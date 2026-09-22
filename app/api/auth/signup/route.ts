import { NextResponse } from "next/server";

import {
  createApiRequestId,
  logApiError,
  logApiInfo,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  consumePersistentApiRateLimit,
} from "@/lib/api/api-rate-limit";

import {
  resolveApiRateLimitIdentity,
} from "@/lib/api/api-rate-limit-identity";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";

import { isEmailDeliveryConfigured } from "@/lib/communication/email-delivery-config";
import { sendEmailWithResend } from "@/lib/communication/resend-email.provider";
import { buildSignupConfirmationEmail } from "@/lib/communication/signup-confirmation-email.template";

export const runtime = "nodejs";

// Account creation itself is cheap; what this route actually needs to
// protect is the outbound email send, so the limit is generous enough for
// a real signup (including a retry) but not for scripting mass account
// creation or spamming an inbox.
const SIGNUP_RATE_LIMIT = {
  limit: 5,
  windowMs: 60 * 60 * 1000,
} as const;

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignupRequestBody = {
  email?: unknown;
  password?: unknown;
  username?: unknown;
  fullName?: unknown;
  dateOfBirth?: unknown;
  sexAtBirth?: unknown;
  language?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function jsonError(
  message: string,
  status: number,
  requestId: string
): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { "x-request-id": requestId } }
  );
}

export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const timer = startApiTimer();

  let body: SignupRequestBody;

  try {
    body = (await request.json()) as SignupRequestBody;
  } catch {
    return jsonError("Invalid request body.", 400, requestId);
  }

  const language = body.language === "ar" ? "ar" : "en";

  const rateLimitIdentity = resolveApiRateLimitIdentity({ request });

  try {
    const rateLimit = await consumePersistentApiRateLimit({
      client: getSupabaseAdminClient(),
      key: `signup:${rateLimitIdentity.type}:${rateLimitIdentity.value}`,
      policy: SIGNUP_RATE_LIMIT,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            language === "ar"
              ? "محاولات كثيرة لإنشاء حساب. حاول مرة أخرى لاحقًا."
              : "Too many signup attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "x-request-id": requestId,
            "retry-after": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }
  } catch (error) {
    // The rate limiter itself failing must not block real signups.
    logApiError("auth.signup_rate_limit_failed", error, {
      route: "/api/auth/signup",
      requestId,
    });
  }

  if (
    !isNonEmptyString(body.email) ||
    !EMAIL_REGEX.test(body.email.trim())
  ) {
    return jsonError("A valid email address is required.", 400, requestId);
  }

  if (!isNonEmptyString(body.password) || body.password.length < 8) {
    return jsonError("A valid password is required.", 400, requestId);
  }

  if (
    !isNonEmptyString(body.username) ||
    !USERNAME_REGEX.test(body.username.trim())
  ) {
    return jsonError("A valid username is required.", 400, requestId);
  }

  if (!isNonEmptyString(body.fullName) || body.fullName.trim().length < 2) {
    return jsonError("A valid full name is required.", 400, requestId);
  }

  const email = body.email.trim().toLowerCase();
  const username = body.username.trim().toLowerCase();
  const fullName = body.fullName.trim();
  const dateOfBirth = isNonEmptyString(body.dateOfBirth)
    ? body.dateOfBirth.trim()
    : null;
  const sexAtBirth = isNonEmptyString(body.sexAtBirth)
    ? body.sexAtBirth.trim()
    : null;

  const userMetadata = {
    username,
    full_name: fullName,
    date_of_birth: dateOfBirth,
    sex_at_birth: sexAtBirth,
    report_identity_preference: "ask",
  };

  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/login`;

  try {
    if (isEmailDeliveryConfigured()) {
      const admin = getSupabaseAdminClient();

      const { data, error } = await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password: body.password,
        options: {
          data: userMetadata,
          redirectTo,
        },
      });

      if (error || !data?.properties?.hashed_token) {
        logApiError(
          "auth.signup_generate_link_failed",
          error ?? new Error("No hashed_token returned."),
          { route: "/api/auth/signup", requestId }
        );

        return jsonError(
          language === "ar"
            ? "تعذر إنشاء الحساب. يرجى المحاولة مرة أخرى."
            : "Could not create your account. Please try again.",
          400,
          requestId
        );
      }

      const confirmUrl = `${origin}/verify?token_hash=${encodeURIComponent(
        data.properties.hashed_token
      )}&type=signup`;

      const emailContent = buildSignupConfirmationEmail({
        confirmUrl,
        language,
      });

      try {
        await sendEmailWithResend({
          to: email,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
          idempotencyKey: `signup-confirmation:${data.user.id}`,
        });
      } catch (sendError) {
        // The account exists but the branded email failed to send. Fail
        // loudly rather than leaving the user unable to ever confirm.
        logApiError("auth.signup_confirmation_email_failed", sendError, {
          route: "/api/auth/signup",
          requestId,
          userId: data.user.id,
        });

        return jsonError(
          language === "ar"
            ? "تم إنشاء الحساب، لكن تعذر إرسال رسالة التأكيد. يرجى التواصل مع الدعم."
            : "Your account was created, but the confirmation email could not be sent. Please contact support.",
          502,
          requestId
        );
      }

      logApiInfo("auth.signup_completed", {
        route: "/api/auth/signup",
        requestId,
        userId: data.user.id,
        deliveryMethod: "branded_email",
        durationMs: timer.elapsedMs(),
      });

      return NextResponse.json(
        { success: true },
        { headers: { "x-request-id": requestId } }
      );
    }

    // Resend isn't configured yet — fall back to Supabase's own
    // confirmation email so signup keeps working (unbranded) instead of
    // breaking outright.
    const { error } = await supabase.auth.signUp({
      email,
      password: body.password,
      options: {
        emailRedirectTo: redirectTo,
        data: userMetadata,
      },
    });

    if (error) {
      logApiError("auth.signup_fallback_failed", error, {
        route: "/api/auth/signup",
        requestId,
      });

      return jsonError(
        language === "ar"
          ? "تعذر إنشاء الحساب. يرجى المحاولة مرة أخرى."
          : "Could not create your account. Please try again.",
        400,
        requestId
      );
    }

    logApiInfo("auth.signup_completed", {
      route: "/api/auth/signup",
      requestId,
      deliveryMethod: "supabase_default_email",
      durationMs: timer.elapsedMs(),
    });

    return NextResponse.json(
      { success: true },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    logApiError("auth.signup_failed", error, {
      route: "/api/auth/signup",
      requestId,
    });

    return jsonError(
      language === "ar"
        ? "تعذر إنشاء الحساب. يرجى المحاولة مرة أخرى."
        : "Could not create your account. Please try again.",
      500,
      requestId
    );
  }
}

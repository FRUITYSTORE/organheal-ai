import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  resolveApiRateLimitIdentity,
} from "@/lib/api/api-rate-limit-identity";

import {
  consumePersistentApiRateLimit,
} from "@/lib/api/api-rate-limit";

import {
  createApiRequestId,
  logApiError,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

const LOGIN_RATE_LIMIT = {
  limit: 10,
  windowMs: 60_000,
} as const;

const INVALID_CREDENTIALS =
  "Incorrect email, username, or password.";

type LoginRequest = {
  identifier?: unknown;
  password?: unknown;
};

export async function POST(
  request: Request
) {
  const requestId =
    createApiRequestId();

  const timer =
    startApiTimer();

  try {
    const adminClient =
      getSupabaseAdminClient();

    const rateLimitIdentity =
      resolveApiRateLimitIdentity({
        request,
      });

    const rateLimit =
      await consumePersistentApiRateLimit({
        client:
          adminClient,

        key:
          `login:${rateLimitIdentity.type}:${rateLimitIdentity.value}`,

        policy:
          LOGIN_RATE_LIMIT,
      });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Too many login attempts. Please try again shortly.",

          requestId,
        },
        {
          status: 429,

          headers: {
            "x-request-id":
              requestId,

            "retry-after":
              String(
                rateLimit.retryAfterSeconds
              ),
          },
        }
      );
    }

    let body:
      LoginRequest;

    try {
      body =
        await request.json() as LoginRequest;
    } catch {
      return NextResponse.json(
        {
          error:
            INVALID_CREDENTIALS,

          requestId,
        },
        {
          status: 400,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    if (
      typeof body.identifier !==
        "string" ||
      typeof body.password !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            INVALID_CREDENTIALS,

          requestId,
        },
        {
          status: 400,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const identifier =
      body.identifier
        .trim()
        .toLowerCase();

    const password =
      body.password;

    if (
      !identifier ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            INVALID_CREDENTIALS,

          requestId,
        },
        {
          status: 400,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    let loginEmail =
      identifier;

    if (
      !identifier.includes("@")
    ) {
      const {
        data:
          profile,
        error:
          profileError,
      } =
        await adminClient
          .from("profiles")
          .select("email")
          .ilike(
            "username",
            identifier
          )
          .maybeSingle();

      if (
        profileError ||
        !profile?.email
      ) {
        return NextResponse.json(
          {
            error:
              INVALID_CREDENTIALS,

            requestId,
          },
          {
            status: 401,

            headers: {
              "x-request-id":
                requestId,
            },
          }
        );
      }

      loginEmail =
        profile.email;
    }

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (
      !supabaseUrl ||
      !supabaseKey
    ) {
      throw new Error(
        "Supabase public environment variables are missing."
      );
    }

    const authClient =
      createClient(
        supabaseUrl,
        supabaseKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,

            detectSessionInUrl:
              false,
          },
        }
      );

    const {
      data,
      error,
    } =
      await authClient.auth
        .signInWithPassword({
          email:
            loginEmail,

          password,
        });

    if (
      error ||
      !data.session ||
      !data.user
    ) {
      return NextResponse.json(
        {
          error:
            INVALID_CREDENTIALS,

          requestId,
        },
        {
          status: 401,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,

        session: {
          accessToken:
            data.session.access_token,

          refreshToken:
            data.session.refresh_token,
        },

        requestId,
      },
      {
        status: 200,

        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (error) {
    logApiError(
      "login_failed",
      {
        requestId,

        durationMs:
          timer.elapsedMs(),

        error,
      }
    );

    return NextResponse.json(
      {
        error:
          "Unable to sign in.",

        requestId,
      },
      {
        status: 500,

        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  }
}
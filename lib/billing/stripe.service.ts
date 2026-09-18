import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export type PlanInterval = "month" | "year";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  return secret;
}

export function getStripePriceId(interval: PlanInterval): string {
  const envVar =
    interval === "year"
      ? "STRIPE_PRICE_ID_PLUS_YEARLY"
      : "STRIPE_PRICE_ID_PLUS_MONTHLY";

  const priceId = process.env[envVar]?.trim();

  if (!priceId) {
    throw new Error(`${envVar} is not configured.`);
  }

  return priceId;
}

export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_ID_PLUS_MONTHLY?.trim() &&
      process.env.STRIPE_PRICE_ID_PLUS_YEARLY?.trim()
  );
}

function appendStripeParam(
  params: URLSearchParams,
  key: string,
  value: unknown
): void {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      appendStripeParam(params, `${key}[${index}]`, item);
    });
    return;
  }

  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(
      ([nestedKey, nestedValue]) => {
        appendStripeParam(params, `${key}[${nestedKey}]`, nestedValue);
      }
    );
    return;
  }

  params.append(key, String(value));
}

function buildStripeBody(
  fields: Record<string, unknown>
): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(fields).forEach(([key, value]) => {
    appendStripeParam(params, key, value);
  });

  return params;
}

async function stripeRequest<TResult>(
  path: string,
  fields: Record<string, unknown>
): Promise<TResult> {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: buildStripeBody(fields),
  });

  const payload = await response.json();

  if (!response.ok) {
    const message =
      (payload && payload.error && payload.error.message) ||
      `Stripe request to ${path} failed with status ${response.status}.`;

    throw new Error(message);
  }

  return payload as TResult;
}

type StripeCustomer = {
  id: string;
};

export async function createStripeCustomer({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}): Promise<string> {
  const customer = await stripeRequest<StripeCustomer>("/customers", {
    email: email ?? undefined,
    metadata: {
      supabase_user_id: userId,
    },
  });

  return customer.id;
}

type StripeCheckoutSession = {
  id: string;
  url: string | null;
};

export async function createCheckoutSession({
  userId,
  customerId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>("/checkout/sessions", {
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    subscription_data: {
      metadata: {
        supabase_user_id: userId,
      },
    },
    metadata: {
      supabase_user_id: userId,
    },
  });
}

type StripeBillingPortalSession = {
  url: string;
};

export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<StripeBillingPortalSession> {
  return stripeRequest<StripeBillingPortalSession>(
    "/billing_portal/sessions",
    {
      customer: customerId,
      return_url: returnUrl,
    }
  );
}

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

/**
 * Reimplements Stripe's own signature scheme (documented at
 * https://stripe.com/docs/webhooks#verify-manually) with the platform
 * crypto module instead of the stripe SDK, matching this codebase's
 * existing pattern of calling providers directly over fetch rather than
 * depending on vendor SDKs (see lib/voice/voice-synthesis.service.ts).
 */
export function verifyStripeWebhookSignature({
  payload,
  signatureHeader,
  secret,
}: {
  payload: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>(
    (acc, part) => {
      const [key, value] = part.split("=");

      if (key && value) {
        acc[key] = value;
      }

      return acc;
    },
    {}
  );

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const timestampSeconds = Number(timestamp);

  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const providedBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/lib/api/api-auth";
import {
  createApiRequestId,
  logApiError,
  logApiInfo,
  startApiTimer,
} from "@/lib/api/api-logger";
import { resolveRequestOrigin } from "@/lib/api/request-origin";
import {
  createCheckoutSession,
  createStripeCustomer,
  getStripePriceId,
  isBillingConfigured,
  type PlanInterval,
} from "@/lib/billing/stripe.service";
import {
  getBillingProfileByUserId,
  setStripeCustomerId,
} from "@/lib/repositories/billing.repository";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

function parseInterval(value: unknown): PlanInterval | null {
  if (value === "month" || value === "year") {
    return value;
  }

  return null;
}

export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const timer = startApiTimer();

  try {
    if (!isBillingConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Payments are not yet configured.",
          requestId,
        },
        { status: 503, headers: { "x-request-id": requestId } }
      );
    }

    const authentication = await authenticateApiRequest(request);

    if (!authentication.success) {
      return NextResponse.json(
        { success: false, error: authentication.error, requestId },
        {
          status: authentication.status,
          headers: { "x-request-id": requestId },
        }
      );
    }

    let rawBody: unknown = {};

    try {
      rawBody = await request.json();
    } catch {
      // No body is fine; interval defaults to monthly below.
    }

    const interval =
      parseInterval((rawBody as { interval?: unknown })?.interval) ??
      "month";

    const priceId = getStripePriceId(interval);
    const adminClient = getSupabaseAdminClient();

    const billingProfile = await getBillingProfileByUserId(
      authentication.user.id,
      authentication.client
    );

    let stripeCustomerId = billingProfile?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      stripeCustomerId = await createStripeCustomer({
        userId: authentication.user.id,
        email: authentication.user.email ?? null,
      });

      await setStripeCustomerId(
        authentication.user.id,
        stripeCustomerId,
        adminClient
      );
    }

    const origin = resolveRequestOrigin(request);

    const session = await createCheckoutSession({
      userId: authentication.user.id,
      customerId: stripeCustomerId,
      priceId,
      successUrl: `${origin}/pricing?checkout=success`,
      cancelUrl: `${origin}/pricing?checkout=canceled`,
    });

    logApiInfo("billing.checkout_session_created", {
      route: "/api/billing/checkout",
      requestId,
      userId: authentication.user.id,
      interval,
      durationMs: timer.elapsedMs(),
    });

    return NextResponse.json(
      { success: true, url: session.url, requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    logApiError("billing.checkout_session_failed", error, {
      route: "/api/billing/checkout",
      requestId,
      durationMs: timer.elapsedMs(),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Could not start checkout.",
        requestId,
      },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}

import { NextResponse } from "next/server";

import {
  createApiRequestId,
  logApiError,
  logApiInfo,
  startApiTimer,
} from "@/lib/api/api-logger";
import {
  getStripeWebhookSecret,
  verifyStripeWebhookSignature,
  type PlanInterval,
} from "@/lib/billing/stripe.service";
import {
  syncSubscriptionByStripeCustomerId,
  type BillingPlan,
} from "@/lib/repositories/billing.repository";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type StripeSubscriptionEvent = {
  type: string;
  data: {
    object: {
      id: string;
      customer: string;
      status: string;
      current_period_end: number;
      items?: {
        data?: Array<{
          price?: {
            recurring?: {
              interval?: string;
            };
          };
        }>;
      };
    };
  };
};

const ACTIVE_ENTITLEMENT_STATUSES = new Set(["active", "trialing"]);

function deriveEntitlement(status: string): BillingPlan {
  return ACTIVE_ENTITLEMENT_STATUSES.has(status) ? "plus" : "free";
}

function parseInterval(value: string | undefined): PlanInterval | null {
  return value === "month" || value === "year" ? value : null;
}

const HANDLED_EVENT_TYPES = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const timer = startApiTimer();

  const rawBody = await request.text();

  let signatureIsValid = false;

  try {
    signatureIsValid = verifyStripeWebhookSignature({
      payload: rawBody,
      signatureHeader: request.headers.get("stripe-signature"),
      secret: getStripeWebhookSecret(),
    });
  } catch (error) {
    logApiError("billing.webhook_config_error", error, {
      route: "/api/billing/webhook",
      requestId,
    });

    return NextResponse.json(
      { success: false, error: "Webhook is not configured.", requestId },
      { status: 503, headers: { "x-request-id": requestId } }
    );
  }

  if (!signatureIsValid) {
    logApiError("billing.webhook_invalid_signature", null, {
      route: "/api/billing/webhook",
      requestId,
    });

    return NextResponse.json(
      { success: false, error: "Invalid signature.", requestId },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  let event: StripeSubscriptionEvent;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid payload.", requestId },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  try {
    if (!HANDLED_EVENT_TYPES.has(event.type)) {
      // Acknowledge unhandled event types so Stripe stops retrying them.
      return NextResponse.json(
        { success: true, requestId },
        { headers: { "x-request-id": requestId } }
      );
    }

    const subscription = event.data.object;
    const adminClient = getSupabaseAdminClient();

    const isDeleted = event.type === "customer.subscription.deleted";

    const plan: BillingPlan = isDeleted
      ? "free"
      : deriveEntitlement(subscription.status);

    const planStatus = isDeleted ? "canceled" : subscription.status;

    const planInterval = parseInterval(
      subscription.items?.data?.[0]?.price?.recurring?.interval
    );

    const planCurrentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    const matched = await syncSubscriptionByStripeCustomerId(
      {
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        plan,
        planStatus,
        planInterval,
        planCurrentPeriodEnd,
      },
      adminClient
    );

    if (!matched) {
      logApiError(
        "billing.webhook_customer_not_found",
        null,
        {
          route: "/api/billing/webhook",
          requestId,
          eventType: event.type,
        }
      );
    } else {
      logApiInfo("billing.subscription_synced", {
        route: "/api/billing/webhook",
        requestId,
        eventType: event.type,
        plan,
        planStatus,
        durationMs: timer.elapsedMs(),
      });
    }

    return NextResponse.json(
      { success: true, requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    logApiError("billing.webhook_processing_failed", error, {
      route: "/api/billing/webhook",
      requestId,
      eventType: event.type,
      durationMs: timer.elapsedMs(),
    });

    return NextResponse.json(
      { success: false, error: "Could not process webhook.", requestId },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}

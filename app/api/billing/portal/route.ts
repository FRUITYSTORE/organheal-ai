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
  createBillingPortalSession,
  isBillingConfigured,
} from "@/lib/billing/stripe.service";
import { getBillingProfileByUserId } from "@/lib/repositories/billing.repository";

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

    const billingProfile = await getBillingProfileByUserId(
      authentication.user.id,
      authentication.client
    );

    if (!billingProfile?.stripe_customer_id) {
      return NextResponse.json(
        {
          success: false,
          error: "No billing account found for this user.",
          requestId,
        },
        { status: 404, headers: { "x-request-id": requestId } }
      );
    }

    const origin = resolveRequestOrigin(request);

    const session = await createBillingPortalSession({
      customerId: billingProfile.stripe_customer_id,
      returnUrl: `${origin}/profile`,
    });

    logApiInfo("billing.portal_session_created", {
      route: "/api/billing/portal",
      requestId,
      userId: authentication.user.id,
      durationMs: timer.elapsedMs(),
    });

    return NextResponse.json(
      { success: true, url: session.url, requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    logApiError("billing.portal_session_failed", error, {
      route: "/api/billing/portal",
      requestId,
      durationMs: timer.elapsedMs(),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Could not open the billing portal.",
        requestId,
      },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}

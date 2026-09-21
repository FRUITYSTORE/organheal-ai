import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveApiRateLimitIdentity } from "@/lib/api/api-rate-limit-identity";
import {
  buildUsageDeniedPayload,
  consumeUsage,
  type UsageFeature,
} from "@/lib/billing/usage-quota";

/**
 * Counts one use of a token-spending feature and returns the response to send
 * when the caller is not allowed to continue, or null when they are.
 */
export async function guardUsage({
  client,
  feature,
  request,
  userId,
  language,
  requestId,
}: {
  client: SupabaseClient;
  feature: UsageFeature;
  request: Request;
  userId: string | null;
  language: "ar" | "en" | "both";
  requestId: string;
}): Promise<NextResponse | null> {
  const decision = await consumeUsage({
    client,
    feature,
    actor: userId
      ? { type: "user", userId }
      : {
          type: "visitor",
          ip: resolveApiRateLimitIdentity({ request }).value,
        },
  });

  if (decision.allowed) {
    return null;
  }

  const headers: Record<string, string> = { "x-request-id": requestId };

  if (decision.retryAfterSeconds > 0) {
    headers["retry-after"] = String(decision.retryAfterSeconds);
  }

  return NextResponse.json(
    { ...buildUsageDeniedPayload({ decision, language }), requestId },
    {
      status: decision.reason === "login_required" ? 401 : 429,
      headers,
    }
  );
}

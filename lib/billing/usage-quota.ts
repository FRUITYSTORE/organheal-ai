import type { SupabaseClient } from "@supabase/supabase-js";

import { consumePersistentApiRateLimit } from "@/lib/api/api-rate-limit";
import {
  USAGE_POLICIES,
  type UsageFeature,
  type UsageTier,
} from "@/lib/billing/usage-limits";

export {
  USAGE_POLICIES,
  type UsageFeature,
  type UsageTier,
} from "@/lib/billing/usage-limits";

export type UsageDeniedReason =
  | "login_required"
  | "quota_exceeded";

export type UsageDecision =
  | {
      allowed: true;
      tier: UsageTier;
      remaining: number;
    }
  | {
      allowed: false;
      tier: UsageTier;
      reason: UsageDeniedReason;
      retryAfterSeconds: number;
    };

export type UsageActor =
  | { type: "user"; userId: string }
  | { type: "visitor"; ip: string };

/**
 * Reads the member's plan. Only the `plan` column is selected because it is
 * the one column that exists before the billing migration is applied. Any
 * failure falls back to the free tier, never to Plus.
 */
export async function resolveUserTier(
  client: SupabaseClient,
  userId: string
): Promise<UsageTier> {
  try {
    const { data, error } = await client
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return "free";
    }

    return (data as { plan?: string } | null)?.plan === "plus"
      ? "plus"
      : "free";
  } catch {
    return "free";
  }
}

export async function consumeUsage({
  client,
  feature,
  actor,
}: {
  client: SupabaseClient;
  feature: UsageFeature;
  actor: UsageActor;
}): Promise<UsageDecision> {
  const tier: UsageTier =
    actor.type === "visitor"
      ? "visitor"
      : await resolveUserTier(client, actor.userId);

  const policy = USAGE_POLICIES[feature][tier];

  if (!policy) {
    return {
      allowed: false,
      tier,
      reason: "login_required",
      retryAfterSeconds: 0,
    };
  }

  const subject =
    actor.type === "visitor"
      ? `ip:${actor.ip}`
      : `user:${actor.userId}`;

  const result = await consumePersistentApiRateLimit({
    client,
    key: `usage:${feature}:${subject}`,
    policy,
  });

  if (!result.allowed) {
    return {
      allowed: false,
      tier,
      reason: "quota_exceeded",
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    tier,
    remaining: result.remaining,
  };
}

export type UsageDeniedPayload = {
  success: false;
  code: UsageDeniedReason;
  error: string;
  response: string;
  action: { label: string; href: string } | null;
};

type Localized = { en: string; ar: string };

function pick(
  text: Localized,
  language: "ar" | "en" | "both"
): string {
  if (language === "both") {
    return `${text.en} ${text.ar}`;
  }

  return text[language];
}

/**
 * A response the existing screens can render as-is: `response` is shown as
 * the assistant's message and `action` becomes its button. Routes that do
 * not know the user's language yet pass "both".
 */
export function buildUsageDeniedPayload({
  decision,
  language,
}: {
  decision: Extract<UsageDecision, { allowed: false }>;
  language: "ar" | "en" | "both";
}): UsageDeniedPayload {
  let message: Localized;
  let action: { label: Localized; href: string } | null;

  if (decision.tier === "visitor") {
    message =
      decision.reason === "login_required"
        ? {
            en: "Voice features are for members. Create a free account to continue.",
            ar: "الميزات الصوتية متاحة للأعضاء. أنشئ حسابًا مجانيًا للمتابعة.",
          }
        : {
            en: "You've used today's free questions. Create a free account to keep going, upload reports and save your results.",
            ar: "استخدمت أسئلتك المجانية لهذا اليوم. أنشئ حسابًا مجانيًا لتكمل الحديث، وترفع تقاريرك، وتحفظ نتائجك.",
          };
    action = {
      label: { en: "Create a free account", ar: "أنشئ حسابًا مجانيًا" },
      href: "/signup",
    };
  } else if (decision.tier === "free") {
    message = {
      en: "You've reached today's limit on the free plan. Upgrade to OrganHeal Plus for higher limits, or come back tomorrow.",
      ar: "وصلت إلى الحد اليومي في الخطة المجانية. رقِّ إلى OrganHeal Plus لحدود أعلى، أو عُد غدًا.",
    };
    action = {
      label: { en: "See OrganHeal Plus", ar: "عرض خطة Plus" },
      href: "/pricing",
    };
  } else {
    message = {
      en: "You've reached today's limit. Please come back tomorrow.",
      ar: "وصلت إلى الحد اليومي. عُد غدًا لمتابعة الاستخدام.",
    };
    action = null;
  }

  const text = pick(message, language);

  return {
    success: false,
    code: decision.reason,
    error: text,
    response: text,
    action: action
      ? { label: pick(action.label, language), href: action.href }
      : null,
  };
}

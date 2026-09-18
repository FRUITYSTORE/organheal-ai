import {
  supabase,
} from "@/lib/supabase";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

const BILLING_PROFILE_SELECT =
  "id,email,plan,plan_status,plan_interval,plan_current_period_end,stripe_customer_id,stripe_subscription_id";

export type BillingPlan = "free" | "plus";

export type BillingProfile = {
  id: string;
  email: string | null;
  plan: BillingPlan;
  plan_status: string | null;
  plan_interval: "month" | "year" | null;
  plan_current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export async function getBillingProfileByUserId(
  userId: string,
  client: SupabaseClient = supabase
): Promise<BillingProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select(BILLING_PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as BillingProfile | null) ?? null;
}

export async function getBillingProfileByStripeCustomerId(
  stripeCustomerId: string,
  client: SupabaseClient
): Promise<BillingProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select(BILLING_PROFILE_SELECT)
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as BillingProfile | null) ?? null;
}

/**
 * Must be called with a service-role client. A regular authenticated
 * client cannot write these columns — see protect_billing_columns_trigger
 * in supabase/migrations/20260919010000_add_billing_plan_columns.sql.
 */
export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
  adminClient: SupabaseClient
): Promise<void> {
  const { error } = await adminClient
    .from("profiles")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export type SubscriptionSyncInput = {
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: BillingPlan;
  planStatus: string | null;
  planInterval: "month" | "year" | null;
  planCurrentPeriodEnd: string | null;
};

/**
 * Must be called with a service-role client, invoked only from the
 * Stripe webhook handler after signature verification.
 */
export async function syncSubscriptionByStripeCustomerId(
  input: SubscriptionSyncInput,
  adminClient: SupabaseClient
): Promise<boolean> {
  const { data, error } = await adminClient
    .from("profiles")
    .update({
      plan: input.plan,
      plan_status: input.planStatus,
      plan_interval: input.planInterval,
      plan_current_period_end: input.planCurrentPeriodEnd,
      stripe_subscription_id: input.stripeSubscriptionId,
    })
    .eq("stripe_customer_id", input.stripeCustomerId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data && data.length > 0);
}

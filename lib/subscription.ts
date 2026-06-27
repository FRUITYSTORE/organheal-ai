export type SubscriptionPlan = "free" | "plus";

export type SubscriptionSource =
  | "local-preview"
  | "database"
  | "stripe";

export type SubscriptionStatus = {
  userId?: string | null;
  plan: SubscriptionPlan;
  isPlus: boolean;
  source: SubscriptionSource;
};

export const DEFAULT_SUBSCRIPTION_STATUS: SubscriptionStatus = {
  userId: null,
  plan: "free",
  isPlus: false,
  source: "local-preview",
};

export const PREMIUM_FEATURE_KEYS = [
  "advanced_intelligence",
  "patient_pdf",
  "doctor_brief_pdf",
  "saved_intelligence_history",
  "health_passport",
  "top_opportunities",
  "risk_signals",
  "trends",
  "timeline",
  "monthly_checkins",
  "report_reminders",
  "doctor_preparation",
] as const;

export type PremiumFeatureKey = (typeof PREMIUM_FEATURE_KEYS)[number];

export const PREMIUM_FEATURE_LABELS: Record<PremiumFeatureKey, string> = {
  advanced_intelligence: "Advanced Intelligence",
  patient_pdf: "Patient-Friendly PDF",
  doctor_brief_pdf: "Doctor-Ready Brief PDF",
  saved_intelligence_history: "Saved Intelligence History",
  health_passport: "Health Passport",
  top_opportunities: "Top Opportunities",
  risk_signals: "Risk Signals",
  trends: "Trends",
  timeline: "Personal Health Timeline",
  monthly_checkins: "Monthly Check-ins",
  report_reminders: "Report Reminders",
  doctor_preparation: "Doctor Preparation",
};

export function getDefaultSubscriptionStatus(): SubscriptionStatus {
  return DEFAULT_SUBSCRIPTION_STATUS;
}

export function isPlusUser(status?: SubscriptionStatus | null): boolean {
  return status?.plan === "plus" || status?.isPlus === true;
}

export function canAccessPremiumFeature(
  status: SubscriptionStatus | null | undefined,
  feature: PremiumFeatureKey
): boolean {
  if (!PREMIUM_FEATURE_KEYS.includes(feature)) {
    return false;
  }

  return isPlusUser(status);
}
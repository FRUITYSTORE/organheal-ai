export type ProductAnalyticsEventName =
  | "homepage_viewed"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "report_upload_started"
  | "report_upload_completed"
  | "intelligence_viewed"
  | "health_plan_viewed"
  | "assistant_used"
  | "voice_used"
  | "return_session"
  | "pricing_viewed"
  | "paid_access_requested";

export type ProductAnalyticsLanguage =
  | "en"
  | "ar";

export type ProductAnalyticsSource =
  | "homepage"
  | "signup"
  | "login"
  | "reports"
  | "lab-upload"
  | "intelligence"
  | "health-plan"
  | "assistant"
  | "dashboard"
  | "pricing"
  | "contact"
  | "unknown";

export type ProductAnalyticsProperties = {
  language?: ProductAnalyticsLanguage;
  source?: ProductAnalyticsSource;
  authenticated?: boolean;
};

export type ProductAnalyticsEvent = {
  name: ProductAnalyticsEventName;
  properties?: ProductAnalyticsProperties;
};
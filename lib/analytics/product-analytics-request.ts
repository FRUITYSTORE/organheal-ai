import type {
  ProductAnalyticsEventName,
  ProductAnalyticsLanguage,
  ProductAnalyticsSource,
} from "./product-analytics.types";

const EVENT_NAMES =
  new Set<ProductAnalyticsEventName>([
    "homepage_viewed",
    "signup_started",
    "signup_completed",
    "login_completed",
    "report_upload_started",
    "report_upload_completed",
    "intelligence_viewed",
    "health_plan_viewed",
    "assistant_used",
    "voice_used",
    "return_session",
    "pricing_viewed",
    "paid_access_requested",
  ]);

const LANGUAGES =
  new Set<ProductAnalyticsLanguage>([
    "en",
    "ar",
  ]);

const SOURCES =
  new Set<ProductAnalyticsSource>([
    "homepage",
    "signup",
    "login",
    "reports",
    "lab-upload",
    "intelligence",
    "health-plan",
    "assistant",
    "dashboard",
    "pricing",
    "contact",
    "unknown",
  ]);

const ALLOWED_KEYS =
  new Set([
    "name",
    "language",
    "source",
    "anonymousSessionId",
  ]);

export type ProductAnalyticsRequest = {
  name: ProductAnalyticsEventName;

  language?:
    ProductAnalyticsLanguage;

  source?:
    ProductAnalyticsSource;

  anonymousSessionId?:
    string;
};

export type ProductAnalyticsRequestValidation =
  | {
      success: true;

      event:
        ProductAnalyticsRequest;
    }
  | {
      success: false;

      error:
        string;
    };

function isUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function validateProductAnalyticsRequest(
  input: unknown
): ProductAnalyticsRequestValidation {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return {
      success: false,

      error:
        "A valid analytics event is required.",
    };
  }

  const record =
    input as Record<string, unknown>;

  for (
    const key of
    Object.keys(record)
  ) {
    if (
      !ALLOWED_KEYS.has(key)
    ) {
      return {
        success: false,

        error:
          "Analytics event contains unsupported properties.",
      };
    }
  }

  if (
    typeof record.name !== "string" ||
    !EVENT_NAMES.has(
      record.name as ProductAnalyticsEventName
    )
  ) {
    return {
      success: false,

      error:
        "Analytics event name is invalid.",
    };
  }

  if (
    record.language !== undefined &&
    (
      typeof record.language !== "string" ||
      !LANGUAGES.has(
        record.language as ProductAnalyticsLanguage
      )
    )
  ) {
    return {
      success: false,

      error:
        "Analytics language is invalid.",
    };
  }

  if (
    record.source !== undefined &&
    (
      typeof record.source !== "string" ||
      !SOURCES.has(
        record.source as ProductAnalyticsSource
      )
    )
  ) {
    return {
      success: false,

      error:
        "Analytics source is invalid.",
    };
  }

  if (
    record.anonymousSessionId !== undefined &&
    (
      typeof record.anonymousSessionId !== "string" ||
      !isUuid(
        record.anonymousSessionId
      )
    )
  ) {
    return {
      success: false,

      error:
        "Anonymous analytics session ID is invalid.",
    };
  }

  return {
    success: true,

    event: {
      name:
        record.name as ProductAnalyticsEventName,

      language:
        record.language as
          | ProductAnalyticsLanguage
          | undefined,

      source:
        record.source as
          | ProductAnalyticsSource
          | undefined,

      anonymousSessionId:
        record.anonymousSessionId as
          | string
          | undefined,
    },
  };
}
import type {
  ProductAnalyticsEvent,
  ProductAnalyticsProperties,
  ProductAnalyticsSource,
} from "./product-analytics.types";

const ALLOWED_SOURCES =
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

function sanitizeProperties(
  properties?: ProductAnalyticsProperties
): ProductAnalyticsProperties | undefined {
  if (!properties) {
    return undefined;
  }

  const safeProperties:
    ProductAnalyticsProperties = {};

  if (
    properties.language === "en" ||
    properties.language === "ar"
  ) {
    safeProperties.language =
      properties.language;
  }

  if (
    properties.source &&
    ALLOWED_SOURCES.has(
      properties.source
    )
  ) {
    safeProperties.source =
      properties.source;
  }

  if (
    typeof properties.authenticated ===
    "boolean"
  ) {
    safeProperties.authenticated =
      properties.authenticated;
  }

  return Object.keys(
    safeProperties
  ).length > 0
    ? safeProperties
    : undefined;
}

export function createProductAnalyticsEvent(
  event: ProductAnalyticsEvent
): ProductAnalyticsEvent {
  return {
    name:
      event.name,

    properties:
      sanitizeProperties(
        event.properties
      ),
  };
}

export function trackProductEvent(
  event: ProductAnalyticsEvent
): void {
  const safeEvent =
    createProductAnalyticsEvent(
      event
    );

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    console.debug(
      "[product-analytics]",
      safeEvent
    );
  }
}
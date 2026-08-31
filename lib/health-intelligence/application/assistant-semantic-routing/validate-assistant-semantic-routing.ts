import type {
  ProductNavigationDestination,
} from "@/lib/health-intelligence/application/product-navigation/product-navigation.types";

import type {
  AssistantSemanticConfidence,
  AssistantSemanticDomain,
  AssistantSemanticRoutingDecision,
} from "./assistant-semantic-routing.types";

const VALID_DOMAINS:
  AssistantSemanticDomain[] = [
    "product_navigation",
    "clinical_question",
    "health_journey",
    "general_health",
    "unclear",
  ];

const VALID_CONFIDENCE:
  AssistantSemanticConfidence[] = [
    "high",
    "medium",
    "low",
  ];

const VALID_PRODUCT_DESTINATIONS:
  ProductNavigationDestination[] = [
    "upload-report",
    "view-results",
    "health-plan",
    "reports",
    "learning",
    "doctor-prep",
    "profile",
    "communication-settings",
  ];

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function validateAssistantSemanticRoutingDecision(
  value: unknown
): AssistantSemanticRoutingDecision | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    domain,
    confidence,
    productDestination,
    requiresConversationContext,
    reason,
  } = value;

  if (
    typeof domain !== "string" ||
    !VALID_DOMAINS.includes(
      domain as AssistantSemanticDomain
    )
  ) {
    return null;
  }

  if (
    typeof confidence !== "string" ||
    !VALID_CONFIDENCE.includes(
      confidence as AssistantSemanticConfidence
    )
  ) {
    return null;
  }

  if (
    typeof requiresConversationContext !==
    "boolean"
  ) {
    return null;
  }

  if (
    reason !== null &&
    typeof reason !== "string"
  ) {
    return null;
  }

  if (
    productDestination !== null &&
    (
      typeof productDestination !==
        "string" ||
      !VALID_PRODUCT_DESTINATIONS.includes(
        productDestination as ProductNavigationDestination
      )
    )
  ) {
    return null;
  }

  if (
    domain === "product_navigation" &&
    productDestination === null
  ) {
    return null;
  }

  if (
    domain !== "product_navigation" &&
    productDestination !== null
  ) {
    return null;
  }

  return {
    domain:
      domain as AssistantSemanticDomain,

    confidence:
      confidence as AssistantSemanticConfidence,

    source:
      "model",

    productDestination:
      productDestination as
        | ProductNavigationDestination
        | null,

    requiresConversationContext,

    reason,
  };
}
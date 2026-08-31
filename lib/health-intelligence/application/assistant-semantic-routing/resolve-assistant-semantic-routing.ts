import {
  resolveProductNavigation,
} from "@/lib/health-intelligence/application/product-navigation/resolve-product-navigation";

import {
  detectClinicalIntent,
} from "@/lib/health-intelligence/application/assistant-response/clinical-intent";

import {
  detectJourneyIntent,
} from "@/lib/health-intelligence/application/assistant-response/journey-intent";

import type {
  AssistantSemanticRoutingDecision,
} from "./assistant-semantic-routing.types";

export function resolveAssistantSemanticRouting(
  message: string
): AssistantSemanticRoutingDecision {
  const clinicalIntent =
    detectClinicalIntent(message);

  if (
    clinicalIntent.intent !==
    "unknown"
  ) {
    return {
      domain:
        "clinical_question",

      confidence:
        clinicalIntent.confidence,

      source:
        "deterministic",

      productDestination:
        null,

      requiresConversationContext:
        false,

      reason:
        "Matched a known clinical intent.",
    };
  }

  const journeyIntent =
    detectJourneyIntent(message);

  if (
    journeyIntent.intent !==
    "unknown"
  ) {
    return {
      domain:
        "health_journey",

      confidence:
        journeyIntent.confidence,

      source:
        "deterministic",

      productDestination:
        null,

      requiresConversationContext:
        false,

      reason:
        "Matched a known health journey intent.",
    };
  }

  const productNavigation =
    resolveProductNavigation(message);

  if (
    productNavigation.matched &&
    productNavigation.destination
  ) {
    return {
      domain:
        "product_navigation",

      confidence:
        productNavigation.confidence,

      source:
        "deterministic",

      productDestination:
        productNavigation.destination,

      requiresConversationContext:
        false,

      reason:
        "Matched a known product navigation intent.",
    };
  }

  return {
    domain:
      "unclear",

    confidence:
      "low",

    source:
      "deterministic",

    productDestination:
      null,

    requiresConversationContext:
      true,

    reason:
      null,
  };
}
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

function normalizeStructuredMessage(
  message: string
): string {
  return message
    .replace(
      /[٠-٩]/g,
      (digit) =>
        String(
          digit.charCodeAt(0) -
            0x0660
        )
    )
    .replace(
      /[۰-۹]/g,
      (digit) =>
        String(
          digit.charCodeAt(0) -
            0x06f0
        )
    )
    .replace(
      /[أإآ]/g,
      "ا"
    )
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function resolveExplicitLatestReportComparison(
  message: string
): AssistantSemanticRoutingDecision | null {
  const normalized =
    normalizeStructuredMessage(
      message
    );

  const hasComparisonSignal =
    /\bcompare\b/.test(
      normalized
    ) ||
    normalized.includes(
      "قارن"
    ) ||
    normalized.includes(
      "الفرق"
    );

  if (
    !hasComparisonSignal
  ) {
    return null;
  }

  const englishMatch =
    normalized.match(
      /\b(?:latest|last)\s+(\d{1,2})\s+reports?\b/
    );

  const arabicMatch =
    normalized.match(
      /(?:اخر|احدث)\s+(\d{1,2})\s+(?:تقارير|تقرير)/u
    );

  const countText =
    englishMatch?.[1] ??
    arabicMatch?.[1] ??
    null;

  if (
    !countText
  ) {
    return null;
  }

  const count =
    Number(
      countText
    );

  /*
   * Keep the deterministic bypass deliberately narrow.
   *
   * Larger or less explicit report-selection requests continue
   * through semantic understanding instead of guessing.
   */
  if (
    !Number.isInteger(
      count
    ) ||
    count < 2 ||
    count > 20
  ) {
    return null;
  }

  return {
    domain:
      "clinical_question",

    confidence:
      "high",

    source:
      "deterministic",

    productDestination:
      null,

    requiresConversationContext:
      false,

    reason:
      "Matched an explicit latest-N report comparison request.",

    understanding: {
      goals: [
        "compare",
        "history",
      ],

      primaryGoal:
        "compare",

      subject: {
        kind:
          "report",

        value:
          null,
      },

      reportReference: {
        kind:
          "latest",

        count,

        value:
          null,
      },

      referentStatus:
        "resolved",

      referentConfidence:
        "high",

      isFollowUp:
        false,

      refersToPreviousTurn:
        false,

      needsReportEvidence:
        true,

      needsHistory:
        true,

      asksForDiagnosis:
        false,

      asksForUrgency:
        false,

      asksForAction:
        false,

      requestedDepth:
        "normal",
    },
  };
}

export function resolveAssistantSemanticRouting(
  message: string
): AssistantSemanticRoutingDecision {
  /*
   * Resolve only highly explicit structured report comparisons here.
   *
   * This gives OrganHeal a zero-cost, deterministic path for
   * requests such as:
   *
   *   Compare my latest 3 reports
   *   قارن آخر 3 تقارير عندي
   *
   * Ambiguous, conversational, colloquial, and indirect requests
   * still belong to semantic-model understanding.
   */
  const structuredReportComparison =
    resolveExplicitLatestReportComparison(
      message
    );

  if (
    structuredReportComparison
  ) {
    return structuredReportComparison;
  }

  const clinicalIntent =
    detectClinicalIntent(
      message
    );

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
    detectJourneyIntent(
      message
    );

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
    resolveProductNavigation(
      message
    );

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
import type {
  ProductNavigationDestination,
} from "@/lib/health-intelligence/application/product-navigation/product-navigation.types";

import type {
  AssistantSemanticConfidence,
  AssistantSemanticDomain,
  AssistantSemanticGoal,
  AssistantSemanticRequestedDepth,
  AssistantSemanticRoutingDecision,
  AssistantSemanticSubjectKind,
  AssistantSemanticUnderstanding,
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

const VALID_GOALS:
  AssistantSemanticGoal[] = [
    "explain",
    "cause",
    "significance",
    "risk",
    "next-step",
    "diagnostic-meaning",
    "compare",
    "history",
    "summarize",
    "doctor-preparation",
    "general",
  ];

const VALID_SUBJECT_KINDS:
  AssistantSemanticSubjectKind[] = [
    "report",
    "marker",
    "organ",
    "finding",
    "symptom",
    "previous-topic",
    "general-health",
    "unknown",
  ];

const VALID_REQUESTED_DEPTH:
  AssistantSemanticRequestedDepth[] = [
    "brief",
    "normal",
    "detailed",
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

function validateUnderstanding(
  value: unknown
): AssistantSemanticUnderstanding | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    goals,
    primaryGoal,
    subject,
    isFollowUp,
    refersToPreviousTurn,
    needsReportEvidence,
    needsHistory,
    asksForDiagnosis,
    asksForUrgency,
    asksForAction,
    requestedDepth,
  } = value;

  if (
    !Array.isArray(goals) ||
    goals.length === 0 ||
    goals.length > 6 ||
    !goals.every(
      (goal) =>
        typeof goal === "string" &&
        VALID_GOALS.includes(
          goal as AssistantSemanticGoal
        )
    )
  ) {
    return null;
  }

  if (
    typeof primaryGoal !== "string" ||
    !VALID_GOALS.includes(
      primaryGoal as AssistantSemanticGoal
    )
  ) {
    return null;
  }

  if (
    !goals.includes(
      primaryGoal
    )
  ) {
    return null;
  }

  if (!isRecord(subject)) {
    return null;
  }

  if (
    typeof subject.kind !== "string" ||
    !VALID_SUBJECT_KINDS.includes(
      subject.kind as AssistantSemanticSubjectKind
    )
  ) {
    return null;
  }

  if (
    subject.value !== null &&
    typeof subject.value !== "string"
  ) {
    return null;
  }

  if (
    typeof isFollowUp !== "boolean" ||
    typeof refersToPreviousTurn !== "boolean" ||
    typeof needsReportEvidence !== "boolean" ||
    typeof needsHistory !== "boolean" ||
    typeof asksForDiagnosis !== "boolean" ||
    typeof asksForUrgency !== "boolean" ||
    typeof asksForAction !== "boolean"
  ) {
    return null;
  }

  if (
    typeof requestedDepth !== "string" ||
    !VALID_REQUESTED_DEPTH.includes(
      requestedDepth as AssistantSemanticRequestedDepth
    )
  ) {
    return null;
  }

  const uniqueGoals = [
    ...new Set(
      goals as AssistantSemanticGoal[]
    ),
  ];

  return {
    goals:
      uniqueGoals,

    primaryGoal:
      primaryGoal as AssistantSemanticGoal,

    subject: {
      kind:
        subject.kind as AssistantSemanticSubjectKind,

      value:
        subject.value === null
          ? null
          : subject.value.trim() || null,
    },

    isFollowUp,

    refersToPreviousTurn,

    needsReportEvidence,

    needsHistory,

    asksForDiagnosis,

    asksForUrgency,

    asksForAction,

    requestedDepth:
      requestedDepth as AssistantSemanticRequestedDepth,
  };
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
    understanding,
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

  let validatedUnderstanding:
    AssistantSemanticUnderstanding | null =
      null;

  if (understanding !== undefined) {
    validatedUnderstanding =
      validateUnderstanding(
        understanding
      );

    if (!validatedUnderstanding) {
      return null;
    }
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

    ...(validatedUnderstanding
      ? {
          understanding:
            validatedUnderstanding,
        }
      : {}),
  };
}
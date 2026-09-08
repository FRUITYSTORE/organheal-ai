import type {
  ProductNavigationDestination,
} from "@/lib/health-intelligence/application/product-navigation/product-navigation.types";

import type {
  AssistantSemanticConfidence,
  AssistantSemanticDomain,
  AssistantSemanticGoal,
  AssistantSemanticReferentStatus,
  AssistantSemanticReportReferenceKind,
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
    "general_conversation",
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
    "general-topic",
    "unknown",
  ];

const VALID_REQUESTED_DEPTH:
  AssistantSemanticRequestedDepth[] = [
    "brief",
    "normal",
    "detailed",
  ];

const VALID_REPORT_REFERENCE_KINDS:
  AssistantSemanticReportReferenceKind[] = [
    "latest",
    "previous",
    "current-conversation",
    "specific",
    "range",
    "unspecified",
  ];

const VALID_REFERENT_STATUS:
  AssistantSemanticReferentStatus[] = [
    "resolved",
    "ambiguous",
    "missing",
  ];

function isRecord(
  value:
    unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function resolveLegacyReferentStatus(
  input: {
    subjectKind:
      AssistantSemanticSubjectKind;

    subjectValue:
      string | null;

    isFollowUp:
      boolean;

    refersToPreviousTurn:
      boolean;
  }
): AssistantSemanticReferentStatus {
  if (
    input.subjectValue ||
    (
      !input.isFollowUp &&
      input.subjectKind !== "unknown"
    )
  ) {
    return "resolved";
  }

  if (
    input.isFollowUp ||
    input.refersToPreviousTurn
  ) {
    return "missing";
  }

  return input.subjectKind === "unknown"
    ? "missing"
    : "resolved";
}

function validateUnderstanding(
  value:
    unknown
): AssistantSemanticUnderstanding | null {
  if (!isRecord(value)) {
    return null;
  }

const {
  goals,
  primaryGoal,
  subject,
  reportReference,
  referentStatus,
  referentConfidence,
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

  const normalizedSubjectKind =
    subject.kind as AssistantSemanticSubjectKind;

  const normalizedSubjectValue =
    subject.value === null
      ? null
      : subject.value.trim() || null;

  let normalizedReferentStatus:
    AssistantSemanticReferentStatus;

  /*
   * Backwards-compatible migration path:
   * older model fixtures may not yet contain referentStatus.
   */
  if (
    referentStatus === undefined
  ) {
    normalizedReferentStatus =
      resolveLegacyReferentStatus({
        subjectKind:
          normalizedSubjectKind,

        subjectValue:
          normalizedSubjectValue,

        isFollowUp,

        refersToPreviousTurn,
      });
  } else if (
    typeof referentStatus === "string" &&
    VALID_REFERENT_STATUS.includes(
      referentStatus as AssistantSemanticReferentStatus
    )
  ) {
    normalizedReferentStatus =
      referentStatus as AssistantSemanticReferentStatus;
  } else {
    return null;
  }

  let normalizedReferentConfidence:
    AssistantSemanticConfidence;

  /*
   * Same migration rule for existing tests/model fixtures.
   * New model-backed decisions should always provide this field.
   */
  if (
    referentConfidence === undefined
  ) {
    normalizedReferentConfidence =
      normalizedReferentStatus === "resolved"
        ? "medium"
        : "low";
  } else if (
    typeof referentConfidence === "string" &&
    VALID_CONFIDENCE.includes(
      referentConfidence as AssistantSemanticConfidence
    )
  ) {
    normalizedReferentConfidence =
      referentConfidence as AssistantSemanticConfidence;
  } else {
    return null;
  }

  /*
   * A resolved reference must identify something meaningful.
   *
   * A direct report-level request is allowed to resolve by kind alone,
   * e.g. subject.kind === "report" with no literal value.
   */
  if (
    normalizedReferentStatus === "resolved" &&
    normalizedSubjectKind === "unknown"
  ) {
    return null;
  }

  /*
   * Do not allow the model to claim high-confidence resolution of an
   * unspecified previous topic.
   */
  if (
    normalizedReferentStatus === "resolved" &&
    normalizedSubjectKind === "previous-topic" &&
    !normalizedSubjectValue &&
    normalizedReferentConfidence === "high"
  ) {
    return null;
  }

  const uniqueGoals = [
    ...new Set(
      goals as AssistantSemanticGoal[]
    ),
  ];

  let normalizedReportReference:
  AssistantSemanticUnderstanding["reportReference"] =
    null;

/*
 * Migration compatibility:
 * older model fixtures and deterministic decisions
 * may not yet contain reportReference.
 */
if (
  reportReference !== undefined &&
  reportReference !== null
) {
  if (
    !isRecord(
      reportReference
    )
  ) {
    return null;
  }

  const {
    kind,
    count,
    value:
      reportReferenceValue,
  } = reportReference;

  if (
    typeof kind !== "string" ||
    !VALID_REPORT_REFERENCE_KINDS.includes(
      kind as AssistantSemanticReportReferenceKind
    )
  ) {
    return null;
  }

  if (
    count !== null &&
    (
      typeof count !== "number" ||
      !Number.isInteger(
        count
      ) ||
      count < 1 ||
      count > 50
    )
  ) {
    return null;
  }

  if (
    reportReferenceValue !== null &&
    typeof reportReferenceValue !==
      "string"
  ) {
    return null;
  }

  const normalizedValue =
    reportReferenceValue === null
      ? null
      : reportReferenceValue
          .trim() || null;

  const normalizedKind =
    kind as AssistantSemanticReportReferenceKind;

  /*
   * A specific report must identify what
   * makes the report specific.
   */
  if (
    normalizedKind === "specific" &&
    !normalizedValue
  ) {
    return null;
  }

  /*
   * A range must describe the requested
   * period/range rather than inventing one.
   */
  if (
    normalizedKind === "range" &&
    !normalizedValue
  ) {
    return null;
  }

  normalizedReportReference = {
    kind:
      normalizedKind,

    count:
      count === null
        ? null
        : count,

    value:
      normalizedValue,
  };
}

  return {
    goals:
      uniqueGoals,

    primaryGoal:
      primaryGoal as AssistantSemanticGoal,

    subject: {
      kind:
        normalizedSubjectKind,

      value:
        normalizedSubjectValue,
    },

    reportReference:
      normalizedReportReference,

    referentStatus:
      normalizedReferentStatus,

    referentConfidence:
      normalizedReferentConfidence,

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
  value:
    unknown
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
    productDestination !== null &&
    (
      typeof productDestination !== "string" ||
      !VALID_PRODUCT_DESTINATIONS.includes(
        productDestination as ProductNavigationDestination
      )
    )
  ) {
    return null;
  }

  /*
 * Product navigation must always resolve to a valid
 * product destination.
 *
 * Conversely, non-product domains must never carry
 * a product destination.
 */
if (
  domain ===
    "product_navigation" &&
  productDestination ===
    null
) {
  return null;
}

if (
  domain !==
    "product_navigation" &&
  productDestination !==
    null
) {
  return null;
}

  if (
    reason !== null &&
    typeof reason !== "string"
  ) {
    return null;
  }

  const normalizedUnderstanding =
    understanding === undefined
      ? undefined
      : validateUnderstanding(
          understanding
        );

  if (
    understanding !== undefined &&
    !normalizedUnderstanding
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

    reason:
      reason === null
        ? null
        : reason.trim() || null,

    ...(normalizedUnderstanding
      ? {
          understanding:
            normalizedUnderstanding,
        }
      : {}),
  };
}
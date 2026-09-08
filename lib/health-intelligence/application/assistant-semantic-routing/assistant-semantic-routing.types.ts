import type {
  AssistantResponseConversationMessage,
} from "@/lib/health-intelligence/application/assistant-response.service";

import type {
  ProductNavigationDestination,
} from "@/lib/health-intelligence/application/product-navigation/product-navigation.types";

export type AssistantSemanticDomain =
  | "product_navigation"
  | "clinical_question"
  | "health_journey"
  | "general_health"
  | "general_conversation"
  | "unclear";

export type AssistantSemanticConfidence =
  | "high"
  | "medium"
  | "low";

export type AssistantSemanticSource =
  | "deterministic"
  | "model";

export type AssistantSemanticGoal =
  | "explain"
  | "cause"
  | "significance"
  | "risk"
  | "next-step"
  | "diagnostic-meaning"
  | "compare"
  | "history"
  | "summarize"
  | "doctor-preparation"
  | "general";

export type AssistantSemanticSubjectKind =
  | "report"
  | "marker"
  | "organ"
  | "finding"
  | "symptom"
  | "previous-topic"
  | "general-health"
  | "general-topic"
  | "unknown";

export type AssistantSemanticRequestedDepth =
  | "brief"
  | "normal"
  | "detailed";

 export type AssistantSemanticReportReferenceKind =
  | "latest"
  | "previous"
  | "current-conversation"
  | "specific"
  | "range"
  | "unspecified";

export type AssistantSemanticReportReference = {
  kind:
    AssistantSemanticReportReferenceKind;

  /**
   * Number of reports requested when the reference
   * represents a collection.
   *
   * Examples:
   * latest + count 3
   *   = the latest 3 uploaded reports
   *
   * previous + count 2
   *   = the previous 2 reports relative to the
   *     active/latest report context
   */
  count:
    number | null;

  /**
   * Human/model-resolved identifier when the user
   * names a particular report, date, period, or
   * conversational reference.
   *
   * Examples:
   * "September 2026"
   * "blood test from August"
   * "report.pdf"
   */
  value:
    string | null;
};

export type AssistantSemanticReferentStatus =
  | "resolved"
  | "ambiguous"
  | "missing";

export type AssistantSemanticSubject = {
  kind:
    AssistantSemanticSubjectKind;

  value:
    string | null;
};

export type AssistantSemanticUnderstanding = {
  goals:
    AssistantSemanticGoal[];

  primaryGoal:
    AssistantSemanticGoal;

  subject:
    AssistantSemanticSubject;

  reportReference:
    AssistantSemanticReportReference | null;

  /**
   * Describes whether the subject/reference required to understand
   * this turn was actually resolved from the current message and
   * recent conversation.
   *
   * resolved:
   *   There is one sufficiently clear active subject.
   *
   * ambiguous:
   *   More than one plausible recent subject exists and choosing one
   *   would require guessing.
   *
   * missing:
   *   The message requires a subject/reference but the available
   *   conversation does not provide one.
   */
  referentStatus:
    AssistantSemanticReferentStatus;

  referentConfidence:
    AssistantSemanticConfidence;

  isFollowUp:
    boolean;

  refersToPreviousTurn:
    boolean;

  needsReportEvidence:
    boolean;

  needsHistory:
    boolean;

  asksForDiagnosis:
    boolean;

  asksForUrgency:
    boolean;

  asksForAction:
    boolean;

  requestedDepth:
    AssistantSemanticRequestedDepth;
};

export type AssistantSemanticRoutingDecision = {
  domain:
    AssistantSemanticDomain;

  confidence:
    AssistantSemanticConfidence;

  source:
    AssistantSemanticSource;

  productDestination:
    ProductNavigationDestination | null;

  requiresConversationContext:
    boolean;

  reason:
    string | null;

  /**
   * Optional during the migration period so existing deterministic
   * routing decisions and older tests remain backwards compatible.
   *
   * Model-backed clinical requests should normally populate it.
   */
  understanding?:
    AssistantSemanticUnderstanding;
};

export type AssistantSemanticRoutingInput = {
  currentMessage:
    string;

  language:
    "en" | "ar";

  conversation:
    AssistantResponseConversationMessage[];

  deterministicDecision:
    AssistantSemanticRoutingDecision;
};
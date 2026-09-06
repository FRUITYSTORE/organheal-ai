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
  | "unknown";

export type AssistantSemanticRequestedDepth =
  | "brief"
  | "normal"
  | "detailed";

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
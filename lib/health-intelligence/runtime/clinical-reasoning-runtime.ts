import type {
  AssistantIntent,
} from "@/lib/health-intelligence/application/assistant-intent/assistant-intent";

import {
  selectClinicalClarificationQuestion,
  type ClinicalClarificationLanguage,
  type ClinicalClarificationSelectionResult,
} from "@/lib/health-intelligence/engines/clinical-clarification-selector.engine";

import {
  evaluateKnowledgeEvidenceWeights,
} from "@/lib/health-intelligence/engines/clinical-evidence-weight.engine";

import type {
  ClinicalEvidenceWeightCollection,
} from "@/lib/health-intelligence/models/clinical-evidence-weight";

import type {
  ClinicalConfidenceProfile,
  ClinicalEvidenceGap,
  ClinicalEvidenceGapType,
  ClinicalEvidenceSufficiencyResult,
  ClinicalReasoningPermission,
} from "@/lib/health-intelligence/models/clinical-evidence-sufficiency";

import type {
  WholeBodyClinicalKnowledgeModel,
  WholeBodyHealthDomain,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

export type ClinicalReasoningMode =
  | "clarification"
  | "provisional"
  | "evidence-based";

export type ClinicalReasoningRuntimeInput = {
  question:
    string;

  intent:
    AssistantIntent;

  language?:
    ClinicalClarificationLanguage;

  knowledge:
    WholeBodyClinicalKnowledgeModel;

  resolvedGapTypes?:
    ClinicalEvidenceGapType[];

  previouslyAskedQuestionIds?:
    string[];
};

export type ClinicalReasoningUncertainty = {
  hasUncertainty:
    boolean;

  gaps:
    ClinicalEvidenceGap[];

  highImpactMissingInformation:
    string[];

  unresolvedDomains:
    WholeBodyHealthDomain[];

  explanation:
    string | null;
};

export type ClinicalReasoningRuntime = {
  question:
    string;

  intent:
    AssistantIntent;

  language:
    ClinicalClarificationLanguage;

  mode:
    ClinicalReasoningMode;

  reasoningPermission:
    ClinicalReasoningPermission;

  knowledge:
    WholeBodyClinicalKnowledgeModel;

  evidenceSufficiency:
    ClinicalEvidenceSufficiencyResult | null;

  evidenceWeights:
    ClinicalEvidenceWeightCollection;

  clarification:
    ClinicalClarificationSelectionResult;

  confidence:
    ClinicalConfidenceProfile | null;

  uncertainty:
    ClinicalReasoningUncertainty;

  canAnswer:
    boolean;

  canProvideProvisionalAnswer:
    boolean;

  requiresClarification:
    boolean;

  generatedAt:
    string;
};

function resolveReasoningMode(
  sufficiency:
    ClinicalEvidenceSufficiencyResult | null,
  clarification:
    ClinicalClarificationSelectionResult
): ClinicalReasoningMode {
  if (
    !sufficiency ||
    sufficiency.reasoningPermission ===
      "clarify-first" ||
    clarification.question !==
      null
  ) {
    return "clarification";
  }

  if (
    sufficiency.reasoningPermission ===
    "provisional-answer"
  ) {
    return "provisional";
  }

  return "evidence-based";
}

function resolveReasoningPermission(
  sufficiency:
    ClinicalEvidenceSufficiencyResult | null
): ClinicalReasoningPermission {
  return (
    sufficiency
      ?.reasoningPermission ??
    "clarify-first"
  );
}

function buildUncertainty(
  knowledge:
    WholeBodyClinicalKnowledgeModel,
  sufficiency:
    ClinicalEvidenceSufficiencyResult | null
): ClinicalReasoningUncertainty {
  const gaps =
    sufficiency?.gaps ??
    [];

  const highImpactMissingInformation =
    sufficiency
      ?.highImpactMissingInformation ??
    [];

  const unresolvedDomains =
    knowledge
      .unresolvedDomains;

  const hasUncertainty =
    !sufficiency ||
    sufficiency.status !==
      "sufficient" ||
    gaps.length >
      0 ||
    unresolvedDomains.length >
      0;

  return {
    hasUncertainty,

    gaps,

    highImpactMissingInformation,

    unresolvedDomains,

    explanation:
      hasUncertainty
        ? "The available evidence contains unresolved gaps that may change the interpretation, confidence, risk priority, or next action."
        : null,
  };
}

export function buildClinicalReasoningRuntime({
  question,
  intent,
  language = "en",
  knowledge,
  resolvedGapTypes = [],
  previouslyAskedQuestionIds = [],
}: ClinicalReasoningRuntimeInput):
  ClinicalReasoningRuntime {
  const normalizedQuestion =
    question.trim();

  const evidenceSufficiency =
    knowledge
      .evidenceSufficiency;

  const evidenceWeights =
    evaluateKnowledgeEvidenceWeights(
      knowledge
    );

  const clarification =
    selectClinicalClarificationQuestion({
      knowledge,

      language,

      resolvedGapTypes,

      previouslyAskedQuestionIds,
    });

  const mode =
    resolveReasoningMode(
      evidenceSufficiency,
      clarification
    );

  const reasoningPermission =
    resolveReasoningPermission(
      evidenceSufficiency
    );

  const requiresClarification =
    mode ===
      "clarification" &&
    clarification.question !==
      null;

  const canProvideProvisionalAnswer =
    Boolean(
      evidenceSufficiency
        ?.canProvideProvisionalInterpretation
    );

  const canAnswer =
    mode ===
      "evidence-based" ||
    mode ===
      "provisional";

  return {
    question:
      normalizedQuestion,

    intent,

    language,

    mode,

    reasoningPermission,

    knowledge,

    evidenceSufficiency,

    evidenceWeights,

    clarification,

    confidence:
      evidenceSufficiency
        ?.confidence ??
      null,

    uncertainty:
      buildUncertainty(
        knowledge,
        evidenceSufficiency
      ),

    canAnswer,

    canProvideProvisionalAnswer,

    requiresClarification,

    generatedAt:
      new Date()
        .toISOString(),
  };
}
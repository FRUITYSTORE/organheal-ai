import type {
  ClinicalEvidenceWeightCollection,
} from "@/lib/health-intelligence/models/clinical-evidence-weight";

import type {
  ClinicalHypothesisCollection,
} from "@/lib/health-intelligence/models/clinical-hypothesis";

import type {
  WholeBodyClinicalKnowledgeModel,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

export type BuildClinicalHypothesisFoundationInput = {
  knowledge:
    WholeBodyClinicalKnowledgeModel;

  evidenceWeights:
    ClinicalEvidenceWeightCollection;

  referenceTime?:
    string | Date;
};

const MINIMUM_ELIGIBLE_EVIDENCE_WEIGHT =
  0.5;

const MINIMUM_ELIGIBLE_EVIDENCE_COUNT =
  2;

function normalizeReferenceTime(
  value:
    string | Date | undefined
): Date {
  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return value;
  }

  if (
    typeof value ===
      "string"
  ) {
    const parsed =
      new Date(
        value
      );

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed;
    }
  }

  return new Date();
}

export function buildClinicalHypothesisFoundation({
  knowledge,
  evidenceWeights,
  referenceTime,
}: BuildClinicalHypothesisFoundationInput):
  ClinicalHypothesisCollection {
  const generatedAt =
    normalizeReferenceTime(
      referenceTime
    ).toISOString();

  const eligibleEvidence =
    evidenceWeights
      .evidence
      .filter(
        (evidence) =>
          evidence.normalizedWeight >=
          MINIMUM_ELIGIBLE_EVIDENCE_WEIGHT
      );

  const excludedEvidence =
    evidenceWeights
      .evidence
      .filter(
        (evidence) =>
          evidence.normalizedWeight <
          MINIMUM_ELIGIBLE_EVIDENCE_WEIGHT
      );

  const evidenceCount =
    evidenceWeights
      .evidence
      .length;

  const eligibleEvidenceCount =
    eligibleEvidence.length;

  const relationshipCount =
    knowledge
      .relationships
      .length;

  if (
    evidenceCount ===
    0
  ) {
    return {
      status:
        "no-evidence",

      hypotheses:
        [],

      eligibleEvidenceIds:
        [],

      excludedEvidenceIds:
        [],

      evidenceCount:
        0,

      eligibleEvidenceCount:
        0,

      relationshipCount,

      generatedHypothesisCount:
        0,

      generationAllowed:
        false,

      reason:
        "No clinical evidence is available. Interpretive hypotheses must not be generated.",

      safetyBoundary:
        "This foundation does not diagnose disease and does not generate unsupported probabilities.",

      generatedAt,
    };
  }

  const hasMinimumEvidence =
    eligibleEvidenceCount >=
    MINIMUM_ELIGIBLE_EVIDENCE_COUNT;

  const hasExplicitRelationship =
    relationshipCount >
    0;

  const generationAllowed =
    hasMinimumEvidence &&
    hasExplicitRelationship;

  /*
   * Foundation-only behavior:
   *
   * This engine intentionally returns no clinical hypotheses.
   * It only determines whether the evidence foundation could
   * safely support a later evidence-grounded generation phase.
   *
   * Actual hypothesis generation will be implemented in a
   * separate scoped step with explicit clinical rules,
   * supporting and contradicting evidence, missing evidence,
   * and calibrated confidence.
   */
  return {
    status:
      generationAllowed
        ? "foundation-ready"
        : "insufficient-foundation",

    hypotheses:
      [],

    eligibleEvidenceIds:
      eligibleEvidence.map(
        (evidence) =>
          evidence.evidenceId
      ),

    excludedEvidenceIds:
      excludedEvidence.map(
        (evidence) =>
          evidence.evidenceId
      ),

    evidenceCount,

    eligibleEvidenceCount,

    relationshipCount,

    generatedHypothesisCount:
      0,

    generationAllowed,

    reason:
      generationAllowed
        ? "The weighted evidence and explicit relationships meet the structural foundation required for a later evidence-grounded hypothesis-generation phase."
        : "The available evidence foundation is not sufficient to generate clinical hypotheses safely.",

    safetyBoundary:
      "This foundation does not diagnose disease, assign disease probabilities, or convert associations into confirmed causal conclusions.",

    generatedAt,
  };
}
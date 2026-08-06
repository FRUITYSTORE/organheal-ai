import type {
  ClinicalEvidenceCertainty,
  ClinicalEvidenceConfidence,
  ClinicalEvidenceReference,
  ClinicalEvidenceRelevance,
  ClinicalEvidenceSourceType,
  WholeBodyClinicalKnowledgeModel,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

import type {
  ClinicalEvidenceCompleteness,
  ClinicalEvidenceRecency,
  ClinicalEvidenceStrength,
  ClinicalEvidenceWeightCollection,
  ClinicalEvidenceWeightComponents,
  ClinicalEvidenceWeightResult,
  EvaluateClinicalEvidenceWeightInput,
} from "@/lib/health-intelligence/models/clinical-evidence-weight";

const SOURCE_RELIABILITY_WEIGHTS:
  Record<
    ClinicalEvidenceSourceType,
    number
  > = {
    "laboratory-result":
      0.95,

    "imaging-result":
      0.95,

    "clinical-note":
      0.9,

    medication:
      0.88,

    "vital-sign":
      0.86,

    "uploaded-report":
      0.82,

    "generated-analysis":
      0.72,

    assessment:
      0.68,

    "health-history":
      0.66,

    symptom:
      0.64,

    "user-answer":
      0.58,

    "family-history":
      0.56,

    lifestyle:
      0.52,

    "check-in":
      0.5,

    "derived-intelligence":
      0.48,

    unknown:
      0.25,
  };

const CERTAINTY_WEIGHTS:
  Record<
    ClinicalEvidenceCertainty,
    number
  > = {
    confirmed:
      1,

    reported:
      0.72,

    inferred:
      0.52,

    suspected:
      0.38,

    unknown:
      0.2,
  };

const CONFIDENCE_WEIGHTS:
  Record<
    ClinicalEvidenceConfidence,
    number
  > = {
    "very-high":
      1,

    high:
      0.84,

    moderate:
      0.64,

    low:
      0.4,

    "very-low":
      0.2,
  };

const RELEVANCE_WEIGHTS:
  Record<
    ClinicalEvidenceRelevance,
    number
  > = {
    supporting:
      1,

    contradicting:
      1,

    contextual:
      0.68,

    uncertain:
      0.4,
  };

function clampWeight(
  value:
    number
): number {
  return Math.max(
    0,
    Math.min(
      1,
      Math.round(
        value *
        1000
      ) /
      1000
    )
  );
}

function normalizeReferenceTime(
  value:
    string | Date | undefined
): Date {
  if (
    value instanceof Date
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

function resolveRecency(
  observedAt:
    string | null,
  referenceTime:
    Date
): ClinicalEvidenceRecency {
  if (
    !observedAt
  ) {
    return "unknown";
  }

  const observedDate =
    new Date(
      observedAt
    );

  if (
    Number.isNaN(
      observedDate.getTime()
    )
  ) {
    return "unknown";
  }

  const ageInDays =
    Math.max(
      0,
      (
        referenceTime.getTime() -
        observedDate.getTime()
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    );

  if (
    ageInDays <=
    7
  ) {
    return "current";
  }

  if (
    ageInDays <=
    90
  ) {
    return "recent";
  }

  if (
    ageInDays <=
    365
  ) {
    return "older";
  }

  return "historical";
}

function getRecencyWeight(
  recency:
    ClinicalEvidenceRecency
): number {
  const weights:
    Record<
      ClinicalEvidenceRecency,
      number
    > = {
      current:
        1,

      recent:
        0.86,

      older:
        0.68,

      historical:
        0.48,

      unknown:
        0.55,
    };

  return weights[
    recency
  ];
}

function resolveCompleteness(
  evidence:
    ClinicalEvidenceReference
): ClinicalEvidenceCompleteness {
  const hasLabel =
    evidence.label
      .trim()
      .length >
    0;

  const hasValue =
    evidence.value !==
      null &&
    evidence.value !==
      "";

  const hasSource =
    evidence.sourceType !==
    "unknown";

  const hasObservationTime =
    Boolean(
      evidence.observedAt
    );

  const completedFields = [
    hasLabel,
    hasValue,
    hasSource,
    hasObservationTime,
  ].filter(
    Boolean
  ).length;

  if (
    completedFields ===
    0
  ) {
    return "missing";
  }

  if (
    completedFields <=
    2
  ) {
    return "limited";
  }

  if (
    completedFields ===
    3
  ) {
    return "usable";
  }

  return "complete";
}

function getCompletenessWeight(
  completeness:
    ClinicalEvidenceCompleteness
): number {
  const weights:
    Record<
      ClinicalEvidenceCompleteness,
      number
    > = {
      complete:
        1,

      usable:
        0.82,

      limited:
        0.55,

      missing:
        0.15,
    };

  return weights[
    completeness
  ];
}

function resolveStrength(
  weight:
    number
): ClinicalEvidenceStrength {
  if (
    weight >=
    0.85
  ) {
    return "very-high";
  }

  if (
    weight >=
    0.7
  ) {
    return "high";
  }

  if (
    weight >=
    0.5
  ) {
    return "moderate";
  }

  if (
    weight >=
    0.3
  ) {
    return "low";
  }

  return "very-low";
}

function buildRationale(
  evidence:
    ClinicalEvidenceReference,
  recency:
    ClinicalEvidenceRecency,
  completeness:
    ClinicalEvidenceCompleteness,
  components:
    ClinicalEvidenceWeightComponents
): string[] {
  const rationale:
    string[] = [
      `Source reliability was evaluated from ${evidence.sourceType}.`,
      `Evidence certainty is ${evidence.certainty}.`,
      `Recorded confidence is ${evidence.confidence}.`,
      `Clinical relevance is ${evidence.relevance}.`,
      `Evidence recency is ${recency}.`,
      `Evidence completeness is ${completeness}.`,
    ];

  if (
    evidence.value ===
    null
  ) {
    rationale.push(
      "The evidence has no recorded value, which reduces its usable weight."
    );
  }

  if (
    evidence.sourceType ===
    "generated-analysis"
  ) {
    rationale.push(
      "Generated analysis is treated as derived interpretation rather than primary clinical evidence."
    );
  }

  if (
    evidence.certainty ===
    "reported"
  ) {
    rationale.push(
      "Reported evidence is preserved as patient or source-reported information and is not treated as independently confirmed."
    );
  }

  if (
    components.relevance ===
      1 &&
    evidence.relevance ===
      "contradicting"
  ) {
    rationale.push(
      "Contradicting evidence can be highly influential even though it does not support the current interpretation."
    );
  }

  return rationale;
}

export function evaluateClinicalEvidenceWeight({
  evidence,
  referenceTime,
}: EvaluateClinicalEvidenceWeightInput):
  ClinicalEvidenceWeightResult {
  const evaluatedAt =
    normalizeReferenceTime(
      referenceTime
    );

  const recency =
    resolveRecency(
      evidence.observedAt,
      evaluatedAt
    );

  const completeness =
    resolveCompleteness(
      evidence
    );

  const components:
    ClinicalEvidenceWeightComponents = {
      sourceReliability:
        SOURCE_RELIABILITY_WEIGHTS[
          evidence.sourceType
        ],

      certainty:
        CERTAINTY_WEIGHTS[
          evidence.certainty
        ],

      confidence:
        CONFIDENCE_WEIGHTS[
          evidence.confidence
        ],

      relevance:
        RELEVANCE_WEIGHTS[
          evidence.relevance
        ],

      recency:
        getRecencyWeight(
          recency
        ),

      completeness:
        getCompletenessWeight(
          completeness
        ),
    };

  const normalizedWeight =
    clampWeight(
      (
        components.sourceReliability *
          0.25
      ) +
      (
        components.certainty *
          0.2
      ) +
      (
        components.confidence *
          0.2
      ) +
      (
        components.relevance *
          0.15
      ) +
      (
        components.recency *
          0.1
      ) +
      (
        components.completeness *
          0.1
      )
    );

  return {
    evidenceId:
      evidence.id,

    sourceType:
      evidence.sourceType,

    confidence:
      evidence.confidence,

    relevance:
      evidence.relevance,

    recency,

    completeness,

    strength:
      resolveStrength(
        normalizedWeight
      ),

    normalizedWeight,

    components,

    rationale:
      buildRationale(
        evidence,
        recency,
        completeness,
        components
      ),

    evaluatedAt:
      evaluatedAt
        .toISOString(),
  };
}

export function evaluateKnowledgeEvidenceWeights(
  knowledge:
    WholeBodyClinicalKnowledgeModel,
  referenceTime?:
    string | Date
): ClinicalEvidenceWeightCollection {
  const evaluatedAt =
    normalizeReferenceTime(
      referenceTime
    );

  const evidence =
    knowledge.nodes
      .flatMap(
        (node) =>
          node.evidence
      )
      .map(
        (item) =>
          evaluateClinicalEvidenceWeight({
            evidence:
              item,

            referenceTime:
              evaluatedAt,
          })
      );

  const sortedEvidence = [
    ...evidence,
  ].sort(
    (
      first,
      second
    ) =>
      second.normalizedWeight -
      first.normalizedWeight
  );

  const averageWeight =
    evidence.length ===
      0
      ? 0
      : clampWeight(
          evidence.reduce(
            (
              total,
              item
            ) =>
              total +
              item.normalizedWeight,
            0
          ) /
          evidence.length
        );

  return {
    evidence,

    averageWeight,

    strongestEvidenceId:
      sortedEvidence[0]
        ?.evidenceId ??
      null,

    weakestEvidenceId:
      sortedEvidence[
        sortedEvidence.length -
          1
      ]?.evidenceId ??
      null,

    evaluatedAt:
      evaluatedAt
        .toISOString(),
  };
}
import type {
  ClinicalEvidenceSufficiencyResult,
  ClinicalEvidenceGap,
  ClinicalEvidenceSufficiencyStatus,
  ClinicalReasoningPermission,
} from "@/lib/health-intelligence/models/clinical-evidence-sufficiency";

import type {
  ClinicalEvidenceConfidence,
  ClinicalEvidenceSourceType,
  WholeBodyClinicalKnowledgeModel,
  WholeBodyHealthDomain,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

type BuildClinicalEvidenceSufficiencyInput = {
  knowledge:
    WholeBodyClinicalKnowledgeModel;
};

function clampScore(
  value:
    number
): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        value
      )
    )
  );
}

function getSourceTypes(
  knowledge:
    WholeBodyClinicalKnowledgeModel
): ClinicalEvidenceSourceType[] {
  return [
    ...new Set(
      knowledge.nodes.flatMap(
        (node) =>
          node.evidence.map(
            (evidence) =>
              evidence.sourceType
          )
      )
    ),
  ];
}

function getAverageConfidenceWeight(
  values:
    ClinicalEvidenceConfidence[]
): number {
  if (
    values.length ===
    0
  ) {
    return 0;
  }

  const weights:
    Record<
      ClinicalEvidenceConfidence,
      number
    > = {
      "very-low":
        0.15,

      low:
        0.35,

      moderate:
        0.6,

      high:
        0.82,

      "very-high":
        1,
    };

  const total =
    values.reduce(
      (
        sum,
        value
      ) =>
        sum +
        weights[value],
      0
    );

  return total /
    values.length;
}

function confidenceFromScore(
  score:
    number
): ClinicalEvidenceConfidence {
  if (
    score >=
    85
  ) {
    return "very-high";
  }

  if (
    score >=
    68
  ) {
    return "high";
  }

  if (
    score >=
    45
  ) {
    return "moderate";
  }

  if (
    score >=
    22
  ) {
    return "low";
  }

  return "very-low";
}

function collectEvidenceDomains(
  knowledge:
    WholeBodyClinicalKnowledgeModel
): WholeBodyHealthDomain[] {
  return [
    ...new Set(
      knowledge.nodes.flatMap(
        (node) =>
          node.domains
      )
    ),
  ];
}

function buildEvidenceGaps(
  knowledge:
    WholeBodyClinicalKnowledgeModel,
  sourceTypes:
    ClinicalEvidenceSourceType[]
): ClinicalEvidenceGap[] {
  const gaps:
    ClinicalEvidenceGap[] =
      [];

  const coveredDomains =
    collectEvidenceDomains(
      knowledge
    );

  if (
    knowledge.nodes.length ===
    0
  ) {
    gaps.push({
      id:
        "gap:no-evidence",

      type:
        "no-evidence",

      label:
        "No health evidence is available",

      reason:
        "OrganHeal does not currently have patient evidence that can support individualized reasoning.",

      affectedDomains:
        [],

      impact:
        "high",
    });
  }

  if (
    sourceTypes.length <
    2
  ) {
    gaps.push({
      id:
        "gap:limited-source-diversity",

      type:
        "limited-source-diversity",

      label:
        "Evidence comes from too few source types",

      reason:
        "A conclusion based on one source type may miss important clinical context or contradictory information.",

      affectedDomains:
        coveredDomains,

      impact:
        knowledge.nodes.length ===
          0
          ? "high"
          : "moderate",
    });
  }

  if (
    knowledge.nodes.length >
      1 &&
    knowledge.relationships.length ===
      0
  ) {
    gaps.push({
      id:
        "gap:no-explicit-relationships",

      type:
        "no-explicit-relationships",

      label:
        "Available evidence is not yet explicitly connected",

      reason:
        "The current evidence items exist independently and do not yet establish a verified relationship.",

      affectedDomains:
        coveredDomains,

      impact:
        "moderate",
    });
  }

  const hasCheckIn =
    sourceTypes.includes(
      "check-in"
    );

  const hasSymptom =
    sourceTypes.includes(
      "symptom"
    );

  const hasUserAnswer =
    sourceTypes.includes(
      "user-answer"
    );

  if (
    !hasCheckIn &&
    !hasSymptom &&
    !hasUserAnswer
  ) {
    gaps.push({
      id:
        "gap:missing-current-context",

      type:
        "missing-current-context",

      label:
        "Current symptoms and present health context are missing",

      reason:
        "Reports and saved analyses may not describe how the user feels now or whether symptoms have changed.",

      affectedDomains:
        coveredDomains,

      impact:
        "high",
    });
  }

  if (
    !sourceTypes.includes(
      "health-history"
    ) &&
    !sourceTypes.includes(
      "family-history"
    )
  ) {
    gaps.push({
      id:
        "gap:missing-health-history",

      type:
        "missing-health-history",

      label:
        "Relevant health history may be incomplete",

      reason:
        "Previous conditions and family history can change the interpretation and priority of current findings.",

      affectedDomains:
        coveredDomains,

      impact:
        "moderate",
    });
  }

  if (
    !hasUserAnswer
  ) {
    gaps.push({
      id:
        "gap:missing-user-reported-context",

      type:
        "missing-user-reported-context",

      label:
        "No clarification answers have been collected",

      reason:
        "The user has not yet provided targeted answers that could confirm or weaken the current interpretation.",

      affectedDomains:
        coveredDomains,

      impact:
        "moderate",
    });
  }

  if (
    knowledge
      .unresolvedDomains
      .length >
    0
  ) {
    gaps.push({
      id:
        "gap:unresolved-domain",

      type:
        "unresolved-domain",

      label:
        "Some health domains remain unresolved",

      reason:
        "Available evidence points to areas that require additional data or clarification before reliable reasoning.",

      affectedDomains:
        knowledge.unresolvedDomains,

      impact:
        "high",
    });
  }

  return gaps;
}

function calculateCompletenessScore(
  knowledge:
    WholeBodyClinicalKnowledgeModel,
  sourceTypes:
    ClinicalEvidenceSourceType[],
  gaps:
    ClinicalEvidenceGap[]
): number {
  if (
    knowledge.nodes.length ===
    0
  ) {
    return 0;
  }

  const evidenceCoverage =
    Math.min(
      35,
      knowledge.nodes.length *
        5
    );

  const sourceDiversity =
    Math.min(
      25,
      sourceTypes.length *
        6
    );

  const relationshipCoverage =
    knowledge.nodes.length <=
    1
      ? 10
      : Math.min(
          20,
          (
            knowledge.relationships.length /
            Math.max(
              1,
              knowledge.nodes.length -
                1
            )
          ) *
            20
        );

  const confidenceCoverage =
    getAverageConfidenceWeight(
      knowledge.nodes.map(
        (node) =>
          node.confidence
      )
    ) *
    15;

  const domainCoverage =
    Math.min(
      5,
      knowledge
        .coveredDomains
        .length
    );

  const gapPenalty =
    gaps.reduce(
      (
        penalty,
        gap
      ) => {
        if (
          gap.impact ===
          "high"
        ) {
          return penalty +
            8;
        }

        if (
          gap.impact ===
          "moderate"
        ) {
          return penalty +
            4;
        }

        return penalty +
          1;
      },
      0
    );

  return clampScore(
    evidenceCoverage +
      sourceDiversity +
      relationshipCoverage +
      confidenceCoverage +
      domainCoverage -
      gapPenalty
  );
}

function resolveStatus(
  score:
    number,
  knowledge:
    WholeBodyClinicalKnowledgeModel
): ClinicalEvidenceSufficiencyStatus {
  if (
    knowledge.nodes.length ===
      0 ||
    score <
      35
  ) {
    return "insufficient";
  }

  if (
    score <
      72
  ) {
    return "partial";
  }

  return "sufficient";
}

function resolveReasoningPermission(
  status:
    ClinicalEvidenceSufficiencyStatus
): ClinicalReasoningPermission {
  if (
    status ===
    "insufficient"
  ) {
    return "clarify-first";
  }

  if (
    status ===
    "partial"
  ) {
    return "provisional-answer";
  }

  return "evidence-based-answer";
}

function buildHighImpactMissingInformation(
  gaps:
    ClinicalEvidenceGap[]
): string[] {
  return gaps
    .filter(
      (gap) =>
        gap.impact ===
        "high"
    )
    .map(
      (gap) =>
        gap.label
    );
}

export function assessClinicalEvidenceSufficiency({
  knowledge,
}: BuildClinicalEvidenceSufficiencyInput):
  ClinicalEvidenceSufficiencyResult {
  const sourceTypes =
    getSourceTypes(
      knowledge
    );

  const gaps =
    buildEvidenceGaps(
      knowledge,
      sourceTypes
    );

  const completenessScore =
    calculateCompletenessScore(
      knowledge,
      sourceTypes,
      gaps
    );

  const status =
    resolveStatus(
      completenessScore,
      knowledge
    );

  const reasoningPermission =
    resolveReasoningPermission(
      status
    );

  const evidenceConfidence =
    confidenceFromScore(
      completenessScore
    );

  const relationshipConfidence =
    confidenceFromScore(
      knowledge.relationships.length ===
        0
        ? 0
        : getAverageConfidenceWeight(
            knowledge.relationships.map(
              (relationship) =>
                relationship.confidence
            )
          ) *
          100
    );

  const reasoningConfidence =
    status ===
      "sufficient"
      ? evidenceConfidence
      : status ===
          "partial"
        ? "moderate"
        : "low";

  const recommendationConfidence =
    status ===
      "sufficient"
      ? "high"
      : status ===
          "partial"
        ? "moderate"
        : "very-low";

  return {
    status,

    reasoningPermission,

    completenessScore,

    evidenceNodeCount:
      knowledge.nodes.length,

    relationshipCount:
      knowledge
        .relationships
        .length,

    sourceTypeCount:
      sourceTypes.length,

    coveredDomainCount:
      knowledge
        .coveredDomains
        .length,

    unresolvedDomainCount:
      knowledge
        .unresolvedDomains
        .length,

    confidence: {
      evidenceConfidence,

      relationshipConfidence,

      reasoningConfidence,

      recommendationConfidence,
    },

    gaps,

    highImpactMissingInformation:
      buildHighImpactMissingInformation(
        gaps
      ),

    canProvideProvisionalInterpretation:
      status !==
      "insufficient",

    requiresClarification:
      status !==
      "sufficient",

    generatedAt:
      new Date().toISOString(),
  };
}
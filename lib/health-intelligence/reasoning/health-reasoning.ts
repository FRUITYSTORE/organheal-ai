import type {
  HealthFacts,
} from "../facts/health-facts";

import {
  HEALTH_INTELLIGENCE_RULES,
} from "../rules/health-intelligence-rules";

export type HealthOverallDirection =
  | "strong"
  | "stable"
  | "needs-attention"
  | "insufficient-data";

export type HealthEvidenceMaturity =
  | "minimal"
  | "developing"
  | "connected"
  | "comprehensive";

export type HealthReasoningExplanationCode =
  | "no-health-data"
  | "overall-score-strong"
  | "overall-score-stable"
  | "overall-score-needs-attention"
  | "assessment-checkin-aligned"
  | "assessment-higher-than-checkin"
  | "checkin-higher-than-assessment"
  | "score-relationship-unavailable"
  | "evidence-minimal"
  | "evidence-developing"
  | "evidence-connected"
  | "evidence-comprehensive"
  | "multiple-source-types-connected";

export type HealthReasoningExplanation = {
  code: HealthReasoningExplanationCode;

  category:
    | "direction"
    | "score-relationship"
    | "evidence";

  values: {
    overallScore?: number;
    difference?: number;
    completeness?: number;
    connectedSourceCount?: number;
  };
};

export type HealthReasoning = {
  overallDirection:
    HealthOverallDirection;

  scoreRelationship:
    HealthFacts["scoreComparison"];

  evidence: {
    maturity:
      HealthEvidenceMaturity;

    completeness: number;
    connectedSourceCount: number;
    hasMultipleSourceTypes: boolean;
  };

  explanations:
    HealthReasoningExplanation[];

  generatedAt: string;
};

function getOverallDirection(
  facts: HealthFacts
): HealthOverallDirection {
  if (!facts.hasHealthData) {
    return "insufficient-data";
  }

  if (
    facts.scores.overall >=
    HEALTH_INTELLIGENCE_RULES
      .score
      .strongMinimum
  ) {
    return "strong";
  }

  if (
    facts.scores.overall >=
    HEALTH_INTELLIGENCE_RULES
      .score
      .stableMinimum
  ) {
    return "stable";
  }

  return "needs-attention";
}

function getEvidenceMaturity(
  facts: HealthFacts
): HealthEvidenceMaturity {
  const sourceCount =
    facts.evidence
      .availableSourceCount;

  const completeness =
    facts.evidence
      .dataCompleteness;

  if (
    sourceCount >=
      HEALTH_INTELLIGENCE_RULES
        .evidence
        .comprehensive
        .minimumSourceCount &&
    completeness >=
      HEALTH_INTELLIGENCE_RULES
        .evidence
        .comprehensive
        .minimumCompleteness
  ) {
    return "comprehensive";
  }

  if (
    sourceCount >=
      HEALTH_INTELLIGENCE_RULES
        .evidence
        .connected
        .minimumSourceCount &&
    completeness >=
      HEALTH_INTELLIGENCE_RULES
        .evidence
        .connected
        .minimumCompleteness
  ) {
    return "connected";
  }

  if (
    sourceCount >=
      HEALTH_INTELLIGENCE_RULES
        .evidence
        .developing
        .minimumSourceCount ||
    completeness >=
      HEALTH_INTELLIGENCE_RULES
        .evidence
        .developing
        .minimumCompleteness
  ) {
    return "developing";
  }

  return "minimal";
}

function buildExplanations(
  facts: HealthFacts,
  overallDirection:
    HealthOverallDirection,
  evidenceMaturity:
    HealthEvidenceMaturity
): HealthReasoningExplanation[] {
  const explanations:
    HealthReasoningExplanation[] = [];

  if (
    overallDirection ===
    "insufficient-data"
  ) {
    explanations.push({
      code: "no-health-data",
      category: "direction",
      values: {},
    });
  }

  if (
    overallDirection === "strong"
  ) {
    explanations.push({
      code:
        "overall-score-strong",

      category:
        "direction",

      values: {
        overallScore:
          facts.scores.overall,
      },
    });
  }

  if (
    overallDirection === "stable"
  ) {
    explanations.push({
      code:
        "overall-score-stable",

      category:
        "direction",

      values: {
        overallScore:
          facts.scores.overall,
      },
    });
  }

  if (
    overallDirection ===
    "needs-attention"
  ) {
    explanations.push({
      code:
        "overall-score-needs-attention",

      category:
        "direction",

      values: {
        overallScore:
          facts.scores.overall,
      },
    });
  }

  switch (
    facts.scoreComparison.relationship
  ) {
    case "aligned":
      explanations.push({
        code:
          "assessment-checkin-aligned",

        category:
          "score-relationship",

        values: {
          difference:
            facts.scoreComparison
              .difference ??
            undefined,
        },
      });
      break;

    case "assessment-higher":
      explanations.push({
        code:
          "assessment-higher-than-checkin",

        category:
          "score-relationship",

        values: {
          difference:
            facts.scoreComparison
              .difference ??
            undefined,
        },
      });
      break;

    case "check-in-higher":
      explanations.push({
        code:
          "checkin-higher-than-assessment",

        category:
          "score-relationship",

        values: {
          difference:
            facts.scoreComparison
              .difference ??
            undefined,
        },
      });
      break;

    case "unavailable":
      explanations.push({
        code:
          "score-relationship-unavailable",

        category:
          "score-relationship",

        values: {},
      });
      break;
  }

  const evidenceCode:
    HealthReasoningExplanationCode =
      evidenceMaturity ===
      "comprehensive"
        ? "evidence-comprehensive"
        : evidenceMaturity ===
            "connected"
          ? "evidence-connected"
          : evidenceMaturity ===
              "developing"
            ? "evidence-developing"
            : "evidence-minimal";

  explanations.push({
    code:
      evidenceCode,

    category:
      "evidence",

    values: {
      completeness:
        facts.evidence
          .dataCompleteness,

      connectedSourceCount:
        facts.evidence
          .availableSourceCount,
    },
  });

  if (
    facts.evidence
      .availableSourceCount >= 2
  ) {
    explanations.push({
      code:
        "multiple-source-types-connected",

      category:
        "evidence",

      values: {
        connectedSourceCount:
          facts.evidence
            .availableSourceCount,
      },
    });
  }

  return explanations;
}

export function buildHealthReasoning(
  facts: HealthFacts
): HealthReasoning {
  const overallDirection =
    getOverallDirection(facts);

  const evidenceMaturity =
    getEvidenceMaturity(facts);

  return {
    overallDirection,

    scoreRelationship:
      facts.scoreComparison,

    evidence: {
      maturity:
        evidenceMaturity,

      completeness:
        facts.evidence
          .dataCompleteness,

      connectedSourceCount:
        facts.evidence
          .availableSourceCount,

      hasMultipleSourceTypes:
        facts.evidence
          .availableSourceCount >= 2,
    },

    explanations:
      buildExplanations(
        facts,
        overallDirection,
        evidenceMaturity
      ),

    generatedAt:
      facts.generatedAt,
  };
}
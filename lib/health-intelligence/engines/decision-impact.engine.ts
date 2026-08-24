import type {
  NextDecisionAction,
  NextDecisionData,
  NextDecisionType,
} from "./next-decision.engine";

export type DecisionImpactCategory =
  | "evidence-strength"
  | "confidence"
  | "trend-detection"
  | "analysis-readiness"
  | "doctor-preparation"
  | "plan-continuity";

export type DecisionImpactDirection =
  | "improve"
  | "enable"
  | "maintain";

export type DecisionImpactMagnitude =
  | "low"
  | "moderate"
  | "high";

export type DecisionImpactCode =
  | "establish-health-baseline"
  | "increase-source-coverage"
  | "strengthen-daily-context"
  | "enable-trend-comparison"
  | "add-medical-evidence"
  | "enable-report-analysis"
  | "complete-report-evidence"
  | "improve-doctor-preparation"
  | "strengthen-followup-history"
  | "clarify-health-momentum"
  | "support-health-plan-review"
  | "establish-health-plan"
  | "maintain-plan-continuity";

export type DecisionImpact = {
  code: DecisionImpactCode;

  category:
    DecisionImpactCategory;

  direction:
    DecisionImpactDirection;

  magnitude:
    DecisionImpactMagnitude;
};

export type DecisionImpactActionResult = {
  actionType:
    NextDecisionType;

  impacts:
    DecisionImpact[];

  summary: {
    primaryImpact:
      DecisionImpactCode | null;

    highMagnitudeImpactCount: number;
    totalImpactCount: number;
  };
};

export type DecisionImpactData = {
  primary:
    DecisionImpactActionResult;

  alternatives:
    DecisionImpactActionResult[];

  generatedAt: string;
};

function buildImpactsForAction(
  action: NextDecisionAction
): DecisionImpact[] {
  switch (action.type) {
    case "build-baseline":
      return [
        {
          code:
            "establish-health-baseline",

          category:
            "evidence-strength",

          direction:
            "enable",

          magnitude:
            "high",
        },
        {
          code:
            "increase-source-coverage",

          category:
            "confidence",

          direction:
            "improve",

          magnitude:
            "high",
        },
        {
          code:
            "enable-trend-comparison",

          category:
            "trend-detection",

          direction:
            "enable",

          magnitude:
            "moderate",
        },
      ];

    case "add-daily-context":
      return [
        {
          code:
            "strengthen-daily-context",

          category:
            "evidence-strength",

          direction:
            "improve",

          magnitude:
            "moderate",
        },
        {
          code:
            "enable-trend-comparison",

          category:
            "trend-detection",

          direction:
            "enable",

          magnitude:
            "high",
        },
        {
          code:
            "increase-source-coverage",

          category:
            "confidence",

          direction:
            "improve",

          magnitude:
            "moderate",
        },
      ];

    case "add-medical-evidence":
      return [
        {
          code:
            "add-medical-evidence",

          category:
            "evidence-strength",

          direction:
            "improve",

          magnitude:
            "high",
        },
        {
          code:
            "enable-report-analysis",

          category:
            "analysis-readiness",

          direction:
            "enable",

          magnitude:
            "high",
        },
        {
          code:
            "improve-doctor-preparation",

          category:
            "doctor-preparation",

          direction:
            "improve",

          magnitude:
            "high",
        },
      ];

    case "complete-report-processing":
      return [
        {
          code:
            "complete-report-evidence",

          category:
            "evidence-strength",

          direction:
            "improve",

          magnitude:
            "high",
        },
        {
          code:
            "enable-report-analysis",

          category:
            "analysis-readiness",

          direction:
            "enable",

          magnitude:
            "high",
        },
        {
          code:
            "improve-doctor-preparation",

          category:
            "doctor-preparation",

          direction:
            "improve",

          magnitude:
            "moderate",
        },
      ];

    case "generate-analysis":
      return [
        {
          code:
            "enable-report-analysis",

          category:
            "analysis-readiness",

          direction:
            "enable",

          magnitude:
            "high",
        },
        {
          code:
            "increase-source-coverage",

          category:
            "confidence",

          direction:
            "improve",

          magnitude:
            "high",
        },
        {
          code:
            "improve-doctor-preparation",

          category:
            "doctor-preparation",

          direction:
            "improve",

          magnitude:
            "high",
        },
      ];

    case "add-followup-history":
      return [
        {
          code:
            "strengthen-followup-history",

          category:
            "evidence-strength",

          direction:
            "improve",

          magnitude:
            "moderate",
        },
        {
          code:
            "enable-trend-comparison",

          category:
            "trend-detection",

          direction:
            "enable",

          magnitude:
            "high",
        },
        {
          code:
            "clarify-health-momentum",

          category:
            "confidence",

          direction:
            "improve",

          magnitude:
            "moderate",
        },
      ];

    case "review-declining-momentum":
      return [
        {
          code:
            "clarify-health-momentum",

          category:
            "trend-detection",

          direction:
            "improve",

          magnitude:
            "high",
        },
        {
          code:
            "support-health-plan-review",

          category:
            "plan-continuity",

          direction:
            "enable",

          magnitude:
            "high",
        },
        {
          code:
            "improve-doctor-preparation",

          category:
            "doctor-preparation",

          direction:
            "improve",

          magnitude:
            "moderate",
        },
      ];

          case "start-health-plan":
      return [
        {
          code:
            "establish-health-plan",

          category:
            "plan-continuity",

          direction:
            "enable",

          magnitude:
            "high",
        },
        {
          code:
            "strengthen-followup-history",

          category:
            "trend-detection",

          direction:
            "improve",

          magnitude:
            "moderate",
        },
      ];

    case "continue-health-plan":
      return [
        {
          code:
            "maintain-plan-continuity",

          category:
            "plan-continuity",

          direction:
            "maintain",

          magnitude:
            "high",
        },
        {
          code:
            "strengthen-followup-history",

          category:
            "trend-detection",

          direction:
            "improve",

          magnitude:
            "moderate",
        },
      ];
  }
}

function buildActionImpact(
  action: NextDecisionAction
): DecisionImpactActionResult {
  const impacts =
    buildImpactsForAction(action);

  return {
    actionType:
      action.type,

    impacts,

    summary: {
      primaryImpact:
        impacts[0]?.code ?? null,

      highMagnitudeImpactCount:
        impacts.filter(
          (impact) =>
            impact.magnitude === "high"
        ).length,

      totalImpactCount:
        impacts.length,
    },
  };
}

function uniqueAlternativeImpacts(
  alternatives:
    NextDecisionAction[]
): DecisionImpactActionResult[] {
  const seen =
    new Set<NextDecisionType>();

  const results:
    DecisionImpactActionResult[] = [];

  for (const action of alternatives) {
    if (seen.has(action.type)) {
      continue;
    }

    seen.add(action.type);

    results.push(
      buildActionImpact(action)
    );
  }

  return results;
}

export function buildDecisionImpact(
  nextDecision: NextDecisionData
): DecisionImpactData {
  return {
    primary:
      buildActionImpact(
        nextDecision.primary
      ),

    alternatives:
      uniqueAlternativeImpacts(
        nextDecision.alternatives
      ),

    generatedAt:
      nextDecision.generatedAt,
  };
}

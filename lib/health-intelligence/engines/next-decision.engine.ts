import type {
  ClinicalConfidenceData,
} from "./clinical-confidence.engine";

import type {
  EvidenceGapCode,
  EvidenceIntelligenceData,
  EvidenceRecommendation,
  EvidenceRecommendationCode,
} from "./evidence-intelligence.engine";

import type {
  HealthMomentumData,
  HealthMomentumStatus,
} from "./health-momentum.engine";

import type {
  HealthEngineContext,
} from "./shared/health-engine-context";

export type NextDecisionType =
  | "build-baseline"
  | "add-daily-context"
  | "add-medical-evidence"
  | "complete-report-processing"
  | "generate-analysis"
  | "add-followup-history"
  | "review-declining-momentum"
  | "continue-health-plan";

export type NextDecisionPriority =
  | "primary"
  | "secondary";

export type NextDecisionUrgency =
  | "routine"
  | "soon";

export type NextDecisionReasonCode =
  | "evidence-primary-recommendation"
  | "missing-health-baseline"
  | "missing-daily-context"
  | "missing-medical-evidence"
  | "pending-report-processing"
  | "missing-generated-analysis"
  | "limited-followup-history"
  | "declining-momentum-detected"
  | "mixed-momentum-detected"
  | "low-confidence-result"
  | "core-data-connected";

export type NextDecisionAction = {
  type: NextDecisionType;

  priority: NextDecisionPriority;
  urgency: NextDecisionUrgency;

  href:
    | "/assessment"
    | "/checkin"
    | "/lab-upload"
    | "/reports"
    | "/health-plan";

  reasonCodes:
    NextDecisionReasonCode[];

  relatedEvidenceGap:
    EvidenceGapCode | null;

  relatedEvidenceRecommendation:
    EvidenceRecommendationCode | null;
};

export type NextDecisionData = {
  primary: NextDecisionAction;

  alternatives:
    NextDecisionAction[];

  context: {
    evidenceStrength:
      EvidenceIntelligenceData["strength"];

    evidenceScore: number;

    confidenceLevel:
      ClinicalConfidenceData["level"];

    confidenceScore: number;

    momentumStatus:
      HealthMomentumStatus;
  };

  generatedAt: string;
};

export type BuildNextDecisionInput = {
  engineContext: HealthEngineContext;

  evidence:
    EvidenceIntelligenceData;

  clinicalConfidence:
    ClinicalConfidenceData;

  momentum:
    HealthMomentumData;
};

function mapEvidenceRecommendation(
  recommendation: EvidenceRecommendation
): NextDecisionAction {
  switch (recommendation.code) {
    case "complete-assessment":
      return {
        type:
          "build-baseline",

        priority:
          recommendation.priority,

        urgency:
          "routine",

        href:
          "/assessment",

        reasonCodes: [
          "evidence-primary-recommendation",
          "missing-health-baseline",
        ],

        relatedEvidenceGap:
          recommendation.relatedGap,

        relatedEvidenceRecommendation:
          recommendation.code,
      };

    case "complete-checkin":
      return {
        type:
          "add-daily-context",

        priority:
          recommendation.priority,

        urgency:
          "routine",

        href:
          "/checkin",

        reasonCodes: [
          "evidence-primary-recommendation",
          "missing-daily-context",
        ],

        relatedEvidenceGap:
          recommendation.relatedGap,

        relatedEvidenceRecommendation:
          recommendation.code,
      };

    case "upload-medical-report":
      return {
        type:
          "add-medical-evidence",

        priority:
          recommendation.priority,

        urgency:
          "routine",

        href:
          "/lab-upload",

        reasonCodes: [
          "evidence-primary-recommendation",
          "missing-medical-evidence",
        ],

        relatedEvidenceGap:
          recommendation.relatedGap,

        relatedEvidenceRecommendation:
          recommendation.code,
      };

    case "process-pending-report":
      return {
        type:
          "complete-report-processing",

        priority:
          recommendation.priority,

        urgency:
          "soon",

        href:
          "/reports",

        reasonCodes: [
          "evidence-primary-recommendation",
          "pending-report-processing",
        ],

        relatedEvidenceGap:
          recommendation.relatedGap,

        relatedEvidenceRecommendation:
          recommendation.code,
      };

    case "generate-report-analysis":
      return {
        type:
          "generate-analysis",

        priority:
          recommendation.priority,

        urgency:
          "soon",

        href:
          "/reports",

        reasonCodes: [
          "evidence-primary-recommendation",
          "missing-generated-analysis",
        ],

        relatedEvidenceGap:
          recommendation.relatedGap,

        relatedEvidenceRecommendation:
          recommendation.code,
      };

    case "add-followup-data":
      return {
        type:
          "add-followup-history",

        priority:
          recommendation.priority,

        urgency:
          "routine",

        href:
          "/checkin",

        reasonCodes: [
          "evidence-primary-recommendation",
          "limited-followup-history",
        ],

        relatedEvidenceGap:
          recommendation.relatedGap,

        relatedEvidenceRecommendation:
          recommendation.code,
      };
  }
}

function buildMomentumDecision(
  momentum:
    HealthMomentumData
): NextDecisionAction | null {
  if (
    momentum.status !== "declining" &&
    momentum.status !== "mixed"
  ) {
    return null;
  }

  return {
    type:
      "review-declining-momentum",

    priority:
      "primary",

    urgency:
      momentum.status === "declining"
        ? "soon"
        : "routine",

    href:
      "/health-plan",

    reasonCodes: [
      momentum.status === "declining"
        ? "declining-momentum-detected"
        : "mixed-momentum-detected",
    ],

    relatedEvidenceGap:
      null,

    relatedEvidenceRecommendation:
      null,
  };
}

function buildFallbackDecision(
  input: BuildNextDecisionInput
): NextDecisionAction {
  const {
    engineContext,
    clinicalConfidence,
  } = input;

  const {
    context,
  } = engineContext;

  if (!context.readiness.hasAssessment) {
    return {
      type:
        "build-baseline",

      priority:
        "primary",

      urgency:
        "routine",

      href:
        "/assessment",

      reasonCodes: [
        "missing-health-baseline",
      ],

      relatedEvidenceGap:
        "no-assessment",

      relatedEvidenceRecommendation:
        null,
    };
  }

  if (!context.readiness.hasCheckIn) {
    return {
      type:
        "add-daily-context",

      priority:
        "primary",

      urgency:
        "routine",

      href:
        "/checkin",

      reasonCodes: [
        "missing-daily-context",
      ],

      relatedEvidenceGap:
        "no-checkin",

      relatedEvidenceRecommendation:
        null,
    };
  }

  if (!context.readiness.hasReport) {
    return {
      type:
        "add-medical-evidence",

      priority:
        "primary",

      urgency:
        "routine",

      href:
        "/lab-upload",

      reasonCodes: [
        "missing-medical-evidence",
      ],

      relatedEvidenceGap:
        "no-medical-report",

      relatedEvidenceRecommendation:
        null,
    };
  }

  if (!context.readiness.hasAnalysis) {
    return {
      type:
        "generate-analysis",

      priority:
        "primary",

      urgency:
        "soon",

      href:
        "/reports",

      reasonCodes: [
        "missing-generated-analysis",
      ],

      relatedEvidenceGap:
        "no-generated-analysis",

      relatedEvidenceRecommendation:
        null,
    };
  }

  return {
    type:
      "continue-health-plan",

    priority:
      "primary",

    urgency:
      "routine",

    href:
      "/health-plan",

    reasonCodes: [
      "core-data-connected",

      ...(clinicalConfidence.level === "low"
        ? ([
            "low-confidence-result",
          ] as NextDecisionReasonCode[])
        : []),
    ],

    relatedEvidenceGap:
      null,

    relatedEvidenceRecommendation:
      null,
  };
}

function uniqueActions(
  actions: NextDecisionAction[]
): NextDecisionAction[] {
  const seen =
    new Set<string>();

  return actions.filter(
    (action) => {
      const key =
        `${action.type}:${action.href}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

export function buildNextDecision(
  input: BuildNextDecisionInput
): NextDecisionData {
  const {
    engineContext,
    evidence,
    clinicalConfidence,
    momentum,
  } = input;

  const evidenceActions =
    evidence.recommendations.map(
      mapEvidenceRecommendation
    );

  const primaryEvidenceAction =
    evidenceActions.find(
      (action) =>
        action.priority === "primary"
    ) ?? null;

  const momentumDecision =
    buildMomentumDecision(
      momentum
    );

  /*
   * Evidence gaps take precedence because they determine
   * whether OrganHeal has enough connected information to
   * support later guidance.
   *
   * Momentum becomes primary only when no evidence-building
   * action is currently required.
   */
  const primary =
    primaryEvidenceAction ??
    momentumDecision ??
    buildFallbackDecision(input);

  const alternatives =
    uniqueActions([
      ...evidenceActions.filter(
        (action) =>
          action.type !== primary.type
      ),

      ...(momentumDecision &&
      momentumDecision.type !==
        primary.type
        ? [
            {
              ...momentumDecision,
              priority:
                "secondary" as const,
            },
          ]
        : []),
    ]).slice(0, 3);

  return {
    primary,

    alternatives,

    context: {
      evidenceStrength:
        evidence.strength,

      evidenceScore:
        evidence.strengthScore,

      confidenceLevel:
        clinicalConfidence.level,

      confidenceScore:
        clinicalConfidence.score,

      momentumStatus:
        momentum.status,
    },

    generatedAt:
      engineContext.context.generatedAt,
  };
}
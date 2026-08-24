import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildHealthIntelligenceContext,
  type BuildHealthIntelligenceContextInput,
} from "@/lib/health-intelligence/context/health-intelligence-context";

import {
  buildHealthEngineContext,
} from "@/lib/health-intelligence/engines/shared/health-engine-context";

import {
  buildHealthMomentum,
  type HealthMomentumData,
} from "@/lib/health-intelligence/engines/health-momentum.engine";

import {
  buildClinicalConfidence,
} from "@/lib/health-intelligence/engines/clinical-confidence.engine";

import {
  buildEvidenceIntelligence,
} from "@/lib/health-intelligence/engines/evidence-intelligence.engine";

import {
  buildNextDecision,
} from "@/lib/health-intelligence/engines/next-decision.engine";

import type {
  ClinicalConfidenceData,
} from "@/lib/health-intelligence/engines/clinical-confidence.engine";

type AssessmentInput =
  NonNullable<
    BuildHealthIntelligenceContextInput[
      "assessments"
    ]
  >[number];

type CheckInInput =
  NonNullable<
    BuildHealthIntelligenceContextInput[
      "checkIns"
    ]
  >[number];

type ReportInput =
  NonNullable<
    BuildHealthIntelligenceContextInput[
      "reports"
    ]
  >[number];

type AnalysisInput =
  NonNullable<
    BuildHealthIntelligenceContextInput[
      "analyses"
    ]
  >[number];

function createAssessment(
  score = 72,
  id = "assessment-heart"
): AssessmentInput {
  return {
    id,

    moduleName:
      "Heart",

    score,

    status:
      "Stable",

    notes:
      null,

    createdAt:
      "2026-08-01T08:00:00.000Z",
  };
}

function createCheckIn(
  wellnessScore = 74,
  id = "checkin-current"
): CheckInInput {
  return {
    id,

    mood:
      "Good",

    energyLevel:
      null,

    stressLevel:
      null,

    sleepQuality:
      null,

    hydration:
      null,

    physicalActivity:
      null,

    wellnessScore,

    createdAt:
      "2026-08-02T08:00:00.000Z",
  };
}

function createReport(
  extractionStatus:
    string | null = "Completed",
  id = "report-1"
): ReportInput {
  return {
    id,

    fileName:
      "medical-report.pdf",

    extractionStatus,

    createdAt:
      "2026-08-03T08:00:00.000Z",
  };
}

function createAnalysis(
  status:
    string | null = "Generated",
  id = "analysis-1"
): AnalysisInput {
  return {
    id,

    reportId:
      "report-1",

    title:
      "Medical report analysis",

    status,

    createdAt:
      "2026-08-03T09:00:00.000Z",
  };
}

function buildDecisionScenario(
  overrides:
    Partial<
      BuildHealthIntelligenceContextInput
    > = {}
) {
  const context =
    buildHealthIntelligenceContext({
      userId:
        "next-decision-test-user",

      language:
        "en",

      audience:
        "patient",

      assessments:
        [],

      checkIns:
        [],

      reports:
        [],

      analyses:
        [],

      hasHealthPlan:
        false,

      hasDoctorBrief:
        false,

      ...overrides,
    });

  const engineContext =
    buildHealthEngineContext(
      context
    );

  const momentum =
    buildHealthMomentum(
      engineContext
    );

  const clinicalConfidence =
    buildClinicalConfidence(
      engineContext
    );

  const evidence =
    buildEvidenceIntelligence(
      engineContext
    );

  return {
    engineContext,
    momentum,
    clinicalConfidence,
    evidence,
  };
}

describe(
  "next decision engine scenarios",
  () => {
    it(
      "builds the health baseline when assessment evidence is missing",
      () => {
        const scenario =
          buildDecisionScenario();

        const decision =
          buildNextDecision(
            scenario
          );

        expect(
          decision.primary
        ).toMatchObject({
          type:
            "build-baseline",

          priority:
            "primary",

          urgency:
            "routine",

          href:
            "/assessment",
        });

        expect(
          decision.primary.reasonCodes
        ).toContain(
          "missing-health-baseline"
        );
      }
    );

    it(
  "requests follow-up history when an assessment exists without enough longitudinal context",
  () => {
    const scenario =
      buildDecisionScenario({
        assessments: [
          createAssessment(),
        ],
      });

    const decision =
      buildNextDecision(
        scenario
      );

    expect(
      decision.primary
    ).toMatchObject({
      type:
        "add-followup-history",

      href:
        "/checkin",

      urgency:
        "routine",
    });

    expect(
      decision.primary.reasonCodes
    ).toContain(
      "limited-followup-history"
    );
  }
);

    it(
      "requests medical evidence after assessment and Check-In are available",
      () => {
        const scenario =
          buildDecisionScenario({
            assessments: [
              createAssessment(),
            ],

            checkIns: [
              createCheckIn(),
            ],
          });

        const decision =
          buildNextDecision(
            scenario
          );

        expect(
          decision.primary
        ).toMatchObject({
          type:
            "add-medical-evidence",

          href:
            "/lab-upload",

          urgency:
            "routine",
        });

        expect(
          decision.primary.reasonCodes
        ).toContain(
          "missing-medical-evidence"
        );
      }
    );

    it(
      "requests report processing when the uploaded report is pending",
      () => {
        const scenario =
          buildDecisionScenario({
            assessments: [
              createAssessment(),
            ],

            checkIns: [
              createCheckIn(),
            ],

            reports: [
              createReport(
                "Pending"
              ),
            ],
          });

        const decision =
          buildNextDecision(
            scenario
          );

        expect(
          decision.primary
        ).toMatchObject({
          type:
            "complete-report-processing",

          href:
            "/reports",

          urgency:
            "soon",
        });

        expect(
          decision.primary.reasonCodes
        ).toContain(
          "pending-report-processing"
        );
      }
    );

    it(
      "requests report analysis when a processed report has no generated analysis",
      () => {
        const scenario =
          buildDecisionScenario({
            assessments: [
              createAssessment(),
            ],

            checkIns: [
              createCheckIn(),
            ],

            reports: [
              createReport(),
            ],
          });

        const decision =
          buildNextDecision(
            scenario
          );

        expect(
          decision.primary
        ).toMatchObject({
          type:
            "generate-analysis",

          href:
            "/reports",

          urgency:
            "soon",
        });

        expect(
          decision.primary.reasonCodes
        ).toContain(
          "missing-generated-analysis"
        );
      }
    );

    it(
      "prioritizes an evidence-building action over declining momentum",
      () => {
        const scenario =
          buildDecisionScenario();

        const decliningMomentum:
          HealthMomentumData = {
            ...scenario.momentum,

            status:
              "declining",
          };

        const decision =
          buildNextDecision({
            engineContext:
              scenario.engineContext,

            evidence:
              scenario.evidence,

            clinicalConfidence:
              scenario.clinicalConfidence,

            momentum:
              decliningMomentum,
          });

        expect(
          decision.primary.type
        ).toBe(
          "build-baseline"
        );

        expect(
          decision.alternatives.some(
            (action) =>
              action.type ===
              "review-declining-momentum"
          )
        ).toBe(
          true
        );
      }
    );

    it(
      "uses declining momentum when no evidence-building recommendation remains",
      () => {
        const scenario =
          buildDecisionScenario({
            assessments: [
              createAssessment(),
            ],

            checkIns: [
              createCheckIn(),
            ],

            reports: [
              createReport(),
            ],

            analyses: [
              createAnalysis(),
            ],
          });

        const decliningMomentum:
          HealthMomentumData = {
            ...scenario.momentum,

            status:
              "declining",
        };

        const decision =
          buildNextDecision({
            engineContext:
              scenario.engineContext,

            evidence: {
              ...scenario.evidence,

              recommendations:
                [],
            },

            clinicalConfidence:
              scenario.clinicalConfidence,

            momentum:
              decliningMomentum,
          });

        expect(
          decision.primary
        ).toMatchObject({
          type:
            "review-declining-momentum",

          priority:
            "primary",

          urgency:
            "soon",

          href:
            "/health-plan",
        });

        expect(
          decision.primary.reasonCodes
        ).toContain(
          "declining-momentum-detected"
        );
      }
    );

    it(
      "uses routine urgency for mixed momentum",
      () => {
        const scenario =
          buildDecisionScenario({
            assessments: [
              createAssessment(),
            ],

            checkIns: [
              createCheckIn(),
            ],

            reports: [
              createReport(),
            ],

            analyses: [
              createAnalysis(),
            ],
          });

        const mixedMomentum:
          HealthMomentumData = {
            ...scenario.momentum,

            status:
              "mixed",
        };

        const decision =
          buildNextDecision({
            engineContext:
              scenario.engineContext,

            evidence: {
              ...scenario.evidence,

              recommendations:
                [],
            },

            clinicalConfidence:
              scenario.clinicalConfidence,

            momentum:
              mixedMomentum,
          });

        expect(
          decision.primary
        ).toMatchObject({
          type:
            "review-declining-momentum",

          urgency:
            "routine",
        });

        expect(
          decision.primary.reasonCodes
        ).toContain(
          "mixed-momentum-detected"
        );
      }
    );

    it(
      "falls back to continuing the health plan when evidence and momentum require no action",
      () => {
        const scenario =
          buildDecisionScenario({
            assessments: [
              createAssessment(),
            ],

            checkIns: [
              createCheckIn(),
            ],

            reports: [
              createReport(),
            ],

            analyses: [
              createAnalysis(),
            ],

            hasHealthPlan:
              true,
          });

        const stableMomentum:
          HealthMomentumData = {
            ...scenario.momentum,

            status:
              "stable",
        };

        const decision =
          buildNextDecision({
            engineContext:
              scenario.engineContext,

            evidence: {
              ...scenario.evidence,

              recommendations:
                [],
            },

            clinicalConfidence:
              scenario.clinicalConfidence,

            momentum:
              stableMomentum,
          });

        expect(
          decision.primary
        ).toMatchObject({
          type:
            "continue-health-plan",

          priority:
            "primary",

          urgency:
            "routine",

          href:
            "/health-plan",
        });

        expect(
          decision.primary.reasonCodes
        ).toContain(
          "core-data-connected"
        );
      }
    );

    it(
  "starts a health plan when core intelligence is connected but no health plan exists",
  () => {
    const scenario =
      buildDecisionScenario({
        assessments: [
          createAssessment(),
        ],

        checkIns: [
          createCheckIn(),
        ],

        reports: [
          createReport(),
        ],

        analyses: [
          createAnalysis(),
        ],

        hasHealthPlan:
          false,
      });

    const stableMomentum:
      HealthMomentumData = {
      ...scenario.momentum,

      status:
        "stable",
    };

    const decision =
      buildNextDecision({
        engineContext:
          scenario.engineContext,

        evidence: {
          ...scenario.evidence,

          recommendations:
            [],
        },

        clinicalConfidence:
          scenario.clinicalConfidence,

        momentum:
          stableMomentum,
      });

    expect(
      decision.primary
    ).toMatchObject({
      type:
        "start-health-plan",

      priority:
        "primary",

      urgency:
        "routine",

      href:
        "/health-plan",
    });

    expect(
      decision.primary.reasonCodes
    ).toContain(
      "core-data-connected"
    );
  }
);

it(
  "preserves low confidence context when starting a health plan",
  () => {
    const scenario =
      buildDecisionScenario({
        assessments: [
          createAssessment(),
        ],

        checkIns: [
          createCheckIn(),
        ],

        reports: [
          createReport(),
        ],

        analyses: [
          createAnalysis(),
        ],

        hasHealthPlan:
          false,
      });

    const stableMomentum:
      HealthMomentumData = {
      ...scenario.momentum,

      status:
        "stable",
    };

    const lowConfidence:
      ClinicalConfidenceData = {
      ...scenario.clinicalConfidence,

      level:
        "low",

      score:
        30,
    };

    const decision =
      buildNextDecision({
        engineContext:
          scenario.engineContext,

        evidence: {
          ...scenario.evidence,

          recommendations:
            [],
        },

        clinicalConfidence:
          lowConfidence,

        momentum:
          stableMomentum,
      });

    expect(
      decision.primary.type
    ).toBe(
      "start-health-plan"
    );

    expect(
      decision.primary.reasonCodes
    ).toContain(
      "low-confidence-result"
    );
  }
);

    it(
      "returns unique alternatives, excludes the primary type, and limits them to three",
      () => {
        const scenario =
          buildDecisionScenario();

        const decliningMomentum:
          HealthMomentumData = {
            ...scenario.momentum,

            status:
              "declining",
        };

        const decision =
          buildNextDecision({
            engineContext:
              scenario.engineContext,

            evidence:
              scenario.evidence,

            clinicalConfidence:
              scenario.clinicalConfidence,

            momentum:
              decliningMomentum,
          });

        const alternativeKeys =
          decision.alternatives.map(
            (action) =>
              `${action.type}:${action.href}`
          );

        expect(
          decision.alternatives.length
        ).toBeLessThanOrEqual(
          3
        );

        expect(
          new Set(
            alternativeKeys
          ).size
        ).toBe(
          alternativeKeys.length
        );

        expect(
          decision.alternatives.some(
            (action) =>
              action.type ===
              decision.primary.type
          )
        ).toBe(
          false
        );
      }
    );
  }
);
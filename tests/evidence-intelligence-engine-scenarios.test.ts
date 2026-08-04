import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  buildHealthIntelligenceContext,
  type BuildHealthIntelligenceContextInput,
} from "@/lib/health-intelligence/context/health-intelligence-context";

import {
  buildHealthEngineContext,
} from "@/lib/health-intelligence/engines/shared/health-engine-context";

import {
  buildEvidenceIntelligence,
} from "@/lib/health-intelligence/engines/evidence-intelligence.engine";

const FIXED_NOW =
  new Date(
    "2026-08-04T12:00:00.000Z"
  );

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

function createAssessment({
  id,
  score,
  createdAt,
}: {
  id: string;
  score: number;
  createdAt: string;
}): AssessmentInput {
  return {
    id,

    moduleName:
      "Heart",

    score,

    status:
      score >= 80
        ? "Strong"
        : score >= 60
          ? "Stable"
          : "Needs attention",

    notes:
      null,

    createdAt,
  };
}

function createCheckIn({
  id,
  wellnessScore,
  createdAt,
}: {
  id: string;
  wellnessScore: number;
  createdAt: string;
}): CheckInInput {
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

    createdAt,
  };
}

function createReport({
  id = "report-1",
  extractionStatus = "Completed",
}: {
  id?: string;
  extractionStatus?: string | null;
} = {}): ReportInput {
  return {
    id,

    fileName:
      `${id}.pdf`,

    extractionStatus,

    createdAt:
      "2026-08-03T08:00:00.000Z",
  };
}

function createAnalysis({
  id = "analysis-1",
  reportId = "report-1",
}: {
  id?: string;
  reportId?: string | null;
} = {}): AnalysisInput {
  return {
    id,

    reportId,

    title:
      "Generated medical analysis",

    status:
      "Generated",

    createdAt:
      "2026-08-03T09:00:00.000Z",
  };
}

function buildEvidenceScenario(
  overrides:
    Partial<
      BuildHealthIntelligenceContextInput
    > = {}
) {
  const context =
    buildHealthIntelligenceContext({
      userId:
        "evidence-test-user",

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

  return buildEvidenceIntelligence(
    engineContext
  );
}

describe(
  "evidence intelligence engine scenarios",
  () => {
    beforeAll(
      () => {
        vi.useFakeTimers();

        vi.setSystemTime(
          FIXED_NOW
        );
      }
    );

    afterAll(
      () => {
        vi.useRealTimers();
      }
    );

    it(
      "returns insufficient evidence and assessment recommendation when no health data exists",
      () => {
        const evidence =
          buildEvidenceScenario();

        expect(
          evidence.strength
        ).toBe(
          "insufficient"
        );

        expect(
          evidence.strengthScore
        ).toBe(
          0
        );

        expect(
          evidence.gaps[0]?.code
        ).toBe(
          "no-health-data"
        );

        expect(
          evidence.recommendations[0]
        ).toMatchObject({
          code:
            "complete-assessment",

          priority:
            "primary",

          href:
            "/assessment",

          relatedGap:
            "no-health-data",
        });

        expect(
          evidence.contradictions
        ).toEqual([]);
      }
    );

    it(
      "identifies limited single-source evidence when only an assessment exists",
      () => {
        const evidence =
          buildEvidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-1",

                score:
                  72,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],
          });

        const gapCodes =
          evidence.gaps.map(
            (gap) =>
              gap.code
          );

        expect(
          gapCodes
        ).toContain(
          "single-source-category"
        );

        expect(
          gapCodes
        ).toContain(
          "limited-data-volume"
        );

        expect(
          gapCodes
        ).toContain(
          "no-checkin"
        );

        expect(
          gapCodes
        ).toContain(
          "no-medical-report"
        );

        expect(
          evidence.recommendations.length
        ).toBeGreaterThan(
          0
        );
      }
    );

    it(
      "recognizes connected evidence across multiple source categories",
      () => {
        const evidence =
          buildEvidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-1",

                score:
                  76,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],

            checkIns: [
              createCheckIn({
                id:
                  "checkin-1",

                wellnessScore:
                  75,

                createdAt:
                  "2026-08-02T08:00:00.000Z",
              }),
            ],

            reports: [
              createReport(),
            ],

            analyses: [
              createAnalysis(),
            ],
          });

        const reasonCodes =
          evidence.reasons.map(
            (reason) =>
              reason.code
          );

        const gapCodes =
          evidence.gaps.map(
            (gap) =>
              gap.code
          );

        expect(
          reasonCodes
        ).toContain(
          "multiple-source-categories"
        );

        expect(
          gapCodes
        ).not.toContain(
          "single-source-category"
        );

        expect(
          evidence.strengthScore
        ).toBeGreaterThan(
          0
        );
      }
    );

    it(
      "detects opposing assessment and Check-In directions",
      () => {
        const evidence =
          buildEvidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-old",

                score:
                  55,

                createdAt:
                  "2026-07-01T08:00:00.000Z",
              }),

              createAssessment({
                id:
                  "assessment-new",

                score:
                  75,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],

            checkIns: [
              createCheckIn({
                id:
                  "checkin-old",

                wellnessScore:
                  80,

                createdAt:
                  "2026-07-02T08:00:00.000Z",
              }),

              createCheckIn({
                id:
                  "checkin-new",

                wellnessScore:
                  60,

                createdAt:
                  "2026-08-02T08:00:00.000Z",
              }),
            ],

            reports: [
              createReport(),
            ],

            analyses: [
              createAnalysis(),
            ],
          });

        expect(
          evidence.contradictions.some(
            (contradiction) =>
              contradiction.code ===
              "assessment-improving-checkin-declining"
          )
        ).toBe(
          true
        );

        expect(
          evidence.summary
            .contradictionCount
        ).toBeGreaterThan(
          0
        );
      }
    );

    it(
      "reduces evidence strength when equivalent evidence contains a contradiction",
      () => {
        const alignedEvidence =
          buildEvidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-old",

                score:
                  55,

                createdAt:
                  "2026-07-01T08:00:00.000Z",
              }),

              createAssessment({
                id:
                  "assessment-new",

                score:
                  75,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],

            checkIns: [
              createCheckIn({
                id:
                  "checkin-old",

                wellnessScore:
                  55,

                createdAt:
                  "2026-07-02T08:00:00.000Z",
              }),

              createCheckIn({
                id:
                  "checkin-new",

                wellnessScore:
                  75,

                createdAt:
                  "2026-08-02T08:00:00.000Z",
              }),
            ],

            reports: [
              createReport(),
            ],

            analyses: [
              createAnalysis(),
            ],
          });

        const contradictoryEvidence =
          buildEvidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-old",

                score:
                  55,

                createdAt:
                  "2026-07-01T08:00:00.000Z",
              }),

              createAssessment({
                id:
                  "assessment-new",

                score:
                  75,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],

            checkIns: [
              createCheckIn({
                id:
                  "checkin-old",

                wellnessScore:
                  80,

                createdAt:
                  "2026-07-02T08:00:00.000Z",
              }),

              createCheckIn({
                id:
                  "checkin-new",

                wellnessScore:
                  60,

                createdAt:
                  "2026-08-02T08:00:00.000Z",
              }),
            ],

            reports: [
              createReport(),
            ],

            analyses: [
              createAnalysis(),
            ],
          });

        expect(
          contradictoryEvidence
            .contradictions.length
        ).toBeGreaterThan(
          alignedEvidence
            .contradictions.length
        );

        expect(
          contradictoryEvidence
            .strengthScore
        ).toBeLessThan(
          alignedEvidence
            .strengthScore
        );
      }
    );

    it(
      "keeps recommendations unique and marks the first recommendation as primary",
      () => {
        const evidence =
          buildEvidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-1",

                score:
                  72,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],
          });

        const recommendationCodes =
          evidence.recommendations.map(
            (recommendation) =>
              recommendation.code
          );

        expect(
          new Set(
            recommendationCodes
          ).size
        ).toBe(
          recommendationCodes.length
        );

        expect(
          evidence.recommendations[0]
            ?.priority
        ).toBe(
          "primary"
        );

        expect(
          evidence.recommendations
            .slice(1)
            .every(
              (recommendation) =>
                recommendation.priority ===
                "secondary"
            )
        ).toBe(
          true
        );
      }
    );

    it(
      "keeps the summary synchronized with evidence collections",
      () => {
        const evidence =
          buildEvidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-1",

                score:
                  72,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],

            checkIns: [
              createCheckIn({
                id:
                  "checkin-1",

                wellnessScore:
                  74,

                createdAt:
                  "2026-08-02T08:00:00.000Z",
              }),
            ],
          });

        expect(
          evidence.summary.reasonCount
        ).toBe(
          evidence.reasons.length
        );

        expect(
          evidence.summary.gapCount
        ).toBe(
          evidence.gaps.length
        );

        expect(
          evidence.summary
            .contradictionCount
        ).toBe(
          evidence.contradictions.length
        );

        expect(
          evidence.summary
            .recommendationCount
        ).toBe(
          evidence.recommendations.length
        );

        expect(
          evidence.summary.primaryGap
        ).toBe(
          evidence.gaps[0]?.code ??
            null
        );

        expect(
          evidence.summary
            .primaryRecommendation
        ).toBe(
          evidence.recommendations[0]
            ?.code ??
            null
        );

        expect(
          evidence.summary
            .primaryStrength
        ).toBe(
          evidence.reasons[0]?.code ??
            null
        );
      }
    );
  }
);
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
  buildClinicalConfidence,
} from "@/lib/health-intelligence/engines/clinical-confidence.engine";

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

function createReport(
  id =
    "report-1"
): ReportInput {
  return {
    id,

    fileName:
      `${id}.pdf`,

    extractionStatus:
      "Completed",

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

function buildConfidenceScenario(
  overrides:
    Partial<
      BuildHealthIntelligenceContextInput
    > = {}
) {
  const context =
    buildHealthIntelligenceContext({
      userId:
        "clinical-confidence-test-user",

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

  return buildClinicalConfidence(
    engineContext
  );
}

describe(
  "clinical confidence engine scenarios",
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
      "returns zero low confidence when no health data exists",
      () => {
        const confidence =
          buildConfidenceScenario();

        expect(
          confidence.score
        ).toBe(
          0
        );

        expect(
          confidence.level
        ).toBe(
          "low"
        );

        expect(
          confidence.strengths
        ).toEqual([]);

        expect(
          confidence.limitations
        ).toEqual([
          "no-health-data",
        ]);

        expect(
          confidence.comparableSourceCount
        ).toBe(
          0
        );
      }
    );

    it(
      "identifies all major limitations when only one assessment exists",
      () => {
        const confidence =
          buildConfidenceScenario({
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

        expect(
          confidence.level
        ).toBe(
          "low"
        );

        expect(
          confidence.limitations
        ).toEqual(
          expect.arrayContaining([
            "single-source-category",
            "limited-data-volume",
            "no-comparable-history",
            "no-medical-report",
            "no-generated-analysis",
          ])
        );

        expect(
          confidence.strengths
        ).not.toContain(
          "multiple-source-categories"
        );
      }
    );

    it(
      "increases confidence when a second source category is connected",
      () => {
        const assessmentOnly =
          buildConfidenceScenario({
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

        const connected =
          buildConfidenceScenario({
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
          connected.score
        ).toBeGreaterThan(
          assessmentOnly.score
        );

        expect(
          connected.strengths
        ).toContain(
          "multiple-source-categories"
        );

        expect(
          connected.limitations
        ).not.toContain(
          "single-source-category"
        );
      }
    );

    it(
      "recognizes report and generated analysis as confidence strengths",
      () => {
        const confidence =
          buildConfidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-1",

                score:
                  75,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],

            checkIns: [
              createCheckIn({
                id:
                  "checkin-1",

                wellnessScore:
                  76,

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
          confidence.strengths
        ).toEqual(
          expect.arrayContaining([
            "multiple-source-categories",
            "medical-report-available",
            "generated-analysis-available",
          ])
        );

        expect(
          confidence.limitations
        ).not.toContain(
          "no-medical-report"
        );

        expect(
          confidence.limitations
        ).not.toContain(
          "no-generated-analysis"
        );
      }
    );

    it(
      "recognizes sufficient data volume when at least five data points exist",
      () => {
        const confidence =
          buildConfidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-1",

                score:
                  70,

                createdAt:
                  "2026-07-01T08:00:00.000Z",
              }),

              createAssessment({
                id:
                  "assessment-2",

                score:
                  74,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],

            checkIns: [
              createCheckIn({
                id:
                  "checkin-1",

                wellnessScore:
                  71,

                createdAt:
                  "2026-07-02T08:00:00.000Z",
              }),

              createCheckIn({
                id:
                  "checkin-2",

                wellnessScore:
                  75,

                createdAt:
                  "2026-08-02T08:00:00.000Z",
              }),
            ],

            reports: [
              createReport(),
            ],
          });

        expect(
          confidence.strengths
        ).toContain(
          "sufficient-data-volume"
        );

        expect(
          confidence.limitations
        ).not.toContain(
          "limited-data-volume"
        );
      }
    );

    it(
      "recognizes comparable history from repeated assessments and Check-Ins",
      () => {
        const confidence =
          buildConfidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-old",

                score:
                  68,

                createdAt:
                  "2026-07-01T08:00:00.000Z",
              }),

              createAssessment({
                id:
                  "assessment-new",

                score:
                  74,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],

            checkIns: [
              createCheckIn({
                id:
                  "checkin-old",

                wellnessScore:
                  69,

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
          });

        expect(
          confidence.comparableSourceCount
        ).toBeGreaterThan(
          0
        );

        expect(
          confidence.strengths
        ).toContain(
          "comparable-history-available"
        );

        expect(
          confidence.limitations
        ).not.toContain(
          "no-comparable-history"
        );
      }
    );

    it(
  "does not present high confidence when evidence maturity is only connected",
  () => {
    const confidence =
      buildConfidenceScenario({
        assessments: [
          createAssessment({
            id:
              "assessment-old",

            score:
              72,

            createdAt:
              "2026-07-01T08:00:00.000Z",
          }),

          createAssessment({
            id:
              "assessment-new",

            score:
              78,

            createdAt:
              "2026-08-01T08:00:00.000Z",
          }),
        ],

        checkIns: [
          createCheckIn({
            id:
              "checkin-old",

            wellnessScore:
              70,

            createdAt:
              "2026-07-02T08:00:00.000Z",
          }),

          createCheckIn({
            id:
              "checkin-new",

            wellnessScore:
              76,

            createdAt:
              "2026-08-02T08:00:00.000Z",
          }),
        ],

        reports: [
          createReport(),
        ],

        analyses: [],
      });

    expect(
      confidence.evidenceMaturity
    ).toBe(
      "connected"
    );

    expect(
      confidence.level
    ).not.toBe(
      "high"
    );
  }
);

    it(
      "reaches high confidence with complete connected evidence and comparable history",
      () => {
        const confidence =
          buildConfidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-old",

                score:
                  78,

                createdAt:
                  "2026-07-01T08:00:00.000Z",
              }),

              createAssessment({
                id:
                  "assessment-new",

                score:
                  84,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],

            checkIns: [
              createCheckIn({
                id:
                  "checkin-old",

                wellnessScore:
                  79,

                createdAt:
                  "2026-07-02T08:00:00.000Z",
              }),

              createCheckIn({
                id:
                  "checkin-new",

                wellnessScore:
                  85,

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
          confidence.level
        ).toBe(
          "high"
        );

        expect(
          confidence.score
        ).toBeGreaterThanOrEqual(
          75
        );

        expect(
          confidence.strengths
        ).toEqual(
          expect.arrayContaining([
            "multiple-source-categories",
            "sufficient-data-volume",
            "comparable-history-available",
            "medical-report-available",
            "generated-analysis-available",
          ])
        );
      }
    );

    it(
      "keeps factors internally consistent with the final confidence score",
      () => {
        const confidence =
          buildConfidenceScenario({
            assessments: [
              createAssessment({
                id:
                  "assessment-1",

                score:
                  75,

                createdAt:
                  "2026-08-01T08:00:00.000Z",
              }),
            ],

            checkIns: [
              createCheckIn({
                id:
                  "checkin-1",

                wellnessScore:
                  76,

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

        const factorTotal =
          confidence.factors.reduce(
            (
              total,
              factor
            ) =>
              total +
              factor.scoreContribution,
            0
          );

        expect(
          confidence.factors.map(
            (factor) =>
              factor.category
          )
        ).toEqual([
          "source-coverage",
          "data-volume",
          "history",
        ]);

        expect(
          confidence.factors.every(
            (factor) =>
              factor.scoreContribution >=
                0 &&
              factor.scoreContribution <=
                factor.maximumContribution
          )
        ).toBe(
          true
        );

        expect(
          confidence.score
        ).toBe(
          Math.min(
            100,
            factorTotal
          )
        );
      }
    );
  }
);
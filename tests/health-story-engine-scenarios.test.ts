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
  buildHealthStory,
} from "@/lib/health-intelligence/engines/health-story.engine";

const FIXED_NOW =
  new Date(
    "2026-08-04T12:00:00.000Z"
  );

function buildStory(
  overrides:
    Partial<
      BuildHealthIntelligenceContextInput
    > = {}
) {
  const context =
    buildHealthIntelligenceContext({
      userId:
        "health-story-test-user",

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

  return buildHealthStory(
    engineContext
  );
}

function createAssessment(
  score:
    number,
  id =
    "assessment-heart"
) {
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

    createdAt:
      "2026-08-01T08:00:00.000Z",
  };
}

function createCheckIn(
  wellnessScore:
    number,
  id =
    "checkin-current"
) {
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
  id =
    "report-1"
) {
  return {
    id,

    fileName:
      "medical-report.pdf",

    extractionStatus:
      "Completed",

    createdAt:
      "2026-08-03T08:00:00.000Z",
  };
}

function createAnalysis(
  id =
    "analysis-1"
) {
  return {
    id,

    reportId:
      "report-1",

    title:
      "Generated report analysis",

    status:
      "Generated",

    createdAt:
      "2026-08-03T09:00:00.000Z",
  };
}

describe(
  "health story engine scenarios",
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
      "returns insufficient-data and routes a new user to assessment",
      () => {
        const story =
          buildStory();

        expect(
          story.tone
        ).toBe(
          "insufficient-data"
        );

        expect(
          story.confidence
        ).toBe(
          "low"
        );

        expect(
          story.confidenceScore
        ).toBe(
          0
        );

        expect(
          story.nextDecision.href
        ).toBe(
          "/assessment"
        );

        expect(
          story.priorityMessage
        ).toBeNull();

       expect(
  story.supportingSignals
).toEqual([
  "This story is based on 0 health data points across 0 connected source categories.",
]);
      }
    );

    it(
      "returns attention tone for a low health score",
      () => {
        const story =
          buildStory({
            assessments: [
              createAssessment(
                45
              ),
            ],
          });

        expect(
          story.tone
        ).toBe(
          "attention"
        );

        expect(
          story.priorityMessage
        ).not.toBeNull();

        expect(
          story.nextDecision.href
        ).toBe(
          "/checkin"
        );
      }
    );

    it(
      "returns stable tone for a score from 60 to 79",
      () => {
        const story =
          buildStory({
            assessments: [
              createAssessment(
                70
              ),
            ],
          });

        expect(
          story.tone
        ).toBe(
          "stable"
        );

        expect(
          story.nextDecision.href
        ).toBe(
          "/checkin"
        );
      }
    );

    it(
      "returns positive tone for a score of 80 or higher",
      () => {
        const story =
          buildStory({
            assessments: [
              createAssessment(
                88
              ),
            ],
          });

        expect(
          story.tone
        ).toBe(
          "positive"
        );

        expect(
          story.strongestMessage
        ).not.toBeNull();
      }
    );

    it(
      "returns low confidence with one source and one data point",
      () => {
        const story =
          buildStory({
            assessments: [
              createAssessment(
                72
              ),
            ],
          });

        expect(
          story.confidenceScore
        ).toBe(
          19
        );

        expect(
          story.confidence
        ).toBe(
          "low"
        );
      }
    );

    it(
      "returns moderate confidence when three source categories are connected",
      () => {
        const story =
          buildStory({
            assessments: [
              createAssessment(
                72
              ),
            ],

            checkIns: [
              createCheckIn(
                74
              ),
            ],

            reports: [
              createReport(),
            ],
          });

        expect(
          story.confidenceScore
        ).toBe(
          57
        );

        expect(
          story.confidence
        ).toBe(
          "moderate"
        );
      }
    );

    it(
      "returns high confidence when all four source categories are connected",
      () => {
        const story =
          buildStory({
            assessments: [
              createAssessment(
                82
              ),
            ],

            checkIns: [
              createCheckIn(
                84
              ),
            ],

            reports: [
              createReport(),
            ],

            analyses: [
              createAnalysis(),
            ],
          });

        expect(
          story.confidenceScore
        ).toBe(
          76
        );

        expect(
          story.confidence
        ).toBe(
          "high"
        );
      }
    );

    it(
      "routes to Check-In after an assessment is available",
      () => {
        const story =
          buildStory({
            assessments: [
              createAssessment(
                72
              ),
            ],
          });

        expect(
          story.nextDecision.href
        ).toBe(
          "/checkin"
        );
      }
    );

    it(
      "routes to report upload after assessment and Check-In are available",
      () => {
        const story =
          buildStory({
            assessments: [
              createAssessment(
                72
              ),
            ],

            checkIns: [
              createCheckIn(
                74
              ),
            ],
          });

        expect(
          story.nextDecision.href
        ).toBe(
          "/lab-upload"
        );
      }
    );
  }
);
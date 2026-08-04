import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/lib/services/shared/patient-summary.service",
  () => ({
    getPatientSummary:
      vi.fn(),
  })
);

import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import {
  buildHealthRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder";

import {
  buildUnifiedIntelligenceExperienceContext,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.builder";

import {
  buildHealthPlanViewModel,
} from "@/lib/services/health-plan/health-plan-view.service";

import {
  buildAssistantHealthContext,
} from "@/lib/health-intelligence/application/assistant-health-context.builder";

import {
  createPatientSummaryFixture,
} from "@/tests/fixtures/patient-summary.fixture";

import type {
  PatientSummary,
} from "@/lib/models/patient";

const FIXED_NOW =
  new Date(
    "2026-08-04T12:00:00.000Z"
  );

function createAssessment():
  PatientSummary["assessments"][number] {
  return {
    organ_name:
      "Heart",

    score:
      72,

    risk_level:
      "Stable",

    notes:
      "Stable cardiovascular assessment.",

    created_at:
      "2026-08-01T08:00:00.000Z",
  };
}

function createCheckIn():
  NonNullable<
    PatientSummary["latestCheckIn"]
  > {
  return {
    mood:
      "Good",

    wellness_score:
      75,

    created_at:
      "2026-08-02T08:00:00.000Z",
  };
}

async function buildDecisionPipeline(
  patient:
    PatientSummary,
  userId:
    string
) {
  const intelligence =
    buildHealthIntelligence(
      patient
    );

  const runtime =
    await buildHealthRuntime({
      userId,

      patient,

      language:
        "en",

      audience:
        "patient",

      hasHealthPlan:
        false,

      hasDoctorBrief:
        false,
    });

  const unifiedResult =
    buildUnifiedIntelligenceExperienceContext({
      patientSummary:
        patient,

      intelligence,

      runtime,
    });

  if (
    unifiedResult.status !==
    "ready"
  ) {
    throw new Error(
      `Expected a ready unified experience, received: ${unifiedResult.unavailableReason}`
    );
  }

  const unifiedExperience =
    unifiedResult.experience;

  const healthPlanView =
    buildHealthPlanViewModel({
      unifiedExperience,

      recommendations:
        intelligence.recommendations,

      healthScore:
        intelligence.healthScore,

      language:
        "en",
    });

  const assistantContext =
    buildAssistantHealthContext({
      patientSummary:
        patient,

      intelligence,

      runtime,

      doctorBrief:
        null,

      latestReportContext:
        null,
    });

  return {
    intelligence,
    runtime,
    unifiedExperience,
    healthPlanView,
    assistantContext,
  };
}

describe(
  "unified decision consistency regression",
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
      "keeps the baseline action synchronized for a new patient",
      async () => {
        const patient =
          createPatientSummaryFixture();

        const {
          intelligence,
          unifiedExperience,
          healthPlanView,
          assistantContext,
        } =
          await buildDecisionPipeline(
            patient,
            "new-patient-decision-user"
          );

        const recommendationAction =
          intelligence.recommendations
            .data.primaryAction;

        expect(
          unifiedExperience
            .primaryAction.id
        ).toBe(
          recommendationAction.id
        );

        expect(
          unifiedExperience
            .primaryAction.title
        ).toBe(
          recommendationAction.title
        );

        expect(
          unifiedExperience
            .primaryAction.description
        ).toBe(
          recommendationAction.description
        );

        expect(
          unifiedExperience
            .primaryAction.href
        ).toBe(
          recommendationAction.href
        );

        expect(
          unifiedExperience
            .primaryAction.priority
        ).toBe(
          recommendationAction.priority
        );

        expect(
          healthPlanView.nextAction
        ).toMatchObject({
          title:
            recommendationAction.title,

          detail:
            recommendationAction.description,

          href:
            recommendationAction.href,

          priority:
            recommendationAction.priority,
        });

        expect(
          healthPlanView.todaysMission
            .primaryAction
        ).toBe(
          recommendationAction.description ||
            recommendationAction.title
        );

        expect(
          assistantContext
            .recommendation
        ).toBe(
          recommendationAction.description ||
            recommendationAction.title ||
            null
        );

        expect(
          assistantContext
            .unifiedExperience
            ?.primaryAction.id
        ).toBe(
          recommendationAction.id
        );

        expect(
          assistantContext
            .unifiedExperience
            ?.primaryAction.href
        ).toBe(
          recommendationAction.href
        );
      }
    );

    it(
      "keeps the next action synchronized when assessment and Check-In data are available",
      async () => {
        const latestCheckIn =
          createCheckIn();

        const patient =
          createPatientSummaryFixture({
            assessments: [
              createAssessment(),
            ],

            latestCheckIn,

            recentCheckIns: [
              latestCheckIn,
            ],
          });

        const {
          intelligence,
          unifiedExperience,
          healthPlanView,
          assistantContext,
        } =
          await buildDecisionPipeline(
            patient,
            "connected-decision-user"
          );

        const recommendationAction =
          intelligence.recommendations
            .data.primaryAction;

        expect(
          unifiedExperience
            .primaryAction
        ).toMatchObject({
          id:
            recommendationAction.id,

          title:
            recommendationAction.title,

          description:
            recommendationAction.description,

          href:
            recommendationAction.href,

          category:
            recommendationAction.category,

          priority:
            recommendationAction.priority,

          score:
            recommendationAction.score,
        });

        expect(
          unifiedExperience
            .primaryAction.reasons
        ).toEqual(
          recommendationAction.reasons
        );

        expect(
          healthPlanView.nextAction
            .title
        ).toBe(
          unifiedExperience
            .primaryAction.title
        );

        expect(
          healthPlanView.nextAction
            .detail
        ).toBe(
          unifiedExperience
            .primaryAction.description
        );

        expect(
          healthPlanView.nextAction
            .href
        ).toBe(
          unifiedExperience
            .primaryAction.href
        );

        expect(
          healthPlanView.nextAction
            .priority
        ).toBe(
          unifiedExperience
            .primaryAction.priority
        );

        expect(
          assistantContext
            .recommendation
        ).toBe(
          healthPlanView
            .todaysMission
            .primaryAction
        );

        expect(
          assistantContext
            .unifiedExperience
            ?.primaryAction
        ).toEqual(
          unifiedExperience
            .primaryAction
        );

        expect(
          healthPlanView
            .nextReviewDays
        ).toBe(
          unifiedExperience
            .review.nextReviewDays
        );

        expect(
          healthPlanView
            .healthScore.score
        ).toBe(
          unifiedExperience
            .healthScore.score
        );

        expect(
          assistantContext
            .overallScore
        ).toBe(
          unifiedExperience
            .healthScore.score
        );
      }
    );
  }
);
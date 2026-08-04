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

import type {
  HealthIntelligenceRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime";

import {
  buildUnifiedIntelligenceExperienceContext,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.builder";

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
      78,

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
      80,

    created_at:
      "2026-08-02T08:00:00.000Z",
  };
}

function createReport():
  PatientSummary["uploadedReports"][number] {
  return {
    id:
      1,

    file_name:
      "connected-health-report.pdf",

    file_path:
      "/reports/connected-health-report.pdf",

    report_type:
      "Laboratory",

    extraction_status:
      "Completed",

    extracted_text:
      "Structured laboratory report content.",

    created_at:
      "2026-08-03T08:00:00.000Z",

    extracted_at:
      "2026-08-03T08:05:00.000Z",
  };
}

function createInsight():
  PatientSummary["healthInsights"][number] {
  return {
    id:
      1,

    report_id:
      1,

    insight_title:
      "Connected health analysis",

    summary:
      "The report has been analyzed and connected with the current health context.",

    key_findings:
      "No critical findings were identified.",

    recommendations:
      "Continue routine health follow-up.",

    doctor_brief:
      "Stable current health context with routine follow-up recommended.",

    ai_status:
      "Generated",

    risk_level:
      "Stable",

    next_best_action:
      "Continue the current health plan.",

    report_type:
      "Laboratory",

    created_at:
      "2026-08-03T09:00:00.000Z",
  };
}

function createGeneratedResult():
  PatientSummary["generatedResults"][number] {
  return {
    insight_id:
      1,

    report_id:
      1,

    updated_at:
      "2026-08-03T09:05:00.000Z",
  };
}

describe(
  "unified intelligence experience context integration",
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
      "builds a ready unified experience for a new patient with no health data",
      async () => {
        const patient =
          createPatientSummaryFixture();

        const intelligence =
          buildHealthIntelligence(
            patient
          );

        const runtime =
          await buildHealthRuntime({
            userId:
              "new-patient-user",

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

        const result =
          buildUnifiedIntelligenceExperienceContext({
            patientSummary:
              patient,

            intelligence,

            runtime,
          });

        expect(
          result.status
        ).toBe(
          "ready"
        );

        expect(
          result.unavailableReason
        ).toBeNull();

        expect(
          result.experience
        ).not.toBeNull();

        expect(
          runtime.modules.story.status
        ).toBe(
          "ready"
        );

        expect(
          runtime.modules.story.data
        ).not.toBeNull();

        if (
          result.status !==
            "ready" ||
          !runtime.modules.story.data
        ) {
          throw new Error(
            "Expected a ready unified experience and a ready health story."
          );
        }

        expect(
          result.experience.story
            .nextDecision
        ).toEqual(
          runtime.modules.story.data
            .nextDecision
        );

        expect(
          result.experience.story.tone
        ).toBe(
          runtime.modules.story.data
            .tone
        );

        expect(
          result.experience.decision
            .layer
        ).toBe(
          intelligence.recommendations
            .data.decisionLayer
        );

        expect(
          result.experience.decision
            .reason
        ).toBe(
          intelligence.recommendations
            .data.decisionReason
        );

        expect(
          result.experience.primaryAction
            .id
        ).toBe(
          intelligence.recommendations
            .data.primaryAction.id
        );

        expect(
          result.experience.healthScore
            .score
        ).toBe(
          intelligence.healthScore.data
            .score
        );
      }
    );

    it(
      "keeps intelligence, runtime story, journey, clinical context, and primary action synchronized for connected patient data",
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

            uploadedReports: [
              createReport(),
            ],

            healthInsights: [
              createInsight(),
            ],

            generatedResults: [
              createGeneratedResult(),
            ],
          });

        const intelligence =
          buildHealthIntelligence(
            patient
          );

        const runtime =
          await buildHealthRuntime({
            userId:
              "connected-patient-user",

            patient,

            language:
              "en",

            audience:
              "patient",

            hasHealthPlan:
              true,

            hasDoctorBrief:
              true,
          });

        const result =
          buildUnifiedIntelligenceExperienceContext({
            patientSummary:
              patient,

            intelligence,

            runtime,
          });

        expect(
          result.status
        ).toBe(
          "ready"
        );

        expect(
          runtime.readyModuleCount
        ).toBeGreaterThan(
          0
        );

        expect(
          runtime.errorModuleCount
        ).toBe(
          0
        );

        if (
          result.status !==
            "ready" ||
          !runtime.modules.story.data
        ) {
          throw new Error(
            "Expected connected patient data to produce a ready unified experience."
          );
        }

        const experience =
          result.experience;

        const runtimeStory =
          runtime.modules.story.data;

        const primaryAction =
          intelligence.recommendations
            .data.primaryAction;

        expect(
          experience.generatedAt
        ).toBe(
          intelligence.recommendations
            .generatedAt
        );

        expect(
          experience.status
        ).toBe(
          intelligence.recommendations
            .status
        );

        expect(
          experience.story.headline
        ).toBe(
          runtimeStory.headline
        );

        expect(
          experience.story.narrative
        ).toBe(
          runtimeStory.narrative
        );

        expect(
          experience.story
            .confidenceScore
        ).toBe(
          runtimeStory.confidenceScore
        );

        expect(
          experience.story
            .supportingSignals
        ).toEqual(
          runtimeStory.supportingSignals
        );

        expect(
          experience.decision
        ).toEqual({
          layer:
            intelligence.recommendations
              .data.decisionLayer,

          reason:
            intelligence.recommendations
              .data.decisionReason,
        });

        expect(
          experience.primaryAction
        ).toMatchObject({
          id:
            primaryAction.id,

          title:
            primaryAction.title,

          description:
            primaryAction.description,

          href:
            primaryAction.href,

          category:
            primaryAction.category,

          priority:
            primaryAction.priority,

          score:
            primaryAction.score,
        });

        expect(
          experience.primaryAction
            .reasons
        ).toEqual(
          primaryAction.reasons
        );

        expect(
          experience.healthScore
        ).toMatchObject({
          score:
            intelligence.healthScore
              .data.score,

          level:
            intelligence.healthScore
              .data.level,

          confidence:
            intelligence.healthScore
              .confidence,

          dataCompleteness:
            intelligence.healthScore
              .data.dataCompleteness,

          summary:
            intelligence.healthScore
              .data.summary,
        });

        expect(
          experience.review
            .nextReviewDays
        ).toBe(
          intelligence.recommendations
            .data.nextReviewDays
        );

        expect(
          experience.journey
            .followUpStatus
        ).toBeDefined();

        expect(
          experience.clinical
            .canConfirmClinicalDirection
        ).toBe(
          false
        );

        expect(
          Array.isArray(
            experience.clinical
              .limitations
          )
        ).toBe(
          true
        );
      }
    );

    it(
      "returns unavailable when the runtime health story is missing",
      async () => {
        const patient =
          createPatientSummaryFixture();

        const intelligence =
          buildHealthIntelligence(
            patient
          );

        const runtime =
          await buildHealthRuntime({
            userId:
              "missing-story-user",

            patient,

            language:
              "en",

            audience:
              "patient",
          });

        const runtimeWithoutStory = {
          ...runtime,

          modules: {
            ...runtime.modules,

            story: {
              status:
                "unavailable" as const,

              data:
                null,

              error:
                null,
            },
          },

          readyModuleCount:
            Math.max(
              0,
              runtime.readyModuleCount -
                1
            ),

          unavailableModuleCount:
            runtime.unavailableModuleCount +
            1,
        } satisfies HealthIntelligenceRuntime;

        const result =
          buildUnifiedIntelligenceExperienceContext({
            patientSummary:
              patient,

            intelligence,

            runtime:
              runtimeWithoutStory,
          });

        expect(
          result
        ).toEqual({
          status:
            "unavailable",

          experience:
            null,

          unavailableReason:
            "health_story_unavailable",
        });
      }
    );
  }
);
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
  buildAssistantHealthContext,
} from "@/lib/health-intelligence/application/assistant-health-context.builder";

import type {
  AssistantLatestReportContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

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
      "assistant-context-report.pdf",

    file_path:
      "/reports/assistant-context-report.pdf",

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
      "Connected assistant health analysis",

    summary:
      "The report was analyzed and connected with the patient's current health context.",

    key_findings:
      "No critical findings were identified.",

    recommendations:
      "Continue routine follow-up.",

    doctor_brief:
      "Stable health context with routine follow-up recommended.",

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

function createLatestReportContext():
  AssistantLatestReportContext {
  return {
    reportId:
      1,

    fileName:
      "assistant-context-report.pdf",

    reportType:
      "Laboratory",

    uploadedAt:
      "2026-08-03T08:00:00.000Z",

    summary:
      "The report was analyzed and connected with the patient's current health context.",

    keyFindings:
      "No critical findings were identified.",

    recommendations:
      "Continue routine follow-up.",

    doctorBrief:
      "Stable health context with routine follow-up recommended.",

    nextBestAction:
      "Continue the current health plan.",

        riskLevel:
      "Stable",

    reportEvidence: [
      {
        marker:
          "LDL",

        value:
          174,

        unit:
          "mg/dL",
      },
    ],
  };
}

describe(
  "assistant health context integration",
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
      "builds a synchronized assistant context for a new patient",
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
              "assistant-new-user",

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

        const context =
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

        expect(
          context.overallScore
        ).toBe(
          intelligence.healthScore.data
            .score
        );

        expect(
          context.healthScore
        ).toEqual({
          score:
            intelligence.healthScore.data
              .score,

          level:
            intelligence.healthScore.data
              .level,

          confidence:
            intelligence.healthScore
              .confidence,

          dataCompleteness:
            intelligence.healthScore.data
              .dataCompleteness,
        });

        expect(
          context.priorityOrgan
        ).toBe(
          intelligence.priority.data
            .priorityOrgan
        );

        expect(
          context.strongestOrgan
        ).toBe(
          intelligence.intelligenceOverview
            .data.strongestOrgan
        );

        expect(
          context.dailyCheckInScore
        ).toBeNull();

        expect(
          context.dailyMood
        ).toBeNull();

        expect(
          context.latestReportContext
        ).toBeNull();

        expect(
          context.patientJourney
        ).toBeDefined();

        expect(
          context.patientJourneyEvents
        ).toEqual([]);

        expect(
          context.clinicalContext
        ).toBeDefined();

        expect(
          context.clinicalContext
            ?.direction
            .canConfirmClinicalDirection
        ).toBe(
          false
        );

        expect(
          runtime.modules.story.data
        ).not.toBeNull();

        expect(
          context.unifiedExperience
        ).not.toBeNull();

        if (
          !runtime.modules.story.data ||
          !context.unifiedExperience
        ) {
          throw new Error(
            "Expected the assistant context to contain the runtime story and unified experience."
          );
        }

        expect(
          context.unifiedExperience.story
            .headline
        ).toBe(
          runtime.modules.story.data
            .headline
        );

        expect(
          context.unifiedExperience.story
            .nextDecision
        ).toEqual(
          runtime.modules.story.data
            .nextDecision
        );

        expect(
          context.unifiedExperience
            .primaryAction.id
        ).toBe(
          intelligence.recommendations
            .data.primaryAction.id
        );
      }
    );

    it(
      "keeps connected patient intelligence, report context, journey and unified experience aligned",
      async () => {
        const latestCheckIn =
          createCheckIn();

        const latestReportContext =
          createLatestReportContext();

        const doctorBrief =
          "Stable health context with routine follow-up recommended.";

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
              "assistant-connected-user",

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

        const context =
          buildAssistantHealthContext({
            patientSummary:
              patient,

            intelligence,

            runtime,

            doctorBrief,

            latestReportContext,
          });

        const primaryAction =
          intelligence.recommendations.data
            .primaryAction;

        expect(
          context.overallScore
        ).toBe(
          intelligence.healthScore.data
            .score
        );

        expect(
          context.dailyCheckInScore
        ).toBe(
          latestCheckIn.wellness_score
        );

        expect(
          context.dailyMood
        ).toBe(
          latestCheckIn.mood
        );

        expect(
          context.doctorBrief
        ).toBe(
          doctorBrief
        );

        expect(
          context.latestReportContext
        ).toEqual(
          latestReportContext
        );

        expect(
          context.riskPattern
        ).toBe(
          intelligence.doctorBrief.data
            .riskPattern
        );

        expect(
          context.recommendation
        ).toBe(
          primaryAction.description ||
            primaryAction.title ||
            null
        );

        expect(
          context.healthEngine
        ).toBe(
          intelligence
        );

        expect(
          context.patientJourney
        ).toBeDefined();

        expect(
          context.patientJourneyEvents
            ?.length
        ).toBeGreaterThan(
          0
        );

        expect(
          context.clinicalContext
        ).toBeDefined();

        expect(
          context.unifiedExperience
        ).not.toBeNull();

        expect(
          runtime.modules.story.data
        ).not.toBeNull();

        if (
          !context.unifiedExperience ||
          !runtime.modules.story.data
        ) {
          throw new Error(
            "Expected connected patient data to produce a unified assistant experience."
          );
        }

        expect(
          context.unifiedExperience.story
            .headline
        ).toBe(
          runtime.modules.story.data
            .headline
        );

        expect(
          context.unifiedExperience.story
            .confidenceScore
        ).toBe(
          runtime.modules.story.data
            .confidenceScore
        );

        expect(
          context.unifiedExperience
            .primaryAction
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
          context.unifiedExperience
            .healthScore.score
        ).toBe(
          context.overallScore
        );

        expect(
          context.unifiedExperience
            .journey.followUpStatus
        ).toBe(
          context.patientJourney
            ?.followUpStatus
        );

        expect(
          context.unifiedExperience
            .clinical.direction
        ).toBe(
          context.clinicalContext
            ?.direction.direction
        );

        expect(
          context.unifiedExperience
            .clinical
            .canConfirmClinicalDirection
        ).toBe(
          false
        );
      }
    );

    it(
      "returns no unified experience when the runtime story is unavailable",
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
              "assistant-missing-story-user",

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

        const context =
          buildAssistantHealthContext({
            patientSummary:
              patient,

            intelligence,

            runtime:
              runtimeWithoutStory,

            doctorBrief:
              null,

            latestReportContext:
              null,
          });

        expect(
          context.unifiedExperience
        ).toBeNull();

        expect(
          context.patientJourney
        ).toBeDefined();

        expect(
          context.clinicalContext
        ).toBeDefined();

        expect(
          context.overallScore
        ).toBe(
          intelligence.healthScore.data
            .score
        );

        expect(
          context.recommendation
        ).toBe(
          intelligence.recommendations
            .data.primaryAction
            .description ||
            intelligence.recommendations
              .data.primaryAction.title ||
            null
        );
      }
    );
  }
);
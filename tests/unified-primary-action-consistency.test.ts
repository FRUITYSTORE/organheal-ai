import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildUnifiedIntelligenceExperience,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.service";

import {
  buildHealthPlanViewModel,
} from "@/lib/services/health-plan/health-plan-view.service";

import type {
  HealthStoryData,
} from "@/lib/health-intelligence/engines/health-story.engine";

import type {
  EngineResult,
} from "@/lib/health-intelligence/models/engine-result";

import type {
  HealthScoreData,
} from "@/lib/health-intelligence/engines/health-score.engine";

import {
  createHealthRecommendationFixture,
  createRecommendationResultFixture,
} from "@/tests/fixtures/recommendation.fixture";

import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import {
  buildPatientJourneySnapshot,
} from "@/lib/application/journey/patient-journey-snapshot.service";

import {
  buildPatientClinicalContext,
} from "@/lib/application/clinical/patient-clinical-context.service";

import {
  createPatientSummaryFixture,
} from "@/tests/fixtures/patient-summary.fixture";

describe(
  "unified primary action consistency",
  () => {
    it(
      "preserves the recommendation primary action through unified experience and the health plan presenter",
      () => {
        const primaryAction =
          createHealthRecommendationFixture({
            id:
              "upload-medical-report",

            title:
              "Upload your latest medical report",

            description:
              "Add your latest medical report so OrganHeal can strengthen your health intelligence.",

            priority:
              "high",

            category:
              "report",

            href:
              "/lab-upload",

            score:
              92,

            reasons: [
              "A current medical report is missing.",
              "More evidence is needed before deeper analysis.",
            ],
          });

        const recommendations =
          createRecommendationResultFixture({
            confidence:
              91,

            data: {
              todaysMission:
                "Upload your latest medical report.",

              decisionLayer:
                "data",

              decisionReason:
                "missing_report",

              primaryAction,

              nextReviewDays:
                3,
            },
          });

        const healthScore:
          EngineResult<HealthScoreData> = {
            status:
              "ready",

            confidence:
              84,

            generatedAt:
              "2026-08-04T00:00:00.000Z",

            data: {
              score:
                68,

              level:
                "moderate",

              contributors:
                [],

              dataCompleteness:
                72,

              summary:
                "The current composite score is 68/100.",
            },
          };

                const patientSummary =
          createPatientSummaryFixture();

        const baseIntelligence =
          buildHealthIntelligence(
            patientSummary
          );

        const intelligence = {
          ...baseIntelligence,

          recommendations,

          healthScore,
        };

        const story:
          HealthStoryData = {
            headline:
              "More health evidence is needed",

            narrative:
              "Adding your latest report will strengthen the available health evidence and clarify the next decision.",

            tone:
              "attention",

            confidence:
              "moderate",

            confidenceScore:
              72,

            priorityMessage:
              "A current report is needed.",

            strongestMessage:
              null,

            progressMessage:
              null,

            evidenceMessage:
              "The available evidence is incomplete.",

            nextDecision: {
              title:
                primaryAction.title,

              description:
                primaryAction.description,

              href:
                primaryAction.href,

              actionLabel:
                "Upload Report",
            },

            supportingSignals: [
              "No current medical report is available.",
            ],

            generatedAt:
              "2026-08-04T00:00:00.000Z",
          };

                const patientJourney =
          buildPatientJourneySnapshot({
            patientSummary,

            healthIntelligence:
              intelligence,
          });

        const clinicalContext =
          buildPatientClinicalContext({
            patientSummary,
          });

        const unifiedExperience =
          buildUnifiedIntelligenceExperience({
            intelligence,
            story,
            patientJourney,
            clinicalContext,
          });

        const healthPlanView =
          buildHealthPlanViewModel({
            unifiedExperience,

            recommendations,

            healthScore,

            language:
              "en",
          });

        expect(
          unifiedExperience.primaryAction
        ).toEqual(
          primaryAction
        );

        expect(
          unifiedExperience.decision
        ).toEqual({
          layer:
            recommendations.data.decisionLayer,

          reason:
            recommendations.data.decisionReason,
        });

        expect(
          healthPlanView.nextAction
        ).toMatchObject({
          title:
            primaryAction.title,

          detail:
            primaryAction.description,

          href:
            primaryAction.href,

          priority:
            primaryAction.priority,
        });

        expect(
          healthPlanView.todaysMission.primaryAction
        ).toBe(
          primaryAction.description
        );

        expect(
          healthPlanView.nextReviewDays
        ).toBe(
          recommendations.data.nextReviewDays
        );
      }
    );
  }
);
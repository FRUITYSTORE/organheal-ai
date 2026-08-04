import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildHealthIntelligenceSummary,
  type BuildHealthIntelligenceSummaryInput,
} from "@/lib/health-intelligence/engines/health-intelligence-summary.engine";

import {
  buildDashboardIntelligenceViewModel,
} from "@/lib/application/dashboard/dashboard-intelligence.view-model";

import {
  healthIntelligencePresenter,
} from "@/lib/health-intelligence/presentation/health-intelligence.presenter";

const GENERATED_AT =
  "2026-08-04T12:00:00.000Z";

function createSummaryInput():
  BuildHealthIntelligenceSummaryInput {
  /*
   * هذا الاختبار يركز فقط على عقد:
   *
   * Next Decision
   * → Health Intelligence Summary
   * → Dashboard View Model
   *
   * لذلك نستخدم بيانات دنيا للمحركات الأخرى،
   * دون إعادة اختبار عقودها الكاملة هنا.
   */
  return {
    story: {
      headline:
        "Your current health direction",

      narrative:
        "Your current information supports a focused next step.",

      tone:
        "stable",

      confidence:
        "moderate",

      confidenceScore:
        70,

      priorityMessage:
        null,

      strongestMessage:
        null,

      progressMessage:
        null,

      evidenceMessage:
        "Multiple health sources are connected.",

      nextDecision: {
        title:
          "Review your health plan",

        description:
          "Continue with the next recommended action.",

        href:
          "/health-plan",

        actionLabel:
          "Review Health Plan",
      },

      supportingSignals:
        [],

      generatedAt:
        GENERATED_AT,
    },

    momentum: {
      status:
        "stable",

      averageDelta:
        2,

      signals:
        [],

      explanations:
        [],

      evidenceMaturity:
        "developing",

      comparableSourceCount:
        2,

      generatedAt:
        GENERATED_AT,
    },

    clinicalConfidence: {
      level:
        "moderate",

      score:
        68,

      factors:
        [],

      strengths: [
        "multiple-source-categories",
      ],

      limitations:
        [],

      evidenceMaturity:
        "developing",

      comparableSourceCount:
        2,

      generatedAt:
        GENERATED_AT,
    },

    evidence: {
      strength:
        "moderate",

      strengthScore:
        65,

      reasons:
        [],

      gaps:
        [],

      contradictions:
        [],

      recommendations:
        [],

      summary: {
        overallState:
          "developing",

        primaryStrength:
          null,

        primaryGap:
          null,

        primaryRecommendation:
          null,

        reasonCount:
          0,

        gapCount:
          0,

        contradictionCount:
          0,

        recommendationCount:
          0,
      },

      generatedAt:
        GENERATED_AT,
    },

    nextDecision: {
      primary: {
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
        ],

        relatedEvidenceGap:
          null,

        relatedEvidenceRecommendation:
          null,
      },

      alternatives:
        [],

      context: {
        evidenceStrength:
          "moderate",

        evidenceScore:
          65,

        confidenceLevel:
          "moderate",

        confidenceScore:
          68,

        momentumStatus:
          "stable",
      },

      generatedAt:
        GENERATED_AT,
    },

    decisionImpact: {
      primary: {
        actionType:
          "continue-health-plan",

        impacts:
          [],

        summary: {
          primaryImpact:
            null,

          highMagnitudeImpactCount:
            0,

          totalImpactCount:
            0,
        },
      },

      alternatives:
        [],

      generatedAt:
        GENERATED_AT,
    },
    };
}

describe(
  "dashboard decision consistency regression",
  () => {
    it(
      "copies the Next Decision primary action into the intelligence summary without changing its contract",
      () => {
        const input =
          createSummaryInput();

        const summary =
          buildHealthIntelligenceSummary(
            input
          );

        expect(
          summary.decision
        ).toEqual({
          type:
            input.nextDecision
              .primary.type,

          urgency:
            input.nextDecision
              .primary.urgency,

          href:
            input.nextDecision
              .primary.href,

          reasonCodes:
            input.nextDecision
              .primary.reasonCodes,
        });

        expect(
          summary.generatedAt
        ).toBe(
          input.nextDecision
            .generatedAt
        );
      }
    );

    it(
      "builds the Dashboard decision from the summary decision without changing its href",
      () => {
        const input =
          createSummaryInput();

        const summary =
          buildHealthIntelligenceSummary(
            input
          );

        const dashboard =
          buildDashboardIntelligenceViewModel(
            summary
          );

        const presentedDecision =
          healthIntelligencePresenter
            .presentNextDecision(
              summary.decision.type,
              summary.decision.urgency,
              "en"
            );

        expect(
          dashboard.decision
        ).toEqual({
          title:
            presentedDecision.title,

          description:
            presentedDecision.description,

          actionLabel:
            presentedDecision.actionLabel,

          urgencyLabel:
            presentedDecision.urgencyLabel,

          href:
            summary.decision.href,
        });
      }
    );

    it(
      "keeps Dashboard decision output synchronized when the Next Decision changes",
      () => {
        const input =
          createSummaryInput();

        input.nextDecision.primary = {
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
            null,

          relatedEvidenceRecommendation:
            null,
        };

        input.decisionImpact.primary = {
          actionType:
            "add-medical-evidence",

          impacts:
            [],

          summary: {
            primaryImpact:
              null,

            highMagnitudeImpactCount:
              0,

            totalImpactCount:
              0,
          },
        };

        const summary =
          buildHealthIntelligenceSummary(
            input
          );

        const dashboard =
          buildDashboardIntelligenceViewModel(
            summary
          );

        const presentedDecision =
          healthIntelligencePresenter
            .presentNextDecision(
              "add-medical-evidence",
              "routine",
              "en"
            );

        expect(
          summary.decision
        ).toEqual({
          type:
            "add-medical-evidence",

          urgency:
            "routine",

          href:
            "/lab-upload",

          reasonCodes: [
            "missing-medical-evidence",
          ],
        });

        expect(
          dashboard.decision.href
        ).toBe(
          "/lab-upload"
        );

        expect(
          dashboard.decision.title
        ).toBe(
          presentedDecision.title
        );

        expect(
          dashboard.decision.description
        ).toBe(
          presentedDecision.description
        );

        expect(
          dashboard.decision.actionLabel
        ).toBe(
          presentedDecision.actionLabel
        );

        expect(
          dashboard.decision.urgencyLabel
        ).toBe(
          presentedDecision.urgencyLabel
        );
      }
    );

    it(
      "keeps summary status limited when evidence or confidence is insufficient",
      () => {
        const input =
          createSummaryInput();

        input.story = {
          ...input.story,

          tone:
            "insufficient-data",
        };

        input.evidence = {
          ...input.evidence,

          strength:
            "insufficient",
        };

        input.clinicalConfidence = {
          ...input.clinicalConfidence,

          level:
            "low",
        };

        const summary =
          buildHealthIntelligenceSummary(
            input
          );

        expect(
          summary.status
        ).toBe(
          "limited"
        );
      }
    );
  }
);
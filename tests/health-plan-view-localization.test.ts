import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildHealthPlanViewModel,
} from "@/lib/services/health-plan/health-plan-view.service";

type BuildInput =
  Parameters<
    typeof buildHealthPlanViewModel
  >[0];

function createInput(
  options?: {
    language?: "en" | "ar";
    actionId?: string;
    actionTitle?: string;
    actionDescription?: string;
    actionCategory?:
      | "assessment"
      | "checkin"
      | "report"
      | "follow-up"
      | "lifestyle";
  }
): BuildInput {
  const language =
    options?.language ?? "en";

  const actionId =
    options?.actionId ??
    "professional-review";

  const actionTitle =
    options?.actionTitle ??
    "Review the critical health signal";

  const actionDescription =
    options?.actionDescription ??
    "A critical signal is present and should be reviewed with a qualified healthcare professional.";

  const actionCategory =
    options?.actionCategory ??
    "follow-up";

  const primaryAction = {
    id:
      actionId,

    title:
      actionTitle,

    description:
      actionDescription,

    priority:
      "urgent",

    category:
      actionCategory,

    href:
      "/doctor-portal",

    score:
      100,

    reasons:
      [],
  };

  return {
    language,

    unifiedExperience: {
      status:
        "ready",

      confidence:
        90,

      generatedAt:
        "2026-09-12T00:00:00.000Z",

      story: {
        headline:
          language === "ar"
            ? "الأولوية الصحية الحالية"
            : "Current health priority",

        narrative:
          "",

        tone:
          "priority",

        confidence:
          "high",

        confidenceScore:
          90,

        priorityMessage:
          null,

        strongestMessage:
          null,

        progressMessage:
          null,

        evidenceMessage:
          "",

        nextDecision:
          null,

        supportingSignals:
          [],
      },

      decision: {
        layer:
          "health",

        reason:
          "test",
      },

      primaryAction,

      healthScore: {
        score:
          64,

        level:
          "moderate",

        confidence:
          82,

        dataCompleteness:
          70,

        summary:
          "English unified summary",
      },

      journey: {
        followUpStatus:
          "active",

        lastMeaningfulUpdate:
          null,
      },

      clinical: {
        direction:
          "stable",

        confidence:
          80,

        canConfirmClinicalDirection:
          true,

        supportingSignals:
          [],

        contradictingSignals:
          [],

        markerTrends:
          [],
      },

      review: {
        nextReviewDays:
          3,
      },
    },

    recommendations: {
      status:
        "completed",

      confidence:
        90,

      generatedAt:
        "2026-09-12T00:00:00.000Z",

      data: {
        todaysMission:
          actionTitle,

        decisionLayer:
          "health",

        decisionReason:
          "test",

        primaryAction,

        weeklyActions: [
          {
            id:
              "complete-checkin",

            title:
              "Complete today's Check-In",

            description:
              "Add your current sleep, stress, energy, activity, and mood information.",

            priority:
              "high",

            category:
              "checkin",

            href:
              "/checkin",

            score:
              70,

            reasons:
              [],
          },
        ],

        nextReviewDays:
          3,
      },
    },

    healthScore: {
      status:
        "completed",

      confidence:
        82,

      generatedAt:
        "2026-09-12T00:00:00.000Z",

      data: {
        score:
          64,

        level:
          "moderate",

        dataCompleteness:
          70,

        summary:
          "Your current Health Intelligence Score is 64/100.",

        contributors: [
          {
            id:
              "assessment",

            label:
              "Priority assessment",

            score:
              72,

            weight:
              35,

            weightedScore:
              25.2,

            available:
              true,

            explanation:
              "The lowest current organ assessment score is 72/100.",
          },

          {
            id:
              "checkin",

            label:
              "Latest Check-In",

            score:
              75,

            weight:
              20,

            weightedScore:
              15,

            available:
              true,

            explanation:
              "The latest wellness score is 75/100.",
          },
        ],
      },
    },
  } as unknown as BuildInput;
}

describe(
  "health plan view localization",
  () => {
    it(
      "preserves English presentation when language is English",
      () => {
        const input =
          createInput({
            language:
              "en",
          });

        const result =
          buildHealthPlanViewModel(
            input
          );

        expect(
          result.healthScore.summary
        ).toBe(
          "Your current Health Intelligence Score is 64/100."
        );

        expect(
          result.healthScore
            .contributors[0]
            .explanation
        ).toBe(
          "The lowest current organ assessment score is 72/100."
        );

        expect(
          result.nextAction.title
        ).toBe(
          "Review the critical health signal"
        );

        expect(
          result.weeklyTasks[0]
        ).toBe(
          "Add your current sleep, stress, energy, activity, and mood information."
        );
      }
    );

    it(
      "localizes Health Plan presentation into Arabic",
      () => {
        const input =
          createInput({
            language:
              "ar",
          });

        const result =
          buildHealthPlanViewModel(
            input
          );

        expect(
          result.healthScore.summary
        ).toContain(
          "64/100"
        );

        expect(
          result.healthScore.summary
        ).not.toContain(
          "Health Intelligence Score"
        );

        expect(
          result.healthScore
            .contributors[0]
            .explanation
        ).toBe(
          "أدنى نتيجة حالية في التقييم الصحي هي 72/100."
        );

        expect(
          result.healthScore
            .contributors[1]
            .explanation
        ).toBe(
          "أحدث نتيجة للعافية هي 75/100."
        );

        expect(
          result.nextAction.title
        ).toBe(
          "راجع المؤشر الصحي المهم"
        );

        expect(
          result.nextAction.detail
        ).not.toContain(
          "critical signal"
        );

        expect(
          result.weeklyTasks[0]
        ).toBe(
          "أضف معلوماتك الحالية عن النوم والتوتر والطاقة والنشاط والمزاج."
        );
      }
    );

    it(
      "localizes a dynamic priority organ without changing action metadata",
      () => {
        const input =
          createInput({
            language:
              "ar",

            actionId:
              "monitor-priority-area",

            actionTitle:
              "Monitor Heart",

            actionDescription:
              "Track symptoms, habits, and meaningful changes related to Heart.",

            actionCategory:
              "follow-up",
          });

        const result =
          buildHealthPlanViewModel(
            input
          );

        expect(
          result.nextAction.title
        ).toBe(
          "تابع القلب"
        );

        expect(
          result.nextAction.detail
        ).toContain(
          "القلب"
        );

        expect(
          result.nextAction.href
        ).toBe(
          "/doctor-portal"
        );

        expect(
          result.nextAction.priority
        ).toBe(
          "urgent"
        );
      }
    );
  }
);
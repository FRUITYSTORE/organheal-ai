import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildHealthStrategy,
} from "@/lib/healthStrategyEngine";

import {
  buildActionPlan,
} from "@/lib/actionPlanEngine";

import {
  buildHealthStory,
} from "@/lib/healthStoryEngine";

import type {
  LabMarkerResult,
} from "@/lib/labMarkerDetector";

import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

describe(
  "intelligence Arabic localization regression",
  () => {
    const markers:
      LabMarkerResult[] = [
        {
          marker: "LDL",
          value: 170,
          unit: "mg/dL",
          status: "High",
          note: "Above range",
          category: "Lipids",
          referenceLow: 0,
          referenceHigh: 100,
          referenceSource:
            "default",
        },
      ];

    it(
      "localizes report strategy content into Arabic",
      () => {
        const strategy =
          buildHealthStrategy(
            markers,
            "ar"
          );

        const content =
          [
            strategy.healthRisks,
            strategy.actionPlan90Days,
            strategy.nutritionStrategy,
            strategy.followUpPlan,
          ].join(" ");

        expect(
          content
        ).toMatch(
          /[\u0600-\u06FF]/
        );

        expect(
          content
        ).not.toContain(
          "Possible cardiovascular risk pattern"
        );

        expect(
          content
        ).not.toContain(
          "Repeat lipid profile"
        );
      }
    );

    it(
      "localizes action-plan items into Arabic",
      () => {
        const plan =
          buildActionPlan({
            digitalTwin: {
              primarySystem:
                "Cardiometabolic",
            },

            forecast: {
              improvementPotential:
                "High",
            },

            longitudinalRisk: {
              escalationLevel:
                "High",
            },

            crossSource: {},

            language:
              "ar",
          });

        const content =
          [
            ...plan.thisWeek,
            ...plan.thisMonth,
            ...plan.next90Days,
          ].join(" ");

        expect(
          content
        ).toMatch(
          /[\u0600-\u06FF]/
        );

        expect(
          content
        ).not.toContain(
          "Review your latest health intelligence summary"
        );

        expect(
          content
        ).not.toContain(
          "Repeat relevant labs"
        );
      }
    );

    it(
      "localizes legacy health story into Arabic",
      () => {
        const story =
          buildHealthStory({
            timeline: {},
            longitudinalRisk: {
              riskDirection:
                "Increasing",
            },

            forecast: {
              forecastScore:
                72,
            },

            crossSource: {
              primarySystem:
                "Cardiometabolic",
            },

            digitalTwin: {
              primarySystem:
                "Cardiometabolic",
            },

            language:
              "ar",
          });

        expect(
          story
        ).toMatch(
          /[\u0600-\u06FF]/
        );

        expect(
          story
        ).not.toContain(
          "Longitudinal risk direction"
        );

        expect(
          story
        ).not.toContain(
          "The primary health focus area"
        );
      }
    );

    it(
      "passes Arabic presentation state into the strategy card",
      () => {
        const pageSource =
          readFileSync(
            resolve(
              process.cwd(),
              "app/intelligence/page.tsx"
            ),
            "utf8"
          );

        const cardSource =
          readFileSync(
            resolve(
              process.cwd(),
              "app/intelligence/components/PersonalHealthStrategyCard.tsx"
            ),
            "utf8"
          );

        expect(
          pageSource
        ).toMatch(
          /<PersonalHealthStrategyCard[\s\S]*?isArabic=\{isArabicUi\}/
        );

        expect(
          cardSource
        ).toContain(
          "isArabic: boolean"
        );

        expect(
          cardSource
        ).toContain(
          '"المخاطر الصحية"'
        );

        expect(
          cardSource
        ).toContain(
          '"خطة المتابعة"'
        );
      }
    );
  }
);
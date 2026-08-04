import {
  describe,
  expect,
  it,
} from "vitest";

import {
  presentNextDecision,
} from "@/lib/health-intelligence/presentation/next-decision.presenter";

import type {
  NextDecisionType,
  NextDecisionUrgency,
} from "@/lib/health-intelligence/engines/next-decision.engine";

const decisionTypes:
  NextDecisionType[] = [
    "build-baseline",
    "add-daily-context",
    "add-medical-evidence",
    "complete-report-processing",
    "generate-analysis",
    "add-followup-history",
    "review-declining-momentum",
    "continue-health-plan",
  ];

const urgencies:
  NextDecisionUrgency[] = [
    "routine",
    "soon",
  ];

describe(
  "language behavior consistency regression",
  () => {
    it(
      "returns complete English and Arabic presentations for every decision type",
      () => {
        for (
          const type of
          decisionTypes
        ) {
          const english =
            presentNextDecision(
              type,
              "routine",
              "en"
            );

          const arabic =
            presentNextDecision(
              type,
              "routine",
              "ar"
            );

          expect(
            english.title.trim()
          ).not.toBe(
            ""
          );

          expect(
            english.description.trim()
          ).not.toBe(
            ""
          );

          expect(
            english.actionLabel.trim()
          ).not.toBe(
            ""
          );

          expect(
            english.urgencyLabel.trim()
          ).not.toBe(
            ""
          );

          expect(
            arabic.title.trim()
          ).not.toBe(
            ""
          );

          expect(
            arabic.description.trim()
          ).not.toBe(
            ""
          );

          expect(
            arabic.actionLabel.trim()
          ).not.toBe(
            ""
          );

          expect(
            arabic.urgencyLabel.trim()
          ).not.toBe(
            ""
          );
        }
      }
    );

    it(
      "changes presentation text between English and Arabic without changing the requested decision type",
      () => {
        for (
          const type of
          decisionTypes
        ) {
          const english =
            presentNextDecision(
              type,
              "routine",
              "en"
            );

          const arabic =
            presentNextDecision(
              type,
              "routine",
              "ar"
            );

          expect(
            arabic.title
          ).not.toBe(
            english.title
          );

          expect(
            arabic.description
          ).not.toBe(
            english.description
          );

          expect(
            arabic.actionLabel
          ).not.toBe(
            english.actionLabel
          );
        }
      }
    );

    it(
      "keeps urgency behavior consistent across both languages",
      () => {
        for (
          const urgency of
          urgencies
        ) {
          const english =
            presentNextDecision(
              "continue-health-plan",
              urgency,
              "en"
            );

          const arabic =
            presentNextDecision(
              "continue-health-plan",
              urgency,
              "ar"
            );

          if (
            urgency ===
            "soon"
          ) {
            expect(
              english.urgencyLabel
            ).toBe(
              "Recommended soon"
            );

            expect(
              arabic.urgencyLabel
            ).toBe(
              "موصى بها قريبًا"
            );
          } else {
            expect(
              english.urgencyLabel
            ).toBe(
              "Routine next step"
            );

            expect(
              arabic.urgencyLabel
            ).toBe(
              "خطوة متابعة اعتيادية"
            );
          }
        }
      }
    );

    it(
      "keeps the same action meaning for baseline creation in both languages",
      () => {
        const english =
          presentNextDecision(
            "build-baseline",
            "routine",
            "en"
          );

        const arabic =
          presentNextDecision(
            "build-baseline",
            "routine",
            "ar"
          );

        expect(
          english
        ).toEqual({
          title:
            "Build your health baseline",

          description:
            "Complete a health assessment so OrganHeal can establish your first connected health picture.",

          actionLabel:
            "Start Assessment",

          urgencyLabel:
            "Routine next step",
        });

        expect(
          arabic
        ).toEqual({
          title:
            "أنشئ خط الأساس الصحي",

          description:
            "أكمل تقييمًا صحيًا حتى يتمكن OrganHeal من إنشاء أول صورة صحية مترابطة لك.",

          actionLabel:
            "ابدأ التقييم",

          urgencyLabel:
            "خطوة متابعة اعتيادية",
        });
      }
    );

    it(
      "keeps the same action meaning for medical evidence in both languages",
      () => {
        const english =
          presentNextDecision(
            "add-medical-evidence",
            "routine",
            "en"
          );

        const arabic =
          presentNextDecision(
            "add-medical-evidence",
            "routine",
            "ar"
          );

        expect(
          english.actionLabel
        ).toBe(
          "Upload Report"
        );

        expect(
          arabic.actionLabel
        ).toBe(
          "ارفع تقريرًا"
        );

        expect(
          english.title
        ).toBe(
          "Add medical evidence"
        );

        expect(
          arabic.title
        ).toBe(
          "أضف دليلًا طبيًا"
        );
      }
    );

    it(
      "keeps the same action meaning for Check-In decisions in both languages",
      () => {
        const dailyContextEnglish =
          presentNextDecision(
            "add-daily-context",
            "routine",
            "en"
          );

        const dailyContextArabic =
          presentNextDecision(
            "add-daily-context",
            "routine",
            "ar"
          );

        const followUpEnglish =
          presentNextDecision(
            "add-followup-history",
            "routine",
            "en"
          );

        const followUpArabic =
          presentNextDecision(
            "add-followup-history",
            "routine",
            "ar"
          );

        expect(
          dailyContextEnglish.actionLabel
        ).toBe(
          "Open Check-In"
        );

        expect(
          dailyContextArabic.actionLabel
        ).toBe(
          "افتح التحديث الصحي"
        );

        expect(
          followUpEnglish.actionLabel
        ).toBe(
          "Add Check-In"
        );

        expect(
          followUpArabic.actionLabel
        ).toBe(
          "أضف تحديثًا صحيًا"
        );
      }
    );

    it(
      "keeps the same action meaning for Health Plan decisions in both languages",
      () => {
        const continueEnglish =
          presentNextDecision(
            "continue-health-plan",
            "routine",
            "en"
          );

        const continueArabic =
          presentNextDecision(
            "continue-health-plan",
            "routine",
            "ar"
          );

        const reviewEnglish =
          presentNextDecision(
            "review-declining-momentum",
            "soon",
            "en"
          );

        const reviewArabic =
          presentNextDecision(
            "review-declining-momentum",
            "soon",
            "ar"
          );

        expect(
          continueEnglish.actionLabel
        ).toBe(
          "Open Health Plan"
        );

        expect(
          continueArabic.actionLabel
        ).toBe(
          "افتح الخطة الصحية"
        );

        expect(
          reviewEnglish.actionLabel
        ).toBe(
          "Review Health Plan"
        );

        expect(
          reviewArabic.actionLabel
        ).toBe(
          "راجع الخطة الصحية"
        );

        expect(
          reviewEnglish.urgencyLabel
        ).toBe(
          "Recommended soon"
        );

        expect(
          reviewArabic.urgencyLabel
        ).toBe(
          "موصى بها قريبًا"
        );
      }
    );

    it(
      "returns deterministic output for repeated presentation requests",
      () => {
        for (
          const type of
          decisionTypes
        ) {
          for (
            const urgency of
            urgencies
          ) {
            const firstEnglish =
              presentNextDecision(
                type,
                urgency,
                "en"
              );

            const repeatedEnglish =
              presentNextDecision(
                type,
                urgency,
                "en"
              );

            const firstArabic =
              presentNextDecision(
                type,
                urgency,
                "ar"
              );

            const repeatedArabic =
              presentNextDecision(
                type,
                urgency,
                "ar"
              );

            expect(
              repeatedEnglish
            ).toEqual(
              firstEnglish
            );

            expect(
              repeatedArabic
            ).toEqual(
              firstArabic
            );
          }
        }
      }
    );
  }
);
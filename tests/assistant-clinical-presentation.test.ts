import {
  describe,
  expect,
  it,
} from "vitest";

import {
  renderAssistantClinicalExplanation,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/render-assistant-clinical-explanation";

describe(
  "assistant clinical presentation",
  () => {
    it(
      "presents common clinical marker names understandably in Arabic",
      () => {
        const result =
          renderAssistantClinicalExplanation(
            {
              overview:
                "Glucose is High and Ferritin is Low.",

              priorityFindings: [
                {
                  title:
                    "ارتفاع في سكر الدم",

                  explanation:
                    "Glucose is High and should be interpreted with HbA1c.",

                  evidenceMarkers: [
                    "Glucose",
                    "HbA1c",
                  ],

                  importance:
                    "important",

                  confidence:
                    "high",
                },
              ],

              relationships:
                [],

              possibleContributors:
                [],

              reassuringFindings:
                [],

              missingContext:
                [],

              nextSteps:
                [],

              questionsForClinician:
                [],

              urgency:
                "timely",

              limitations: [
                "Ferritin is Low and this result alone does not establish a diagnosis.",
              ],
            },
            "ar",
            "full"
          );

        expect(
          result
        ).toContain(
          "سكر الدم (Glucose)"
        );

        expect(
          result
        ).toContain(
          "مخزون الحديد (Ferritin)"
        );

        expect(
          result
        ).toContain(
          "السكر التراكمي (HbA1c)"
        );

        expect(
          result
        ).toContain(
          "مرتفع"
        );

        expect(
          result
        ).toContain(
          "منخفض"
        );

        expect(
          result
        ).toContain(
          "عالية"
        );

        expect(
          result
        ).not.toContain(
          "Glucose is High"
        );

        expect(
          result
        ).not.toContain(
          "Ferritin is Low"
        );
      }
    );

    it(
      "localizes marker names inside Arabic relationship explanations",
      () => {
        const result =
          renderAssistantClinicalExplanation(
            {
              overview:
                "هناك علاقة تستحق التفسير.",

              priorityFindings:
                [],

              relationships: [
                {
                  markers: [
                    "Glucose",
                    "HbA1c",
                  ],

                  explanation:
                    "Glucose and HbA1c can describe glucose regulation across different time windows.",

                  confidence:
                    "high",
                },
              ],

              possibleContributors:
                [],

              reassuringFindings:
                [],

              missingContext:
                [],

              nextSteps:
                [],

              questionsForClinician:
                [],

              urgency:
                "timely",

              limitations: [
                "لا تكفي هذه النتائج وحدها لإثبات تشخيص.",
              ],
            },
            "ar",
            "full"
          );

        expect(
          result
        ).toContain(
          "سكر الدم (Glucose)"
        );

        expect(
          result
        ).toContain(
          "السكر التراكمي (HbA1c)"
        );

        expect(
          result
        ).not.toContain(
          "Glucose and HbA1c"
        );
      }
    );

    it(
      "keeps canonical clinical marker names unchanged in English responses",
      () => {
        const result =
          renderAssistantClinicalExplanation(
            {
              overview:
                "Glucose is high.",

              priorityFindings: [
                {
                  title:
                    "Elevated glucose",

                  explanation:
                    "Glucose is above the supplied reference range.",

                  evidenceMarkers: [
                    "Glucose",
                    "HbA1c",
                  ],

                  importance:
                    "important",

                  confidence:
                    "high",
                },
              ],

              relationships:
                [],

              possibleContributors:
                [],

              reassuringFindings:
                [],

              missingContext:
                [],

              nextSteps:
                [],

              questionsForClinician:
                [],

              urgency:
                "timely",

              limitations: [
                "The report alone cannot establish a diagnosis.",
              ],
            },
            "en",
            "full"
          );

        expect(
          result
        ).toContain(
          "Glucose"
        );

        expect(
          result
        ).toContain(
          "HbA1c"
        );

        expect(
          result
        ).toContain(
          "Confidence: high"
        );

        expect(
          result
        ).not.toContain(
          "سكر الدم"
        );

        expect(
          result
        ).not.toContain(
          "السكر التراكمي"
        );
      }
    );

    it(
      "removes internal pipeline language from user-facing responses",
      () => {
        const result =
          renderAssistantClinicalExplanation(
            {
              overview:
                "Review extracted report text and generate deeper structured intelligence.",

              priorityFindings:
                [],

              relationships:
                [],

              possibleContributors:
                [],

              reassuringFindings:
                [],

              missingContext:
                [],

              nextSteps:
                [],

              questionsForClinician:
                [],

              urgency:
                "routine",

              limitations: [
                "This laboratory marker was extracted from this uploaded report.",
              ],
            },
            "en",
            "full"
          );

        expect(
          result
        ).not.toContain(
          "generate deeper structured intelligence"
        );

        expect(
          result
        ).not.toContain(
          "laboratory marker was extracted"
        );
      }
    );

    it(
      "removes internal pipeline language from Arabic responses too",
      () => {
        const result =
          renderAssistantClinicalExplanation(
            {
              overview:
                "Report text extracted and prepared for doctor-ready summarization.",

              priorityFindings:
                [],

              relationships:
                [],

              possibleContributors:
                [],

              reassuringFindings:
                [],

              missingContext:
                [],

              nextSteps:
                [],

              questionsForClinician:
                [],

              urgency:
                "routine",

              limitations: [
                "Review extracted report text and generate deeper structured intelligence.",
              ],
            },
            "ar",
            "full"
          );

        expect(
          result
        ).not.toContain(
          "doctor-ready summarization"
        );

        expect(
          result
        ).not.toContain(
          "generate deeper structured intelligence"
        );
      }
    );
  }
);
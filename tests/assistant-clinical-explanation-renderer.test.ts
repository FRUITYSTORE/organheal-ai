import {
  describe,
  expect,
  it,
} from "vitest";

import {
  renderAssistantClinicalExplanation,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/render-assistant-clinical-explanation";

import type {
  AssistantClinicalExplanation,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.types";

const explanation:
  AssistantClinicalExplanation = {
    overview:
      "The report shows a glucose-related pattern that deserves review.",

    priorityFindings: [
      {
        title:
          "Glucose regulation needs review",

        explanation:
          "HbA1c and glucose are both above the supplied ranges.",

        evidenceMarkers: [
          "HbA1c",
          "Glucose",
        ],

        importance:
          "important",

        confidence:
          "high",
      },
    ],

    relationships: [
      {
        markers: [
          "HbA1c",
          "Glucose",
        ],

        explanation:
          "They provide related information across different time windows.",

        confidence:
          "high",
      },
    ],

    possibleContributors: [
      {
        factor:
          "Changes in glucose regulation",

        whyPossible:
          "Two related markers are elevated.",

        confirmationNeeded:
          "Fasting status and confirmatory testing.",
      },
    ],

    reassuringFindings: [
      "Kidney markers are within the supplied ranges.",
    ],

    missingContext: [
      "Fasting status",
    ],

    nextSteps: [
      "Discuss confirmatory testing with a clinician.",
    ],

    questionsForClinician: [
      "Should the glucose results be repeated?",
    ],

    urgency:
      "timely",

    limitations: [
      "The report alone cannot establish a diagnosis.",
    ],
  };

describe(
  "renderAssistantClinicalExplanation",
  () => {
    it(
      "renders a structured English explanation",
      () => {
        const result =
          renderAssistantClinicalExplanation(
            explanation,
            "en"
          );

        expect(
          result
        ).toContain(
          "What deserves attention first:"
        );

        expect(
          result
        ).toContain(
          "HbA1c, Glucose"
        );

        expect(
          result
        ).toContain(
          "Possible contributors requiring confirmation:"
        );

        expect(
          result
        ).not.toContain(
          "/100"
        );
      }
    );

    it(
      "renders Arabic section labels",
      () => {
        const result =
          renderAssistantClinicalExplanation(
            {
              ...explanation,

              overview:
                "يظهر التقرير نمطًا متعلقًا بتنظيم السكر يحتاج إلى مراجعة.",
            },
            "ar"
          );

        expect(
          result
        ).toContain(
          "الخلاصة:"
        );

        expect(
          result
        ).toContain(
          "ما الذي يستحق الاهتمام أولًا:"
        );

        expect(
          result
        ).toContain(
          "حدود هذا التفسير:"
        );
      }
    );
  }
);
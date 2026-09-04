import {
  describe,
  expect,
  it,
} from "vitest";

import {
  validateAssistantClinicalExplanation,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/validate-assistant-clinical-explanation";

const reportEvidence = [
  {
    marker:
      "HbA1c",

    value:
      6.6,

    unit:
      "%",

    status:
      "High" as const,

    referenceLow:
      0,

    referenceHigh:
      5.7,

    referenceSource:
      "report" as const,
  },

  {
    marker:
      "Glucose",

    value:
      128,

    unit:
      "mg/dL",

    status:
      "High" as const,

    referenceLow:
      70,

    referenceHigh:
      99,

    referenceSource:
      "report" as const,
  },
];

function createValidExplanation() {
  return {
    overview:
      "The report contains a glucose-related pattern that deserves clinical review.",

    priorityFindings: [
      {
        title:
          "Glucose regulation needs review",

        explanation:
          "HbA1c and glucose are both above the supplied reference ranges.",

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
          "These markers provide related but different information about glucose regulation.",

        confidence:
          "high",
      },
    ],

    possibleContributors: [
      {
        factor:
          "Glucose regulation changes",

        whyPossible:
          "Both supplied glucose-related markers are elevated.",

        confirmationNeeded:
          "Fasting status, symptoms, medications, and confirmatory clinical testing are needed.",
      },
    ],

    reassuringFindings:
      [],

    missingContext: [
      "Fasting status",
    ],

    nextSteps: [
      "Discuss confirmatory testing with a licensed clinician.",
    ],

    questionsForClinician: [
      "Should these results be repeated or confirmed?",
    ],

    urgency:
      "timely",

    limitations: [
      "The report alone cannot establish a diagnosis or cause.",
    ],
  };
}

describe(
  "validateAssistantClinicalExplanation",
  () => {
    it(
      "accepts an evidence-grounded structured explanation",
      () => {
        const result =
          validateAssistantClinicalExplanation(
            createValidExplanation(),
            reportEvidence
          );

        expect(
          result
        ).not.toBeNull();
      }
    );

    it(
      "accepts marker names case-insensitively",
      () => {
        const explanation =
          createValidExplanation();

        explanation
          .priorityFindings[0]
          .evidenceMarkers = [
            "hba1c",
            "GLUCOSE",
          ];

        const result =
          validateAssistantClinicalExplanation(
            explanation,
            reportEvidence
          );

        expect(
          result
        ).not.toBeNull();
      }
    );

    it(
      "rejects an invented marker",
      () => {
        const explanation =
          createValidExplanation();

        explanation
          .priorityFindings[0]
          .evidenceMarkers.push(
            "Troponin"
          );

        const result =
          validateAssistantClinicalExplanation(
            explanation,
            reportEvidence
          );

        expect(
          result
        ).toBeNull();
      }
    );

    it(
      "rejects an invalid enum value",
      () => {
        const explanation =
          createValidExplanation();

        (
          explanation
            .priorityFindings[0] as {
              importance:
                string;
            }
        ).importance =
          "critical";

        const result =
          validateAssistantClinicalExplanation(
            explanation,
            reportEvidence
          );

        expect(
          result
        ).toBeNull();
      }
    );

    it(
      "requires at least one limitation",
      () => {
        const explanation =
          createValidExplanation();

        explanation.limitations =
          [];

        const result =
          validateAssistantClinicalExplanation(
            explanation,
            reportEvidence
          );

        expect(
          result
        ).toBeNull();
      }
    );
  }
);
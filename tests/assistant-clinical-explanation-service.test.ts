import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  enhanceAssistantClinicalResponse,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.service";

import type {
  AssistantClinicalExplanationClient,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.types";

import type {
  AssistantOrchestratorResult,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

const validExplanation = {
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
        "The markers provide related information across different time windows.",

      confidence:
        "high",
    },
  ],

  possibleContributors:
    [],

  reassuringFindings:
    [],

  missingContext: [
    "Fasting status",
  ],

  nextSteps: [
    "Discuss confirmatory testing with a clinician.",
  ],

  questionsForClinician:
    [],

  urgency:
    "timely",

  limitations: [
    "The report alone cannot establish a diagnosis.",
  ],
};

function createDeterministicResult():
  AssistantOrchestratorResult {
  return {
    success:
      true,

    response:
      "Deterministic fallback response.",

    clinicalReasoningState:
      null,

    reasoning: {
      mode:
        "answer",

      clinicalUrgencyLevel:
        "none",

      status:
        "ready",

      confidence:
        "moderate",

      availableEvidence:
        [],

      missingInformation:
        [],

      questionIntent:
        "report",

      productNavigation:
        null,

      questionEvidenceStatus:
        "ready",

      questionEvidenceConfidence:
        "moderate",

      questionAvailableEvidence:
        [],

      questionMissingInformation:
        [],

      clinicalHypothesisRanking:
        null,

      clinicalConflictResolution:
        null,

      clinicalConfidenceCalibration:
        null,

      clinicalDecisionTrace:
        null,

      clinicalNarrative:
        null,

      clarifyingQuestion:
        null,

      reason:
        null,
    },
  };
}

function createHealthContext():
  AssistantResponseHealthContext {
  return {
    latestReportContext: {
      reportId:
        108,

      fileName:
        "report.pdf",

      reportType:
        "Laboratory",

      uploadedAt:
        "2026-09-01T10:00:00.000Z",

      summary:
        null,

      keyFindings:
        null,

      recommendations:
        null,

      doctorBrief:
        null,

      nextBestAction:
        null,

      riskLevel:
        null,

      reportEvidence: [
        {
          marker:
            "HbA1c",

          value:
            6.6,

          unit:
            "%",

          status:
            "High",

          referenceLow:
            0,

          referenceHigh:
            5.7,

          referenceSource:
            "report",
        },

        {
          marker:
            "Glucose",

          value:
            128,

          unit:
            "mg/dL",

          status:
            "High",

          referenceLow:
            70,

          referenceHigh:
            99,

          referenceSource:
            "report",
        },
      ],
    },

    wholeBodyKnowledge: {
      nodes:
        [],

      relationships:
        [],

      clarificationQuestions:
        [],

      coveredDomains:
        [],

      unresolvedDomains:
        [],

      evidenceSufficiency:
        null,

      generatedAt:
        "2026-09-01T10:00:00.000Z",
    },
  };
}

describe(
  "enhanceAssistantClinicalResponse",
  () => {
    afterEach(
      () => {
        vi.unstubAllEnvs();
      }
    );

    it(
      "uses a validated generated explanation for a report question",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const client: AssistantClinicalExplanationClient = {
          generate:
            vi.fn().mockResolvedValue(
              validExplanation
            ),
        };

        const result =
          await enhanceAssistantClinicalResponse({
            question:
              "Explain my latest report.",

            language:
              "en",

            healthContext:
              createHealthContext(),

            deterministicResult:
              createDeterministicResult(),

            client,

            requestId:
              "req_test",
          });

        expect(
          client.generate
        ).toHaveBeenCalledOnce();

        expect(
          result.response
        ).toContain(
          "What deserves attention first:"
        );

        expect(
          result.response
        ).not.toBe(
          "Deterministic fallback response."
        );
      }
    );

    it(
      "falls back when validation rejects invented evidence",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const invalidExplanation = {
          ...validExplanation,

          priorityFindings: [
            {
              ...validExplanation
                .priorityFindings[0],

              evidenceMarkers: [
                "Troponin",
              ],
            },
          ],
        };

        const client: AssistantClinicalExplanationClient = {
          generate:
            vi.fn().mockResolvedValue(
              invalidExplanation
            ),
        };

        const result =
          await enhanceAssistantClinicalResponse({
            question:
              "Explain my latest report.",

            language:
              "en",

            healthContext:
              createHealthContext(),

            deterministicResult:
              createDeterministicResult(),

            client,

            requestId:
              "req_test",
          });

        expect(
          result.response
        ).toBe(
          "Deterministic fallback response."
        );
      }
    );

    it(
      "does not call the model for an emergency response",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const deterministicResult =
          createDeterministicResult();

        deterministicResult
          .reasoning
          .clinicalUrgencyLevel =
          "emergency";

        const client: AssistantClinicalExplanationClient = {
          generate:
            vi.fn(),
        };

        const result =
          await enhanceAssistantClinicalResponse({
            question:
              "I have chest pain and shortness of breath.",

            language:
              "en",

            healthContext:
              createHealthContext(),

            deterministicResult,

            client,

            requestId:
              "req_test",
          });

        expect(
          client.generate
        ).not.toHaveBeenCalled();

        expect(
          result
        ).toBe(
          deterministicResult
        );
      }
    );

    it(
      "does not call the model while the feature is disabled",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "false"
        );

        const client: AssistantClinicalExplanationClient = {
          generate:
            vi.fn(),
        };

        const deterministicResult =
          createDeterministicResult();

        const result =
          await enhanceAssistantClinicalResponse({
            question:
              "Explain my latest report.",

            language:
              "en",

            healthContext:
              createHealthContext(),

            deterministicResult,

            client,

            requestId:
              "req_test",
          });

        expect(
          client.generate
        ).not.toHaveBeenCalled();

        expect(
          result
        ).toBe(
          deterministicResult
        );
      }
    );
        it(
      "uses expanded evidence only for full report interpretation",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const healthContext =
          createHealthContext();

        const latestReport =
          healthContext
            .latestReportContext;

        expect(
          latestReport
        ).not.toBeNull();

        expect(
          latestReport
        ).toBeDefined();

        if (
          !latestReport
        ) {
          throw new Error(
            "Expected latest report context."
          );
        }

        latestReport
          .expandedReportEvidence = [
            ...latestReport
              .reportEvidence,

            {
              marker:
                "Urine ACR",

              value:
                31,

              unit:
                "mg/g",

              status:
                "High",

              referenceLow:
                null,

              referenceHigh:
                30,

              referenceSource:
                "report",
            },
          ];

        const generate =
          vi.fn()
            .mockResolvedValue(
              validExplanation
            );

        const client: AssistantClinicalExplanationClient = {
          generate,
        };

        await enhanceAssistantClinicalResponse({
          question:
            "Explain my latest report.",

          language:
            "en",

          healthContext,

          deterministicResult:
            createDeterministicResult(),

          client,

          requestId:
            "req_full_evidence",
        });

        await enhanceAssistantClinicalResponse({
          question:
            "Why is my HbA1c high?",

          language:
            "en",

          healthContext,

          deterministicResult:
            createDeterministicResult(),

          client,

          requestId:
            "req_cause_evidence",
        });

        await enhanceAssistantClinicalResponse({
          question:
            "What should I do next about my report?",

          language:
            "en",

          healthContext,

          deterministicResult:
            createDeterministicResult(),

          client,

          requestId:
            "req_next_step_evidence",
        });

        expect(
          generate
        ).toHaveBeenCalledTimes(
          3
        );

        const fullInput =
          generate.mock
            .calls[0][0];

        const causeInput =
          generate.mock
            .calls[1][0];

        const nextStepInput =
          generate.mock
            .calls[2][0];

        expect(
          fullInput.mode
        ).toBe(
          "full"
        );

        expect(
          fullInput.report
            .reportEvidence
        ).toHaveLength(
          3
        );

        expect(
          fullInput.report
            .reportEvidence
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              marker:
                "Urine ACR",

              value:
                31,

              unit:
                "mg/g",
            }),
          ])
        );

        expect(
          causeInput.mode
        ).toBe(
          "cause-reasoning"
        );

        expect(
          causeInput.report
            .reportEvidence
        ).toEqual(
          latestReport
            .reportEvidence
        );

        expect(
          causeInput.report
            .reportEvidence
        ).toHaveLength(
          2
        );

        expect(
          nextStepInput.mode
        ).toBe(
          "next-step"
        );

        expect(
          nextStepInput.report
            .reportEvidence
        ).toEqual(
          latestReport
            .reportEvidence
        );

        expect(
          nextStepInput.report
            .reportEvidence
        ).toHaveLength(
          2
        );
      }
    );
  }
);
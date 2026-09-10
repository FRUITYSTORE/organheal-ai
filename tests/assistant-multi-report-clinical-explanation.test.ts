import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  enhanceAssistantMultiReportClinicalResponse,
  generateAssistantMultiReportClinicalResponseOutcome,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/assistant-multi-report-clinical-explanation.service";

import {
  validateAssistantMultiReportClinicalExplanation,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/validate-assistant-multi-report-clinical-explanation";

import type {
  AssistantMultiReportClinicalExplanationClient,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/assistant-multi-report-clinical-explanation.types";

import type {
  PatientClinicalLongitudinalComparison,
} from "@/lib/application/clinical/patient-clinical-longitudinal-comparison.service";

import type {
  AssistantOrchestratorResult,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

function buildComparison():
  PatientClinicalLongitudinalComparison {
  return {
    reportIds: [
      3,
      2,
      1,
    ],

    reportCount:
      3,

    markerSeries: [
      {
        marker:
          "LDL",

        unit:
          "mg/dL",

        points: [
          {
            reportId:
              1,

            reportDate:
              "2026-07-01T00:00:00.000Z",

            value:
              180,

            unit:
              "mg/dL",

            status:
              "High",

            referenceLow:
              0,

            referenceHigh:
              100,

            referenceSource:
              "report",
          },

          {
            reportId:
              2,

            reportDate:
              "2026-08-01T00:00:00.000Z",

            value:
              160,

            unit:
              "mg/dL",

            status:
              "High",

            referenceLow:
              0,

            referenceHigh:
              100,

            referenceSource:
              "report",
          },

          {
            reportId:
              3,

            reportDate:
              "2026-09-01T00:00:00.000Z",

            value:
              140,

            unit:
              "mg/dL",

            status:
              "High",

            referenceLow:
              0,

            referenceHigh:
              100,

            referenceSource:
              "report",
          },
        ],

        direction:
          "decreasing",

        clinicalTrend:
          "improved",

        comparable:
          true,

        limitation:
          null,
      },
    ],

    comparableMarkerCount:
      1,

    limitations: [
      "A numeric trend does not by itself establish a diagnosis or explain the cause of a change.",
    ],
  };
}

function buildDeterministicResult(
  urgency:
    "none" | "emergency" =
      "none"
): AssistantOrchestratorResult {
  return {
    response:
      "deterministic fallback",

    reasoning: {
      mode:
        "answer",

      clinicalUrgencyLevel:
        urgency,

      productNavigation:
        null,

      clinicalNarrative:
        "deterministic comparison",
    },
  } as unknown as
    AssistantOrchestratorResult;
}

function buildValidExplanation() {
  return {
    overview:
      "LDL decreased across the three reports.",

    importantChanges: [
      {
        marker:
          "LDL",

        explanation:
          "The value moved closer to the supplied reference range across the available reports.",

        importance:
          "important",

        confidence:
          "high",
      },
    ],

    patterns:
      [],

    possibleContributors:
      [],

    missingContext:
      [],

    nextSteps: [
      "Continue reviewing the lipid trend with a licensed clinician.",
    ],

    questionsForClinician:
      [],

    limitations: [
      "The trend does not establish why LDL changed.",
    ],
  };
}

describe(
  "assistant multi-report clinical explanation",
  () => {
    beforeEach(
      () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );
      }
    );

    afterEach(
      () => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
      }
    );

    it(
      "accepts a valid grounded explanation",
      () => {
        const result =
          validateAssistantMultiReportClinicalExplanation(
            buildValidExplanation(),
            buildComparison()
          );

        expect(
          result
        ).not.toBeNull();

        expect(
          result
            ?.importantChanges[0]
            ?.marker
        ).toBe(
          "LDL"
        );
      }
    );

    it(
      "rejects a marker that is not present in the resolved comparison",
      () => {
        const invalid = {
          ...buildValidExplanation(),

          importantChanges: [
            {
              marker:
                "Troponin",

              explanation:
                "Invented marker.",

              importance:
                "important",

              confidence:
                "high",
            },
          ],
        };

        const result =
          validateAssistantMultiReportClinicalExplanation(
            invalid,
            buildComparison()
          );

        expect(
          result
        ).toBeNull();
      }
    );

    it(
      "uses the validated AI explanation while preserving the deterministic trend label",
      async () => {
        const client: AssistantMultiReportClinicalExplanationClient =
          {
            generate:
              vi.fn(
                async () =>
                  buildValidExplanation()
              ),
          };

        const result =
          await enhanceAssistantMultiReportClinicalResponse({
            question:
              "قارن آخر 3 تقارير",

            language:
              "ar",

            comparison:
              buildComparison(),

            deterministicResult:
              buildDeterministicResult(),

            semanticRoutingDecision:
              null,

            client,

            requestId:
              "req-test",
          });

        expect(
          client.generate
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result.response
        ).not.toBe(
          "deterministic fallback"
        );

        expect(
          result.response
        ).toContain(
          "LDL"
        );

        expect(
          result.response
        ).toContain(
          "[تحسن]"
        );

        expect(
          result.reasoning
            .clinicalNarrative
        ).toBe(
          result.response
        );
      }
    );

    it(
      "falls back to the deterministic comparison when model output fails validation",
      async () => {
        const client: AssistantMultiReportClinicalExplanationClient =
          {
            generate:
              vi.fn(
                async () => ({
                  ...buildValidExplanation(),

                  importantChanges: [
                    {
                      marker:
                        "Invented Marker",

                      explanation:
                        "Invalid.",

                      importance:
                        "important",

                      confidence:
                        "high",
                    },
                  ],
                })
              ),
          };

        const result =
          await enhanceAssistantMultiReportClinicalResponse({
            question:
              "قارن آخر 3 تقارير",

            language:
              "ar",

            comparison:
              buildComparison(),

            deterministicResult:
              buildDeterministicResult(),

            semanticRoutingDecision:
              null,

            client,

            requestId:
              "req-test",
          });

        expect(
          result.response
        ).toBe(
          "deterministic fallback"
        );
      }
    );

    it(
      "falls back safely when the provider fails",
      async () => {
        const client: AssistantMultiReportClinicalExplanationClient =
          {
            generate:
              vi.fn(
                async () => {
                  throw new Error(
                    "provider unavailable"
                  );
                }
              ),
          };

        const result =
          await enhanceAssistantMultiReportClinicalResponse({
            question:
              "قارن آخر 3 تقارير",

            language:
              "ar",

            comparison:
              buildComparison(),

            deterministicResult:
              buildDeterministicResult(),

            semanticRoutingDecision:
              null,

            client,

            requestId:
              "req-test",
          });

        expect(
          result.response
        ).toBe(
          "deterministic fallback"
        );
      }
    );

    it(
      "does not invoke generative clinical explanation when deterministic urgency is authoritative",
      async () => {
        const client: AssistantMultiReportClinicalExplanationClient =
          {
            generate:
              vi.fn(),
          };

        const result =
          await enhanceAssistantMultiReportClinicalResponse({
            question:
              "قارن آخر 3 تقارير",

            language:
              "ar",

            comparison:
              buildComparison(),

            deterministicResult:
              buildDeterministicResult(
                "emergency"
              ),

            semanticRoutingDecision:
              null,

            client,

            requestId:
              "req-test",
          });

        expect(
          client.generate
        ).not.toHaveBeenCalled();

        expect(
          result.response
        ).toBe(
          "deterministic fallback"
        );
      }
    );
  }
);
describe(
  "multi-report clinical generation outcome contract",
  () => {
    afterEach(
      () => {
        vi.unstubAllEnvs();
      }
    );

    it(
      "returns completed for a validated multi-report clinical explanation",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const client:
          AssistantMultiReportClinicalExplanationClient = {
            generate:
              vi.fn(
                async () =>
                  buildValidExplanation()
              ),
          };

        const outcome =
          await generateAssistantMultiReportClinicalResponseOutcome({
            question:
              "Compare my latest reports.",

            language:
              "en",

            comparison:
              buildComparison(),

            deterministicResult:
              buildDeterministicResult(),

            semanticRoutingDecision:
              null,

            client,

            requestId:
              "req_multi_outcome_completed",
          });

        expect(
          outcome.status
        ).toBe(
          "completed"
        );

        expect(
          outcome.result.reasoning
            .clinicalNarrative
        ).toBeTruthy();
      }
    );

    it(
      "returns validation-rejected when multi-report model output fails validation",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const client:
          AssistantMultiReportClinicalExplanationClient = {
            generate:
              vi.fn(
                async () => ({
                  ...buildValidExplanation(),

                  importantChanges: [
                    {
                      marker:
                        "Invented Marker",

                      explanation:
                        "Invalid.",

                      importance:
                        "important",

                      confidence:
                        "high",
                    },
                  ],
                })
              ),
          };

        const deterministicResult =
          buildDeterministicResult();

        const outcome =
          await generateAssistantMultiReportClinicalResponseOutcome({
            question:
              "Compare my latest reports.",

            language:
              "en",

            comparison:
              buildComparison(),

            deterministicResult,

            semanticRoutingDecision:
              null,

            client,

            requestId:
              "req_multi_outcome_validation",
          });

        expect(
          outcome.status
        ).toBe(
          "validation-rejected"
        );

        expect(
          outcome.result
        ).toBe(
          deterministicResult
        );
      }
    );

    it(
      "returns provider-failed when the multi-report clinical provider fails",
      async () => {
        vi.stubEnv(
          "OPENAI_CLINICAL_EXPLANATION_ENABLED",
          "true"
        );

        const client:
          AssistantMultiReportClinicalExplanationClient = {
            generate:
              vi.fn(
                async () => {
                  throw new Error(
                    "provider unavailable"
                  );
                }
              ),
          };

        const deterministicResult =
          buildDeterministicResult();

        const outcome =
          await generateAssistantMultiReportClinicalResponseOutcome({
            question:
              "Compare my latest reports.",

            language:
              "en",

            comparison:
              buildComparison(),

            deterministicResult,

            semanticRoutingDecision:
              null,

            client,

            requestId:
              "req_multi_outcome_provider_failed",
          });

        expect(
          outcome.status
        ).toBe(
          "provider-failed"
        );

        expect(
          outcome.result
        ).toBe(
          deterministicResult
        );

        expect(
          outcome.result.reasoning
            .clinicalNarrative
        ).toBe(
          "deterministic comparison"
        );
      }
    );
  }
);
import { describe, expect, it } from "vitest";

import { buildAssistantResponseContract } from "@/lib/health-intelligence/application/assistant-response-contract.service";

import type { AssistantOrchestratorResult } from "@/lib/health-intelligence/application/assistant-orchestrator.service";

function createOrchestratorResult(
  overrides: {
    mode?: "clarify" | "answer";

    response?: string;

    clinicalNarrative?: string | null;

    clinicalDecisionTrace?: unknown;

    clinicalHypothesisRanking?: unknown;

    clinicalConfidenceCalibration?: unknown;

    clarifyingQuestion?: string | null;
  } = {},
): AssistantOrchestratorResult {
  return {
    success: true,

    response: overrides.response ?? "Assistant response",

    clinicalReasoningState:
      null,

    reasoning: {
      mode: overrides.mode ?? "answer",

      status: "sufficient",

      confidence: "moderate",

      availableEvidence: [],

      missingInformation: [],

      questionIntent: "general",

      productNavigation: null,

      questionEvidenceStatus: "sufficient",

      questionEvidenceConfidence: "moderate",

      questionAvailableEvidence: [],

      questionMissingInformation: [],

      clinicalHypothesisRanking: overrides.clinicalHypothesisRanking ?? null,

      clinicalConflictResolution: null,

      clinicalConfidenceCalibration:
        overrides.clinicalConfidenceCalibration ?? null,

      clinicalDecisionTrace: overrides.clinicalDecisionTrace,

      clinicalNarrative: overrides.clinicalNarrative,

      clarifyingQuestion: overrides.clarifyingQuestion ?? null,

      reason: null,
    },
  };
}

describe("Assistant response contract", () => {
  it("maps an orchestrator result to the stable public contract", () => {
    const result = buildAssistantResponseContract(
      createOrchestratorResult({
        response: "Review your latest health plan.",
      }),
    );

    expect(result).toEqual({
      success: true,

      response: "Review your latest health plan.",

      clinicalInterviewId:
        null,


      action:
        null,

      reasoning: {
        mode: "answer",

        status: "sufficient",

        confidence: "moderate",

        intent: "general",

        clarification: null,

        narrative: null,

        hasDecisionTrace: false,

        hasClinicalInterpretation: false,
      },
    });
  });

  it("exposes a safe clinical narrative without exposing internal engine objects", () => {
    const result = buildAssistantResponseContract(
      createOrchestratorResult({
        clinicalNarrative:
          "The available evidence supports a provisional interpretation.",

        clinicalDecisionTrace: {
          available: true,

          hypothesisId: "hypothesis:test",
        },

        clinicalHypothesisRanking: {
          rankedHypotheses: [
            {
              id: "internal-ranking",
            },
          ],
        },

        clinicalConfidenceCalibration: {
          calibratedCount: 1,
        },
      }),
    );

    expect(result.reasoning.narrative).toBe(
      "The available evidence supports a provisional interpretation.",
    );

    expect(result.reasoning.hasDecisionTrace).toBe(true);

    expect(result.reasoning.hasClinicalInterpretation).toBe(true);

    expect(result.reasoning).not.toHaveProperty("clinicalHypothesisRanking");

    expect(result.reasoning).not.toHaveProperty("clinicalDecisionTrace");
  });

  it("preserves clarification behavior", () => {
    const result = buildAssistantResponseContract(
      createOrchestratorResult({
        mode: "clarify",

        response: "Which result are you concerned about?",

        clarifyingQuestion: "Which result are you concerned about?",
      }),
    );

    expect(result.reasoning.mode).toBe("clarify");

    expect(result.reasoning.clarification).toBe(
      "Which result are you concerned about?",
    );

    expect(result.response).toBe("Which result are you concerned about?");
  });

  it("treats blank narrative text as unavailable", () => {
    const result = buildAssistantResponseContract(
      createOrchestratorResult({
        clinicalNarrative: "   ",
      }),
    );

    expect(result.reasoning.narrative).toBeNull();
  });

  it("does not mark an unavailable decision trace as available", () => {
    const result = buildAssistantResponseContract(
      createOrchestratorResult({
        clinicalDecisionTrace: {
          available: false,
        },
      }),
    );

    expect(result.reasoning.hasDecisionTrace).toBe(false);
  });
});

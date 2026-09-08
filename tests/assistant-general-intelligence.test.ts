import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  enhanceAssistantGeneralResponse,
} from "@/lib/health-intelligence/application/assistant-general-intelligence/assistant-general-intelligence.service";

import type {
  AssistantGeneralIntelligenceClient,
} from "@/lib/health-intelligence/application/assistant-general-intelligence/assistant-general-intelligence.types";

import type {
  AssistantOrchestratorResult,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import type {
  AssistantSemanticRoutingDecision,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-routing.types";

function createResult(
  mode:
    "answer" | "clarify" =
      "answer"
): AssistantOrchestratorResult {
  return {
    success:
      true,

    response:
      "Deterministic fallback.",

    clinicalReasoningState:
      null,

    reasoning: {
      mode,

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
        "general",

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
        mode === "clarify"
          ? "What do you mean?"
          : null,

      reason:
        null,
    },
  };
}

function createDecision(
  domain:
    AssistantSemanticRoutingDecision["domain"],
  referentStatus:
    "resolved" |
    "ambiguous" |
    "missing" =
      "resolved"
): AssistantSemanticRoutingDecision {
  return {
    domain,

    confidence:
      "high",

    source:
      "model",

    productDestination:
      null,

    requiresConversationContext:
      false,

    reason:
      null,

    understanding: {
      goals: [
        "general",
      ],

      primaryGoal:
        "general",

      subject: {
        kind:
          domain ===
          "general_conversation"
            ? "general-topic"
            : "general-health",

        value:
          referentStatus ===
          "resolved"
            ? "resolved topic"
            : null,
      },

      reportReference:
        null,

      referentStatus,

      referentConfidence:
        referentStatus ===
        "resolved"
          ? "high"
          : "low",

      isFollowUp:
        false,

      refersToPreviousTurn:
        false,

      needsReportEvidence:
        false,

      needsHistory:
        false,

      asksForDiagnosis:
        false,

      asksForUrgency:
        false,

      asksForAction:
        false,

      requestedDepth:
        "normal",
    },
  };
}

function createClient(
  response =
    "Generated general answer."
) {
  const generate =
    vi.fn()
      .mockResolvedValue(
        response
      );

  const client:
    AssistantGeneralIntelligenceClient = {
      generate,
    };

  return {
    client,
    generate,
  };
}

describe(
  "assistant general intelligence",
  () => {
    it(
      "answers an open-ended non-medical question without a predefined intent",
      async () => {
        const {
          client,
          generate,
        } =
          createClient(
            "Oslo is the capital of Norway."
          );

        const result =
          await enhanceAssistantGeneralResponse({
            message:
              "شو عاصمة النرويج؟",

            language:
              "ar",

            conversation:
              [],

            semanticRoutingDecision:
              createDecision(
                "general_conversation"
              ),

            deterministicResult:
              createResult(),

            client,
          });

        expect(
          generate
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result.response
        ).toBe(
          "Oslo is the capital of Norway."
        );
      }
    );

    it(
      "allows novel general health education without requiring a predefined marker handler",
      async () => {
        const {
          client,
          generate,
        } =
          createClient(
            "Procalcitonin can rise in several inflammatory contexts."
          );

        const result =
          await enhanceAssistantGeneralResponse({
            message:
              "ليش procalcitonin ممكن يعلى؟",

            language:
              "ar",

            conversation:
              [],

            semanticRoutingDecision:
              createDecision(
                "general_health"
              ),

            deterministicResult:
              createResult(),

            client,
          });

        expect(
          generate
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result.response
        ).toContain(
          "Procalcitonin"
        );
      }
    );

    it(
      "does not override genuine ambiguity clarification",
      async () => {
        const {
          client,
          generate,
        } =
          createClient();

        const deterministicResult =
          createResult(
            "clarify"
          );

        deterministicResult.response =
          "تقصد أي نتيجة بالتحديد؟";

        const result =
          await enhanceAssistantGeneralResponse({
            message:
              "ليش؟",

            language:
              "ar",

            conversation:
              [],

            semanticRoutingDecision:
              createDecision(
                "general_conversation",
                "ambiguous"
              ),

            deterministicResult,

            client,
          });

        expect(
          generate
        ).not.toHaveBeenCalled();

        expect(
          result.response
        ).toBe(
          "تقصد أي نتيجة بالتحديد؟"
        );
      }
    );

    it(
      "does not steal patient-specific clinical questions",
      async () => {
        const {
          client,
          generate,
        } =
          createClient();

        const decision =
          createDecision(
            "clinical_question"
          );

        if (
          decision.understanding
        ) {
          decision.understanding
            .needsReportEvidence =
              true;

          decision.understanding
            .subject = {
              kind:
                "marker",

              value:
                "LDL",
            };
        }

        const result =
          await enhanceAssistantGeneralResponse({
            message:
              "ليش LDL عندي مرتفع؟",

            language:
              "ar",

            conversation:
              [],

            semanticRoutingDecision:
              decision,

            deterministicResult:
              createResult(),

            client,
          });

        expect(
          generate
        ).not.toHaveBeenCalled();

        expect(
          result.response
        ).toBe(
          "Deterministic fallback."
        );
      }
    );

    it(
      "falls back safely when the provider fails",
      async () => {
        const generate =
          vi.fn()
            .mockRejectedValue(
              new Error(
                "provider unavailable"
              )
            );

        const client:
          AssistantGeneralIntelligenceClient = {
            generate,
          };

        const result =
          await enhanceAssistantGeneralResponse({
            message:
              "Explain quantum computing.",

            language:
              "en",

            conversation:
              [],

            semanticRoutingDecision:
              createDecision(
                "general_conversation"
              ),

            deterministicResult:
              createResult(),

            client,
          });

        expect(
          result.response
        ).toBe(
          "Deterministic fallback."
        );
      }
    );
  }
);
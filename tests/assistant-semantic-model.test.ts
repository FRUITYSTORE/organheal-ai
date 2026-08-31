import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  resolveAssistantSemanticRoutingWithModel,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-model.service";

import type {
  AssistantSemanticRoutingInput,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-routing.types";

function createInput(
  overrides: Partial<AssistantSemanticRoutingInput> = {}
): AssistantSemanticRoutingInput {
  return {
    currentMessage:
      "طيب وين بلاقيه؟",

    language:
      "ar",

    conversation:
      [],

    deterministicDecision: {
      domain:
        "unclear",

      confidence:
        "low",

      source:
        "deterministic",

      productDestination:
        null,

      requiresConversationContext:
        true,

      reason:
        null,
    },

    ...overrides,
  };
}

describe(
  "assistant semantic model routing",
  () => {
    it(
      "does not call the model when deterministic routing is already clear",
      async () => {
        const classify =
          vi.fn();

        const input =
          createInput({
            deterministicDecision: {
              domain:
                "product_navigation",

              confidence:
                "high",

              source:
                "deterministic",

              productDestination:
                "reports",

              requiresConversationContext:
                false,

              reason:
                "Matched a known product navigation intent.",
            },
          });

        const result =
          await resolveAssistantSemanticRoutingWithModel({
            input,

            client: {
              classify,
            },
          });

        expect(
          classify
        ).not.toHaveBeenCalled();

        expect(result).toBe(
          input.deterministicDecision
        );
      }
    );

    it(
      "uses a valid model classification for an unclear request",
      async () => {
        const classify =
          vi.fn().mockResolvedValue({
            domain:
              "product_navigation",

            confidence:
              "high",

            productDestination:
              "view-results",

            requiresConversationContext:
              true,

            reason:
              "The follow-up refers to previously discussed results.",
          });

        const result =
          await resolveAssistantSemanticRoutingWithModel({
            input:
              createInput(),

            client: {
              classify,
            },
          });

        expect(
          classify
        ).toHaveBeenCalledOnce();

        expect(result).toEqual({
          domain:
            "product_navigation",

          confidence:
            "high",

          source:
            "model",

          productDestination:
            "view-results",

          requiresConversationContext:
            true,

          reason:
            "The follow-up refers to previously discussed results.",
        });
      }
    );

    it(
      "falls back to the deterministic decision when model output is invalid",
      async () => {
        const input =
          createInput();

        const result =
          await resolveAssistantSemanticRoutingWithModel({
            input,

            client: {
              classify:
                vi.fn().mockResolvedValue({
                  domain:
                    "product_navigation",

                  confidence:
                    "high",

                  productDestination:
                    "admin",

                  requiresConversationContext:
                    false,

                  reason:
                    null,
                }),
            },
          });

        expect(result).toBe(
          input.deterministicDecision
        );
      }
    );

    it(
      "falls back safely when the model client fails",
      async () => {
        const input =
          createInput();

        const result =
          await resolveAssistantSemanticRoutingWithModel({
            input,

            client: {
              classify:
                vi.fn().mockRejectedValue(
                  new Error(
                    "Model unavailable"
                  )
                ),
            },
          });

        expect(result).toBe(
          input.deterministicDecision
        );
      }
    );
  }
);
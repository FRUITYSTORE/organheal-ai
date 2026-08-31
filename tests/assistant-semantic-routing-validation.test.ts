import {
  describe,
  expect,
  it,
} from "vitest";

import {
  validateAssistantSemanticRoutingDecision,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/validate-assistant-semantic-routing";

describe(
  "assistant semantic routing validation",
  () => {
    it(
      "accepts a valid product navigation decision",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
            domain:
              "product_navigation",

            confidence:
              "high",

            productDestination:
              "view-results",

            requiresConversationContext:
              false,

            reason:
              "The user wants to find their results.",
          });

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
            false,

          reason:
            "The user wants to find their results.",
        });
      }
    );

    it(
      "accepts a valid clinical classification without a product destination",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
            domain:
              "clinical_question",

            confidence:
              "high",

            productDestination:
              null,

            requiresConversationContext:
              false,

            reason:
              "The user is asking about the meaning of a report finding.",
          });

        expect(
          result?.domain
        ).toBe(
          "clinical_question"
        );

        expect(
          result?.productDestination
        ).toBeNull();

        expect(
          result?.source
        ).toBe(
          "model"
        );
      }
    );

    it(
      "rejects an unknown product destination",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
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
          });

        expect(result).toBeNull();
      }
    );

    it(
      "rejects product navigation without a destination",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
            domain:
              "product_navigation",

            confidence:
              "high",

            productDestination:
              null,

            requiresConversationContext:
              false,

            reason:
              null,
          });

        expect(result).toBeNull();
      }
    );

    it(
      "rejects a product destination attached to a clinical question",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
            domain:
              "clinical_question",

            confidence:
              "high",

            productDestination:
              "reports",

            requiresConversationContext:
              false,

            reason:
              null,
          });

        expect(result).toBeNull();
      }
    );

    it(
      "rejects malformed model output",
      () => {
        expect(
          validateAssistantSemanticRoutingDecision(
            "product_navigation"
          )
        ).toBeNull();

        expect(
          validateAssistantSemanticRoutingDecision(
            null
          )
        ).toBeNull();

        expect(
          validateAssistantSemanticRoutingDecision({
            domain:
              "product_navigation",
          })
        ).toBeNull();
      }
    );

    it(
      "rejects an unsupported domain",
      () => {
        const result =
          validateAssistantSemanticRoutingDecision({
            domain:
              "diagnose_patient",

            confidence:
              "high",

            productDestination:
              null,

            requiresConversationContext:
              false,

            reason:
              null,
          });

        expect(result).toBeNull();
      }
    );
  }
);
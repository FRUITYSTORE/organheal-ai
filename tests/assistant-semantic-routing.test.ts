import {
  describe,
  expect,
  it,
} from "vitest";

import {
  resolveAssistantSemanticRouting,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/resolve-assistant-semantic-routing";

describe(
  "assistant semantic routing",
  () => {
    it(
      "routes an explicit product request to product navigation",
      () => {
        const result =
          resolveAssistantSemanticRouting(
            "Open my reports"
          );

        expect(
          result.domain
        ).toBe(
          "product_navigation"
        );

        expect(
          result.productDestination
        ).toBe(
          "reports"
        );

        expect(
          result.source
        ).toBe(
          "deterministic"
        );
      }
    );

    it(
      "routes a report comparison question to clinical reasoning",
      () => {
        const result =
          resolveAssistantSemanticRouting(
            "Compare my latest reports"
          );

        expect(
          result.domain
        ).toBe(
          "clinical_question"
        );

        expect(
          result.productDestination
        ).toBeNull();
      }
    );

    it(
      "routes a health journey question to journey intelligence",
      () => {
        const result =
          resolveAssistantSemanticRouting(
            "What changed recently"
          );

        expect(
          result.domain
        ).toBe(
          "health_journey"
        );

        expect(
          result.productDestination
        ).toBeNull();
      }
    );

    it(
      "does not mistake a clinical report question for navigation",
      () => {
        const result =
          resolveAssistantSemanticRouting(
            "What changed between my reports?"
          );

        expect(
          result.domain
        ).toBe(
          "clinical_question"
        );

        expect(
          result.productDestination
        ).toBeNull();
      }
    );

    it(
      "leaves an unsupported colloquial request for semantic understanding",
      () => {
        const result =
          resolveAssistantSemanticRouting(
            "يا زلمة الفحص اللي رفعته مبارح وين راح؟"
          );

        expect(
          result.domain
        ).toBe(
          "unclear"
        );

        expect(
          result.confidence
        ).toBe(
          "low"
        );

        expect(
          result.requiresConversationContext
        ).toBe(
          true
        );
      }
    );

    it(
      "does not classify an unknown message as general health automatically",
      () => {
        const result =
          resolveAssistantSemanticRouting(
            "طيب شو أعمل هسا؟"
          );

        expect(
          result.domain
        ).toBe(
          "unclear"
        );

        expect(
          result.requiresConversationContext
        ).toBe(
          true
        );
      }
    );
  }
);
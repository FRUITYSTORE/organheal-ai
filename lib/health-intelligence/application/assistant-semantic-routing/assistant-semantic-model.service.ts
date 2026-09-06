import type {
  AssistantSemanticRoutingDecision,
  AssistantSemanticRoutingInput,
} from "./assistant-semantic-routing.types";

import {
  validateAssistantSemanticRoutingDecision,
} from "./validate-assistant-semantic-routing";

export type AssistantSemanticModelClient = {
  classify: (
    input: AssistantSemanticRoutingInput
  ) => Promise<unknown>;
};

export async function resolveAssistantSemanticRoutingWithModel({
  input,
  client,
}: {
  input:
    AssistantSemanticRoutingInput;

  client:
    AssistantSemanticModelClient;
}): Promise<AssistantSemanticRoutingDecision> {
  /*
   * Explicit deterministic product navigation is intentionally
   * preserved without an additional model call.
   *
   * Clinical, journey, general-health, and unclear messages are
   * allowed through the semantic model so OrganHeal can understand
   * multi-goal questions, colloquial language, and follow-up
   * references instead of relying only on keyword classifiers.
   */
  if (
    input.deterministicDecision.domain ===
      "product_navigation" &&
    input.deterministicDecision.confidence ===
      "high"
  ) {
    return input.deterministicDecision;
  }

  try {
    const modelResult =
      await client.classify(
        input
      );

    const validatedResult =
      validateAssistantSemanticRoutingDecision(
        modelResult
      );

    if (!validatedResult) {
      return input.deterministicDecision;
    }

    /*
     * Known deterministic clinical/journey domains remain routing
     * authority while the model enriches them with semantic
     * understanding.
     *
     * This prevents a semantic-model classification drift from
     * overriding an already-established product capability.
     */
    if (
      input.deterministicDecision.domain !==
      "unclear"
    ) {
      return {
        ...validatedResult,

        domain:
          input.deterministicDecision.domain,

        productDestination:
          input.deterministicDecision.productDestination,

        reason:
          validatedResult.reason ??
          input.deterministicDecision.reason,
      };
    }

    return validatedResult;
  } catch {
    return input.deterministicDecision;
  }
}
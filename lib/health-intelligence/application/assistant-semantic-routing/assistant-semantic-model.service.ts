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
  if (
    input.deterministicDecision.domain !==
    "unclear"
  ) {
    return input.deterministicDecision;
  }

  try {
    const modelResult =
      await client.classify(input);

    const validatedResult =
      validateAssistantSemanticRoutingDecision(
        modelResult
      );

    if (!validatedResult) {
      return input.deterministicDecision;
    }

    return validatedResult;
  } catch {
    return input.deterministicDecision;
  }
}
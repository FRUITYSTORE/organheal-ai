import {
  logApiError,
  logApiInfo,
} from "@/lib/api/api-logger";

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

function isAuthoritativeStructuredReportComparison(
  decision:
    AssistantSemanticRoutingDecision
): boolean {
  const understanding =
    decision.understanding;

  if (
    !understanding
  ) {
    return false;
  }

  const reportReference =
    understanding.reportReference;

  return (
    decision.source ===
      "deterministic" &&
    decision.domain ===
      "clinical_question" &&
    decision.confidence ===
      "high" &&
    understanding.primaryGoal ===
      "compare" &&
    understanding.goals.includes(
      "compare"
    ) &&
    understanding.needsReportEvidence ===
      true &&
    understanding.needsHistory ===
      true &&
    reportReference?.kind ===
      "latest" &&
    typeof reportReference.count ===
      "number" &&
    reportReference.count >=
      2
  );
}

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
   * Explicit high-confidence product navigation requires no model.
   */
  if (
    input.deterministicDecision.domain ===
      "product_navigation" &&
    input.deterministicDecision.confidence ===
      "high"
  ) {
    return input
      .deterministicDecision;
  }

  /*
   * A fully structured, explicit latest-N report comparison also
   * requires no semantic-model call.
   *
   * The server-side report resolver remains responsible for choosing
   * the actual authenticated report records.
   */
  if (
    isAuthoritativeStructuredReportComparison(
      input.deterministicDecision
    )
  ) {
    return input
      .deterministicDecision;
  }

  try {
    /*
     * One semantic call only.
     *
     * Semantic routing is an enrichment layer. Retrying a failed
     * semantic call inside the same request unnecessarily increases
     * cost and latency, while the deterministic fallback remains
     * available.
     */
    const modelResult =
      await client.classify(
        input
      );

    const validatedResult =
      validateAssistantSemanticRoutingDecision(
        modelResult
      );

    if (
      !validatedResult
    ) {
      logApiInfo(
        "assistant.semantic_model.validation_failed",
        {
          fallbackDomain:
            input
              .deterministicDecision
              .domain,

          fallbackConfidence:
            input
              .deterministicDecision
              .confidence,
        }
      );

      return input
        .deterministicDecision;
    }

    /*
     * Known deterministic clinical/journey domains remain routing
     * authority while the model may enrich semantic understanding.
     */
    if (
      input.deterministicDecision.domain !==
      "unclear"
    ) {
      return {
        ...validatedResult,

        domain:
          input
            .deterministicDecision
            .domain,

        productDestination:
          input
            .deterministicDecision
            .productDestination,

        reason:
          validatedResult.reason ??
          input
            .deterministicDecision
            .reason,
      };
    }

    return validatedResult;
  } catch (
    error
  ) {
    logApiError(
      "assistant.semantic_model.failed",
      error,
      {
        fallbackDomain:
          input
            .deterministicDecision
            .domain,

        fallbackConfidence:
          input
            .deterministicDecision
            .confidence,
      }
    );

    return input
      .deterministicDecision;
  }
}
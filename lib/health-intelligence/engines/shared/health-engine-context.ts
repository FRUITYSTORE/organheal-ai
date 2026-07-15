import type {
  HealthIntelligenceContext,
} from "../../context/health-intelligence-context";

import {
  buildHealthFacts,
  type HealthFacts,
} from "../../facts/health-facts";

import {
  buildHealthReasoning,
  type HealthReasoning,
} from "../../reasoning/health-reasoning";

export type HealthEngineContext = {
  context: HealthIntelligenceContext;
  facts: HealthFacts;
  reasoning: HealthReasoning;
};

export function buildHealthEngineContext(
  context: HealthIntelligenceContext
): HealthEngineContext {
  const facts =
    buildHealthFacts(context);

  const reasoning =
    buildHealthReasoning(facts);

  return {
    context,
    facts,
    reasoning,
  };
}
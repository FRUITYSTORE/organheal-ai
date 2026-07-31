import type {
  GeneratedHypothesisCandidate,
  HypothesisGenerationContext,
  HypothesisGenerationRule,
} from "../evidence-backed-reasoning";
import {
  evidencePatternGenerator,
} from "./evidence-pattern.generator";
/*
 * Provenance information preserved for every executed
 * hypothesis generation rule.
 */
export type HypothesisGenerationExecution = {
  ruleId: string;
  ruleName: string;

  generatedCandidates:
    GeneratedHypothesisCandidate[];
};

/*
 * Registry execution result.
 *
 * The registry is responsible only for coordinating rule
 * execution. It does not evaluate, rank, or filter the
 * generated candidates.
 */
export type HypothesisGenerationRegistryResult = {
  executions:
    HypothesisGenerationExecution[];

  generatedCandidates:
    GeneratedHypothesisCandidate[];
};

/*
 * Central registry for deterministic and bounded hypothesis
 * generation rules.
 *
 * Registry order is preserved and therefore execution order
 * is deterministic.
 */
export const hypothesisGenerationRules:
  HypothesisGenerationRule[] = [
    evidencePatternGenerator,
  ];

/*
 * Executes every registered generation rule.
 *
 * Individual rules decide whether they match the supplied
 * evidence and may legitimately return zero candidates.
 */
export function runGenerationRegistry(
  context: HypothesisGenerationContext
): HypothesisGenerationRegistryResult {
  const executions:
    HypothesisGenerationExecution[] = [];

  const generatedCandidates:
    GeneratedHypothesisCandidate[] = [];

  for (const rule of hypothesisGenerationRules) {
    const candidates =
      rule.generate(context);

    const preservedCandidates = [
      ...candidates,
    ];

    executions.push({
      ruleId: rule.id,
      ruleName: rule.name,
      generatedCandidates:
        preservedCandidates,
    });

    generatedCandidates.push(
      ...preservedCandidates
    );
  }

  return {
    executions,
    generatedCandidates,
  };
}
import type {
  HypothesisGenerationRule,
} from "../evidence-backed-reasoning";

import {
  evidencePatternGenerator,
} from "./evidence-pattern.generator";

import {
  reportEvidencePatternGenerator,
} from "./report-evidence-pattern.generator";

const REGISTERED_HYPOTHESIS_GENERATORS:
  readonly HypothesisGenerationRule[] = [
    evidencePatternGenerator,
    reportEvidencePatternGenerator,
  ];

export function getRegisteredHypothesisGenerators():
  HypothesisGenerationRule[] {
  return [
    ...REGISTERED_HYPOTHESIS_GENERATORS,
  ];
}
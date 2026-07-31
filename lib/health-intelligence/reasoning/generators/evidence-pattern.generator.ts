import type {
  GeneratedHypothesisCandidate,
  HypothesisGenerationRule,
} from "../evidence-backed-reasoning";

export const evidencePatternGenerator:
  HypothesisGenerationRule = {
  id: "evidence-pattern",

  name:
    "Evidence Pattern Generator",

  generate(context) {
    if (
      !context.readyForHypothesisReasoning ||
      !context.hypothesisGate.allowed
    ) {
      return [];
    }

    const supportingEvidence = [
      ...context.confirmedEvidence,
    ];

    const candidate: GeneratedHypothesisCandidate =
      {
        candidate: {
          id:
            "bounded-evidence-interpretation",

          title:
            "Bounded Evidence-Based Clinical Interpretation",

          supportingEvidence,

          rationale:
            "The available confirmed evidence supports generating a bounded clinical interpretation suitable for structured evaluation.",

          requestedConfidence:
            "low",
        },

        generation: {
          generatorId:
            "evidence-pattern-generator",

          generatorVersion:
            "1.0",

          source:
            "rule-engine",

          mode:
            "deterministic",

          generationReason:
            "Basic evidence completeness requirements were satisfied.",

          generatedAt:
            new Date().toISOString(),
        },

        diagnosticClaim: false,
      };

    return [candidate];
  },
};
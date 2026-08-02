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

    const missingEvidence: string[] = [];

    if (
      !context.facts.hasReportSummary &&
      !context.facts.hasReportFindings
    ) {
      missingEvidence.push(
        "Recent report summary or key findings"
      );
    }

    if (
      !context.facts.hasReportRiskLevel
    ) {
      missingEvidence.push(
        "Report risk level"
      );
    }

    const hasReportEvidence =
      context.facts.hasReportSummary ||
      context.facts.hasReportFindings;

    const title =
      hasReportEvidence
        ? "Structured Symptom and Report Evidence Pattern"
        : "Structured Symptom Evidence Pattern";

    const rationale =
      hasReportEvidence
        ? "The available symptom details and saved report evidence can be organized into a bounded interpretation. The evidence supports structured review, but it does not establish that the reported symptoms were caused by the report findings."
        : "The available symptom details are complete enough for a bounded structured interpretation. Report evidence is still needed before the symptom pattern can be compared with saved clinical findings.";

    const candidate:
      GeneratedHypothesisCandidate = {
      candidate: {
        id:
          "bounded-evidence-interpretation",

        title,

        supportingEvidence,

        conflictingEvidence: [],

        missingEvidence,

        rationale,

        requestedConfidence:
          "low",
      },

      generation: {
        generatorId:
          "evidence-pattern-generator",

        generatorVersion:
          "1.1",

        source:
          "rule-engine",

        mode:
          "deterministic",

        generationReason:
          hasReportEvidence
            ? "Basic clinical evidence was complete and report evidence was available for bounded comparison."
            : "Basic clinical evidence was complete, but report evidence remained limited.",

        generatedAt:
          new Date().toISOString(),
      },

      diagnosticClaim: false,
    };

    return [candidate];
  },
};
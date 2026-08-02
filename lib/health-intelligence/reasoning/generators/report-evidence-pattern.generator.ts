import type {
  GeneratedHypothesisCandidate,
  HypothesisGenerationRule,
  ReasoningEvidence,
} from "../evidence-backed-reasoning";

function getReportEvidence(
  evidence: ReasoningEvidence[]
): ReasoningEvidence[] {
  return evidence.filter(
    (item) => item.source === "report"
  );
}

function getUserEvidence(
  evidence: ReasoningEvidence[]
): ReasoningEvidence[] {
  return evidence.filter(
    (item) => item.source === "user"
  );
}

export const reportEvidencePatternGenerator:
  HypothesisGenerationRule = {
  id: "report-evidence-pattern",

  name:
    "Report Evidence Pattern Generator",

  generate(context) {
    if (
      !context.readyForHypothesisReasoning ||
      !context.hypothesisGate.allowed
    ) {
      return [];
    }

    const reportEvidence =
      getReportEvidence(
        context.confirmedEvidence
      );

    if (reportEvidence.length === 0) {
      return [];
    }

    const userEvidence =
      getUserEvidence(
        context.confirmedEvidence
      );

    const supportingEvidence = [
      ...reportEvidence,
      ...userEvidence,
    ];

    const missingEvidence: string[] = [];

    if (!context.facts.hasReportFindings) {
      missingEvidence.push(
        "Structured report key findings"
      );
    }

    if (!context.facts.hasReportRiskLevel) {
      missingEvidence.push(
        "Report risk level"
      );
    }

    missingEvidence.push(
      "Clinician-confirmed relationship between the report findings and the reported symptoms"
    );

    const candidate:
      GeneratedHypothesisCandidate = {
      candidate: {
        id:
          "report-supported-clinical-pattern",

        title:
          "Report-Supported Clinical Evidence Pattern",

        supportingEvidence,

        conflictingEvidence: [],

        missingEvidence,

        rationale:
          "The saved report evidence can be reviewed alongside the user-reported clinical information. This supports a structured comparison, but it does not establish that the report findings caused the reported symptoms.",

        requestedConfidence:
          "low",
      },

      generation: {
        generatorId:
          "report-evidence-pattern-generator",

        generatorVersion:
          "1.0",

        source:
          "report-analysis",

        mode:
          "deterministic",

        generationReason:
          "Basic clinical evidence was complete and saved report evidence was available for structured comparison.",

        generatedAt:
          new Date().toISOString(),
      },

      diagnosticClaim: false,
    };

    return [candidate];
  },
};
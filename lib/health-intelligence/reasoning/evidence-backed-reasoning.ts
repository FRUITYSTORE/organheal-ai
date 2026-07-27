export type EvidenceConfidence =
  | "low"
  | "moderate"
  | "high";

export type EvidenceBackedHypothesis = {
  title: string;
  confidence: EvidenceConfidence;
  supportingEvidence: string[];
  conflictingEvidence: string[];
  missingEvidence: string[];
};

export type EvidenceBackedReasoningResult = {
  confirmedEvidence: string[];
  hypotheses: EvidenceBackedHypothesis[];
  leadingInterpretation: string | null;
  uncertainty: string;
  readyForHypothesisReasoning: boolean;
};

export type EvidenceBackedReasoningInput = {
  symptoms: string[];
  onset: string | null;
  severity: string | null;
  associatedSymptoms: string[];
  associatedSymptomsKnown: boolean;

  reportSummary?: string | null;
  reportKeyFindings?: string | null;
  reportRiskLevel?: string | null;
};

export function buildEvidenceBackedReasoning(
  input: EvidenceBackedReasoningInput
): EvidenceBackedReasoningResult {
  const confirmedEvidence: string[] = [];

  if (input.symptoms.length > 0) {
    confirmedEvidence.push(
      `Reported symptoms: ${input.symptoms.join(", ")}`
    );
  }

  if (input.onset) {
    confirmedEvidence.push(
      `Reported onset: ${input.onset}`
    );
  }

  if (input.severity) {
    confirmedEvidence.push(
      `Reported severity: ${input.severity}`
    );
  }

  if (input.associatedSymptomsKnown) {
    confirmedEvidence.push(
      input.associatedSymptoms.length > 0
        ? `Associated symptoms: ${input.associatedSymptoms.join(", ")}`
        : "No additional associated symptoms were reported."
    );
  }

  if (input.reportKeyFindings) {
    confirmedEvidence.push(
      `Saved report findings: ${input.reportKeyFindings}`
    );
  } else if (input.reportSummary) {
    confirmedEvidence.push(
      `Saved report summary: ${input.reportSummary}`
    );
  }

  if (input.reportRiskLevel) {
    confirmedEvidence.push(
      `Saved report risk level: ${input.reportRiskLevel}`
    );
  }

  const basicClinicalEvidenceComplete =
    input.symptoms.length > 0 &&
    Boolean(input.onset) &&
    Boolean(input.severity) &&
    input.associatedSymptomsKnown;

  return {
    confirmedEvidence,

    /*
     * Hypotheses remain intentionally empty in 10H.1.
     * We first establish the evidence contract before adding
     * medical differential rules or AI-generated hypotheses.
     */
    hypotheses: [],

    leadingInterpretation: null,

    uncertainty:
      basicClinicalEvidenceComplete
        ? "The basic symptom evidence is complete enough to begin bounded hypothesis reasoning, but it does not establish a diagnosis."
        : "The available evidence is still incomplete for bounded hypothesis reasoning.",

    readyForHypothesisReasoning:
      basicClinicalEvidenceComplete,
  };
}
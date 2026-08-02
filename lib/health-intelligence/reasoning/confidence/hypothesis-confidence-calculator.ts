import type {
  EvidenceConfidence,
} from "../evidence-backed-reasoning";

export type HypothesisConfidenceInput = {
  requestedConfidence?:
    | EvidenceConfidence
    | null;

  supportingEvidenceCount: number;
  conflictingEvidenceCount: number;
  missingEvidenceCount: number;
};

export type HypothesisConfidenceResult = {
  confidence: EvidenceConfidence;

  confidenceConstrained: boolean;

  requestedConfidence:
    | EvidenceConfidence
    | null;

  permittedConfidence:
    EvidenceConfidence;

  notes: string[];
};

const CONFIDENCE_ORDER: Record<
  EvidenceConfidence,
  number
> = {
  low: 1,
  moderate: 2,
  high: 3,
};

function getPermittedConfidence({
  supportingEvidenceCount,
  conflictingEvidenceCount,
  missingEvidenceCount,
}: HypothesisConfidenceInput): {
  confidence: EvidenceConfidence;
  notes: string[];
} {
  const notes: string[] = [];

  if (
    supportingEvidenceCount >= 3 &&
    conflictingEvidenceCount === 0 &&
    missingEvidenceCount === 0
  ) {
    notes.push(
      "The evidence structure permits high confidence."
    );

    return {
      confidence: "high",
      notes,
    };
  }

  if (
    supportingEvidenceCount >= 2 &&
    conflictingEvidenceCount <= 1
  ) {
    notes.push(
      "The evidence structure permits moderate confidence."
    );

    return {
      confidence: "moderate",
      notes,
    };
  }

  notes.push(
    "The evidence structure limits this candidate to low confidence."
  );

  return {
    confidence: "low",
    notes,
  };
}

export function calculateHypothesisConfidence(
  input: HypothesisConfidenceInput
): HypothesisConfidenceResult {
  const {
    requestedConfidence = null,
    supportingEvidenceCount,
    conflictingEvidenceCount,
    missingEvidenceCount,
  } = input;

  const permitted =
    getPermittedConfidence(input);

  const requested =
    requestedConfidence ??
    permitted.confidence;

  const confidence =
    CONFIDENCE_ORDER[requested] <=
    CONFIDENCE_ORDER[permitted.confidence]
      ? requested
      : permitted.confidence;

  const confidenceConstrained =
    requestedConfidence !== null &&
    confidence !== requestedConfidence;

  const notes = [
    ...permitted.notes,
  ];

  if (confidenceConstrained) {
    notes.push(
      `Requested confidence "${requestedConfidence}" was reduced to "${confidence}" because the evidence did not support the requested level.`
    );
  } else if (requestedConfidence) {
    notes.push(
      `Requested confidence "${requestedConfidence}" was permitted by the available evidence structure.`
    );
  } else {
    notes.push(
      `Confidence was derived from the available evidence structure as "${confidence}".`
    );
  }

  if (conflictingEvidenceCount > 0) {
    notes.push(
      "Conflicting evidence reduced the strength of the candidate."
    );
  }

  if (missingEvidenceCount > 0) {
    notes.push(
      "Missing evidence prevents the candidate from reaching maximum certainty."
    );
  }

  return {
    confidence,
    confidenceConstrained,

    requestedConfidence,

    permittedConfidence:
      permitted.confidence,

    notes,
  };
}
import type {
  ClinicalComparisonField,
  ClinicalComparisonFieldEvidence,
  PatientClinicalComparisonEvidence,
} from "@/lib/application/clinical/patient-clinical-comparison-evidence.service";

export type PatientClinicalReasoningState =
  | "comparison_unavailable"
  | "insufficient_evidence"
  | "verified_changes"
  | "no_verified_changes";

export type PatientClinicalReasoningConfidence =
  | "low"
  | "moderate"
  | "high";

export type PatientClinicalReasoningSignal = {
  field:
    ClinicalComparisonField;

  previousValue:
    | string
    | null;

  latestValue:
    | string
    | null;

  changed:
    boolean;
};

export type PatientClinicalReasoning = {
  state:
    PatientClinicalReasoningState;

  comparisonReady:
    boolean;

  confidence:
    PatientClinicalReasoningConfidence;

  significantChanges:
    PatientClinicalReasoningSignal[];

  stableAreas:
    PatientClinicalReasoningSignal[];

  insufficientEvidence:
    ClinicalComparisonField[];

  verifiedChangeCount:
    number;

  stableFieldCount:
    number;

  comparableFieldCount:
    number;

  canConfirmDirection:
    false;

  direction:
    null;

  limitations:
    string[];
};

export type BuildPatientClinicalReasoningInput = {
  evidence:
    PatientClinicalComparisonEvidence;
};

function toReasoningSignal(
  field:
    ClinicalComparisonFieldEvidence
): PatientClinicalReasoningSignal {
  return {
    field:
      field.field,

    previousValue:
      field.previousValue,

    latestValue:
      field.latestValue,

    changed:
      field.changed,
  };
}

function calculateConfidence(
  evidence:
    PatientClinicalComparisonEvidence
): PatientClinicalReasoningConfidence {
  if (
    evidence.status ===
      "insufficient" ||
    evidence.comparableFieldCount ===
      0
  ) {
    return "low";
  }

  if (
    evidence.status ===
      "ready" &&
    evidence.comparableFieldCount >=
      5
  ) {
    return "high";
  }

  return "moderate";
}

function determineState(
  evidence:
    PatientClinicalComparisonEvidence
): PatientClinicalReasoningState {
  if (
    evidence.latestReportId ===
      null ||
    evidence.previousReportId ===
      null
  ) {
    return "comparison_unavailable";
  }

  if (
    evidence.status ===
      "insufficient" ||
    evidence.comparableFieldCount ===
      0
  ) {
    return "insufficient_evidence";
  }

  if (
    evidence.changedFieldCount >
    0
  ) {
    return "verified_changes";
  }

  return "no_verified_changes";
}

export function buildPatientClinicalReasoning({
  evidence,
}: BuildPatientClinicalReasoningInput): PatientClinicalReasoning {
  const comparableFields =
    evidence.fields.filter(
      (field) =>
        field.comparable
    );

  const significantChanges =
    comparableFields
      .filter(
        (field) =>
          field.changed
      )
      .map(
        toReasoningSignal
      );

  const stableAreas =
    comparableFields
      .filter(
        (field) =>
          !field.changed
      )
      .map(
        toReasoningSignal
      );

  const limitations = [
    ...evidence.limitations,
  ];

  if (
    significantChanges.length >
    0
  ) {
    limitations.push(
      "The detected changes confirm that report content differs, but they do not establish whether the patient's condition improved or deteriorated."
    );
  }

  if (
    evidence.missingFields.length >
    0
  ) {
    limitations.push(
      "Some structured comparison fields are missing from one or both reports."
    );
  }

  return {
    state:
      determineState(
        evidence
      ),

    comparisonReady:
      evidence.status ===
        "ready",

    confidence:
      calculateConfidence(
        evidence
      ),

    significantChanges,

    stableAreas,

    insufficientEvidence:
      evidence.missingFields,

    verifiedChangeCount:
      significantChanges.length,

    stableFieldCount:
      stableAreas.length,

    comparableFieldCount:
      evidence.comparableFieldCount,

    canConfirmDirection:
      false,

    direction:
      null,

    limitations:
      Array.from(
        new Set(
          limitations
        )
      ),
  };
}
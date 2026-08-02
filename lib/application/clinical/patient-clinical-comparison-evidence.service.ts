import type {
  PatientClinicalComparison,
} from "@/lib/application/clinical/patient-clinical-comparison.service";

export type ClinicalComparisonEvidenceStatus =
  | "ready"
  | "partial"
  | "insufficient";

export type ClinicalComparisonField =
  | "report_type"
  | "risk_level"
  | "summary"
  | "key_findings"
  | "recommendations"
  | "next_best_action";

export type ClinicalComparisonFieldEvidence = {
  field:
    ClinicalComparisonField;

  previousValue:
    | string
    | null;

  latestValue:
    | string
    | null;

  comparable:
    boolean;

  changed:
    boolean;
};

export type PatientClinicalComparisonEvidence = {
  status:
    ClinicalComparisonEvidenceStatus;

  latestReportId:
    | number
    | null;

  previousReportId:
    | number
    | null;

  latestReportDate:
    | string
    | null;

  previousReportDate:
    | string
    | null;

  fields:
    ClinicalComparisonFieldEvidence[];

  comparableFieldCount:
    number;

  changedFieldCount:
    number;

  unchangedFieldCount:
    number;

  missingFields:
    ClinicalComparisonField[];

  limitations:
    string[];
};

export type BuildPatientClinicalComparisonEvidenceInput = {
  comparison:
    PatientClinicalComparison;
};

function normalizeText(
  value:
    | string
    | null
    | undefined
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .replace(/\s+/g, " ");

  return normalized.length > 0
    ? normalized
    : null;
}

function normalizeComparableText(
  value:
    | string
    | null
): string | null {
  return value
    ? value.toLocaleLowerCase()
    : null;
}

function buildFieldEvidence(
  field: ClinicalComparisonField,
  previousValue:
    | string
    | null
    | undefined,
  latestValue:
    | string
    | null
    | undefined
): ClinicalComparisonFieldEvidence {
  const normalizedPrevious =
    normalizeText(
      previousValue
    );

  const normalizedLatest =
    normalizeText(
      latestValue
    );

  const comparable =
    normalizedPrevious !== null &&
    normalizedLatest !== null;

  return {
    field,

    previousValue:
      normalizedPrevious,

    latestValue:
      normalizedLatest,

    comparable,

    changed:
      comparable &&
      normalizeComparableText(
        normalizedPrevious
      ) !==
        normalizeComparableText(
          normalizedLatest
        ),
  };
}

export function buildPatientClinicalComparisonEvidence({
  comparison,
}: BuildPatientClinicalComparisonEvidenceInput): PatientClinicalComparisonEvidence {
  const latest =
    comparison.latest;

  const previous =
    comparison.previous;

  const latestInsight =
    latest?.insight ??
    null;

  const previousInsight =
    previous?.insight ??
    null;

  const fields:
    ClinicalComparisonFieldEvidence[] = [
      buildFieldEvidence(
        "report_type",
        previousInsight?.report_type ??
          previous?.report.report_type,
        latestInsight?.report_type ??
          latest?.report.report_type
      ),

      buildFieldEvidence(
        "risk_level",
        previousInsight?.risk_level,
        latestInsight?.risk_level
      ),

      buildFieldEvidence(
        "summary",
        previousInsight?.summary,
        latestInsight?.summary
      ),

      buildFieldEvidence(
        "key_findings",
        previousInsight?.key_findings,
        latestInsight?.key_findings
      ),

      buildFieldEvidence(
        "recommendations",
        previousInsight?.recommendations,
        latestInsight?.recommendations
      ),

      buildFieldEvidence(
        "next_best_action",
        previousInsight?.next_best_action,
        latestInsight?.next_best_action
      ),
    ];

  const comparableFields =
    fields.filter(
      (field) =>
        field.comparable
    );

  const changedFields =
    comparableFields.filter(
      (field) =>
        field.changed
    );

  const missingFields =
    fields
      .filter(
        (field) =>
          !field.comparable
      )
      .map(
        (field) =>
          field.field
      );

  const limitations:
    string[] = [];

  if (!comparison.hasComparison) {
    limitations.push(
      "Two uploaded reports are required."
    );
  }

  if (!comparison.comparisonReady) {
    limitations.push(
      "Both reports require linked health insights before a structured comparison is ready."
    );
  }

  if (
    comparableFields.length === 0
  ) {
    limitations.push(
      "No shared structured fields are available for comparison."
    );
  }

  limitations.push(
    "A changed text field does not by itself prove clinical improvement or deterioration."
  );

  const status:
    ClinicalComparisonEvidenceStatus =
      !comparison.hasComparison ||
      comparableFields.length === 0
        ? "insufficient"
        : comparison.comparisonReady &&
            missingFields.length === 0
          ? "ready"
          : "partial";

  return {
    status,

    latestReportId:
      latest?.report.id ??
      null,

    previousReportId:
      previous?.report.id ??
      null,

    latestReportDate:
      latest?.report.created_at ??
      null,

    previousReportDate:
      previous?.report.created_at ??
      null,

    fields,

    comparableFieldCount:
      comparableFields.length,

    changedFieldCount:
      changedFields.length,

    unchangedFieldCount:
      comparableFields.length -
      changedFields.length,

    missingFields,

    limitations,
  };
}
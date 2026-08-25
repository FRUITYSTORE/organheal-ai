import type {
  PatientClinicalComparison,
} from "@/lib/application/clinical/patient-clinical-comparison.service";

import type {
  ReportMedicalMarkerEvidence,
} from "@/lib/repositories/report-markers.repository";

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

export type ClinicalMarkerComparisonEvidence = {
  marker:
    string;

  unit:
    string;

  previousValue:
    number;

  latestValue:
    number;

  delta:
    number;

  changed:
    boolean;

  previousStatus:
    ReportMedicalMarkerEvidence["marker_status"];

  latestStatus:
    ReportMedicalMarkerEvidence["marker_status"];

  statusChanged:
    boolean;

  previousReferenceLow:
    number | null;

  previousReferenceHigh:
    number | null;

  latestReferenceLow:
    number | null;

  latestReferenceHigh:
    number | null;

  previousReferenceSource:
    ReportMedicalMarkerEvidence["reference_source"];

  latestReferenceSource:
    ReportMedicalMarkerEvidence["reference_source"];
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

  markerComparisons:
  ClinicalMarkerComparisonEvidence[];

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

  reportMarkers?:
    ReportMedicalMarkerEvidence[];
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

function normalizeMarkerName(
  value:
    string
): string {
  return value
    .trim()
    .toLocaleLowerCase();
}

function normalizeMarkerUnit(
  value:
    string | null
): string | null {
  if (!value) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLocaleLowerCase();

  return normalized.length > 0
    ? normalized
    : null;
}

function buildMarkerComparisons({
  comparison,
  reportMarkers,
}: {
  comparison:
    PatientClinicalComparison;

  reportMarkers:
    ReportMedicalMarkerEvidence[];
}): ClinicalMarkerComparisonEvidence[] {
  const latestReportId =
    comparison.latest?.report.id ??
    null;

  const previousReportId =
    comparison.previous?.report.id ??
    null;

  if (
    latestReportId === null ||
    previousReportId === null
  ) {
    return [];
  }

  const latestMarkers =
    reportMarkers.filter(
      (marker) =>
        marker.report_id ===
        latestReportId
    );

  const previousMarkersByName =
    new Map(
      reportMarkers
        .filter(
          (marker) =>
            marker.report_id ===
            previousReportId
        )
        .map(
          (marker) => [
            normalizeMarkerName(
              marker.marker_name
            ),
            marker,
          ]
        )
    );

  return latestMarkers.flatMap(
    (latestMarker) => {
      const previousMarker =
        previousMarkersByName.get(
          normalizeMarkerName(
            latestMarker.marker_name
          )
        );

      if (!previousMarker) {
        return [];
      }

      const latestUnit =
        normalizeMarkerUnit(
          latestMarker.marker_unit
        );

      const previousUnit =
        normalizeMarkerUnit(
          previousMarker.marker_unit
        );

      if (
        !latestUnit ||
        !previousUnit ||
        latestUnit !== previousUnit
      ) {
        return [];
      }

      const delta =
        latestMarker.marker_value -
        previousMarker.marker_value;

      return [
  {
    marker:
      latestMarker.marker_name,

    unit:
      latestMarker.marker_unit!,

    previousValue:
      previousMarker.marker_value,

    latestValue:
      latestMarker.marker_value,

    delta,

    changed:
      delta !== 0,

    previousStatus:
      previousMarker.marker_status,

    latestStatus:
      latestMarker.marker_status,

    statusChanged:
      previousMarker.marker_status !==
      latestMarker.marker_status,

    previousReferenceLow:
      previousMarker.reference_low,

    previousReferenceHigh:
      previousMarker.reference_high,

    latestReferenceLow:
      latestMarker.reference_low,

    latestReferenceHigh:
      latestMarker.reference_high,

    previousReferenceSource:
      previousMarker.reference_source,

    latestReferenceSource:
      latestMarker.reference_source,
  },
];
    }
  );
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
  reportMarkers = [],
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
  const markerComparisons =
  buildMarkerComparisons({
    comparison,
    reportMarkers,
  });

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

    markerComparisons,

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
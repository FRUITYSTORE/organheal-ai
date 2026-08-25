import type {
  ClinicalMarkerComparisonEvidence,
} from "@/lib/application/clinical/patient-clinical-comparison-evidence.service";

export type PatientClinicalMarkerTrendInterpretation =
  | "persistent_abnormal_numeric_change"
  | "abnormal_to_normal"
  | "normal_to_abnormal"
  | "normal_numeric_change"
  | "status_transition"
  | "numeric_change"
  | "unchanged";

export type PatientClinicalMarkerTrend = {
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

  previousStatus:
    ClinicalMarkerComparisonEvidence["previousStatus"];

  latestStatus:
    ClinicalMarkerComparisonEvidence["latestStatus"];

  interpretation:
    PatientClinicalMarkerTrendInterpretation;

  canConfirmClinicalDirection:
    false;
};

function isAbnormalStatus(
  status:
    ClinicalMarkerComparisonEvidence["previousStatus"]
): boolean {
  return (
    status === "High" ||
    status === "Low"
  );
}

function resolveMarkerTrendInterpretation(
  marker:
    ClinicalMarkerComparisonEvidence
): PatientClinicalMarkerTrendInterpretation {
  const previousStatus =
    marker.previousStatus;

  const latestStatus =
    marker.latestStatus;

  if (
    previousStatus ===
      "Normal" &&
    isAbnormalStatus(
      latestStatus
    )
  ) {
    return "normal_to_abnormal";
  }

  if (
    isAbnormalStatus(
      previousStatus
    ) &&
    latestStatus ===
      "Normal"
  ) {
    return "abnormal_to_normal";
  }

  if (
    isAbnormalStatus(
      previousStatus
    ) &&
    previousStatus ===
      latestStatus &&
    marker.changed
  ) {
    return "persistent_abnormal_numeric_change";
  }

  if (
    previousStatus ===
      "Normal" &&
    latestStatus ===
      "Normal" &&
    marker.changed
  ) {
    return "normal_numeric_change";
  }

  if (
    marker.statusChanged
  ) {
    return "status_transition";
  }

  if (
    marker.changed
  ) {
    return "numeric_change";
  }

  return "unchanged";
}

export function buildPatientClinicalMarkerTrends(
  markerComparisons:
    ClinicalMarkerComparisonEvidence[]
): PatientClinicalMarkerTrend[] {
  return markerComparisons.map(
    (marker) => ({
      marker:
        marker.marker,

      unit:
        marker.unit,

      previousValue:
        marker.previousValue,

      latestValue:
        marker.latestValue,

      delta:
        marker.delta,

      previousStatus:
        marker.previousStatus,

      latestStatus:
        marker.latestStatus,

      interpretation:
        resolveMarkerTrendInterpretation(
          marker
        ),

      canConfirmClinicalDirection:
        false,
    })
  );
}
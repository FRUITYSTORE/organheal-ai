import type {
  PatientSummary,
} from "@/lib/models/patient";

import {
  buildPatientClinicalComparison,
  type PatientClinicalComparison,
} from "@/lib/application/clinical/patient-clinical-comparison.service";

import {
  buildPatientClinicalComparisonEvidence,
  type PatientClinicalComparisonEvidence,
} from "@/lib/application/clinical/patient-clinical-comparison-evidence.service";

import {
  buildPatientClinicalReasoning,
  type PatientClinicalReasoning,
} from "@/lib/application/clinical/patient-clinical-reasoning.service";

import {
  buildPatientClinicalDirection,
  type PatientClinicalDirectionAssessment,
} from "@/lib/application/clinical/patient-clinical-direction.service";

import {
  buildPatientClinicalMarkerTrends,
  type PatientClinicalMarkerTrend,
} from "@/lib/application/clinical/patient-clinical-marker-trend.service";

export type PatientClinicalContext = {
  comparison:
    PatientClinicalComparison;

  evidence:
    PatientClinicalComparisonEvidence;

  markerTrends:
    PatientClinicalMarkerTrend[];

  reasoning:
    PatientClinicalReasoning;

  direction:
    PatientClinicalDirectionAssessment;
};

export type BuildPatientClinicalContextInput = {
  patientSummary:
    PatientSummary;
};

export function buildPatientClinicalContext({
  patientSummary,
}: BuildPatientClinicalContextInput): PatientClinicalContext {
  const comparison =
    buildPatientClinicalComparison({
      patientSummary,
    });

  const evidence =
  buildPatientClinicalComparisonEvidence({
    comparison,

    reportMarkers:
      patientSummary.reportMarkers,
  });

  const markerTrends =
  buildPatientClinicalMarkerTrends(
    evidence.markerComparisons
  );

  const reasoning =
    buildPatientClinicalReasoning({
      evidence,
    });

  const direction =
  buildPatientClinicalDirection({
    evidence,
    reasoning,
    markerTrends,
  });

  return {
  comparison,
  evidence,
  markerTrends,
  reasoning,
  direction,
};
}

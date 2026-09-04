import type {
  ClinicalFinding,
} from "@/lib/health-intelligence/models/clinical-findings";

import type {
  ReportMedicalMarkerEvidence,
} from "@/lib/repositories/report-markers.repository";

import type {
  PatientSummary,
} from "@/lib/models/patient";

function normalizeMarkerName(
  markerName: string
): string {
  return markerName
    .trim()
    .toLocaleLowerCase();
}

function selectLatestMarkers(
  markers: ReportMedicalMarkerEvidence[]
): ReportMedicalMarkerEvidence[] {
  const sortedMarkers = [
    ...markers,
  ].sort((left, right) =>
    right.created_at.localeCompare(
      left.created_at
    )
  );

  const seenMarkers =
    new Set<string>();

  return sortedMarkers.filter(
    (marker) => {
      const key =
        normalizeMarkerName(
          marker.marker_name
        );

      if (
        !key ||
        seenMarkers.has(key)
      ) {
        return false;
      }

      seenMarkers.add(key);

      return true;
    }
  );
}

function isAbnormalMarker(
  marker: ReportMedicalMarkerEvidence
): boolean {
  return (
    marker.marker_status === "High" ||
    marker.marker_status === "Low" ||
    marker.marker_status === "Detected"
  );
}

function formatMarkerValue(
  marker: ReportMedicalMarkerEvidence
): string {
  return [
    marker.marker_value,
    marker.marker_unit,
  ]
    .filter(
      (value) =>
        value !== null &&
        value !== ""
    )
    .join(" ");
}

function formatReferenceRange(
  marker: ReportMedicalMarkerEvidence
): string | null {
  if (
    marker.reference_low !== null &&
    marker.reference_high !== null
  ) {
    return `${marker.reference_low}-${marker.reference_high}`;
  }

  if (
    marker.reference_low !== null
  ) {
    return `>= ${marker.reference_low}`;
  }

  if (
    marker.reference_high !== null
  ) {
    return `<= ${marker.reference_high}`;
  }

  return null;
}

function buildMarkerTitle(
  marker: ReportMedicalMarkerEvidence
): string {
  if (
    marker.marker_status === "High"
  ) {
    return `${marker.marker_name} is above the available reference range`;
  }

  if (
    marker.marker_status === "Low"
  ) {
    return `${marker.marker_name} is below the available reference range`;
  }

  return `${marker.marker_name} was detected`;
}

function buildMarkerDescription(
  marker: ReportMedicalMarkerEvidence
): string {
  const result =
    formatMarkerValue(marker);

  const referenceRange =
    formatReferenceRange(marker);

  const referenceDescription =
    referenceRange === null
      ? ""
      : ` The available reference range is ${referenceRange}${
          marker.marker_unit
            ? ` ${marker.marker_unit}`
            : ""
        }${
          marker.reference_source
            ? ` (${marker.reference_source})`
            : ""
        }.`;

  return `The reported result is ${result}.${referenceDescription} This finding should be interpreted with the patient's clinical context and the original laboratory report.`;
}

function buildReportMarkerFindings(
  patient: PatientSummary
): ClinicalFinding[] {
  const latestMarkers =
    selectLatestMarkers(
      patient.reportMarkers
    );

  const abnormalMarkers =
    latestMarkers.filter(
      isAbnormalMarker
    );

  if (
    latestMarkers.length > 0 &&
    abnormalMarkers.length === 0
  ) {
    return [
      {
        id:
          "report-markers-no-flags",
        severity:
          "info",
        title:
          "No extracted marker was flagged outside its available reference range",
        description:
          "The extracted report markers were not flagged as high, low, or detected. This does not replace review of the complete original report.",
        source:
          "report",
      },
    ];
  }

  return abnormalMarkers.map(
    (marker, index) => ({
      id: [
        "report-marker",
        marker.report_id,
        index,
        normalizeMarkerName(
          marker.marker_name
        ).replace(
          /[^a-z0-9]+/g,
          "-"
        ) || "marker",
      ].join("-"),

      severity:
        "warning",

      title:
        buildMarkerTitle(marker),

      description:
        buildMarkerDescription(marker),

      source:
        "report",

      reportEvidence: {
        reportId:
          marker.report_id,

        markerName:
          marker.marker_name,

        markerValue:
          marker.marker_value,

        markerUnit:
          marker.marker_unit,

        markerStatus:
          marker.marker_status,

        referenceLow:
          marker.reference_low,

        referenceHigh:
          marker.reference_high,

        referenceSource:
          marker.reference_source,

        measuredAt:
          marker.created_at,
      },
    })
  );
}

export function buildClinicalFindings(
  patient: PatientSummary
): ClinicalFinding[] {
  const findings:
    ClinicalFinding[] = [];

  if (
    !patient.assessments.length
  ) {
    findings.push({
      id:
        "assessment-missing",
      severity:
        "warning",
      title:
        "Health assessment missing",
      description:
        "No organ assessment data is available yet. Completing an assessment will improve the quality of health intelligence.",
      source:
        "assessment",
    });
  } else {
    const lowestAssessment = [
      ...patient.assessments,
    ].sort(
      (left, right) =>
        left.score -
        right.score
    )[0];

    if (
      lowestAssessment.score < 50
    ) {
      findings.push({
        id:
          "assessment-critical-lowest",
        severity:
          "critical",
        title:
          `${lowestAssessment.organ_name} needs priority attention`,
        description:
          `${lowestAssessment.organ_name} has the lowest assessment score at ${lowestAssessment.score}/100.`,
        source:
          "assessment",
      });
    } else if (
      lowestAssessment.score < 75
    ) {
      findings.push({
        id:
          "assessment-warning-lowest",
        severity:
          "warning",
        title:
          `${lowestAssessment.organ_name} is below target`,
        description:
          `${lowestAssessment.organ_name} has the lowest assessment score at ${lowestAssessment.score}/100.`,
        source:
          "assessment",
      });
    } else {
      findings.push({
        id:
          "assessment-stable",
        severity:
          "info",
        title:
          "Assessment profile looks stable",
        description:
          "Available organ assessment scores are currently within a lower-risk range.",
        source:
          "assessment",
      });
    }
  }

  if (
    !patient.latestCheckIn
  ) {
    findings.push({
      id:
        "checkin-missing",
      severity:
        "warning",
      title:
        "Check-In not updated",
      description:
        "No recent Check-In is available. Regular Check-Ins improve follow-up accuracy.",
      source:
        "checkin",
    });
  } else if (
    patient.latestCheckIn
      .wellness_score < 50
  ) {
    findings.push({
      id:
        "checkin-critical-low",
      severity:
        "critical",
      title:
        "Low wellness score",
      description:
        `Latest Check-In wellness score is ${patient.latestCheckIn.wellness_score}/100.`,
      source:
        "checkin",
    });
  } else if (
    patient.latestCheckIn
      .wellness_score < 70
  ) {
    findings.push({
      id:
        "checkin-warning-low",
      severity:
        "warning",
      title:
        "Wellness score below target",
      description:
        `Latest Check-In wellness score is ${patient.latestCheckIn.wellness_score}/100.`,
      source:
        "checkin",
    });
  }

  findings.push(
    ...buildReportMarkerFindings(
      patient
    )
  );

  if (
    patient.uploadedReports.length >
      0 &&
    patient.generatedResults.length ===
      0
  ) {
    findings.push({
      id:
        "reports-analysis-pending",
      severity:
        "warning",
      title:
        "Reports need analysis",
      description:
        "Medical reports are uploaded, but no saved AI analysis is available yet.",
      source:
        "report",
    });
  }

  if (
    patient.generatedResults.length >
    0
  ) {
    findings.push({
      id:
        "intelligence-generated",
      severity:
        "info",
      title:
        "Saved intelligence available",
      description:
        "At least one saved health intelligence result is available for review.",
      source:
        "intelligence",
    });
  }

  return findings;
}
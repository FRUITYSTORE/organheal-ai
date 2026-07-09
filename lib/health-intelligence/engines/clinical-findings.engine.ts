import { PatientSummary } from "@/lib/models/patient";

export type ClinicalFindingSeverity = "info" | "warning" | "critical";

export type ClinicalFindingSource =
  | "assessment"
  | "checkin"
  | "report"
  | "intelligence";

export type ClinicalFinding = {
  id: string;
  severity: ClinicalFindingSeverity;
  title: string;
  description: string;
  source: ClinicalFindingSource;
};

export function buildClinicalFindings(
  patient: PatientSummary
): ClinicalFinding[] {
  const findings: ClinicalFinding[] = [];

  if (!patient.assessments.length) {
    findings.push({
      id: "assessment-missing",
      severity: "warning",
      title: "Health assessment missing",
      description:
        "No organ assessment data is available yet. Completing an assessment will improve the quality of health intelligence.",
      source: "assessment",
    });
  } else {
    const lowestAssessment = [...patient.assessments].sort(
      (a, b) => a.score - b.score
    )[0];

    if (lowestAssessment.score < 50) {
      findings.push({
        id: "assessment-critical-lowest",
        severity: "critical",
        title: `${lowestAssessment.organ_name} needs priority attention`,
        description: `${lowestAssessment.organ_name} has the lowest assessment score at ${lowestAssessment.score}/100.`,
        source: "assessment",
      });
    } else if (lowestAssessment.score < 75) {
      findings.push({
        id: "assessment-warning-lowest",
        severity: "warning",
        title: `${lowestAssessment.organ_name} is below target`,
        description: `${lowestAssessment.organ_name} has the lowest assessment score at ${lowestAssessment.score}/100.`,
        source: "assessment",
      });
    } else {
      findings.push({
        id: "assessment-stable",
        severity: "info",
        title: "Assessment profile looks stable",
        description:
          "Available organ assessment scores are currently within a lower-risk range.",
        source: "assessment",
      });
    }
  }

  if (!patient.latestCheckIn) {
    findings.push({
      id: "checkin-missing",
      severity: "warning",
      title: "Check-In not updated",
      description:
        "No recent Check-In is available. Regular Check-Ins improve follow-up accuracy.",
      source: "checkin",
    });
  } else if (patient.latestCheckIn.wellness_score < 50) {
    findings.push({
      id: "checkin-critical-low",
      severity: "critical",
      title: "Low wellness score",
      description: `Latest Check-In wellness score is ${patient.latestCheckIn.wellness_score}/100.`,
      source: "checkin",
    });
  } else if (patient.latestCheckIn.wellness_score < 70) {
    findings.push({
      id: "checkin-warning-low",
      severity: "warning",
      title: "Wellness score below target",
      description: `Latest Check-In wellness score is ${patient.latestCheckIn.wellness_score}/100.`,
      source: "checkin",
    });
  }

  if (patient.uploadedReports.length > 0 && patient.generatedResults.length === 0) {
    findings.push({
      id: "reports-analysis-pending",
      severity: "warning",
      title: "Reports need analysis",
      description:
        "Medical reports are uploaded, but no saved AI analysis is available yet.",
      source: "report",
    });
  }

  if (patient.generatedResults.length > 0) {
    findings.push({
      id: "intelligence-generated",
      severity: "info",
      title: "Saved intelligence available",
      description:
        "At least one saved health intelligence result is available for review.",
      source: "intelligence",
    });
  }

  return findings;
}
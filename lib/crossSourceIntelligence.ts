import type { LabMarkerResult } from "./labMarkerDetector";

export type CrossSourceResult = {
  confidenceLevel: "Low" | "Moderate" | "High";
  confidenceScore: number;
  primarySystem: string;
  supportingSources: string[];
  intelligenceSummary: string;
};

type Assessment = {
  organ_name: string;
  score: number;
};

type DailyCheckIn = {
  mood?: string | null;
  wellness_score?: number | null;
};

type CrossSourceInput = {
  detectedMarkers: LabMarkerResult[];
  assessments?: Assessment[];
  dailyCheckIn?: DailyCheckIn | null;
};

function hasAbnormalMarker(
  markers: LabMarkerResult[],
  names: string[]
) {
  return markers.some(
    (marker) =>
      names.includes(marker.marker) &&
      (marker.status === "High" || marker.status === "Low")
  );
}

export function buildCrossSourceIntelligence(
  input: CrossSourceInput
): CrossSourceResult {
  const supportingSources: string[] = [];

  const hasLiverLabs = hasAbnormalMarker(input.detectedMarkers, [
    "ALT",
    "AST",
    "ALP",
    "Bilirubin",
    "Albumin",
  ]);

  const hasCardioLabs = hasAbnormalMarker(input.detectedMarkers, [
    "LDL",
    "HDL",
    "Triglycerides",
    "Total Cholesterol",
  ]);

  const hasKidneyLabs = hasAbnormalMarker(input.detectedMarkers, [
    "Creatinine",
    "Urea",
    "BUN",
    "eGFR",
  ]);

  const hasBloodLabs = hasAbnormalMarker(input.detectedMarkers, [
    "Hemoglobin",
    "Ferritin",
    "Platelets",
    "WBC",
  ]);

  const lowAssessment = input.assessments?.find(
    (item) => item.score < 60
  );

  const lowWellness =
    input.dailyCheckIn?.wellness_score !== undefined &&
    input.dailyCheckIn?.wellness_score !== null &&
    input.dailyCheckIn.wellness_score < 60;

  let primarySystem = "General Health";

  if (hasLiverLabs) primarySystem = "Liver Health";
  else if (hasCardioLabs) primarySystem = "Cardiovascular / Metabolic Health";
  else if (hasKidneyLabs) primarySystem = "Kidney Health";
  else if (hasBloodLabs) primarySystem = "Blood / Hematology";

  if (input.detectedMarkers.length > 0) {
    supportingSources.push("Uploaded lab report");
  }

  if (lowAssessment) {
    supportingSources.push(
      `Low organ assessment: ${lowAssessment.organ_name} (${lowAssessment.score}/100)`
    );
  }

  if (lowWellness) {
    supportingSources.push(
      `Low daily wellness check-in (${input.dailyCheckIn?.wellness_score}/100)`
    );
  }
let confidenceScore = 0;

if (input.detectedMarkers.length > 0) {
  confidenceScore += 40;
}

if (lowAssessment) {
  confidenceScore += 30;
}

if (lowWellness) {
  confidenceScore += 20;
}

if (
  hasLiverLabs ||
  hasCardioLabs ||
  hasKidneyLabs ||
  hasBloodLabs
) {
  confidenceScore += 10;
}

confidenceScore = Math.min(confidenceScore, 100);
  let confidenceLevel: "Low" | "Moderate" | "High";

if (confidenceScore >= 80) {
  confidenceLevel = "High";
} else if (confidenceScore >= 50) {
  confidenceLevel = "Moderate";
} else {
  confidenceLevel = "Low";
}

  const intelligenceSummary =
    confidenceLevel === "High"
      ? `Multiple data sources support a ${primarySystem.toLowerCase()} priority.`
      : confidenceLevel === "Moderate"
      ? `More than one data source suggests a possible ${primarySystem.toLowerCase()} priority.`
      : `Current insight is mainly based on one available data source. More assessments and check-ins can improve confidence.`;
return {
  confidenceLevel,
  confidenceScore,
  primarySystem,
  supportingSources,
  intelligenceSummary,
};
}
export default buildCrossSourceIntelligence;
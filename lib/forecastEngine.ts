import type { LabMarkerResult } from "./labMarkerDetector";

export type ForecastResult = {
  forecastScore: number;

  currentScore: number;

  bestCaseScore: number;
  expectedScore: number;
  riskScore: number;

  currentTrajectory: string;

  bestCase: string;
  expectedCase: string;
  riskCase: string;

  improvementPotential: string;
};

export function buildForecast(
  markers: LabMarkerResult[],
  confidenceScore: number
): ForecastResult {
  const abnormalMarkers = markers.filter(
    (m) => m.status === "High" || m.status === "Low"
  );

  const hasLiverIssue = markers.some(
    (m) =>
      ["ALT", "AST", "Bilirubin", "Albumin"].includes(m.marker) &&
      (m.status === "High" || m.status === "Low")
  );

  const hasCardioIssue = markers.some(
    (m) =>
      ["LDL", "HDL", "Triglycerides", "Total Cholesterol"].includes(m.marker) &&
      (m.status === "High" || m.status === "Low")
  );

  const hasBloodIssue = markers.some(
    (m) =>
      ["Hemoglobin", "Ferritin", "Platelets", "WBC"].includes(m.marker) &&
      (m.status === "High" || m.status === "Low")
  );

  let currentScore = Math.max(
    20,
    100 - abnormalMarkers.length * 5
  );

  let bestCaseGain = 15;
  let expectedGain = 6;
  let riskLoss = 10;

  if (hasLiverIssue) {
    bestCaseGain += 5;
    riskLoss += 5;
  }

  if (hasCardioIssue) {
    bestCaseGain += 5;
    riskLoss += 5;
  }

  if (hasBloodIssue) {
    expectedGain += 2;
  }

  const bestCaseScore = Math.min(
    currentScore + bestCaseGain,
    100
  );

  const expectedScore = Math.min(
    currentScore + expectedGain,
    100
  );

  const riskScore = Math.max(
    currentScore - riskLoss,
    0
  );

  let currentTrajectory =
    "Current health trajectory appears relatively stable.";

  if (hasLiverIssue) {
    currentTrajectory =
      "Current trajectory suggests liver-related risk requiring follow-up.";
  }

  if (hasCardioIssue) {
    currentTrajectory =
      "Current trajectory suggests elevated cardiometabolic risk.";
  }

  let bestCase =
    "Consistent adherence to recommendations may improve overall health indicators over the next 90 days.";

  let expectedCase =
    "Partial adherence may stabilize most current findings.";

  let riskCase =
    "Failure to address current abnormalities may increase future health risk.";

  if (hasLiverIssue) {
    bestCase =
      "Liver-related markers may improve within 4–12 weeks with appropriate lifestyle changes and follow-up.";

    riskCase =
      "Persistent liver marker abnormalities may increase the likelihood of ongoing liver dysfunction.";
  }

  if (hasCardioIssue) {
    expectedCase =
      "Cardiovascular risk may remain elevated unless lipid markers improve.";
  }

  let improvementPotential = "Moderate";

  if (bestCaseScore - currentScore >= 15) {
    improvementPotential = "High";
  }

  if (bestCaseScore - currentScore < 8) {
    improvementPotential = "Limited";
  }

  let forecastScore = 50;

  if (confidenceScore >= 80) {
    forecastScore = 90;
  } else if (confidenceScore >= 50) {
    forecastScore = 75;
  }

  return {
    forecastScore,

    currentScore,

    bestCaseScore,
    expectedScore,
    riskScore,

    currentTrajectory,

    bestCase,
    expectedCase,
    riskCase,

    improvementPotential,
  };
}
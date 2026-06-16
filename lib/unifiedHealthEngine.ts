import type { LabMarkerResult } from "./labMarkerDetector";
import type { HealthStrategyResult } from "./healthStrategyEngine";

type UnifiedHealthInput = {
  detectedMarkers: LabMarkerResult[];
  healthStrategy: HealthStrategyResult;
};

type HealthPriority = {
  area: string;
  score: number;
  severity: "Low" | "Moderate" | "High";
  reason: string;
};

function getMarker(markers: LabMarkerResult[], name: string) {
  return markers.find((marker) => marker.marker === name);
}

function addScore(
  priorities: Record<string, HealthPriority>,
  area: string,
  score: number,
  reason: string
) {
  if (!priorities[area]) {
    priorities[area] = {
      area,
      score: 0,
      severity: "Low",
      reason: "",
    };
  }

  priorities[area].score += score;

  if (!priorities[area].reason.includes(reason)) {
    priorities[area].reason = priorities[area].reason
      ? `${priorities[area].reason} ${reason}`
      : reason;
  }
}

function severityFromScore(score: number): "Low" | "Moderate" | "High" {
  if (score >= 8) return "High";
  if (score >= 4) return "Moderate";
  return "Low";
}

export function buildUnifiedHealthIntelligence(input: UnifiedHealthInput) {
  const markers = input.detectedMarkers;
  const priorities: Record<string, HealthPriority> = {};

  const hemoglobin = getMarker(markers, "Hemoglobin");
  const wbc = getMarker(markers, "WBC");
  const platelets = getMarker(markers, "Platelets");

  const glucose = getMarker(markers, "Glucose");
  const hba1c = getMarker(markers, "HbA1c");

  const totalCholesterol = getMarker(markers, "Total Cholesterol");
  const ldl = getMarker(markers, "LDL");
  const hdl = getMarker(markers, "HDL");
  const triglycerides = getMarker(markers, "Triglycerides");

  const creatinine = getMarker(markers, "Creatinine");
  const urea = getMarker(markers, "Urea");
  const bun = getMarker(markers, "BUN");
  const egfr = getMarker(markers, "eGFR");

  const alt = getMarker(markers, "ALT");
  const ast = getMarker(markers, "AST");
  const alp = getMarker(markers, "ALP");
  const bilirubin = getMarker(markers, "Bilirubin");
  const albumin = getMarker(markers, "Albumin");

  const tsh = getMarker(markers, "TSH");
  const ft4 = getMarker(markers, "FT4");

  const vitaminD = getMarker(markers, "Vitamin D");
  const ferritin = getMarker(markers, "Ferritin");

  if (bilirubin?.status === "High") {
    addScore(
      priorities,
      "Liver Health",
      4,
      "Bilirubin is elevated, which may require liver or bile-related follow-up."
    );
  }

  if (alt?.status === "High") {
    addScore(
      priorities,
      "Liver Health",
      3,
      "ALT is elevated, suggesting liver enzyme monitoring is needed."
    );
  }

  if (ast?.status === "High") {
    addScore(
      priorities,
      "Liver Health",
      3,
      "AST is elevated and should be reviewed with other liver markers."
    );
  }

  if (alp?.status === "High") {
    addScore(
      priorities,
      "Liver Health",
      2,
      "ALP is elevated and may support a liver or bile-duct monitoring pattern."
    );
  }

  if (albumin?.status === "Low") {
    addScore(
      priorities,
      "Liver Health",
      2,
      "Albumin is low, which should be interpreted with liver, nutrition, and inflammation context."
    );
  }

  if (ldl?.status === "High") {
    addScore(
      priorities,
      "Cardiovascular Health",
      3,
      "LDL is elevated, increasing cardiovascular prevention priority."
    );
  }

  if (totalCholesterol?.status === "High") {
    addScore(
      priorities,
      "Cardiovascular Health",
      2,
      "Total cholesterol is elevated."
    );
  }

  if (triglycerides?.status === "High") {
    addScore(
      priorities,
      "Cardiovascular Health",
      3,
      "Triglycerides are elevated and may reflect metabolic or cardiovascular risk."
    );
    addScore(
      priorities,
      "Metabolic Health",
      2,
      "High triglycerides may be associated with insulin resistance or dietary imbalance."
    );
  }

  if (hdl?.status === "Low") {
    addScore(
      priorities,
      "Cardiovascular Health",
      2,
      "HDL is low, reducing protective lipid balance."
    );
  }

  if (glucose?.status === "High") {
    addScore(
      priorities,
      "Metabolic Health",
      4,
      "Glucose is elevated, suggesting blood sugar control should be reviewed."
    );
  }

  if (hba1c?.status === "High") {
    addScore(
      priorities,
      "Metabolic Health",
      4,
      "HbA1c is elevated, suggesting longer-term glucose control concern."
    );
  }

  if (creatinine?.status === "High") {
    addScore(
      priorities,
      "Kidney Health",
      4,
      "Creatinine is elevated and should be interpreted with eGFR and hydration status."
    );
  }

  if (egfr?.status === "Low") {
    addScore(
      priorities,
      "Kidney Health",
      5,
      "eGFR is low, making kidney function follow-up a priority."
    );
  }

  if (urea?.status === "High" || bun?.status === "High") {
    addScore(
      priorities,
      "Kidney Health",
      2,
      "Urea or BUN is elevated and may relate to hydration, kidney function, or protein metabolism."
    );
  }

  if (hemoglobin?.status === "Low") {
    addScore(
      priorities,
      "Hematology / Anemia Review",
      4,
      "Hemoglobin is low, suggesting anemia or blood count follow-up may be needed."
    );
  }

  if (ferritin?.status === "Low") {
    addScore(
      priorities,
      "Hematology / Anemia Review",
      3,
      "Ferritin is low, supporting possible iron deficiency pattern."
    );
  }

  if (wbc?.status === "High") {
    addScore(
      priorities,
      "Inflammation / Infection Review",
      3,
      "WBC is elevated and may reflect inflammation, infection, stress, or other clinical context."
    );
  }

  if (platelets?.status === "Low" || platelets?.status === "High") {
    addScore(
      priorities,
      "Hematology / Anemia Review",
      2,
      "Platelet abnormality should be reviewed in the full blood count context."
    );
  }

  if (tsh?.status === "High" || tsh?.status === "Low" || ft4?.status === "High" || ft4?.status === "Low") {
    addScore(
      priorities,
      "Thyroid Health",
      4,
      "Thyroid markers appear outside common ranges and should be reviewed."
    );
  }

  if (vitaminD?.status === "Low") {
    addScore(
      priorities,
      "Vitamin / Wellness Optimization",
      2,
      "Vitamin D is low and may affect bone, muscle, and general wellness."
    );
  }

  let rankedPriorities = Object.values(priorities)
    .map((priority) => ({
      ...priority,
      severity: severityFromScore(priority.score),
    }))
    .sort((a, b) => b.score - a.score);

  if (rankedPriorities.length === 0 && markers.length > 0) {
    rankedPriorities = [
      {
        area: "Preventive Health Monitoring",
        score: 1,
        severity: "Low",
        reason:
          "Detected markers do not show a strong abnormal pattern based on common adult reference ranges.",
      },
    ];
  }

  if (markers.length === 0) {
    rankedPriorities = [
      {
        area: "Incomplete Data Quality",
        score: 1,
        severity: "Low",
        reason:
          "No structured lab values were detected clearly enough to create health priorities.",
      },
    ];
  }

  const primaryPriority = rankedPriorities[0];
  const secondaryPriority = rankedPriorities[1] || null;
  const thirdPriority = rankedPriorities[2] || null;

  const priorityGoal = primaryPriority
    ? `Focus first on ${primaryPriority.area.toLowerCase()} because it has the strongest detected risk pattern.`
    : "Complete more health data to identify a priority goal.";

  const healthForecast = primaryPriority
    ? `With consistent follow-up and targeted lifestyle changes, ${primaryPriority.area.toLowerCase()} may improve or become clearer over the next 8–12 weeks.`
    : "A clearer health forecast requires more structured health data.";

  const expectedImprovement = primaryPriority
    ? `Better tracking of ${primaryPriority.area.toLowerCase()}, clearer clinical direction, and improved prevention planning.`
    : "Better data quality and more accurate health intelligence.";

  const nextBestAction = primaryPriority
    ? `Review ${primaryPriority.area.toLowerCase()} markers with a licensed healthcare professional and repeat relevant labs as advised.`
    : "Upload a clearer report or complete assessments to improve intelligence accuracy.";

  return {
    currentProfile: primaryPriority
      ? `${primaryPriority.area} Priority Phase`
      : "General Health Monitoring Phase",
    priorityGoal,
    healthForecast,
    expectedImprovement,
    nextBestAction,
    riskLevel: primaryPriority?.severity || "Low",
    abnormalMarkers: markers
      .filter((marker) => marker.status === "High" || marker.status === "Low")
      .map((marker) => marker.marker),
    topPriorities: rankedPriorities,
    primaryPriority,
    secondaryPriority,
    thirdPriority,
  };
}
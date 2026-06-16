import type { LabMarkerResult } from "./labMarkerDetector";

export type ClinicalPattern = {
  title: string;
  severity: "Low" | "Moderate" | "High";
  system: string;
  summary: string;
  involvedMarkers: string[];
  suggestedFocus: string;
};

function has(markers: LabMarkerResult[], name: string, status?: "Low" | "High") {
  const marker = markers.find((item) => item.marker === name);
  if (!marker) return false;
  if (!status) return true;
  return marker.status === status;
}

export function detectClinicalPatterns(markers: LabMarkerResult[]): ClinicalPattern[] {
  const patterns: ClinicalPattern[] = [];

  if (
    has(markers, "ALT", "High") ||
    has(markers, "AST", "High") ||
    has(markers, "Bilirubin", "High") ||
    has(markers, "Albumin", "Low")
  ) {
    patterns.push({
      title: "Liver Health Pattern",
      severity:
        has(markers, "Bilirubin", "High") || has(markers, "Albumin", "Low")
          ? "High"
          : "Moderate",
      system: "Liver / Biliary",
      summary:
        "Multiple liver-related markers may suggest liver stress, bile-flow disturbance, inflammation, or reduced liver synthetic function.",
      involvedMarkers: markers
        .filter((m) => ["ALT", "AST", "ALP", "Bilirubin", "Albumin"].includes(m.marker))
        .map((m) => `${m.marker} (${m.status})`),
      suggestedFocus:
        "Review liver panel clinically, assess symptoms, medications, supplements, alcohol exposure, and repeat liver tests as advised.",
    });
  }

  if (
    has(markers, "Total Cholesterol", "High") ||
    has(markers, "LDL", "High") ||
    has(markers, "HDL", "Low") ||
    has(markers, "Triglycerides", "High")
  ) {
    patterns.push({
      title: "Cardiometabolic Risk Pattern",
      severity:
        has(markers, "Triglycerides", "High") && has(markers, "HDL", "Low")
          ? "High"
          : "Moderate",
      system: "Cardiovascular / Metabolic",
      summary:
        "The lipid pattern may increase cardiovascular risk, especially when triglycerides are high or protective HDL is low.",
      involvedMarkers: markers
        .filter((m) =>
          ["Total Cholesterol", "LDL", "HDL", "Triglycerides"].includes(m.marker)
        )
        .map((m) => `${m.marker} (${m.status})`),
      suggestedFocus:
        "Focus on nutrition quality, physical activity, weight management, and repeat lipid profile after lifestyle intervention.",
    });
  }

  if (has(markers, "Glucose", "High") || has(markers, "HbA1c", "High")) {
    patterns.push({
      title: "Blood Sugar Control Pattern",
      severity: has(markers, "HbA1c", "High") ? "High" : "Moderate",
      system: "Metabolic",
      summary:
        "Glucose-related markers may suggest impaired blood sugar control or increased metabolic risk.",
      involvedMarkers: markers
        .filter((m) => ["Glucose", "HbA1c"].includes(m.marker))
        .map((m) => `${m.marker} (${m.status})`),
      suggestedFocus:
        "Reduce refined carbohydrates and sugary drinks, increase daily walking, and review fasting glucose or HbA1c clinically.",
    });
  }

  if (
    has(markers, "Hemoglobin", "Low") ||
    has(markers, "Ferritin", "Low") ||
    has(markers, "Platelets", "Low") ||
    has(markers, "WBC", "High")
  ) {
    patterns.push({
      title: "Blood Count Review Pattern",
      severity:
        has(markers, "Hemoglobin", "Low") && has(markers, "Platelets", "Low")
          ? "Moderate"
          : "Low",
      system: "Hematology",
      summary:
        "Blood count abnormalities may require follow-up to assess anemia, inflammation, infection, nutritional deficiency, or other clinical causes.",
      involvedMarkers: markers
        .filter((m) => ["Hemoglobin", "Ferritin", "Platelets", "WBC", "RBC"].includes(m.marker))
        .map((m) => `${m.marker} (${m.status})`),
      suggestedFocus:
        "Consider CBC follow-up, iron studies, ferritin, B12/folate if clinically appropriate, and symptom review.",
    });
  }

  if (
    has(markers, "Creatinine", "High") ||
    has(markers, "Urea", "High") ||
    has(markers, "BUN", "High") ||
    has(markers, "eGFR", "Low")
  ) {
    patterns.push({
      title: "Kidney Function Monitoring Pattern",
      severity: has(markers, "eGFR", "Low") || has(markers, "Creatinine", "High")
        ? "High"
        : "Moderate",
      system: "Kidney",
      summary:
        "Kidney-related markers may need follow-up, especially when creatinine is elevated or eGFR is reduced.",
      involvedMarkers: markers
        .filter((m) => ["Creatinine", "Urea", "BUN", "eGFR"].includes(m.marker))
        .map((m) => `${m.marker} (${m.status})`),
      suggestedFocus:
        "Review hydration, blood pressure, kidney function, urine testing, and medication exposure with a clinician.",
    });
  }

  return patterns;
}
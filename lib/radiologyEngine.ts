export type RadiologyFinding = {
  organ: string;
  finding: string;
  severity: "Normal" | "Mild" | "Moderate" | "Severe" | "Detected";
  confidence: "Low" | "Moderate" | "High";
  note: string;
};

export function detectRadiologyFindings(text: string): RadiologyFinding[] {
  const cleanText = text.toLowerCase();
  const findings: RadiologyFinding[] = [];

  if (
    cleanText.includes("fatty liver") ||
    cleanText.includes("hepatic steatosis")
  ) {
    findings.push({
      organ: "Liver",
      finding: "Fatty liver / hepatic steatosis",
      severity: cleanText.includes("mild")
        ? "Mild"
        : cleanText.includes("moderate")
        ? "Moderate"
        : cleanText.includes("severe")
        ? "Severe"
        : "Detected",
      confidence: "High",
      note: "Radiology text suggests fatty liver changes.",
    });
  }

  if (
    cleanText.includes("no acute") ||
    cleanText.includes("no significant abnormality") ||
    cleanText.includes("unremarkable")
  ) {
    findings.push({
      organ: "General",
      finding: "No acute abnormality detected",
      severity: "Normal",
      confidence: "Moderate",
      note: "Report text suggests no urgent abnormality was described.",
    });
  }

  if (
    cleanText.includes("splenomegaly") ||
    cleanText.includes("enlarged spleen")
  ) {
    findings.push({
      organ: "Spleen",
      finding: "Splenomegaly",
      severity: cleanText.includes("mild")
        ? "Mild"
        : cleanText.includes("moderate")
        ? "Moderate"
        : cleanText.includes("severe")
        ? "Severe"
        : "Detected",
      confidence: "High",
      note: "Radiology text suggests spleen enlargement.",
    });
  }

  if (
    cleanText.includes("cardiomegaly") ||
    cleanText.includes("enlarged heart")
  ) {
    findings.push({
      organ: "Heart",
      finding: "Cardiomegaly",
      severity: cleanText.includes("mild")
        ? "Mild"
        : cleanText.includes("moderate")
        ? "Moderate"
        : cleanText.includes("severe")
        ? "Severe"
        : "Detected",
      confidence: "High",
      note: "Radiology text suggests enlarged cardiac silhouette/heart size.",
    });
  }

  if (
    cleanText.includes("pleural effusion") ||
    cleanText.includes("lung consolidation") ||
    cleanText.includes("pneumonia")
  ) {
    findings.push({
      organ: "Lungs",
      finding: "Pulmonary abnormality",
      severity: cleanText.includes("mild")
        ? "Mild"
        : cleanText.includes("moderate")
        ? "Moderate"
        : cleanText.includes("severe")
        ? "Severe"
        : "Detected",
      confidence: "High",
      note: "Radiology text suggests a lung-related abnormality.",
    });
  }

  return findings;
}

export function buildRadiologySummary(findings: RadiologyFinding[]) {
  if (findings.length === 0) {
    return {
      summary: "No structured radiology findings were detected clearly.",
      riskSignals: "No specific radiology risk signals detected.",
      recommendations:
        "Review the original radiology report with a licensed healthcare professional.",
    };
  }

  return {
    summary: `${findings.length} radiology finding(s) detected.`,
    riskSignals: findings
      .map(
        (item) =>
          `${item.organ}: ${item.finding} (${item.severity}) - ${item.note}`
      )
      .join("\n"),
    recommendations:
      "Radiology findings should be reviewed with the ordering clinician and correlated with symptoms, examination, and lab results.",
  };
}
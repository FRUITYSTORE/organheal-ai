export type LabMarkerResult = {
  marker: string;
  value: number | null;
  unit: string;
  status: "Low" | "Normal" | "High" | "Detected";
  note: string;
};

const markerPatterns = [
  { marker: "Hemoglobin", regex: /hemoglobin\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "g/dL", low: 12, high: 17.5 },
  { marker: "WBC", regex: /(white blood cell|wbc)\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "x10^9/L", low: 4, high: 11 },
  { marker: "Platelets", regex: /(platelet|platelets)\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "x10^9/L", low: 150, high: 450 },
  { marker: "Glucose", regex: /glucose\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "mg/dL", low: 70, high: 126 },
  { marker: "Creatinine", regex: /creatinine\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "mg/dL", low: 0.6, high: 1.3 },
  { marker: "Urea", regex: /urea\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "mg/dL", low: 15, high: 45 },
  { marker: "ALT", regex: /(alt|alanine aminotransferase)\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "U/L", low: 0, high: 45 },
  { marker: "AST", regex: /(ast|aspartate aminotransferase)\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "U/L", low: 0, high: 40 },
  { marker: "ALP", regex: /(alp|alkaline phosphatase)\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "U/L", low: 40, high: 130 },
  { marker: "Bilirubin", regex: /bilirubin\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "mg/dL", low: 0.1, high: 1.2 },
  { marker: "TSH", regex: /(tsh|thyroid stimulating hormone)\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "mIU/L", low: 0.4, high: 4.5 },
  { marker: "FT4", regex: /(ft4|free thyroxine)\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "ng/dL", low: 0.8, high: 1.8 },
  { marker: "LDL", regex: /ldl\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "mg/dL", low: 0, high: 100 },
  { marker: "HDL", regex: /hdl\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "mg/dL", low: 40, high: 999 },
  { marker: "Triglycerides", regex: /triglycerides\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "mg/dL", low: 0, high: 150 },
  { marker: "HbA1c", regex: /(hba1c|a1c)\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "%", low: 0, high: 5.7 },
  { marker: "Vitamin D", regex: /(vitamin d|25-oh vitamin d)\s*[:\-]?\s*(\d+\.?\d*)/i, unit: "ng/mL", low: 30, high: 100 },
];

export function detectLabMarkers(text: string): LabMarkerResult[] {
  const results: LabMarkerResult[] = [];

  for (const item of markerPatterns) {
    const match = text.match(item.regex);
    if (!match) continue;

    const rawValue = Number(match[2] || match[1]);
    const value = Number.isFinite(rawValue) ? rawValue : null;

    let status: LabMarkerResult["status"] = "Detected";
    let note = `${item.marker} detected in the uploaded report.`;

    if (value !== null) {
      if (value < item.low) {
        status = "Low";
        note = `${item.marker} appears below the common reference range.`;
      } else if (value > item.high) {
        status = "High";
        note = `${item.marker} appears above the common reference range.`;
      } else {
        status = "Normal";
        note = `${item.marker} appears within the common reference range.`;
      }
    }

    results.push({
      marker: item.marker,
      value,
      unit: item.unit,
      status,
      note,
    });
  }

  return results;
}

export function buildLabMarkerSummary(markers: LabMarkerResult[]) {
  if (markers.length === 0) {
    return {
      summary: "No structured lab markers were detected clearly from this report.",
      keyFindings: "OCR text was extracted, but lab values were not clearly structured.",
      riskSignals: "No specific lab risk signals detected.",
      recommendations:
        "Review the original report with a licensed healthcare professional.",
    };
  }

  const abnormal = markers.filter(
    (item) => item.status === "High" || item.status === "Low"
  );

  return {
    summary: `${markers.length} lab marker(s) detected from the uploaded report.`,
    keyFindings: markers
      .map((item) => `${item.marker}: ${item.value ?? "Detected"} ${item.unit} (${item.status})`)
      .join("\n"),
    riskSignals:
      abnormal.length > 0
        ? abnormal.map((item) => `${item.marker}: ${item.status}`).join("\n")
        : "No abnormal marker detected based on common reference ranges.",
    recommendations:
      abnormal.length > 0
        ? "Some markers may be outside common reference ranges. Please review with a licensed healthcare professional."
        : "Detected markers appear generally within common reference ranges. Continue regular health monitoring.",
  };
}
export type LabMarkerStatus = "Low" | "Normal" | "High" | "Detected";

export type LabMarkerResult = {
  marker: string;
  value: number | null;
  unit: string;
  status: LabMarkerStatus;
  note: string;
  category: string;
  referenceLow?: number | null;
  referenceHigh?: number | null;
  referenceSource?: "report" | "default";
};

export type LabPatternInsight = {
  title: string;
  severity: "Low" | "Moderate" | "High";
  message: string;
};

type MarkerPattern = {
  marker: string;
  aliases: string[];
  unit: string;
  low: number;
  high: number;
  category: string;
};

const markerPatterns: MarkerPattern[] = [
  {
    marker: "Hemoglobin",
    aliases: ["hemoglobin", "hb"],
    unit: "g/dL",
    low: 12,
    high: 17.5,
    category: "Blood Count",
  },
  {
    marker: "WBC",
    aliases: ["wbc", "white blood cell", "white blood cells"],
    unit: "x10^9/L",
    low: 4,
    high: 11,
    category: "Blood Count",
  },
  {
    marker: "RBC",
    aliases: ["rbc", "red blood cell", "red blood cells"],
    unit: "x10^12/L",
    low: 4.2,
    high: 5.9,
    category: "Blood Count",
  },
  {
    marker: "Platelets",
    aliases: ["platelet", "platelets", "plt"],
    unit: "x10^9/L",
    low: 150,
    high: 450,
    category: "Blood Count",
  },
  {
    marker: "Glucose",
    aliases: ["glucose", "fasting glucose", "blood glucose"],
    unit: "mg/dL",
    low: 70,
    high: 126,
    category: "Metabolic",
  },
  {
    marker: "HbA1c",
    aliases: ["hba1c", "a1c", "glycated hemoglobin"],
    unit: "%",
    low: 0,
    high: 5.7,
    category: "Metabolic",
  },
  {
    marker: "Total Cholesterol",
    aliases: ["total cholesterol", "cholesterol"],
    unit: "mg/dL",
    low: 0,
    high: 200,
    category: "Lipids",
  },
  {
    marker: "LDL",
    aliases: ["ldl", "ldl cholesterol"],
    unit: "mg/dL",
    low: 0,
    high: 100,
    category: "Lipids",
  },
  {
    marker: "HDL",
    aliases: ["hdl", "hdl cholesterol"],
    unit: "mg/dL",
    low: 40,
    high: 999,
    category: "Lipids",
  },
  {
    marker: "Triglycerides",
    aliases: ["triglycerides", "tg"],
    unit: "mg/dL",
    low: 0,
    high: 150,
    category: "Lipids",
  },
  {
    marker: "Creatinine",
    aliases: ["creatinine"],
    unit: "mg/dL",
    low: 0.6,
    high: 1.3,
    category: "Kidney",
  },
  {
    marker: "Urea",
    aliases: ["urea", "blood urea"],
    unit: "mg/dL",
    low: 15,
    high: 45,
    category: "Kidney",
  },
  {
    marker: "BUN",
    aliases: ["bun", "blood urea nitrogen"],
    unit: "mg/dL",
    low: 7,
    high: 20,
    category: "Kidney",
  },
  {
    marker: "eGFR",
    aliases: ["egfr", "gfr", "glomerular filtration rate"],
    unit: "mL/min/1.73m²",
    low: 60,
    high: 999,
    category: "Kidney",
  },
  {
    marker: "ALT",
    aliases: ["alt", "alanine aminotransferase"],
    unit: "U/L",
    low: 0,
    high: 45,
    category: "Liver",
  },
  {
    marker: "AST",
    aliases: ["ast", "aspartate aminotransferase"],
    unit: "U/L",
    low: 0,
    high: 40,
    category: "Liver",
  },
  {
    marker: "ALP",
    aliases: ["alp", "alkaline phosphatase"],
    unit: "U/L",
    low: 40,
    high: 130,
    category: "Liver",
  },
  {
    marker: "Bilirubin",
    aliases: ["bilirubin", "total bilirubin"],
    unit: "mg/dL",
    low: 0.1,
    high: 1.2,
    category: "Liver",
  },
  {
    marker: "Albumin",
    aliases: ["albumin"],
    unit: "g/dL",
    low: 3.5,
    high: 5.5,
    category: "Liver",
  },
  {
    marker: "TSH",
    aliases: ["tsh", "thyroid stimulating hormone"],
    unit: "mIU/L",
    low: 0.4,
    high: 4.5,
    category: "Thyroid",
  },
  {
    marker: "FT4",
    aliases: ["ft4", "free thyroxine"],
    unit: "ng/dL",
    low: 0.8,
    high: 1.8,
    category: "Thyroid",
  },
  {
    marker: "Vitamin D",
    aliases: ["vitamin d", "25-oh vitamin d", "25 hydroxy vitamin d"],
    unit: "ng/mL",
    low: 30,
    high: 100,
    category: "Vitamins",
  },
  {
    marker: "Ferritin",
    aliases: ["ferritin"],
    unit: "ng/mL",
    low: 30,
    high: 300,
    category: "Iron",
  },
];

function normalizeText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function isReasonableReferenceRange(
  marker: string,
  low: number,
  high: number
) {
  const rules: Record<
    string,
    { minLow: number; maxLow: number; minHigh: number; maxHigh: number }
  > = {
    LDL: { minLow: 0, maxLow: 100, minHigh: 50, maxHigh: 300 },

    HDL: { minLow: 10, maxLow: 80, minHigh: 20, maxHigh: 150 },

    "Total Cholesterol": {
      minLow: 0,
      maxLow: 150,
      minHigh: 100,
      maxHigh: 400,
    },

    Triglycerides: {
      minLow: 0,
      maxLow: 150,
      minHigh: 50,
      maxHigh: 500,
    },
  };

  const rule = rules[marker];

  if (!rule) return true;

  return (
    low >= rule.minLow &&
    low <= rule.maxLow &&
    high >= rule.minHigh &&
    high <= rule.maxHigh
  );
}
function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function findRangeNearAlias(text: string, alias: string) {
  const safeAlias = escapeRegex(alias);

  /*
   * Marker aliases must match as complete terms.
   *
   * Without word boundaries, a short alias such as "ast"
   * can incorrectly match the "ast" inside "fasting" and
   * capture the glucose value that follows it.
   */
  const boundedAlias =
    `\\b${safeAlias}\\b`;

  const patterns = [
    new RegExp(
      `${boundedAlias}[^\\d]{0,30}(\\d+(?:\\.\\d+)?)\\s*(?:mg\\/dL|g\\/dL|U\\/L|IU\\/L|%|ng\\/mL|mIU\\/L|x10\\^9\\/L|x10\\^12\\/L)?[^\\d]{0,30}(\\d+(?:\\.\\d+)?)\\s*[-–to]+\\s*(\\d+(?:\\.\\d+)?)`,
      "i"
    ),
    new RegExp(
      `${boundedAlias}[^\\d]{0,80}(\\d+(?:\\.\\d+)?)\\s*[-–]\\s*(\\d+(?:\\.\\d+)?)`,
      "i"
    ),
    new RegExp(
      `${boundedAlias}[^\\d]{0,80}ref(?:erence)?\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*[-–]\\s*(\\d+(?:\\.\\d+)?)`,
      "i"
    ),
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (!match) continue;

    if (match.length >= 4) {
      const value = Number(match[1]);
      const low = Number(match[2]);
      const high = Number(match[3]);

      if (Number.isFinite(value) && Number.isFinite(low) && Number.isFinite(high)) {
        return { value, low, high };
      }
    }

    if (match.length >= 3) {
      const low = Number(match[1]);
      const high = Number(match[2]);

      if (Number.isFinite(low) && Number.isFinite(high)) {
        return { value: null, low, high };
      }
    }
  }

  return null;
}

function findValueNearAlias(text: string, alias: string): number | null {
  const safeAlias = escapeRegex(alias);

  const boundedAlias =
    `\\b${safeAlias}\\b`;

  const patterns = [
    new RegExp(
  `${boundedAlias}\\s*[:=\\-]?\\s*(\\d+(?:\\.\\d+)?)`,
  "i"
),
new RegExp(
  `${boundedAlias}\\s+.*?\\s(\\d+(?:\\.\\d+)?)\\s*(mg\\/dL|g\\/dL|u\\/l|iu\\/l|%|ng\\/ml|miu\\/l)?`,
  "i"
),
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (!match) continue;

    const value = Number(match[1]);
    if (Number.isFinite(value)) return value;
  }

  return null;
}

function getStatus(value: number | null, low: number, high: number): LabMarkerStatus {
  if (value === null) return "Detected";

  if (value < low) return "Low";
  if (value > high) return "High";
  return "Normal";
}

function getNote(marker: string, status: LabMarkerStatus) {
  if (status === "High") {
    return `${marker} appears above common adult reference ranges.`;
  }

  if (status === "Low") {
    return `${marker} appears below common adult reference ranges.`;
  }

  if (status === "Normal") {
    return `${marker} appears within common adult reference ranges.`;
  }

  return `${marker} was detected, but no clear numeric value was extracted.`;
}

export function detectLabMarkers(text: string): LabMarkerResult[] {
  const cleanText = normalizeText(text);
  const results: LabMarkerResult[] = [];
  const seenMarkers = new Set<string>();

  for (const markerDef of markerPatterns) {
    for (const alias of markerDef.aliases) {
const rangeMatch = findRangeNearAlias(cleanText, alias);
const value = rangeMatch?.value ?? findValueNearAlias(cleanText, alias);

if (value === null) continue;
if (seenMarkers.has(markerDef.marker)) continue;

let referenceLow = markerDef.low;
let referenceHigh = markerDef.high;
let referenceSource: "report" | "default" = "default";

if (
  rangeMatch &&
  isReasonableReferenceRange(
    markerDef.marker,
    rangeMatch.low,
    rangeMatch.high
  )
) {
  referenceLow = rangeMatch.low;
  referenceHigh = rangeMatch.high;
  referenceSource = "report";
}

const status = getStatus(value, referenceLow, referenceHigh);

results.push({
  marker: markerDef.marker,
  value,
  unit: markerDef.unit,
  status,
  note:
    referenceSource === "report"
      ? `${markerDef.marker} interpreted using the reference range found in the uploaded report.`
      : getNote(markerDef.marker, status),
  category: markerDef.category,
  referenceLow,
  referenceHigh,
  referenceSource,
});

seenMarkers.add(markerDef.marker);
    }
  }

  return results;
}

export function detectLabPatterns(markers: LabMarkerResult[]): LabPatternInsight[] {
  const insights: LabPatternInsight[] = [];

  const get = (name: string) => markers.find((m) => m.marker === name);

  const glucose = get("Glucose");
  const hba1c = get("HbA1c");
  const ldl = get("LDL");
  const hdl = get("HDL");
  const triglycerides = get("Triglycerides");
  const creatinine = get("Creatinine");
  const egfr = get("eGFR");
  const alt = get("ALT");
  const ast = get("AST");
  const bilirubin = get("Bilirubin");
  const tsh = get("TSH");
  const ft4 = get("FT4");
  const vitaminD = get("Vitamin D");
  const hemoglobin = get("Hemoglobin");
  const ferritin = get("Ferritin");

  if (
    (glucose?.status === "High" || hba1c?.status === "High") &&
    (triglycerides?.status === "High" || hdl?.status === "Low")
  ) {
    insights.push({
      title: "Possible metabolic risk pattern",
      severity: "High",
      message:
        "Elevated glucose/HbA1c combined with triglyceride or HDL imbalance may suggest a metabolic risk pattern that deserves lifestyle intervention and clinical follow-up.",
    });
  }

  if (ldl?.status === "High" || triglycerides?.status === "High" || hdl?.status === "Low") {
    insights.push({
      title: "Cardiovascular risk pattern",
      severity: ldl?.status === "High" && triglycerides?.status === "High" ? "High" : "Moderate",
      message:
        "Lipid abnormalities may increase cardiovascular risk. Nutrition, physical activity, weight management, and follow-up lipid testing are recommended.",
    });
  }

  if (creatinine?.status === "High" || egfr?.status === "Low") {
    insights.push({
      title: "Kidney monitoring pattern",
      severity: "High",
      message:
        "Creatinine elevation or low eGFR may indicate a need for kidney function follow-up, hydration review, blood pressure monitoring, and clinical evaluation.",
    });
  }

  if (alt?.status === "High" || ast?.status === "High" || bilirubin?.status === "High") {
    insights.push({
      title: "Liver function monitoring pattern",
      severity: bilirubin?.status === "High" ? "High" : "Moderate",
      message:
        "Liver-related markers appear abnormal. Follow-up liver panel review and assessment of symptoms or medication/supplement exposure may be needed.",
    });
  }

  if (tsh?.status === "High" && ft4?.status === "Low") {
    insights.push({
      title: "Possible hypothyroid pattern",
      severity: "Moderate",
      message:
        "High TSH with low FT4 may suggest a thyroid underactivity pattern that requires clinical review and repeat thyroid testing.",
    });
  } else if (tsh?.status === "Low" && ft4?.status === "High") {
    insights.push({
      title: "Possible hyperthyroid pattern",
      severity: "Moderate",
      message:
        "Low TSH with high FT4 may suggest a thyroid overactivity pattern that requires clinical review and repeat thyroid testing.",
    });
  }

  if (vitaminD?.status === "Low") {
    insights.push({
      title: "Vitamin D insufficiency pattern",
      severity: "Low",
      message:
        "Low vitamin D may affect bone, muscle, and general wellness. Supplementation and repeat testing may be discussed with a clinician.",
    });
  }

  if (hemoglobin?.status === "Low" || ferritin?.status === "Low") {
    insights.push({
      title: "Possible anemia or iron deficiency pattern",
      severity: "Moderate",
      message:
        "Low hemoglobin or ferritin may suggest anemia or iron deficiency pattern. Clinical review and iron studies may be needed.",
    });
  }

  return insights;
}

export function buildLabMarkerSummary(markers: LabMarkerResult[]) {
  const patterns = detectLabPatterns(markers);

  if (markers.length === 0) {
    return {
      summary: "No structured lab markers were detected clearly from this report.",
      keyFindings:
        "OCR text was extracted, but lab values were not clearly structured.",
      riskSignals: "No specific lab risk signals detected.",
      recommendations:
        "Review the original report with a licensed healthcare professional.",
    };
  }

  const abnormal = markers.filter(
    (item) => item.status === "High" || item.status === "Low"
  );

  const normal = markers.filter((item) => item.status === "Normal");

  const keyFindings = [
  ...abnormal.map(
    (item) =>
      `${item.marker}: ${item.value ?? "Detected"} ${item.unit} (${item.status})${
        item.referenceLow !== undefined &&
        item.referenceHigh !== undefined
          ? ` | Ref: ${item.referenceLow}-${item.referenceHigh} (${item.referenceSource})`
          : ""
      }`
  ),

  ...normal.map(
    (item) =>
      `${item.marker}: ${item.value ?? "Detected"} ${item.unit} (${item.status})${
        item.referenceLow !== undefined &&
        item.referenceHigh !== undefined
          ? ` | Ref: ${item.referenceLow}-${item.referenceHigh} (${item.referenceSource})`
          : ""
      }`
  ),
].join(" | ");

  const riskSignals =
    patterns.length > 0
      ? patterns
          .map((pattern) => `${pattern.title} (${pattern.severity}): ${pattern.message}`)
          .join("\n")
      : abnormal.length > 0
      ? abnormal.map((item) => `${item.marker}: ${item.status}`).join("\n")
      : "No abnormal marker detected based on common adult reference ranges.";

  const recommendations =
    patterns.length > 0
      ? patterns
          .map((pattern) => `${pattern.title}: ${pattern.message}`)
          .join("\n")
      : abnormal.length > 0
      ? "Some markers may be outside common adult reference ranges. Please review with a licensed healthcare professional."
      : "Detected markers appear generally within common adult reference ranges. Continue regular health monitoring.";

  return {
    summary: `${markers.length} lab marker(s) detected from the uploaded report.`,
    keyFindings,
    riskSignals,
    recommendations,
  };
}
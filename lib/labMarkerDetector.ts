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
  aliases: [
    "hemoglobin a1c",
    "hba1c",
    "a1c",
    "glycated hemoglobin",
  ],
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

type ExtractedLabValue = {
  value: number;
  unit: string | null;
};

function normalizeReportedUnit(
  unit: string | undefined
): string | null {
  if (!unit) {
    return null;
  }

  const normalized =
    unit
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

  const knownUnits: Record<
    string,
    string
  > = {
    "mg/dl":
      "mg/dL",

    "g/dl":
      "g/dL",

    "u/l":
      "U/L",

    "iu/l":
      "IU/L",

    "%":
      "%",

    "ng/ml":
      "ng/mL",

    "miu/l":
      "mIU/L",

    "mmol/l":
      "mmol/L",

    "ml/min/1.73m²":
      "mL/min/1.73m²",

    "ml/min/1.73m2":
      "mL/min/1.73m²",

    "ml/min/1.73mâ²":
      "mL/min/1.73m²",
  };

  return (
    knownUnits[
      normalized
    ] ??
    unit.trim()
  );
}

function findValueNearAlias(
  text: string,
  alias: string
): ExtractedLabValue | null {
  const safeAlias =
    escapeRegex(
      alias
    );

  const boundedAlias =
    `\\b${safeAlias}\\b`;

  const unitPattern =
    "mg\\/dL|g\\/dL|u\\/l|iu\\/l|%|ng\\/ml|miu\\/l|mmol\\/l|ml\\/min\\/1\\.73m(?:²|2|Â²)";

  const patterns = [
    /*
     * A method or equation may appear between the marker
     * name and the actual result:
     *
     * eGFR (CKD-EPI 2021) 105 mL/min/1.73m²
     *
     * 2021 describes the equation and is not the result.
     */
    new RegExp(
      `${boundedAlias}\\s*\\([^)]{0,80}\\)\\s*(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})?`,
      "i"
    ),

    new RegExp(
      `${boundedAlias}\\s*[:=\\-]?\\s*(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})?`,
      "i"
    ),

    new RegExp(
      `${boundedAlias}\\s+.*?\\s(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})?`,
      "i"
    ),
  ];

  for (
    const regex
    of patterns
  ) {
    const match =
      text.match(
        regex
      );

    if (!match) {
      continue;
    }

    const value =
      Number(
        match[1]
      );

    if (
      !Number.isFinite(
        value
      )
    ) {
      continue;
    }

    return {
      value,

      unit:
        normalizeReportedUnit(
          match[2]
        ),
    };
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
const rangeMatch =
  findRangeNearAlias(
    cleanText,
    alias
  );

const extractedValue =
  findValueNearAlias(
    cleanText,
    alias
  );

const value =
  rangeMatch?.value ??
  extractedValue?.value ??
  null;

if (
  value === null
) {
  continue;
}

if (
  seenMarkers.has(
    markerDef.marker
  )
) {
  continue;
}

const reportedUnit =
  extractedValue?.unit;

const unit =
  reportedUnit ??
  markerDef.unit;

const usesDefaultUnit =
  !reportedUnit ||
  reportedUnit
    .trim()
    .toLowerCase() ===
    markerDef.unit
      .trim()
      .toLowerCase();

let referenceLow:
  number | null =
  usesDefaultUnit
    ? markerDef.low
    : null;

let referenceHigh:
  number | null =
  usesDefaultUnit
    ? markerDef.high
    : null;

let referenceSource:
  | "report"
  | "default"
  | undefined =
  usesDefaultUnit
    ? "default"
    : undefined;

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

const status =
  referenceLow !== null &&
  referenceHigh !== null
    ? getStatus(
        value,
        referenceLow,
        referenceHigh
      )
    : "Detected";

results.push({
  marker: markerDef.marker,
  value,
  unit,
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

export function buildLabMarkerSummary(
  markers: LabMarkerResult[],
  language: "en" | "ar" = "en"
) {
  const patterns =
    detectLabPatterns(
      markers
    );

  const isArabic =
    language === "ar";

  const statusLabel = (
    status: LabMarkerResult["status"]
  ) => {
    if (!isArabic) {
      return status;
    }

    if (status === "High") {
      return "مرتفع";
    }

    if (status === "Low") {
      return "منخفض";
    }

    if (status === "Normal") {
      return "طبيعي";
    }

    return "تم اكتشافه";
  };

  const severityRank: Record<
    LabPatternInsight["severity"],
    number
  > = {
    High: 3,
    Moderate: 2,
    Low: 1,
  };

  const prioritizedPatterns =
    [...patterns].sort(
      (left, right) =>
        severityRank[right.severity] -
        severityRank[left.severity]
    );

  if (markers.length === 0) {
    return {
      summary: isArabic
        ? "لم يتم اكتشاف مؤشرات مخبرية منظمة بشكل واضح من هذا التقرير."
        : "No structured lab markers were detected clearly from this report.",

      keyFindings: isArabic
        ? "تم استخراج نص التقرير، لكن القيم المخبرية لم تكن منظمة بشكل يسمح بتفسير موثوق."
        : "Report text was extracted, but the lab values were not structured clearly enough for reliable interpretation.",

      riskSignals: isArabic
        ? "لم يتم اكتشاف إشارات مخبرية محددة تستدعي الانتباه."
        : "No specific lab risk signals were identified.",

      recommendations: isArabic
        ? "راجع التقرير الأصلي مع مختص رعاية صحية مرخص إذا كانت لديك أعراض أو مخاوف، لأن عدم اكتشاف المؤشرات آليًا لا يعني أن التقرير طبيعي."
        : "Review the original report with a licensed healthcare professional if you have symptoms or concerns, because failure to detect structured markers does not mean the report is normal.",
    };
  }

  const abnormal =
    markers.filter(
      (item) =>
        item.status === "High" ||
        item.status === "Low"
    );

  const normal =
    markers.filter(
      (item) =>
        item.status === "Normal"
    );

  const unclassified =
    markers.filter(
      (item) =>
        item.status === "Detected"
    );

  const formatMarker = (
    item: LabMarkerResult
  ) => {
    const valueText =
      item.value !== null
        ? `${item.value}${
            item.unit
              ? ` ${item.unit}`
              : ""
          }`
        : isArabic
          ? "تم اكتشاف المؤشر"
          : "Detected";

    const hasReferenceRange =
      typeof item.referenceLow ===
        "number" &&
      typeof item.referenceHigh ===
        "number";

    const referenceText =
      hasReferenceRange
        ? isArabic
          ? ` | المرجع: ${item.referenceLow}-${item.referenceHigh}${
              item.referenceSource
                ? ` (${item.referenceSource === "report" ? "من التقرير" : "افتراضي"})`
                : ""
            }`
          : ` | Ref: ${item.referenceLow}-${item.referenceHigh}${
              item.referenceSource
                ? ` (${item.referenceSource})`
                : ""
            }`
        : "";

    return `${item.marker}: ${valueText} (${statusLabel(
      item.status
    )})${referenceText}`;
  };

  const priorityPattern =
    prioritizedPatterns[0] ??
    null;

  const summary =
    abnormal.length > 0
      ? isArabic
        ? `${abnormal.length} من أصل ${markers.length} مؤشرًا مخبريًا مكتشفًا يقع خارج النطاقات المرجعية المتاحة. ${
            priorityPattern
              ? "كما تم اكتشاف نمط مخبري مترابط يستحق أولوية في المراجعة."
              : "تحتاج النتائج غير الطبيعية إلى تفسيرها مع السياق السريري الكامل."
          } ${
            normal.length > 0
              ? `وفي المقابل، ظهر ${normal.length} مؤشرًا ضمن النطاق المرجعي المتاح.`
              : ""
          }`
        : `${abnormal.length} of ${markers.length} detected lab markers are outside the available reference ranges. ${
            priorityPattern
              ? `The highest-priority pattern identified by the rule-based analysis is ${priorityPattern.title}.`
              : "The abnormal findings should be interpreted together with the full clinical context."
          } ${
            normal.length > 0
              ? `${normal.length} marker(s) were within the available reference ranges.`
              : ""
          }`
      : isArabic
        ? `تم اكتشاف ${markers.length} مؤشرًا مخبريًا، ولم يظهر أي منها خارج النطاقات المرجعية المتاحة حاليًا.${
            unclassified.length > 0
              ? ` تعذر تصنيف ${unclassified.length} مؤشرًا بشكل كامل بسبب عدم توفر نطاق مرجعي مناسب.`
              : ""
          }`
        : `${markers.length} lab marker(s) were detected, with no marker classified outside the currently available reference ranges.${
            unclassified.length > 0
              ? ` ${unclassified.length} marker(s) could not be fully classified because an appropriate reference range was unavailable.`
              : ""
          }`;

  const keyFindingsSections: string[] =
    [];

  keyFindingsSections.push(
    isArabic
      ? "النتائج التي تحتاج إلى الانتباه:"
      : "Abnormal findings:"
  );

  if (abnormal.length > 0) {
    keyFindingsSections.push(
      ...abnormal.map(
        (item) =>
          `- ${formatMarker(
            item
          )}`
      )
    );
  } else {
    keyFindingsSections.push(
      isArabic
        ? "- لم يتم تصنيف أي مؤشر مكتشف كمرتفع أو منخفض."
        : "- No detected marker was classified as high or low."
    );
  }

  if (normal.length > 0) {
    keyFindingsSections.push(
      "",
      isArabic
        ? "نتائج مطمئنة ضمن النطاقات المتاحة:"
        : "Reassuring findings within the available ranges:",
      ...normal.map(
        (item) =>
          `- ${formatMarker(
            item
          )}`
      )
    );
  }

  if (unclassified.length > 0) {
    keyFindingsSections.push(
      "",
      isArabic
        ? "مؤشرات تحتاج إلى سياق إضافي:"
        : "Markers needing additional context:",
      ...unclassified.map(
        (item) =>
          `- ${formatMarker(
            item
          )}`
      )
    );
  }

  const keyFindings =
    keyFindingsSections.join(
      "\n"
    );

  const riskSignals =
    prioritizedPatterns.length > 0
      ? prioritizedPatterns
          .map(
            (
              pattern,
              index
            ) =>
              isArabic
                ? `${
                    index === 0
                      ? "الأولوية الأعلى"
                      : "نمط إضافي"
                  }: ${pattern.title}\n${pattern.message}`
                : `${
                    index === 0
                      ? "Top priority"
                      : "Additional pattern"
                  }: ${pattern.title} (${pattern.severity})\nWhy it matters: ${pattern.message}`
          )
          .join(
            "\n\n"
          )
      : abnormal.length > 0
        ? abnormal
            .map(
              (item) =>
                `${item.marker}: ${statusLabel(
                  item.status
                )}`
            )
            .join(
              "\n"
            )
        : isArabic
          ? "لم يتم اكتشاف نمط مخبري غير طبيعي واضح من المؤشرات المصنفة."
          : "No clear abnormal laboratory pattern was identified from the classified markers.";

  const recommendations =
    abnormal.length > 0
      ? isArabic
        ? [
            "الخطوة التالية: راجع النتائج غير الطبيعية مع مقدم رعاية صحية مرخص وفسرها مع التاريخ المرضي والأعراض والأدوية والنتائج السابقة.",
            "توقيت المتابعة: يعتمد توقيت إعادة الفحوصات على نوع المؤشرات غير الطبيعية وعلى وجود تغيير في العلاج أو نمط الحياة، ويُحدد مع الطبيب.",
            "مراجعة أبكر: اطلب مراجعة طبية أبكر إذا ظهرت أعراض جديدة أو متفاقمة، أو إذا كان التقرير الأصلي يصنف أي نتيجة على أنها حرجة.",
            "حدود التفسير: يعتمد هذا التحليل على القيم المستخرجة والنطاقات المرجعية المتاحة ولا يثبت تشخيصًا بمفرده.",
          ].join(
            "\n"
          )
        : [
            "Next step: Review the abnormal findings with a licensed clinician and interpret them together with your medical history, symptoms, medications, and prior results.",
            "Follow-up timing: The repeat-testing interval should be individualized according to the abnormal markers and whether treatment or lifestyle changes are made.",
            "Earlier review: Seek earlier medical review if symptoms are new or worsening, or if the original laboratory report labels any result as critical.",
            "Limitations: This interpretation uses extracted report values and available reference ranges and does not establish a diagnosis by itself.",
          ].join(
            "\n"
          )
      : isArabic
        ? [
            "النتائج المصنفة تبدو عمومًا ضمن النطاقات المرجعية المتاحة.",
            "استمر في المتابعة الصحية الدورية حسب حالتك وعوامل الخطورة لديك.",
            "هذه النتيجة لا تستبعد وجود مشكلة صحية لم يتم تمثيلها في المؤشرات المكتشفة من التقرير.",
          ].join(
            "\n"
          )
        : [
            "The classified markers appear generally within the available reference ranges.",
            "Continue routine health follow-up according to your individual health history and risk factors.",
            "This does not exclude a health issue that may not be represented by the markers detected from this report.",
          ].join(
            "\n"
          );

  return {
    summary,
    keyFindings,
    riskSignals,
    recommendations,
  };
}
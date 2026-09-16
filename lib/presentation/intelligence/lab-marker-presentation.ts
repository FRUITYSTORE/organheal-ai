export type IntelligencePresentationLanguage =
  | "en"
  | "ar";

const ARABIC_MARKER_NAMES:
  Record<string, string> = {
  glucose: "الجلوكوز",
  "total cholesterol": "الكوليسترول الكلي",
  cholesterol: "الكوليسترول",
  triglycerides: "الدهون الثلاثية",
  creatinine: "الكرياتينين",
  hemoglobin: "الهيموغلوبين",
  wbc: "كريات الدم البيضاء",
  rbc: "كريات الدم الحمراء",
  platelets: "الصفائح الدموية",
  urea: "اليوريا",
  bun: "نيتروجين اليوريا في الدم",
  bilirubin: "البيليروبين",
  "vitamin d": "فيتامين د",
  ferritin: "الفيريتين",

  // Standard clinical abbreviations remain unchanged.
  ldl: "LDL",
  hdl: "HDL",
  hba1c: "HbA1c",
  egfr: "eGFR",
  alt: "ALT",
  ast: "AST",
  alp: "ALP",
  tsh: "TSH",
  ft4: "FT4",
};

export function presentLabMarkerName(
  marker: string,
  language:
    IntelligencePresentationLanguage
): string {
  const clean =
    marker.trim();

  if (
    language !== "ar" ||
    !clean
  ) {
    return clean;
  }

  return (
    ARABIC_MARKER_NAMES[
      clean.toLowerCase()
    ] ??
    clean
  );
}

export function presentLabTrendDirection(
  direction:
    string | null | undefined,
  language:
    IntelligencePresentationLanguage
): string {
  const clean =
    direction?.trim() ||
    "Stable";

  if (language !== "ar") {
    return clean;
  }

  const normalized =
    clean.toLowerCase();

  if (
    normalized.includes(
      "improv"
    ) ||
    normalized.includes(
      "better"
    )
  ) {
    return "تحسن";
  }

  if (
    normalized.includes(
      "wors"
    ) ||
    normalized.includes(
      "declin"
    )
  ) {
    return "تراجع";
  }

  if (
    normalized.includes(
      "stable"
    )
  ) {
    return "مستقر";
  }

  if (
    normalized.includes(
      "insufficient"
    )
  ) {
    return "بيانات غير كافية";
  }

  return clean;
}

export function presentLabTrendSummary({
  marker,
  earliestValue,
  latestValue,
  unit,
  direction,
  fallbackSummary,
  language,
}: {
  marker: string;
  earliestValue?:
    string | number | null;
  latestValue?:
    string | number | null;
  unit?:
    string | null;
  direction?:
    string | null;
  fallbackSummary?:
    string | null;
  language:
    IntelligencePresentationLanguage;
}): string {
  if (language !== "ar") {
    return (
      fallbackSummary?.trim() ||
      ""
    );
  }

  const markerName =
    presentLabMarkerName(
      marker,
      "ar"
    ) ||
    "المؤشر المخبري";

  const directionText =
    presentLabTrendDirection(
      direction,
      "ar"
    );

  const hasEarlier =
    earliestValue !==
      undefined &&
    earliestValue !== null &&
    String(
      earliestValue
    ).trim() !== "";

  const hasLatest =
    latestValue !==
      undefined &&
    latestValue !== null &&
    String(
      latestValue
    ).trim() !== "";

  const unitSuffix =
    unit?.trim()
      ? ` ${unit.trim()}`
      : "";

  if (
    hasEarlier &&
    hasLatest
  ) {
    return `${markerName}: تغيّرت القراءة من ${earliestValue}${unitSuffix} إلى ${latestValue}${unitSuffix}. الاتجاه: ${directionText}.`;
  }

  return `اتجاه ${markerName}: ${directionText}.`;
}

export function presentHealthTimelineSummary(
  summary:
    string | null | undefined,
  language:
    IntelligencePresentationLanguage
): string {
  const clean =
    summary?.trim() || "";

  if (
    language !== "ar" ||
    !clean
  ) {
    return clean;
  }

  const improvement =
    clean.match(
      /Health timeline shows improvement of \+?(-?\d+(?:\.\d+)?) points across (\d+) data points/i
    );

  if (improvement) {
    return `يُظهر المسار الصحي تحسنًا بمقدار ${improvement[1]} نقاط عبر ${improvement[2]} نقاط بيانات.`;
  }

  const decline =
    clean.match(
      /Health timeline shows decline of (-?\d+(?:\.\d+)?) points across (\d+) data points/i
    );

  if (decline) {
    return `يُظهر المسار الصحي تراجعًا بمقدار ${Math.abs(
      Number(
        decline[1]
      )
    )} نقاط عبر ${decline[2]} نقاط بيانات.`;
  }

  const stable =
    clean.match(
      /Health timeline appears stable across (\d+) data points/i
    );

  if (stable) {
    return `يبدو المسار الصحي مستقرًا عبر ${stable[1]} نقاط بيانات.`;
  }

  if (
    clean ===
    "More historical data is needed to calculate a reliable health trend."
  ) {
    return "نحتاج إلى مزيد من البيانات التاريخية لحساب اتجاه صحي موثوق.";
  }

  return clean;
}
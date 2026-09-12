export type IntelligencePresentationLanguage =
  | "en"
  | "ar";

function cleanValue(
  value:
    | string
    | null
    | undefined
): string {
  return value?.trim() ?? "";
}

function hasArabicText(
  value: string
): boolean {
  return /[\u0600-\u06FF]/.test(
    value
  );
}

export function presentIntelligenceStatus(
  value:
    | string
    | null
    | undefined,
  language:
    IntelligencePresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (language !== "ar") {
    return clean || "Pending";
  }

  if (!clean) {
    return "قيد الانتظار";
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  const normalized =
    clean.toLowerCase();

  if (
    normalized.includes("fail") ||
    normalized.includes("error")
  ) {
    return "تعذر التنفيذ";
  }

  if (
    normalized.includes("process") ||
    normalized.includes("extract")
  ) {
    return "قيد المعالجة";
  }

  if (
    normalized.includes("complete") ||
    normalized.includes("generate")
  ) {
    return "مكتمل";
  }

  if (
    normalized.includes("ready")
  ) {
    return "جاهز";
  }

  if (
    normalized.includes("pending")
  ) {
    return "قيد الانتظار";
  }

  return "غير محدد";
}

export function presentIntelligenceRiskLevel(
  value:
    | string
    | null
    | undefined,
  language:
    IntelligencePresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (language !== "ar") {
    return clean ||
      "Not currently specified";
  }

  if (!clean) {
    return "غير محدد حاليًا";
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  const normalized =
    clean.toLowerCase();

  if (
    normalized.includes("critical")
  ) {
    return "حرج";
  }

  if (
    normalized.includes("high")
  ) {
    return "مرتفع";
  }

  if (
    normalized.includes("moderate") ||
    normalized.includes("medium")
  ) {
    return "متوسط";
  }

  if (
    normalized.includes("low")
  ) {
    return "منخفض";
  }

  if (
    normalized.includes("stable") ||
    normalized.includes("normal")
  ) {
    return "مستقر";
  }

  if (
    normalized.includes("review")
  ) {
    return "يحتاج مراجعة";
  }

  return "غير محدد حاليًا";
}

export function presentIntelligencePrioritySystem(
  value:
    | string
    | null
    | undefined,
  language:
    IntelligencePresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (language !== "ar") {
    return clean ||
      "General Health";
  }

  if (!clean) {
    return "الصحة العامة";
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  const normalized =
    clean.toLowerCase();

  if (
    normalized.includes("heart")
  ) {
    return "القلب";
  }

  if (
    normalized.includes("kidney")
  ) {
    return "الكلى";
  }

  if (
    normalized.includes("liver")
  ) {
    return "الكبد";
  }

  if (
    normalized.includes("lung") ||
    normalized.includes("respiratory")
  ) {
    return "الرئة";
  }

  if (
    normalized.includes("brain") ||
    normalized.includes("neurolog")
  ) {
    return "الدماغ";
  }

  if (
    normalized.includes("metabolic")
  ) {
    return "الأيض";
  }

  if (
    normalized.includes("preventive")
  ) {
    return "المتابعة الصحية الوقائية";
  }

  if (
    normalized.includes("general")
  ) {
    return "الصحة العامة";
  }

  return "مجال صحي";
}

export function presentIntelligenceTrend(
  value:
    | string
    | null
    | undefined,
  language:
    IntelligencePresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (language !== "ar") {
    return clean ||
      "Not available";
  }

  if (!clean) {
    return "غير متاح";
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  const normalized =
    clean.toLowerCase();

  if (
    normalized.includes("improv") ||
    normalized.includes("positive")
  ) {
    return "متحسن";
  }

  if (
    normalized.includes("worsen") ||
    normalized.includes("declin")
  ) {
    return "متراجع";
  }

  if (
    normalized.includes("stable") ||
    normalized.includes("unchanged")
  ) {
    return "مستقر";
  }

  if (
    normalized.includes("insufficient")
  ) {
    return "بيانات غير كافية";
  }

  return "غير محدد";
}

export function presentIntelligenceConfidenceLevel(
  value:
    | string
    | null
    | undefined,
  language:
    IntelligencePresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (language !== "ar") {
    return clean ||
      "Not available";
  }

  if (!clean) {
    return "غير متاح";
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  const normalized =
    clean.toLowerCase();

  if (
    normalized.includes("very high") ||
    normalized.includes("very strong")
  ) {
    return "مرتفعة جدًا";
  }

  if (
    normalized.includes("high") ||
    normalized.includes("strong")
  ) {
    return "مرتفعة";
  }

  if (
    normalized.includes("moderate") ||
    normalized.includes("medium")
  ) {
    return "متوسطة";
  }

  if (
    normalized.includes("low") ||
    normalized.includes("limited")
  ) {
    return "منخفضة";
  }

  return "غير محددة";
}

export function presentIntelligenceLegacyNextAction(
  value:
    | string
    | null
    | undefined,
  language:
    IntelligencePresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (language !== "ar") {
    return clean ||
      "Review the recommended next steps.";
  }

  if (!clean) {
    return "راجع النتائج والخطوات التالية المقترحة في تحليلك الصحي.";
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  return "راجع النتائج والخطوات التالية المقترحة في تحليلك الصحي.";
}
export function presentIntelligenceClinicalText(
  value:
    | string
    | null
    | undefined,
  language:
    IntelligencePresentationLanguage,
  fallbackAr: string,
  fallbackEn = "N/A"
): string {
  const clean =
    cleanValue(value);

  if (language !== "ar") {
    return clean ||
      fallbackEn;
  }

  if (!clean) {
    return fallbackAr;
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  return fallbackAr;
}

export function presentIntelligenceMedicalCategory(
  value:
    | string
    | null
    | undefined,
  language:
    IntelligencePresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (language !== "ar") {
    return clean ||
      "Not available";
  }

  if (!clean) {
    return "غير متاح";
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  const normalized =
    clean.toLowerCase();

  if (
    normalized.includes("lab") ||
    normalized.includes("laboratory")
  ) {
    return "التحاليل المخبرية";
  }

  if (
    normalized.includes("radiology") ||
    normalized.includes("imaging")
  ) {
    return "الأشعة والتصوير";
  }

  if (
    normalized.includes("heart") ||
    normalized.includes("cardiac") ||
    normalized.includes("cardio")
  ) {
    return "القلب";
  }

  if (
    normalized.includes("kidney") ||
    normalized.includes("renal")
  ) {
    return "الكلى";
  }

  if (
    normalized.includes("liver") ||
    normalized.includes("hepat")
  ) {
    return "الكبد";
  }

  if (
    normalized.includes("lung") ||
    normalized.includes("respiratory")
  ) {
    return "الجهاز التنفسي";
  }

  if (
    normalized.includes("brain") ||
    normalized.includes("neuro")
  ) {
    return "الجهاز العصبي";
  }

  if (
    normalized.includes("metabolic")
  ) {
    return "الأيض";
  }

  if (
    normalized.includes("preventive")
  ) {
    return "الصحة الوقائية";
  }

  if (
    normalized.includes("general")
  ) {
    return "الصحة العامة";
  }

  if (
    normalized.includes("clinical")
  ) {
    return "تقرير سريري";
  }

  return "فئة طبية";
}
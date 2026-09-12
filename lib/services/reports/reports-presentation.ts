export type ReportsPresentationLanguage =
  | "en"
  | "ar";

function hasArabicText(
  value: string
): boolean {
  return /[\u0600-\u06FF]/.test(
    value
  );
}

function cleanValue(
  value:
    | string
    | null
    | undefined
): string {
  return value?.trim() ?? "";
}

export function presentReportStatus(
  value:
    | string
    | null
    | undefined,
  language:
    ReportsPresentationLanguage
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
    normalized.includes("generate") ||
    normalized.includes("complete")
  ) {
    return "مكتمل";
  }

  if (
    normalized.includes("saved")
  ) {
    return "محفوظ";
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

export function presentReportType(
  value:
    | string
    | null
    | undefined,
  language:
    ReportsPresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (language !== "ar") {
    return clean || "Medical Report";
  }

  if (!clean) {
    return "تقرير طبي";
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  const normalized =
    clean.toLowerCase();

  if (
    normalized.includes("lab")
  ) {
    return "تقرير مختبر";
  }

  if (
    normalized.includes("radiolog")
  ) {
    return "تقرير أشعة";
  }

  if (
    normalized.includes("cardiolog")
  ) {
    return "تقرير قلب";
  }

  if (
    normalized.includes("orthopedic")
  ) {
    return "تقرير عظام";
  }

  if (
    normalized.includes("clinical")
  ) {
    return "ملخص سريري";
  }

  if (
    normalized.includes("prescription")
  ) {
    return "وصفة طبية";
  }

  if (
    normalized.includes("medical")
  ) {
    return "تقرير طبي";
  }

  return "تقرير طبي";
}

export function presentReportRiskLevel(
  value:
    | string
    | null
    | undefined,
  language:
    ReportsPresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (language !== "ar") {
    return clean || "Pending";
  }

  if (!clean) {
    return "غير محدد";
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

  if (
    normalized.includes("pending")
  ) {
    return "قيد التقييم";
  }

  if (
    normalized.includes("unknown")
  ) {
    return "غير محدد";
  }

  return "غير محدد";
}

export function presentReportSummary(
  value:
    | string
    | null
    | undefined,
  language:
    ReportsPresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (!clean) {
    return "";
  }

  if (language !== "ar") {
    return clean;
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  return "يوجد تحليل محفوظ لهذا التقرير. افتح التحليل لمراجعة التفاصيل الصحية باللغة المناسبة.";
}

export function formatReportDate(
  value:
    | string
    | null
    | undefined,
  language:
    ReportsPresentationLanguage
): string {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      language === "ar"
        ? "ar-AE"
        : "en",
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return "—";
  }
}
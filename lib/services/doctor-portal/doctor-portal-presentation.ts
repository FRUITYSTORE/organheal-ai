export type DoctorPortalPresentationLanguage =
  | "en"
  | "ar";

type DoctorPortalClinicalTextKind =
  | "report-summary"
  | "recommendations"
  | "doctor-brief";

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

function getArabicFallback(
  kind:
    DoctorPortalClinicalTextKind
): string {
  switch (kind) {
    case "report-summary":
      return "يوجد ملخص محفوظ لهذا التقرير. افتح تحليل التقرير لمراجعة التفاصيل الصحية باللغة المناسبة.";

    case "recommendations":
      return "توجد توصيات محفوظة لهذا التقرير. افتح تحليل التقرير لمراجعة التوصيات الصحية باللغة المناسبة.";

    case "doctor-brief":
      return "يوجد ملخص طبي محفوظ. راجع التحليل أو ملخص الطبيب لعرض المحتوى باللغة المناسبة.";
  }
}

function getEnglishFallback(
  kind:
    DoctorPortalClinicalTextKind
): string {
  switch (kind) {
    case "report-summary":
      return "No generated report summary is available yet.";

    case "recommendations":
      return "No saved report-specific recommendations are available yet.";

    case "doctor-brief":
      return "No saved report-specific doctor brief is available yet.";
  }
}

export function presentDoctorPortalClinicalText(
  value:
    | string
    | null
    | undefined,
  language:
    DoctorPortalPresentationLanguage,
  kind:
    DoctorPortalClinicalTextKind
): string {
  const clean =
    cleanValue(value);

  if (!clean) {
    return language === "ar"
      ? getArabicFallback(kind)
      : getEnglishFallback(kind);
  }

  if (language !== "ar") {
    return clean;
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  return getArabicFallback(
    kind
  );
}
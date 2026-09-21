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

  if (
    hasArabicText(clean) &&
    !containsEnglishProse(clean)
  ) {
    return clean;
  }

  return getArabicFallback(
    kind
  );
}

// Four or more consecutive English words means an untranslated English
// sentence is mixed into the text, not just a marker or unit name.
function containsEnglishProse(
  value: string
): boolean {
  return /[A-Za-z]{2,}(?:[\s,]+[A-Za-z][A-Za-z'-]*){3,}/.test(
    value
  );
}

const DOCTOR_BRIEF_LABEL_AR: Record<string, string> = {
  "Preventive Health Profile": "ملف صحي وقائي",
  "Balanced Health Profile": "ملف صحي متوازن",
  "Cardiometabolic Risk Profile": "ملف مخاطر القلب والأيض",
  "Brain & Recovery Profile": "ملف الدماغ والتعافي",
  "Health Improvement Profile": "ملف تحسين الصحة",
  "Cardiometabolic Risk Pattern": "نمط مخاطر القلب والأيض",
  "Recovery & Stress Pattern": "نمط التعافي والإجهاد",
  "Stable Preventive Health Pattern": "نمط صحي وقائي مستقر",
  "General Health Monitoring Pattern": "نمط مراقبة صحية عامة",
};

export function presentDoctorBriefLabel(
  value:
    | string
    | null
    | undefined,
  language:
    DoctorPortalPresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (!clean) {
    return language === "ar"
      ? "غير متاح"
      : "Not available";
  }

  if (language !== "ar") {
    return clean;
  }

  return (
    DOCTOR_BRIEF_LABEL_AR[clean] ??
    (hasArabicText(clean)
      ? clean
      : "غير متاح")
  );
}
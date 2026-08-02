import type {
  ClinicalComparisonField,
} from "@/lib/application/clinical/patient-clinical-comparison-evidence.service";

import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

export type BuildClinicalComparisonResponseInput = {
  language:
    | "en"
    | "ar";

  healthContext:
    AssistantResponseHealthContext;
};

type SupportedLanguage =
  BuildClinicalComparisonResponseInput["language"];

function getFieldLabel(
  field: ClinicalComparisonField,
  language: SupportedLanguage
): string {
  const isArabic =
    language === "ar";

  const labels:
    Record<
      ClinicalComparisonField,
      string
    > = {
      report_type:
        isArabic
          ? "نوع التقرير"
          : "Report type",

      risk_level:
        isArabic
          ? "مستوى المخاطر"
          : "Risk level",

      summary:
        isArabic
          ? "الملخص"
          : "Summary",

      key_findings:
        isArabic
          ? "النتائج الرئيسية"
          : "Key findings",

      recommendations:
        isArabic
          ? "التوصيات"
          : "Recommendations",

      next_best_action:
        isArabic
          ? "أفضل خطوة تالية"
          : "Next best action",
    };

  return labels[field];
}

function formatDate(
  value:
    | string
    | null,
  language: SupportedLanguage
): string {
  if (!value) {
    return language === "ar"
      ? "غير متوفر"
      : "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    language === "ar"
      ? "ar"
      : "en",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "numeric",
    }
  ).format(date);
}

function formatFieldList(
  fields:
    ClinicalComparisonField[],
  language: SupportedLanguage
): string {
  if (
    fields.length === 0
  ) {
    return language === "ar"
      ? "لا يوجد"
      : "None";
  }

  return fields
    .map(
      (field) =>
        `• ${getFieldLabel(
          field,
          language
        )}`
    )
    .join("\n");
}

function formatMissingInformation(
  items: string[],
  language: SupportedLanguage
): string {
  if (
    items.length === 0
  ) {
    return language === "ar"
      ? "• تقرير سابق قابل للمقارنة"
      : "• A previous comparable report";
  }

  const labels:
    Record<string, string> = {
      latest_report:
        "أحدث تقرير",

      previous_report:
        "تقرير سابق",

      latest_report_insight:
        "تحليل مرتبط بأحدث تقرير",

      previous_report_insight:
        "تحليل مرتبط بالتقرير السابق",
    };

  return items
    .map((item) => {
      const label =
        language === "ar"
          ? labels[item] ??
            "معلومات مقارنة إضافية"
          : item
              .replaceAll("_", " ");

      return `• ${label}`;
    })
    .join("\n");
}

function formatConfidence(
  confidence:
    | "low"
    | "moderate"
    | "high",
  language: SupportedLanguage
): string {
  if (
    language === "en"
  ) {
    return confidence;
  }

  const labels = {
    low:
      "منخفضة",

    moderate:
      "متوسطة",

    high:
      "مرتفعة",
  };

  return labels[confidence];
}

export function buildClinicalComparisonResponse({
  language,
  healthContext,
}: BuildClinicalComparisonResponseInput): string {
  const isArabic =
    language === "ar";

  const clinicalContext =
    healthContext.clinicalContext;

  if (!clinicalContext) {
    return isArabic
      ? "لا تتوفر حاليًا بيانات جاهزة لإجراء مقارنة سريرية."
      : "Clinical comparison data is not currently available.";
  }

  const {
    comparison,
    evidence,
    reasoning,
  } = clinicalContext;

  if (
    reasoning.state ===
    "comparison_unavailable"
  ) {
    return isArabic
      ? `لا يمكن إجراء مقارنة سريرية حاليًا.

السبب:
تحتاج المقارنة إلى تقريرين طبيين على الأقل.

المعلومات الناقصة:
${formatMissingInformation(
  comparison.missingInformation,
  language
)}`
      : `A clinical comparison is not currently available.

Reason:
At least two medical reports are required.

Missing information:
${formatMissingInformation(
  comparison.missingInformation,
  language
)}`;
  }

  if (
    reasoning.state ===
    "insufficient_evidence"
  ) {
    return isArabic
      ? `يوجد تقريران، لكن الأدلة المنظمة غير كافية لإجراء مقارنة موثوقة.

التقرير الأحدث:
${formatDate(
  evidence.latestReportDate,
  language
)}

التقرير السابق:
${formatDate(
  evidence.previousReportDate,
  language
)}

الحقول التي تعذرت مقارنتها:
${formatFieldList(
  reasoning.insufficientEvidence,
  language
)}

لا أستطيع تأكيد وجود تغير سريري اعتمادًا على البيانات المتاحة حاليًا.`
      : `Two reports are available, but the structured evidence is insufficient for a reliable comparison.

Latest report:
${formatDate(
  evidence.latestReportDate,
  language
)}

Previous report:
${formatDate(
  evidence.previousReportDate,
  language
)}

Fields that could not be compared:
${formatFieldList(
  reasoning.insufficientEvidence,
  language
)}

I cannot confirm a clinical change from the currently available data.`;
  }

  const changedFields =
    reasoning.significantChanges.map(
      (signal) =>
        signal.field
    );

  const stableFields =
    reasoning.stableAreas.map(
      (signal) =>
        signal.field
    );

  if (
    reasoning.state ===
    "no_verified_changes"
  ) {
    return isArabic
      ? `قارنت أحدث تقريرين ولم أجد اختلافات مؤكدة في الحقول المنظمة المتاحة.

التقرير الأحدث:
${formatDate(
  evidence.latestReportDate,
  language
)}

التقرير السابق:
${formatDate(
  evidence.previousReportDate,
  language
)}

الحقول المستقرة:
${formatFieldList(
  stableFields,
  language
)}

درجة الثقة:
${formatConfidence(
  reasoning.confidence,
  language
)}

هذا لا يثبت أن الحالة السريرية لم تتغير؛ بل يعني فقط أن الحقول المنظمة المتاحة لم تُظهر اختلافًا.`
      : `I compared the latest two reports and found no verified differences in the available structured fields.

Latest report:
${formatDate(
  evidence.latestReportDate,
  language
)}

Previous report:
${formatDate(
  evidence.previousReportDate,
  language
)}

Stable fields:
${formatFieldList(
  stableFields,
  language
)}

Confidence:
${formatConfidence(
  reasoning.confidence,
  language
)}

This does not prove that the clinical condition remained unchanged. It only means that the available structured fields did not differ.`;
  }

  return isArabic
    ? `قارنت أحدث تقريرين ووجدت اختلافات مؤكدة في محتوى الحقول التالية:

الحقول التي تغيرت:
${formatFieldList(
  changedFields,
  language
)}

الحقول التي بقيت مستقرة:
${formatFieldList(
  stableFields,
  language
)}

التقرير الأحدث:
${formatDate(
  evidence.latestReportDate,
  language
)}

التقرير السابق:
${formatDate(
  evidence.previousReportDate,
  language
)}

عدد الحقول المتغيرة:
${reasoning.verifiedChangeCount}

درجة الثقة:
${formatConfidence(
  reasoning.confidence,
  language
)}

حدود الاستنتاج:
تؤكد هذه الاختلافات أن محتوى التقريرين تغير، لكنها لا تكفي وحدها لتأكيد تحسن أو تراجع سريري.`
    : `I compared the latest two reports and found verified differences in the following structured fields:

Changed fields:
${formatFieldList(
  changedFields,
  language
)}

Stable fields:
${formatFieldList(
  stableFields,
  language
)}

Latest report:
${formatDate(
  evidence.latestReportDate,
  language
)}

Previous report:
${formatDate(
  evidence.previousReportDate,
  language
)}

Changed field count:
${reasoning.verifiedChangeCount}

Confidence:
${formatConfidence(
  reasoning.confidence,
  language
)}

Reasoning boundary:
These differences confirm that the report content changed, but they are not sufficient by themselves to confirm clinical improvement or deterioration.`;
}
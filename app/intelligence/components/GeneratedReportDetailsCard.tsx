import ArabicSafeText from "./ArabicSafeText";

import {
  presentIntelligenceMedicalCategory,
} from "@/lib/services/intelligence/intelligence-presentation";

type GeneratedReportDetailsCardProps = {
  medicalCategory:
    | string
    | null
    | undefined;

  summary:
    | string
    | null
    | undefined;

  keyFindings:
    | string
    | null
    | undefined;

  riskSignals:
    | string
    | null
    | undefined;

  recommendations:
    | string
    | null
    | undefined;

  doctorBrief:
    | string
    | null
    | undefined;

  isArabic:
    boolean;
};

export default function GeneratedReportDetailsCard({
  medicalCategory,
  summary,
  keyFindings,
  riskSignals,
  recommendations,
  doctorBrief,
  isArabic,
}: GeneratedReportDetailsCardProps) {
  const language =
    isArabic
      ? "ar"
      : "en";

  const medicalCategoryText =
    presentIntelligenceMedicalCategory(
      medicalCategory,
      language
    );

  return (
    <>
      <p>
        <strong>
          {isArabic
            ? "الفئة الطبية:"
            : "Medical Category:"}
        </strong>{" "}

        {medicalCategoryText}
      </p>

      <p>
        <strong>
          {isArabic
            ? "الملخص:"
            : "Summary:"}
        </strong>{" "}

        <ArabicSafeText
          as="span"
          text={summary}
          isArabic={isArabic}
          fallbackAr="تم حفظ التحليل، لكن الملخص العربي غير متاح لهذا السجل."
        />
      </p>

      <p>
        <strong>
          {isArabic
            ? "النتائج الرئيسية:"
            : "Key Findings:"}
        </strong>{" "}

        <ArabicSafeText
          as="span"
          text={keyFindings}
          isArabic={isArabic}
          fallbackAr="تم حفظ النتائج، لكن العرض العربي غير متاح لهذا السجل."
        />
      </p>

      <p>
        <strong>
          {isArabic
            ? "إشارات تحتاج للانتباه:"
            : "Risk Signals:"}
        </strong>{" "}

        <ArabicSafeText
          as="span"
          text={riskSignals}
          isArabic={isArabic}
          fallbackAr="تم حفظ إشارات المتابعة، لكن العرض العربي غير متاح لهذا السجل."
        />
      </p>

      <p>
        <strong>
          {isArabic
            ? "التوصيات:"
            : "Recommendations:"}
        </strong>{" "}

        <ArabicSafeText
          as="span"
          text={recommendations}
          isArabic={isArabic}
          fallbackAr="تم حفظ التوصيات، لكن العرض العربي غير متاح لهذا السجل."
        />
      </p>

      <p>
        <strong>
          {isArabic
            ? "ملخص الطبيب:"
            : "Doctor Brief:"}
        </strong>{" "}

        <ArabicSafeText
          as="span"
          text={doctorBrief}
          isArabic={isArabic}
          fallbackAr="تم حفظ الملخص الطبي، لكن العرض العربي غير متاح لهذا السجل."
        />
      </p>
    </>
  );
}
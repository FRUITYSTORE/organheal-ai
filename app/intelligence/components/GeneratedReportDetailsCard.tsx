import ArabicSafeText from "./ArabicSafeText";

type GeneratedReportDetailsCardProps = {
  medicalCategory:
    string | null | undefined;

  summary:
    string | null | undefined;

  keyFindings:
    string | null | undefined;

  riskSignals:
    string | null | undefined;

  recommendations:
    string | null | undefined;

  doctorBrief:
    string | null | undefined;

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
  return (
    <>
      <p>
        <strong>
          {isArabic
            ? "الفئة الطبية:"
            : "Medical Category:"}
        </strong>{" "}
        {medicalCategory ||
          (isArabic
            ? "غير متاح"
            : "N/A")}
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
        />
      </p>
    </>
  );
}
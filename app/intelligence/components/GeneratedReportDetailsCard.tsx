import ArabicSafeText from "./ArabicSafeText";
type GeneratedReportDetailsCardProps = {
  medicalCategory: string | null | undefined;
  summary: string | null | undefined;
  keyFindings: string | null | undefined;
  riskSignals: string | null | undefined;
  recommendations: string | null | undefined;
  doctorBrief: string | null | undefined;
};

export default function GeneratedReportDetailsCard({
  medicalCategory,
  summary,
  keyFindings,
  riskSignals,
  recommendations,
  doctorBrief,
}: GeneratedReportDetailsCardProps) {
  return (
    <>
      <p>
        <strong>Medical Category:</strong> {medicalCategory || "N/A"}
      </p>

      <p>
        <strong>Summary:</strong>{" "}<ArabicSafeText as="span" text={summary} />
      </p>

      <p>
        <strong>Key Findings:</strong>{" "}<ArabicSafeText as="span" text={keyFindings} />
      </p>

      <p>
        <strong>Risk Signals:</strong>{" "}<ArabicSafeText as="span" text={riskSignals} />
      </p>

      <p>
        <strong>Recommendations:</strong>{" "}<ArabicSafeText as="span" text={recommendations} />
      </p>

      <p>
        <strong>Doctor Brief:</strong>{" "}<ArabicSafeText as="span" text={doctorBrief} />
      </p>
    </>
  );
}


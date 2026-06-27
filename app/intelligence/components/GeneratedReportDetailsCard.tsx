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
        <strong>Summary:</strong> {summary || "N/A"}
      </p>

      <p>
        <strong>Key Findings:</strong> {keyFindings || "N/A"}
      </p>

      <p>
        <strong>Risk Signals:</strong> {riskSignals || "N/A"}
      </p>

      <p>
        <strong>Recommendations:</strong> {recommendations || "N/A"}
      </p>

      <p>
        <strong>Doctor Brief:</strong> {doctorBrief || "N/A"}
      </p>
    </>
  );
}
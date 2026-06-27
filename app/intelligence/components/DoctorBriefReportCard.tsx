"use client";
type ExecutiveSummary = {
  currentScore?: number;
  trend?: string;
  forecastScore?: number;
  confidenceLevel?: string;
  confidenceScore?: number;
  prioritySystem?: string;
  nextBestAction?: string;
};

type DoctorBriefReportCardProps = {
  fileName: string;
  reportTypeLabel: string;
  uploadedAtText: string;
  summary: string | null | undefined;
  keyFindings: string | null | undefined;
  riskSignals: string | null | undefined;
  recommendations: string | null | undefined;
  doctorBrief: string | null | undefined;
  executiveSummary: ExecutiveSummary | null | undefined;
};

export default function DoctorBriefReportCard({
  fileName,
  reportTypeLabel,
  uploadedAtText,
  summary,
  keyFindings,
  riskSignals,
  recommendations,
  doctorBrief,
  executiveSummary,
}: DoctorBriefReportCardProps) {
  return (
    <div className="resultBox doctorBriefPrintArea">
            <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p className="sectionLabel">🩺 DOCTOR BRIEF</p>
          <h2>Doctor-Ready Report Summary</h2>
        </div>

        <button
  className="secondaryBtn doctorBriefPrintButton"
  onClick={() => window.print()}
>
  Print Doctor Brief
</button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginTop: "18px",
          textAlign: "left",
        }}
      >
        <div>
          <strong>Report</strong>
          <p>{fileName}</p>
        </div>

        <div>
          <strong>Type</strong>
          <p>{reportTypeLabel}</p>
        </div>

        <div>
          <strong>Uploaded</strong>
          <p>{uploadedAtText}</p>
        </div>

        <div>
          <strong>Priority System</strong>
          <p>{executiveSummary?.prioritySystem || "N/A"}</p>
        </div>
      </div>

      <div style={{ marginTop: "18px", textAlign: "left" }}>
        <h3>Clinical Summary</h3>
        <p style={{ whiteSpace: "pre-line" }}>{summary || "N/A"}</p>

        <h3>Key Findings</h3>
        <p style={{ whiteSpace: "pre-line" }}>{keyFindings || "N/A"}</p>

        <h3>Risk Signals</h3>
        <p style={{ whiteSpace: "pre-line" }}>{riskSignals || "N/A"}</p>

        <h3>Recommended Follow-Up</h3>
        <p style={{ whiteSpace: "pre-line" }}>{recommendations || "N/A"}</p>

        <h3>Doctor Note</h3>
        <p style={{ whiteSpace: "pre-line" }}>{doctorBrief || "N/A"}</p>

        <h3>AI Intelligence Snapshot</h3>
        <p>
          Current Score:{" "}
          <strong>{executiveSummary?.currentScore ?? "N/A"}</strong>
        </p>
        <p>
          Forecast Score:{" "}
          <strong>{executiveSummary?.forecastScore ?? "N/A"}</strong>
        </p>
        <p>
          Confidence:{" "}
          <strong>{executiveSummary?.confidenceLevel || "N/A"}</strong>
        </p>
        <p>
          Next Best Action:{" "}
          <strong>{executiveSummary?.nextBestAction || "N/A"}</strong>
        </p>

        <p style={{ marginTop: "18px", fontSize: "0.9rem", opacity: 0.75 }}>
          Educational interpretation only. This summary should be reviewed by a
          licensed healthcare professional.
        </p>
      </div>
    </div>
  );
}
"use client";

import { useRef } from "react";

type ExecutiveSummary = {
  currentScore?: number;
  forecastScore?: number;
  confidenceLevel?: string;
  prioritySystem?: string;
  nextBestAction?: string;
};

type PatientReportPdfCardProps = {
  fileName: string;
  uploadedAtText: string;
  summary: string | null | undefined;
  keyFindings: string | null | undefined;
  riskSignals: string | null | undefined;
  recommendations: string | null | undefined;
  healthStory: string | null | undefined;
  executiveSummary: ExecutiveSummary | null | undefined;
};

export default function PatientReportPdfCard({
  fileName,
  uploadedAtText,
  summary,
  keyFindings,
  riskSignals,
  recommendations,
  healthStory,
  executiveSummary,
}: PatientReportPdfCardProps) {
  const patientReportRef = useRef<HTMLDivElement>(null);
  const generatedAtText = new Date().toLocaleString();

  async function downloadPatientPdf() {
    if (!patientReportRef.current) return;

    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const reportElement = patientReportRef.current.cloneNode(true) as HTMLElement;

    reportElement
      .querySelectorAll(".patientReportActions")
      .forEach((element) => element.remove());

    reportElement.style.background = "#ffffff";
    reportElement.style.color = "#111827";
    reportElement.style.padding = "24px";
    reportElement.style.border = "none";
    reportElement.style.boxShadow = "none";

    reportElement.querySelectorAll("*").forEach((element) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.color = "#111827";
    });

    const safeFileName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .slice(0, 60);

    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `OrganHeal-Patient-Report-${safeFileName}.pdf`,
        image: {
          type: "jpeg",
          quality: 0.98,
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
        },
      })
      .from(reportElement)
      .save();
  }

  return (
    <div ref={patientReportRef} className="resultBox">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          borderBottom: "1px solid rgba(148,163,184,0.22)",
          paddingBottom: "14px",
          marginBottom: "18px",
        }}
      >
        <div>
          <p className="sectionLabel">👤 PATIENT REPORT</p>
          <h2>Patient-Friendly Health Summary</h2>
          <p style={{ marginTop: "6px", opacity: 0.82 }}>
            A simple explanation of your report in clear language.
          </p>
        </div>

        <div
          className="patientReportActions"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: "flex-end",
          }}
        >
          <button className="primaryBtn" onClick={downloadPatientPdf}>
            Download Patient PDF
          </button>

          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              opacity: 0.72,
              maxWidth: "250px",
              textAlign: "right",
              lineHeight: 1.4,
            }}
          >
            This version is written for the patient, not for clinical decision
            making.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "18px",
          textAlign: "left",
        }}
      >
        <div>
          <strong>Report</strong>
          <p>{fileName}</p>
        </div>

        <div>
          <strong>Uploaded</strong>
          <p>{uploadedAtText}</p>
        </div>

        <div>
          <strong>Generated</strong>
          <p>{generatedAtText}</p>
        </div>

        <div>
          <strong>Main Focus</strong>
          <p>{executiveSummary?.prioritySystem || "N/A"}</p>
        </div>
      </div>

      <div style={{ textAlign: "left" }}>
        <h3>1. Simple Summary</h3>
        <p style={{ whiteSpace: "pre-line" }}>
          {summary ||
            "Your report was reviewed by OrganHeal AI and summarized in a simple way."}
        </p>

        <h3>2. What Was Noticed</h3>
        <p style={{ whiteSpace: "pre-line" }}>
          {keyFindings ||
            "No major findings were clearly identified from the available data."}
        </p>

        <h3>3. What Needs Attention</h3>
        <p style={{ whiteSpace: "pre-line" }}>
          {riskSignals ||
            "No urgent warning signals were clearly detected. Please review your original report with a healthcare professional."}
        </p>

        <h3>4. What You Can Do Next</h3>
        <p style={{ whiteSpace: "pre-line" }}>
          {recommendations ||
            executiveSummary?.nextBestAction ||
            "Follow up with your healthcare provider if you have symptoms or concerns."}
        </p>

        <h3>5. Your Health Story</h3>
        <p style={{ whiteSpace: "pre-line" }}>
          {healthStory ||
            "As more assessments, check-ins, and reports are added, OrganHeal will build a clearer picture of your health journey."}
        </p>

        <h3>6. Health Direction</h3>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: "14px",
            background: "rgba(34,211,238,0.08)",
            border: "1px solid rgba(34,211,238,0.18)",
            marginBottom: "14px",
          }}
        >
          <p>
            <strong>Current Health Score:</strong>{" "}
            {executiveSummary?.currentScore ?? "N/A"}
          </p>

          <p>
            <strong>Expected Direction:</strong>{" "}
            {executiveSummary?.forecastScore ?? "N/A"}
          </p>

          <p>
            <strong>Confidence:</strong>{" "}
            {executiveSummary?.confidenceLevel || "N/A"}
          </p>

          <p>
            <strong>Best Next Step:</strong>{" "}
            {executiveSummary?.nextBestAction || "N/A"}
          </p>
        </div>

        <h3>Important Note</h3>
        <p style={{ fontSize: "0.9rem", opacity: 0.78 }}>
          This patient report is for education and personal understanding only.
          It does not replace medical advice, diagnosis, or treatment. Always
          review your results with a licensed healthcare professional.
        </p>
      </div>
    </div>
  );
}
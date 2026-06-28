"use client";

import { useRef } from "react";
import ArabicSafeText from "./ArabicSafeText";

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
    <div ref={patientReportRef} className="resultBox patientReportPdfArea">
            <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "18px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          borderBottom: "1px solid rgba(148,163,184,0.22)",
          paddingBottom: "16px",
          marginBottom: "18px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.72rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 800,
              opacity: 0.78,
            }}
          >
            OrganHeal AI
          </p>

          <p className="sectionLabel" style={{ marginTop: "8px" }}>
            👤 PATIENT REPORT
          </p>

          <h2 style={{ marginBottom: "6px" }}>
            Patient-Friendly Health Summary
          </h2>

          <p
            style={{
              marginTop: "6px",
              opacity: 0.84,
              maxWidth: "620px",
              lineHeight: 1.55,
            }}
          >
            A calm, simple explanation to help you understand your report and
            what to discuss with your doctor.
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
            This version is written to help you understand your health report in simple
language.
          </p>
        </div>
      </div>

           <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
          textAlign: "left",
          padding: "14px",
          borderRadius: "16px",
          background: "rgba(15,23,42,0.38)",
          border: "1px solid rgba(148,163,184,0.18)",
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

            <div
        style={{
          padding: "14px 16px",
          borderRadius: "16px",
          background: "rgba(34,211,238,0.08)",
          border: "1px solid rgba(34,211,238,0.18)",
          marginBottom: "20px",
          textAlign: "left",
        }}
      >
        <strong>How to use this report</strong>
        <p style={{ marginTop: "6px", marginBottom: 0, lineHeight: 1.55 }}>
          Read this as a simple guide. It is meant to help you understand your
          health information and prepare better questions for your doctor.
        </p>
      </div>

      <div style={{ textAlign: "left" }}>
        <h3>1. What This Report Means</h3>
        <ArabicSafeText
          text={summary}
          fallback="Your report was reviewed by OrganHeal AI and summarized in a simple way."
        />

        <h3>2. Main Things Noticed</h3>
        <ArabicSafeText
          text={keyFindings}
          fallback="No major findings were clearly identified from the available data."
        />

        <h3>3. What May Need Attention</h3>
        <ArabicSafeText
          text={riskSignals}
          fallback="No urgent warning signals were clearly detected. Please review your original report with a healthcare professional."
        />

        <h3>4. Helpful Next Steps</h3>
        <ArabicSafeText
          text={recommendations || executiveSummary?.nextBestAction}
          fallback="Follow up with your healthcare provider if you have symptoms or concerns."
        />

        <h3>5. Your Health Story in Simple Words</h3>
        <ArabicSafeText
          text={healthStory}
          fallback="As more assessments, check-ins, and reports are added, OrganHeal will build a clearer picture of your health journey."
        />

        <h3>6. Your Health Direction</h3>

                <div
          style={{
            padding: "14px 16px",
            borderRadius: "16px",
            background: "rgba(34,211,238,0.08)",
            border: "1px solid rgba(34,211,238,0.18)",
            marginBottom: "16px",
          }}
        >
          <p>
            <strong>Your Current Health Score:</strong>{" "}
            {executiveSummary?.currentScore ?? "N/A"}
          </p>

          <p>
            <strong>Expected Health Direction:</strong>{" "}
            {executiveSummary?.forecastScore ?? "N/A"}
          </p>

          <p>
            <strong>Confidence:</strong>{" "}
            {executiveSummary?.confidenceLevel || "N/A"}
          </p>

          <p>
            <strong>Most Helpful Next Step:</strong>{" "}
            {executiveSummary?.nextBestAction || "N/A"}
          </p>
        </div>

        <h3>A Gentle Reminder</h3>
<p style={{ fontSize: "0.95rem", opacity: 0.86 }}>
  This report is not meant to scare you. It is designed to help you understand
  your health information and prepare better questions for your doctor.
</p>

<h3>Important Note</h3>
        <p style={{ fontSize: "0.9rem", opacity: 0.78 }}>
          This patient report is for education and personal understanding only.
          It does not replace medical advice, diagnosis, or treatment. Always
          review your results with a licensed healthcare professional.
        </p>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(148,163,184,0.22)",
          marginTop: "26px",
          paddingTop: "12px",
          fontSize: "0.82rem",
          opacity: 0.72,
          lineHeight: 1.5,
          textAlign: "left",
        }}
      >
        <p style={{ margin: 0 }}>
          OrganHeal AI helps you understand your health information in simpler
          language. This report should be used as a conversation guide with your
          healthcare provider.
        </p>
      </div>
    </div>
  );
}
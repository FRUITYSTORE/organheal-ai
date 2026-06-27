"use client";

import { useRef } from "react";

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
  const printRef = useRef<HTMLDivElement>(null);
  const generatedAtText = new Date().toLocaleString();

  function printDoctorBriefOnly() {
    if (!printRef.current) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Doctor Brief</title>
          <style>
            @page {
              size: A4;
              margin: 18mm;
            }

            html,
            body {
              background: white;
              color: #111827;
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }

            * {
              box-sizing: border-box;
            }

            .doctorBriefPrintButton,
            .doctorBriefPrintTip,
            .doctorBriefPrintActions {
              display: none !important;
            }

            .doctorBriefPrintHeader {
              border-bottom: 1px solid #d1d5db;
              padding-bottom: 14px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              gap: 18px;
              align-items: flex-start;
            }

            .doctorBriefBrand {
              font-size: 11px;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              font-weight: 700;
              color: #374151 !important;
              margin-bottom: 6px;
            }

            .doctorBriefTitle {
              font-size: 24px;
              font-weight: 800;
              margin: 0 0 6px 0;
              color: #111827 !important;
            }

            .doctorBriefSubtitle {
              font-size: 12px;
              color: #4b5563 !important;
              margin: 0;
            }

            .doctorBriefMeta {
              text-align: right;
              font-size: 11px;
              color: #4b5563 !important;
              min-width: 180px;
            }

            .doctorBriefMeta p {
              font-size: 11px;
              margin: 0 0 6px 0;
            }

            .doctorBriefFooter {
              border-top: 1px solid #d1d5db;
              margin-top: 28px;
              padding-top: 10px;
              font-size: 10px;
              line-height: 1.5;
              color: #4b5563 !important;
            }

            .doctorBriefFooter p {
              font-size: 10px;
              color: #4b5563 !important;
              margin: 0 0 6px 0;
            }

            .resultBox,
            .doctorBriefPrintArea {
              background: white !important;
              color: #111827 !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            .sectionLabel {
              font-size: 11px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              font-weight: 700;
              margin-bottom: 6px;
              color: #374151 !important;
            }

            h2 {
              font-size: 22px;
              margin: 0 0 16px 0;
              color: #111827 !important;
            }

            h3 {
              font-size: 15px;
              margin: 18px 0 6px 0;
              color: #111827 !important;
              break-after: avoid;
            }

            p {
              font-size: 12px;
              line-height: 1.55;
              margin: 0 0 10px 0;
              color: #111827 !important;
              white-space: pre-line;
            }

            strong {
              color: #111827 !important;
            }

            div {
              break-inside: avoid;
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
  printWindow.focus();
  printWindow.print();
}, 250);
  }

  async function downloadDoctorBriefPdf() {
    if (!printRef.current) return;

    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const reportElement = printRef.current.cloneNode(true) as HTMLElement;

    reportElement
      .querySelectorAll(
        ".doctorBriefPrintActions, .doctorBriefPrintButton, .doctorBriefPrintTip"
      )
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
        filename: `OrganHeal-Doctor-Brief-${safeFileName}.pdf`,
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
    <div ref={printRef} className="resultBox doctorBriefPrintArea">
      <div className="doctorBriefPrintHeader">
        <div>
          <p className="doctorBriefBrand">OrganHeal AI</p>
          <h2 className="doctorBriefTitle">Doctor-Ready Report Summary</h2>
          <p className="doctorBriefSubtitle">
            Structured medical intelligence summary prepared for clinical
            review.
          </p>
        </div>

        <div className="doctorBriefMeta">
          <p>
            <strong>Generated:</strong>
            <br />
            {generatedAtText}
          </p>
          <p>
            <strong>Use:</strong>
            <br />
            Educational / Clinical Review
          </p>
        </div>

        <div
          className="doctorBriefPrintActions"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: "flex-end",
          }}
        >
          <button
            className="secondaryBtn doctorBriefPrintButton"
            onClick={printDoctorBriefOnly}
          >
            Print Doctor Brief
          </button>

          <button
            className="primaryBtn doctorBriefPrintButton"
            onClick={downloadDoctorBriefPdf}
          >
            Download PDF
          </button>

          <p
            className="doctorBriefPrintTip"
            style={{
              margin: 0,
              fontSize: "0.78rem",
              opacity: 0.72,
              maxWidth: "260px",
              textAlign: "right",
              lineHeight: 1.4,
            }}
          >
            Use Download PDF to save this Doctor Brief directly, or Print
            Doctor Brief for paper printing.
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: "14px",
          marginBottom: "18px",
          padding: "12px 14px",
          borderRadius: "14px",
          background: "rgba(34,211,238,0.08)",
          border: "1px solid rgba(34,211,238,0.18)",
          textAlign: "left",
        }}
      >
        <strong>Doctor Brief Ready</strong>
        <p style={{ marginTop: "6px", marginBottom: 0 }}>
          This Doctor Brief is prepared for clinical review. You can print it or
          download it directly as a PDF using the Download PDF button.
        </p>
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
        <h3>1. Clinical Summary</h3>
        <p style={{ whiteSpace: "pre-line" }}>{summary || "N/A"}</p>

        <h3>2. Key Clinical Findings</h3>
        <p style={{ whiteSpace: "pre-line" }}>{keyFindings || "N/A"}</p>

        <h3>3. Important Risk Signals</h3>
        <p style={{ whiteSpace: "pre-line" }}>{riskSignals || "N/A"}</p>

        <h3>4. Recommended Follow-Up</h3>
        <p style={{ whiteSpace: "pre-line" }}>{recommendations || "N/A"}</p>

        <h3>5. Clinical Review Note</h3>
        <p style={{ whiteSpace: "pre-line" }}>{doctorBrief || "N/A"}</p>

        <h3>6. AI Intelligence Snapshot</h3>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: "14px",
            background: "rgba(15,23,42,0.45)",
            border: "1px solid rgba(148,163,184,0.18)",
            marginBottom: "14px",
          }}
        >
          <p>
            <strong>Clinical Review Focus:</strong>{" "}
            {executiveSummary?.prioritySystem || "N/A"}
          </p>
          <p>
            <strong>Suggested Next Action:</strong>{" "}
            {executiveSummary?.nextBestAction || "N/A"}
          </p>
        </div>

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

      <div className="doctorBriefFooter">
        <p>
          OrganHeal AI provides educational health intelligence and does not
          replace medical diagnosis, treatment, or professional clinical
          judgment.
        </p>
        <p>
          This report should be interpreted by a licensed healthcare
          professional in the context of the patient&apos;s full history,
          examination, and original medical documents.
        </p>
      </div>
    </div>
  );
}
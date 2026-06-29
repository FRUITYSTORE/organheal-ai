"use client";

import { useRef } from "react";
import { text, useArabicUi } from "./ArabicUiHelper";

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
  const isArabic = useArabicUi();
  const printRef = useRef<HTMLDivElement>(null);
  const generatedAtText = new Date().toLocaleString(isArabic ? "ar" : undefined);

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

    const direction = isArabic ? "rtl" : "ltr";
    const align = isArabic ? "right" : "left";
    const title = isArabic ? "\u0645\u0644\u062e\u0635 \u0627\u0644\u0637\u0628\u064a\u0628" : "Doctor Brief";

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html dir="${direction}">
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: A4;
              margin: 14mm;
            }

            body {
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              direction: ${direction};
              text-align: ${align};
              line-height: 1.6;
            }

            .doctorBriefPrintButton,
            .doctorBriefPrintTip,
            .doctorBriefPrintActions {
              display: none !important;
            }

            .resultBox {
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
              padding: 0 !important;
            }

            h2, h3, p {
              color: #111827 !important;
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  async function downloadDoctorBriefPdf() {
    if (!printRef.current) return;

    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const reportElement = printRef.current.cloneNode(true) as HTMLElement;

    reportElement
      .querySelectorAll(".doctorBriefPrintActions, .doctorBriefPrintButton, .doctorBriefPrintTip")
      .forEach((element) => element.remove());

    reportElement.style.background = "#ffffff";
    reportElement.style.color = "#111827";
    reportElement.style.padding = "24px";
    reportElement.style.border = "none";
    reportElement.style.boxShadow = "none";
    reportElement.style.direction = isArabic ? "rtl" : "ltr";
    reportElement.style.textAlign = isArabic ? "right" : "left";

    reportElement.querySelectorAll("*").forEach((element) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.color = "#111827";
    });

    const safeFileName = fileName.replace(/[^a-z0-9]/gi, "-").toLowerCase();

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
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      })
      .from(reportElement)
      .save();
  }

  return (
    <div
      ref={printRef}
      className="resultBox doctorBriefReportArea"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
      style={{ textAlign: isArabic ? "right" : "left" }}
    >
      <div
        className="doctorBriefPrintHeader"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "flex-start",
          borderBottom: "1px solid rgba(148,163,184,0.24)",
          paddingBottom: "16px",
          marginBottom: "18px",
        }}
      >
        <div>
          <p className="sectionLabel doctorBriefBrand">OrganHeal AI</p>

          <h2 className="doctorBriefTitle" style={{ marginBottom: "6px" }}>
            {isArabic ? "\u0645\u0644\u062e\u0635 \u0637\u0628\u064a \u062c\u0627\u0647\u0632 \u0644\u0644\u0637\u0628\u064a\u0628" : "Doctor-Ready Report Summary"}
          </h2>

          <p className="doctorBriefSubtitle" style={{ opacity: 0.78, lineHeight: 1.7 }}>
            {isArabic
              ? "\u0645\u0644\u062e\u0635 \u0630\u0643\u0627\u0621 \u0637\u0628\u064a \u0645\u0646\u0638\u0645 \u0645\u062c\u0647\u0632 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0633\u0631\u064a\u0631\u064a\u0629."
              : "Structured medical intelligence summary prepared for clinical review."}
          </p>

          <div className="doctorBriefMeta" style={{ marginTop: "10px", fontSize: "0.9rem", opacity: 0.8 }}>
            <p>
              <strong>{isArabic ? "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621:" : "Generated:"}</strong>
              <br />
              {generatedAtText}
            </p>
            <p>
              <strong>{isArabic ? "\u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645:" : "Use:"}</strong>
              <br />
              {isArabic ? "\u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0637\u0628\u064a\u0629 \u0648\u0644\u064a\u0633 \u0644\u0644\u062a\u0634\u062e\u064a\u0635 \u0627\u0644\u0630\u0627\u062a\u064a" : "Clinical review support only"}
            </p>
          </div>
        </div>

        <div
          className="doctorBriefPrintActions"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: isArabic ? "flex-start" : "flex-end",
          }}
        >
          <button
            className="secondaryBtn doctorBriefPrintButton"
            onClick={printDoctorBriefOnly}
          >
            {isArabic ? "\u0637\u0628\u0627\u0639\u0629 \u0645\u0644\u062e\u0635 \u0627\u0644\u0637\u0628\u064a\u0628" : "Print Doctor Brief"}
          </button>

          <button
            className="primaryBtn doctorBriefPrintButton"
            onClick={downloadDoctorBriefPdf}
          >
            {isArabic ? "\u062a\u0646\u0632\u064a\u0644 PDF" : "Download PDF"}
          </button>

          <p
            className="doctorBriefPrintTip"
            style={{
              margin: 0,
              fontSize: "0.78rem",
              opacity: 0.72,
              maxWidth: "280px",
              textAlign: isArabic ? "right" : "left",
              lineHeight: 1.5,
            }}
          >
            {isArabic
              ? "\u0627\u0633\u062a\u062e\u062f\u0645 \u062a\u0646\u0632\u064a\u0644 PDF \u0644\u062d\u0641\u0638 \u0627\u0644\u0645\u0644\u062e\u0635\u060c \u0623\u0648 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0644\u0646\u0633\u062e\u0629 \u0648\u0631\u0642\u064a\u0629."
              : "Use Download PDF to save this Doctor Brief directly, or Print Doctor Brief for paper printing."}
          </p>
        </div>
      </div>

      <div
        style={{
          padding: "14px",
          borderRadius: "16px",
          background: "rgba(34,211,238,0.08)",
          border: "1px solid rgba(34,211,238,0.18)",
          textAlign: isArabic ? "right" : "left",
          marginBottom: "18px",
        }}
      >
        <strong>{isArabic ? "\u0645\u0644\u062e\u0635 \u0627\u0644\u0637\u0628\u064a\u0628 \u062c\u0627\u0647\u0632" : "Doctor Brief Ready"}</strong>
        <p style={{ marginTop: "6px", marginBottom: 0, lineHeight: 1.7 }}>
          {isArabic
            ? "\u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u062e\u0635 \u0645\u062c\u0647\u0632 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0633\u0631\u064a\u0631\u064a\u0629. \u064a\u0645\u0643\u0646\u0643 \u0637\u0628\u0627\u0639\u062a\u0647 \u0623\u0648 \u062a\u0646\u0632\u064a\u0644\u0647 \u0643\u0645\u0644\u0641 PDF."
            : "This Doctor Brief is prepared for clinical review. You can print it or download it directly as a PDF using the Download PDF button."}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "14px",
          marginTop: "18px",
          textAlign: isArabic ? "right" : "left",
        }}
      >
        <div>
          <strong>{isArabic ? "\u0627\u0644\u062a\u0642\u0631\u064a\u0631" : "Report"}</strong>
          <p>{fileName}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u0646\u0648\u0639 \u0627\u0644\u062a\u0642\u0631\u064a\u0631" : "Report Type"}</strong>
          <p>{reportTypeLabel}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0631\u0641\u0639" : "Uploaded"}</strong>
          <p>{uploadedAtText}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u0646\u0638\u0627\u0645 \u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629" : "Priority System"}</strong>
          <p>{executiveSummary?.prioritySystem || (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}</p>
        </div>
      </div>

      <div style={{ marginTop: "18px", textAlign: isArabic ? "right" : "left" }}>
        <h3>{isArabic ? "\u0661. \u0645\u0644\u062e\u0635 \u0633\u0631\u064a\u0631\u064a" : "1. Clinical Summary"}</h3>
        <p style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {text(summary, isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}
        </p>

        <h3>{isArabic ? "\u0662. \u0623\u0647\u0645 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0633\u0631\u064a\u0631\u064a\u0629" : "2. Key Clinical Findings"}</h3>
        <p style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {text(keyFindings, isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}
        </p>

        <h3>{isArabic ? "\u0663. \u0625\u0634\u0627\u0631\u0627\u062a \u062e\u0637\u0631 \u0645\u0647\u0645\u0629" : "3. Important Risk Signals"}</h3>
        <p style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {text(riskSignals, isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}
        </p>

        <h3>{isArabic ? "\u0664. \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0645\u0648\u0635\u0649 \u0628\u0647\u0627" : "4. Recommended Follow-Up"}</h3>
        <p style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {text(recommendations, isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}
        </p>

        <h3>{isArabic ? "\u0665. \u0645\u0644\u0627\u062d\u0638\u0629 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0633\u0631\u064a\u0631\u064a\u0629" : "5. Clinical Review Note"}</h3>
        <p style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {text(doctorBrief, isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}
        </p>

        <div
          style={{
            padding: "14px",
            borderRadius: "16px",
            background: "rgba(15,23,42,0.28)",
            border: "1px solid rgba(148,163,184,0.18)",
            marginTop: "18px",
            marginBottom: "18px",
          }}
        >
          <p>
            <strong>{isArabic ? "\u062a\u0631\u0643\u064a\u0632 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0633\u0631\u064a\u0631\u064a\u0629:" : "Clinical Review Focus:"}</strong>{" "}
            {executiveSummary?.prioritySystem || (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}
          </p>

          <p>
            <strong>{isArabic ? "\u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u0645\u0642\u062a\u0631\u062d\u0629:" : "Suggested Next Action:"}</strong>{" "}
            {executiveSummary?.nextBestAction || (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}
          </p>
        </div>

        <p>
          {isArabic ? "\u0627\u0644\u0646\u062a\u064a\u062c\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629:" : "Current Score:"}{" "}
          <strong>{executiveSummary?.currentScore ?? (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}</strong>
        </p>

        <p>
          {isArabic ? "\u0646\u062a\u064a\u062c\u0629 \u0627\u0644\u062a\u0648\u0642\u0639:" : "Forecast Score:"}{" "}
          <strong>{executiveSummary?.forecastScore ?? (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}</strong>
        </p>

        <p>
          {isArabic ? "\u0627\u0644\u062b\u0642\u0629:" : "Confidence:"}{" "}
          <strong>{executiveSummary?.confidenceLevel || executiveSummary?.confidenceScore || (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}</strong>
        </p>

        <h3>{isArabic ? "\u0645\u0644\u0627\u062d\u0638\u0629 \u0645\u0647\u0645\u0629" : "Important Note"}</h3>
        <p style={{ fontSize: "0.9rem", opacity: 0.78, lineHeight: 1.8 }}>
          {isArabic
            ? "\u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u062e\u0635 \u0645\u062e\u0635\u0635 \u0644\u062f\u0639\u0645 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0637\u0628\u064a\u0629 \u0648\u0644\u0627 \u064a\u0633\u062a\u0628\u062f\u0644 \u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0633\u0631\u064a\u0631\u064a \u0623\u0648 \u062d\u0643\u0645 \u0627\u0644\u0637\u0628\u064a\u0628."
            : "This brief is intended to support clinical review and does not replace clinical assessment or physician judgment."}
        </p>
      </div>
    </div>
  );
}

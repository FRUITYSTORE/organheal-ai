"use client";

import { useRef } from "react";
import { text, useArabicUi } from "./ArabicUiHelper";

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
  const isArabic = useArabicUi();
  const patientReportRef = useRef<HTMLDivElement>(null);
  const generatedAtText = new Date().toLocaleString(isArabic ? "ar" : undefined);

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
        filename: `OrganHeal-Patient-Report-${safeFileName}.pdf`,
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
      ref={patientReportRef}
      className="resultBox patientReportPdfArea"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
      style={{ textAlign: isArabic ? "right" : "left" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div>
          <p className="sectionLabel" style={{ marginTop: "8px" }}>
            {isArabic ? "\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0645\u0631\u064a\u0636" : "👤 PATIENT REPORT"}
          </p>

          <h2 style={{ marginBottom: "6px" }}>
            {isArabic ? "\u0645\u0644\u062e\u0635 \u0635\u062d\u064a \u0645\u0628\u0633\u0637 \u0644\u0644\u0645\u0631\u064a\u0636" : "Patient-Friendly Health Summary"}
          </h2>

          <p style={{ opacity: 0.78, lineHeight: 1.7, maxWidth: "720px" }}>
            {isArabic
              ? "\u0634\u0631\u062d \u0647\u0627\u062f\u0626 \u0648\u0645\u0628\u0633\u0637 \u064a\u0633\u0627\u0639\u062f\u0643 \u0639\u0644\u0649 \u0641\u0647\u0645 \u062a\u0642\u0631\u064a\u0631\u0643 \u0648\u0645\u0627 \u064a\u0645\u0643\u0646 \u0645\u0646\u0627\u0642\u0634\u062a\u0647 \u0645\u0639 \u0627\u0644\u0637\u0628\u064a\u0628."
              : "A calm, simple explanation to help you understand your report and what to discuss with your doctor."}
          </p>
        </div>

        <div
          className="patientReportActions"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: isArabic ? "flex-start" : "flex-end",
          }}
        >
          <button className="primaryBtn" onClick={downloadPatientPdf}>
            {isArabic ? "\u062a\u0646\u0632\u064a\u0644 PDF \u0644\u0644\u0645\u0631\u064a\u0636" : "Download Patient PDF"}
          </button>

          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              opacity: 0.72,
              maxWidth: "260px",
              textAlign: isArabic ? "right" : "left",
              lineHeight: 1.5,
            }}
          >
            {isArabic
              ? "\u0647\u0630\u0647 \u0627\u0644\u0646\u0633\u062e\u0629 \u0645\u0643\u062a\u0648\u0628\u0629 \u0644\u0645\u0633\u0627\u0639\u062f\u062a\u0643 \u0639\u0644\u0649 \u0641\u0647\u0645 \u062a\u0642\u0631\u064a\u0631\u0643 \u0627\u0644\u0635\u062d\u064a \u0628\u0644\u063a\u0629 \u0628\u0633\u064a\u0637\u0629."
              : "This version is written to help you understand your health report in simple language."}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
          textAlign: isArabic ? "right" : "left",
          padding: "14px",
          borderRadius: "16px",
          background: "rgba(15,23,42,0.38)",
          border: "1px solid rgba(148,163,184,0.18)",
        }}
      >
        <div>
          <strong>{isArabic ? "\u0627\u0644\u062a\u0642\u0631\u064a\u0631" : "Report"}</strong>
          <p>{fileName}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0631\u0641\u0639" : "Uploaded"}</strong>
          <p>{uploadedAtText}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621" : "Generated"}</strong>
          <p>{generatedAtText}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u0627\u0644\u062a\u0631\u0643\u064a\u0632 \u0627\u0644\u0631\u0626\u064a\u0633\u064a" : "Main Focus"}</strong>
          <p>{executiveSummary?.prioritySystem || (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}</p>
        </div>
      </div>

      <div
        style={{
          padding: "14px",
          borderRadius: "16px",
          background: "rgba(34,211,238,0.08)",
          border: "1px solid rgba(34,211,238,0.18)",
          marginBottom: "20px",
          textAlign: isArabic ? "right" : "left",
        }}
      >
        <strong>{isArabic ? "\u0643\u064a\u0641 \u062a\u0633\u062a\u062e\u062f\u0645 \u0647\u0630\u0627 \u0627\u0644\u062a\u0642\u0631\u064a\u0631" : "How to use this report"}</strong>
        <p style={{ marginTop: "6px", marginBottom: 0, lineHeight: 1.7 }}>
          {isArabic
            ? "\u0627\u0642\u0631\u0623\u0647 \u0643\u062f\u0644\u064a\u0644 \u0645\u0628\u0633\u0637. \u0627\u0644\u0647\u062f\u0641 \u0647\u0648 \u0645\u0633\u0627\u0639\u062f\u062a\u0643 \u0639\u0644\u0649 \u0641\u0647\u0645 \u0645\u0639\u0644\u0648\u0645\u0627\u062a\u0643 \u0627\u0644\u0635\u062d\u064a\u0629 \u0648\u062a\u062c\u0647\u064a\u0632 \u0623\u0633\u0626\u0644\u0629 \u0623\u0641\u0636\u0644 \u0644\u0644\u0637\u0628\u064a\u0628."
            : "Read this as a simple guide. It is meant to help you understand your health information and prepare better questions for your doctor."}
        </p>
      </div>

      <div style={{ textAlign: isArabic ? "right" : "left" }}>
        <h3>{isArabic ? "\u0661. \u0645\u0627\u0630\u0627 \u064a\u0639\u0646\u064a \u0647\u0630\u0627 \u0627\u0644\u062a\u0642\u0631\u064a\u0631" : "1. What This Report Means"}</h3>
        <p style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {text(summary, isArabic ? "\u062a\u0645\u062a \u0645\u0631\u0627\u062c\u0639\u0629 \u062a\u0642\u0631\u064a\u0631\u0643 \u0628\u0648\u0627\u0633\u0637\u0629 OrganHeal AI \u0648\u062a\u0644\u062e\u064a\u0635\u0647 \u0628\u0637\u0631\u064a\u0642\u0629 \u0645\u0628\u0633\u0637\u0629." : "Your report was reviewed by OrganHeal AI and summarized in a simple way.")}
        </p>

        <h3>{isArabic ? "\u0662. \u0623\u0647\u0645 \u0627\u0644\u0623\u0645\u0648\u0631 \u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0629" : "2. Main Things Noticed"}</h3>
        <p style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {text(keyFindings, isArabic ? "\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062f \u0646\u062a\u0627\u0626\u062c \u0631\u0626\u064a\u0633\u064a\u0629 \u0648\u0627\u0636\u062d\u0629 \u0645\u0646 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629." : "No major findings were clearly identified from the available data.")}
        </p>

        <h3>{isArabic ? "\u0663. \u0645\u0627 \u0642\u062f \u064a\u062d\u062a\u0627\u062c \u0625\u0644\u0649 \u0627\u0646\u062a\u0628\u0627\u0647" : "3. What May Need Attention"}</h3>
        <p style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {text(riskSignals, isArabic ? "\u0644\u0645 \u062a\u0638\u0647\u0631 \u0625\u0634\u0627\u0631\u0627\u062a \u062a\u062d\u0630\u064a\u0631 \u0639\u0627\u062c\u0644\u0629 \u0648\u0627\u0636\u062d\u0629. \u064a\u0641\u0636\u0644 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0623\u0635\u0644\u064a \u0645\u0639 \u0645\u062e\u062a\u0635 \u0635\u062d\u064a." : "No urgent warning signals were clearly detected. Please review your original report with a healthcare professional.")}
        </p>

        <h3>{isArabic ? "\u0664. \u062e\u0637\u0648\u0627\u062a \u062a\u0627\u0644\u064a\u0629 \u0645\u0641\u064a\u062f\u0629" : "4. Helpful Next Steps"}</h3>
        <p style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {text(recommendations || executiveSummary?.nextBestAction, isArabic ? "\u062a\u0627\u0628\u0639 \u0645\u0639 \u0645\u0642\u062f\u0645 \u0627\u0644\u0631\u0639\u0627\u064a\u0629 \u0627\u0644\u0635\u062d\u064a\u0629 \u0625\u0630\u0627 \u0643\u0627\u0646\u062a \u0644\u062f\u064a\u0643 \u0623\u0639\u0631\u0627\u0636 \u0623\u0648 \u0645\u062e\u0627\u0648\u0641." : "Follow up with your healthcare provider if you have symptoms or concerns.")}
        </p>

        <h3>{isArabic ? "\u0665. \u0642\u0635\u062a\u0643 \u0627\u0644\u0635\u062d\u064a\u0629 \u0628\u0643\u0644\u0645\u0627\u062a \u0628\u0633\u064a\u0637\u0629" : "5. Your Health Story in Simple Words"}</h3>
        <p style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {text(healthStory, isArabic ? "\u0645\u0639 \u0625\u0636\u0627\u0641\u0629 \u062a\u0642\u064a\u064a\u0645\u0627\u062a \u0648\u0641\u062d\u0648\u0635\u0627\u062a \u0648\u062a\u0642\u0627\u0631\u064a\u0631 \u0623\u0643\u062b\u0631\u060c \u0633\u064a\u0628\u0646\u064a OrganHeal \u0635\u0648\u0631\u0629 \u0623\u0648\u0636\u062d \u0644\u0631\u062d\u0644\u062a\u0643 \u0627\u0644\u0635\u062d\u064a\u0629." : "As more assessments, check-ins, and reports are added, OrganHeal will build a clearer picture of your health journey.")}
        </p>

        <h3>{isArabic ? "\u0666. \u0627\u062a\u062c\u0627\u0647\u0643 \u0627\u0644\u0635\u062d\u064a" : "6. Your Health Direction"}</h3>

        <div
          style={{
            padding: "14px",
            borderRadius: "16px",
            background: "rgba(15,23,42,0.28)",
            border: "1px solid rgba(148,163,184,0.18)",
            marginBottom: "18px",
          }}
        >
          <p>
            <strong>{isArabic ? "\u0646\u062a\u064a\u062c\u062a\u0643 \u0627\u0644\u0635\u062d\u064a\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629:" : "Your Current Health Score:"}</strong>{" "}
            {executiveSummary?.currentScore ?? (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}
          </p>

          <p>
            <strong>{isArabic ? "\u0627\u0644\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0635\u062d\u064a \u0627\u0644\u0645\u062a\u0648\u0642\u0639:" : "Expected Health Direction:"}</strong>{" "}
            {executiveSummary?.forecastScore ?? (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}
          </p>

          <p>
            <strong>{isArabic ? "\u0627\u0644\u062b\u0642\u0629:" : "Confidence:"}</strong>{" "}
            {executiveSummary?.confidenceLevel || (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}
          </p>

          <p>
            <strong>{isArabic ? "\u0623\u0641\u0636\u0644 \u062e\u0637\u0648\u0629 \u062a\u0627\u0644\u064a\u0629:" : "Most Helpful Next Step:"}</strong>{" "}
            {executiveSummary?.nextBestAction || (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}
          </p>
        </div>

        <h3>{isArabic ? "\u062a\u0630\u0643\u064a\u0631 \u0644\u0637\u064a\u0641" : "A Gentle Reminder"}</h3>
        <p style={{ fontSize: "0.95rem", opacity: 0.86, lineHeight: 1.8 }}>
          {isArabic
            ? "\u0647\u0630\u0627 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0644\u064a\u0633 \u0644\u0625\u062e\u0627\u0641\u062a\u0643. \u0647\u0648 \u0645\u0635\u0645\u0645 \u0644\u0645\u0633\u0627\u0639\u062f\u062a\u0643 \u0639\u0644\u0649 \u0641\u0647\u0645 \u0645\u0639\u0644\u0648\u0645\u0627\u062a\u0643 \u0627\u0644\u0635\u062d\u064a\u0629 \u0648\u062a\u062c\u0647\u064a\u0632 \u0623\u0633\u0626\u0644\u0629 \u0623\u0641\u0636\u0644 \u0644\u0644\u0637\u0628\u064a\u0628."
            : "This report is not meant to scare you. It is designed to help you understand your health information and prepare better questions for your doctor."}
        </p>

        <h3>{isArabic ? "\u0645\u0644\u0627\u062d\u0638\u0629 \u0645\u0647\u0645\u0629" : "Important Note"}</h3>
        <p style={{ fontSize: "0.9rem", opacity: 0.78, lineHeight: 1.8 }}>
          {isArabic
            ? "\u0647\u0630\u0627 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0644\u0644\u062a\u062b\u0642\u064a\u0641 \u0648\u0627\u0644\u0641\u0647\u0645 \u0627\u0644\u0634\u062e\u0635\u064a \u0641\u0642\u0637. \u0644\u0627 \u064a\u0633\u062a\u0628\u062f\u0644 \u0627\u0644\u0627\u0633\u062a\u0634\u0627\u0631\u0629 \u0627\u0644\u0637\u0628\u064a\u0629 \u0623\u0648 \u0627\u0644\u062a\u0634\u062e\u064a\u0635 \u0623\u0648 \u0627\u0644\u0639\u0644\u0627\u062c. \u0631\u0627\u062c\u0639 \u0646\u062a\u0627\u0626\u062c\u0643 \u062f\u0627\u0626\u0645\u064b\u0627 \u0645\u0639 \u0645\u0642\u062f\u0645 \u0631\u0639\u0627\u064a\u0629 \u0635\u062d\u064a\u0629 \u0645\u0631\u062e\u0635."
            : "This patient report is for education and personal understanding only. It does not replace medical advice, diagnosis, or treatment. Always review your results with a licensed healthcare professional."}
        </p>
      </div>

      <div
        style={{
          marginTop: "24px",
          paddingTop: "14px",
          borderTop: "1px solid rgba(148,163,184,0.22)",
          fontSize: "0.85rem",
          opacity: 0.72,
          lineHeight: 1.7,
        }}
      >
        <p style={{ margin: 0 }}>
          {isArabic
            ? "OrganHeal AI \u064a\u0633\u0627\u0639\u062f\u0643 \u0639\u0644\u0649 \u0641\u0647\u0645 \u0645\u0639\u0644\u0648\u0645\u0627\u062a\u0643 \u0627\u0644\u0635\u062d\u064a\u0629 \u0628\u0644\u063a\u0629 \u0623\u0628\u0633\u0637. \u064a\u062c\u0628 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0643\u062f\u0644\u064a\u0644 \u0644\u0644\u0646\u0642\u0627\u0634 \u0645\u0639 \u0645\u0642\u062f\u0645 \u0627\u0644\u0631\u0639\u0627\u064a\u0629 \u0627\u0644\u0635\u062d\u064a\u0629."
            : "OrganHeal AI helps you understand your health information in simpler language. This report should be used as a conversation guide with your healthcare provider."}
        </p>
      </div>
    </div>
  );
}

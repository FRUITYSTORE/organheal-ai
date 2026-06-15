export function generateIntelligenceFromText(
  extractedText: string | null,
  reportType: string | null
) {
  const text = extractedText || "";

  return {
    medical_category:
      reportType === "lab"
        ? "Laboratory"
        : reportType === "radiology"
        ? "Radiology"
        : reportType === "discharge"
        ? "Clinical Summary"
        : "Medical Document",

    ai_status: "Generated",
    risk_level: "review",

    summary:
      text.length > 100
        ? text.slice(0, 700)
        : "The report text was extracted successfully, but more detailed AI interpretation will be improved in the next phase.",

    key_findings:
      "Key findings extracted from the report will be structured more deeply in the next phase.",

    risk_signals:
      "Risk signals require medical marker detection and will be enhanced in the next version.",

    recommendations:
      "Review this report with a licensed healthcare professional, especially if it contains abnormal results, symptoms, or follow-up instructions.",

    doctor_brief:
      text.length > 100
        ? `Uploaded report content was extracted and is ready for clinical review. Main extracted content preview: ${text.slice(
            0,
            500
          )}`
        : "Report text extracted and prepared for doctor-ready summarization.",

    next_best_action:
      "Review extracted report text and generate deeper structured intelligence.",
  };
}
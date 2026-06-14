export function generateMedicalIntelligence(reportType: string | null) {
  if (reportType === "lab") {
    return {
      medical_category: "Laboratory",
      ai_status: "Generated",
      risk_level: "review",
      summary:
        "This laboratory report is ready for structured interpretation. OrganHeal will use extracted lab markers to identify abnormal values, risk signals, and follow-up needs.",
      key_findings:
        "Lab markers are pending extraction. Future analysis will identify values such as CBC, lipids, glucose, kidney, liver, vitamins, and hormones.",
      risk_signals:
        "Risk signals will be generated after lab value extraction.",
      recommendations:
        "Review abnormal results with a licensed healthcare professional and compare findings with symptoms and medical history.",
      doctor_brief:
        "Laboratory report uploaded and prepared for structured clinical discussion.",
      next_best_action:
        "Extract lab markers and generate structured lab intelligence.",
    };
  }

  if (reportType === "radiology") {
    return {
      medical_category: "Radiology",
      ai_status: "Generated",
      risk_level: "review",
      summary:
        "This radiology report is ready for written-report interpretation. OrganHeal will explain the findings and impression in patient-friendly language.",
      key_findings:
        "Radiology findings are pending extraction from the written report.",
      risk_signals:
        "Potential risk signals will be based on the radiologist’s written findings and impression.",
      recommendations:
        "Discuss the radiology report with the ordering physician or radiologist, especially if symptoms are ongoing or urgent findings are mentioned.",
      doctor_brief:
        "Radiology report uploaded and prepared for doctor-ready summarization.",
      next_best_action:
        "Extract written findings and impression from the radiology report.",
    };
  }

  if (reportType === "discharge") {
    return {
      medical_category: "Clinical Summary",
      ai_status: "Generated",
      risk_level: "review",
      summary:
        "This discharge summary is ready for structured review. OrganHeal will organize diagnosis, medications, follow-up instructions, and warning signs.",
      key_findings:
        "Discharge details are pending extraction, including diagnosis, treatment received, medications, and follow-up plan.",
      risk_signals:
        "Risk signals will be based on discharge warnings, diagnosis severity, and follow-up requirements.",
      recommendations:
        "Follow the discharge instructions and contact a healthcare provider if warning symptoms appear.",
      doctor_brief:
        "Discharge summary uploaded and prepared for structured follow-up discussion.",
      next_best_action:
        "Extract diagnosis, medications, and follow-up instructions.",
    };
  }

  return {
    medical_category: "Medical Document",
    ai_status: "Generated",
    risk_level: "review",
    summary:
      "This medical document is ready for structured interpretation. OrganHeal will organize the written content into clear health insights.",
    key_findings:
      "Medical findings are pending extraction from the uploaded document.",
    risk_signals:
      "Risk signals will be generated after document interpretation.",
    recommendations:
      "Use this report to prepare questions for your licensed healthcare professional.",
    doctor_brief:
      "Medical document uploaded and prepared for future AI-assisted summarization.",
    next_best_action:
      "Extract key medical information and generate patient-friendly intelligence.",
  };
}
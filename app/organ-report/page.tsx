"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";

type Assessment = {
  organ_name: string;
  score: number;
  risk_level: string;
  notes: string;
  created_at: string;
};

type LabReport = {
  total_cholesterol: number | null;
  ldl: number | null;
  hdl: number | null;
  triglycerides: number | null;
  hba1c: number | null;
  vitamin_d: number | null;
  score: number;
  interpretation: string;
  created_at: string;
};

const organOrder = ["Heart", "Lung", "Kidney", "Liver", "Brain", "Metabolic"];

export default function OrganReportPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setMessage("Auth error: " + userError.message);
      setLoading(false);
      return;
    }

    const user = userData.user;
    setUserEmail(user?.email || "");

if (!user) {
  window.location.href = "/login";
  return;
}

    const { data: organData, error: organError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (organError) {
      setMessage("Organ database error: " + organError.message);
      setLoading(false);
      return;
    }

    const sortedOrganData = (organData || []).sort(
      (a, b) =>
        organOrder.indexOf(a.organ_name) - organOrder.indexOf(b.organ_name)
    );

    const { data: labData, error: labError } = await supabase
      .from("lab_reports")
      .select(
        "total_cholesterol, ldl, hdl, triglycerides, hba1c, vitamin_d, score, interpretation, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (labError && labError.code !== "PGRST116") {
      setMessage("Lab database error: " + labError.message);
      setLoading(false);
      return;
    }

    setAssessments(sortedOrganData);
    setLabReport(labData || null);
    setLoading(false);
  }

  const allScores = [
    ...assessments.map((item) => item.score),
    ...(labReport ? [labReport.score] : []),
  ];

  const overallScore =
    allScores.length > 0
      ? Math.round(
          allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        )
      : 0;

  function getStatus(score: number) {
    if (score >= 80) return "Good";
    if (score >= 50) return "Moderate";
    return "High Risk";
  }

  function getStrongestAssessment() {
    if (assessments.length === 0) return null;
    return [...assessments].sort((a, b) => b.score - a.score)[0];
  }

  function getWeakestAssessment() {
    if (assessments.length === 0) return null;
    return [...assessments].sort((a, b) => a.score - b.score)[0];
  }

  function getAIRecommendation(moduleName: string | null) {
    if (!moduleName) {
      return "Complete assessments to receive health insights.";
    }

    switch (moduleName) {
      case "Heart":
        return "Focus on blood pressure, cholesterol management, regular cardiovascular exercise, and preventive follow-up.";

      case "Lung":
        return "Avoid smoking exposure, maintain physical activity, and monitor respiratory symptoms such as cough or shortness of breath.";

      case "Kidney":
        return "Maintain hydration, monitor blood pressure, and consider follow-up kidney function and urine testing with a healthcare professional.";

      case "Liver":
        return "Focus on healthy nutrition, weight control, avoiding unnecessary liver stressors, and monitoring liver enzymes when needed.";

      case "Brain":
        return "Improve sleep quality, reduce stress, stay physically active, and seek medical advice if headaches or memory concerns persist.";

      case "Metabolic":
        return "Focus on blood sugar control, weight management, regular activity, and lipid profile monitoring.";

      default:
        return "Continue preventive health monitoring and healthy lifestyle habits.";
    }
  }

  function setStatusColor(pdf: jsPDF, score: number) {
    if (score >= 80) {
      pdf.setTextColor(34, 197, 94);
      return;
    }

    if (score >= 50) {
      pdf.setTextColor(245, 158, 11);
      return;
    }

    pdf.setTextColor(239, 68, 68);
  }

  function resetPDFColor(pdf: jsPDF) {
    pdf.setTextColor(0, 0, 0);
  }

  function formatValue(value: number | null) {
    if (value === null || value === undefined) return "Not available";
    return String(value);
  }

  function drawLogo(pdf: jsPDF, x: number, y: number) {
    pdf.setFillColor(15, 23, 42);
    pdf.circle(x, y, 8, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("OH", x, y + 3, { align: "center" });

    resetPDFColor(pdf);
  }

  function generateExecutiveSummary() {
    const strongest = getStrongestAssessment();
    const weakest = getWeakestAssessment();

    if (!strongest || !weakest) {
      return "No assessment data available.";
    }

    return `Overall Health Intelligence Score: ${overallScore}/100.

Your strongest health area is ${strongest.organ_name} with a score of ${strongest.score}/100.

The area requiring the most attention is ${weakest.organ_name} with a score of ${weakest.score}/100.

${
  labReport
    ? `Your latest laboratory analysis score is ${labReport.score}/100.`
    : ""
}

Recommended focus: ${getAIRecommendation(weakest.organ_name)}

This report is educational and intended to help identify areas that may benefit from lifestyle improvement, monitoring, or professional medical discussion.`;
  }

  function generateProfessionalPDF() {
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 18;
    let y = 20;

    const strongest = getStrongestAssessment();
    const weakest = getWeakestAssessment();

    // Cover page
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    drawLogo(pdf, pageWidth / 2, 40);

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.text("OrganHeal AI", pageWidth / 2, 62, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    pdf.text("Health Intelligence Report", pageWidth / 2, 74, {
      align: "center",
    });

    pdf.setFontSize(11);
    pdf.text(`User: ${userEmail || "Unknown user"}`, pageWidth / 2, 90, {
      align: "center",
    });

    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 98, {
      align: "center",
    });

    if (overallScore >= 80) {
      pdf.setFillColor(34, 197, 94);
    } else if (overallScore >= 50) {
      pdf.setFillColor(245, 158, 11);
    } else {
      pdf.setFillColor(239, 68, 68);
    }

    pdf.circle(pageWidth / 2, 135, 30, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(30);
    pdf.text(String(overallScore), pageWidth / 2, 139, { align: "center" });

    pdf.setFontSize(12);
    pdf.text("/100", pageWidth / 2, 151, { align: "center" });

    pdf.setFontSize(16);
    pdf.text(getStatus(overallScore).toUpperCase(), pageWidth / 2, 180, {
      align: "center",
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      "Educational wellness report. Not a medical diagnosis.",
      pageWidth / 2,
      265,
      { align: "center" }
    );

    resetPDFColor(pdf);

    pdf.addPage();
    y = 20;

    // Page header
    drawLogo(pdf, margin + 8, y + 2);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("OrganHeal AI", margin + 22, y);

    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text("Comprehensive Health Intelligence Report", margin + 22, y);

    y += 6;

    pdf.setFontSize(10);
    pdf.text(`User: ${userEmail || "Unknown user"}`, margin + 22, y);

    y += 10;

    pdf.line(margin, y, pageWidth - margin, y);

    y += 14;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Overall Health Intelligence Score", margin, y);

    y += 12;

    pdf.setFontSize(28);
    setStatusColor(pdf, overallScore);
    pdf.text(`${overallScore}/100`, margin, y);
    resetPDFColor(pdf);

    y += 9;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(13);
    pdf.text(`Status: ${getStatus(overallScore)}`, margin, y);

    y += 8;

    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, y);

    y += 14;

    pdf.line(margin, y, pageWidth - margin, y);

    y += 12;

    // Executive summary
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("AI Executive Summary", margin, y);

    y += 10;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    const summaryLines = pdf.splitTextToSize(
      generateExecutiveSummary(),
      pageWidth - margin * 2
    );

    pdf.text(summaryLines, margin, y);

    y += summaryLines.length * 5 + 10;

    // AI Health Insights
    if (strongest && weakest) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.text("AI Health Insights", margin, y);

      y += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);

      pdf.text(
        `Strongest Area: ${strongest.organ_name} (${strongest.score}/100)`,
        margin,
        y
      );

      y += 7;

      pdf.text(
        `Priority Area: ${weakest.organ_name} (${weakest.score}/100)`,
        margin,
        y
      );

      y += 7;

      pdf.text(`Overall Status: ${getStatus(overallScore)}`, margin, y);

      y += 10;

      const recommendationLines = pdf.splitTextToSize(
        `Recommendation: ${getAIRecommendation(weakest.organ_name)}`,
        pageWidth - margin * 2
      );

      pdf.text(recommendationLines, margin, y);

      y += recommendationLines.length * 5 + 8;

      if (weakest.score < 50) {
        pdf.setFillColor(127, 29, 29);
        pdf.rect(margin, y, pageWidth - margin * 2, 18, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);

        pdf.text(
          `Priority Alert: ${weakest.organ_name} currently has the lowest score (${weakest.score}/100).`,
          margin + 4,
          y + 11
        );

        resetPDFColor(pdf);

        y += 26;
      }
    }

    pdf.line(margin, y, pageWidth - margin, y);

    y += 12;

// Organ chart

if (y > pageHeight - 120) {
  pdf.addPage();
  y = 20;
}

pdf.setFont("helvetica", "bold");
pdf.setFontSize(15);
pdf.text("Organ Assessment Summary", margin, y);

y += 10;

pdf.setFont("helvetica", "bold");
pdf.setFontSize(13);
pdf.text("Organ Health Chart", margin, y);

y += 10;

    const chartWidth = 100;

    assessments.forEach((item) => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        y = 20;
      }

      let barColor: [number, number, number] = [239, 68, 68];

      if (item.score >= 80) {
        barColor = [34, 197, 94];
      } else if (item.score >= 50) {
        barColor = [245, 158, 11];
      }

      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(item.organ_name, margin, y);

      pdf.setFillColor(barColor[0], barColor[1], barColor[2]);

      pdf.rect(margin + 35, y - 4, (item.score / 100) * chartWidth, 5, "F");

      pdf.text(`${item.score}`, margin + 140, y);

      y += 8;
    });

    y += 10;

    // Organ details
    assessments.forEach((item, index) => {
      if (y > pageHeight - 70) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(`${index + 1}. ${item.organ_name}`, margin, y);

      y += 7;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);

      setStatusColor(pdf, item.score);
      pdf.text(`Score: ${item.score}/100`, margin + 5, y);
      resetPDFColor(pdf);

      y += 6;

      pdf.text(`Status: ${getStatus(item.score)}`, margin + 5, y);

      y += 6;

      const noteLines = pdf.splitTextToSize(
        `Notes: ${item.notes}`,
        pageWidth - margin * 2 - 5
      );

      pdf.text(noteLines, margin + 5, y);

      y += noteLines.length * 5 + 4;

      pdf.setFontSize(9);
      pdf.text(
        `Last saved: ${new Date(item.created_at).toLocaleString()}`,
        margin + 5,
        y
      );

      y += 10;

      pdf.line(margin, y, pageWidth - margin, y);

      y += 9;
    });

    // Lab analyzer
    if (labReport) {
      if (y > pageHeight - 85) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.text("Lab Analyzer Summary", margin, y);

      y += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);

      setStatusColor(pdf, labReport.score);
      pdf.text(`Latest Lab Intelligence Score: ${labReport.score}/100`, margin + 5, y);
      resetPDFColor(pdf);

      y += 6;

      pdf.text(`Status: ${getStatus(labReport.score)}`, margin + 5, y);

      y += 9;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Lab Values", margin + 5, y);

      y += 7;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const labValues = [
        `Total Cholesterol: ${formatValue(labReport.total_cholesterol)}`,
        `LDL: ${formatValue(labReport.ldl)}`,
        `HDL: ${formatValue(labReport.hdl)}`,
        `Triglycerides: ${formatValue(labReport.triglycerides)}`,
        `HbA1c: ${formatValue(labReport.hba1c)}`,
        `Vitamin D: ${formatValue(labReport.vitamin_d)}`,
      ];

      labValues.forEach((value) => {
        pdf.text(value, margin + 8, y);
        y += 6;
      });

      y += 3;

      const labLines = pdf.splitTextToSize(
        `Interpretation: ${labReport.interpretation}`,
        pageWidth - margin * 2 - 5
      );

      pdf.text(labLines, margin + 5, y);

      y += labLines.length * 5 + 4;

      pdf.setFontSize(9);
      pdf.text(
        `Last saved: ${new Date(labReport.created_at).toLocaleString()}`,
        margin + 5,
        y
      );

      y += 12;

      pdf.line(margin, y, pageWidth - margin, y);

      y += 10;
    }

    // Disclaimer
    if (y > pageHeight - 45) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Important Educational Disclaimer", margin, y);

    y += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    const disclaimer = pdf.splitTextToSize(
      "This report is for educational and wellness tracking purposes only. It does not provide a medical diagnosis, treatment plan, or emergency medical advice. Please discuss concerning symptoms or abnormal results with a licensed healthcare professional.",
      pageWidth - margin * 2
    );

    pdf.text(disclaimer, margin, y);

    const totalPages = pdf.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      });
      pdf.text("OrganHeal AI", margin, pageHeight - 10);
    }

    pdf.save("OrganHeal_Professional_Report.pdf");
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">ORGAN HEALTH REPORT</p>
          <h1>Your Organ Health Report</h1>
          <p>
            This report summarizes your saved organ assessments and latest lab
            analyzer score from Supabase.
          </p>
        </div>

        <div className="chatWindow">
          {loading && <p>Loading your report...</p>}

          {!loading && message && <p>{message}</p>}

          {!loading && !message && allScores.length === 0 && (
            <p>No saved organ assessments or lab reports found yet.</p>
          )}

          {!loading && !message && allScores.length > 0 && (
            <>
              <button className="primaryBtn" onClick={generateProfessionalPDF}>
                Download Professional PDF Report
              </button>

              <div className="resultBox">
                <p className="sectionLabel">Overall Health Intelligence Score</p>
                <h2>{overallScore}/100</h2>
                <h3>{getStatus(overallScore)}</h3>
                <p>
                  This score is calculated from your saved organ assessment
                  scores and your latest lab analyzer score.
                </p>
              </div>

              <div className="assessmentForm">
                {assessments.map((item) => (
                  <div className="resultBox" key={item.organ_name}>
                    <p className="sectionLabel">{item.organ_name}</p>
                    <h2>{item.score}/100</h2>
                    <h3>{getStatus(item.score)}</h3>
                    <p>{item.notes}</p>
                    <p>
                      Last saved:{" "}
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}

                {labReport && (
                  <div className="resultBox">
                    <p className="sectionLabel">Lab Analyzer</p>
                    <h2>{labReport.score}/100</h2>
                    <h3>{getStatus(labReport.score)}</h3>

                    <p>
                      <strong>Total Cholesterol:</strong>{" "}
                      {formatValue(labReport.total_cholesterol)}
                    </p>
                    <p>
                      <strong>LDL:</strong> {formatValue(labReport.ldl)}
                    </p>
                    <p>
                      <strong>HDL:</strong> {formatValue(labReport.hdl)}
                    </p>
                    <p>
                      <strong>Triglycerides:</strong>{" "}
                      {formatValue(labReport.triglycerides)}
                    </p>
                    <p>
                      <strong>HbA1c:</strong> {formatValue(labReport.hba1c)}
                    </p>
                    <p>
                      <strong>Vitamin D:</strong>{" "}
                      {formatValue(labReport.vitamin_d)}
                    </p>

                    <p>{labReport.interpretation}</p>

                    <p>
                      Last saved:{" "}
                      {new Date(labReport.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
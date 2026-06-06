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
  score: number;
  interpretation: string;
  created_at: string;
};

export default function OrganReportPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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

    if (!user) {
      setMessage("Please login to view your organ report.");
      setLoading(false);
      return;
    }

    const { data: organData, error: organError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level, notes, created_at")
      .eq("user_id", user.id)
      .order("organ_name", { ascending: true });

    if (organError) {
      setMessage("Organ database error: " + organError.message);
      setLoading(false);
      return;
    }

    const { data: labData, error: labError } = await supabase
      .from("lab_reports")
      .select("score, interpretation, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (labError && labError.code !== "PGRST116") {
      setMessage("Lab database error: " + labError.message);
      setLoading(false);
      return;
    }

    setAssessments(organData || []);
    setLabReport(labData || null);
    setLoading(false);
  }

  const allScores = [
    ...assessments.map((item) => item.score),
    ...(labReport ? [labReport.score] : []),
  ];

  const overallScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
      : 0;

  function getStatus(score: number) {
    if (score >= 80) return "Good";
    if (score >= 50) return "Moderate";
    return "High Risk";
  }

  function generateProfessionalPDF() {
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 18;
    let y = 20;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("OrganHeal AI", margin, y);

    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text("Comprehensive Health Intelligence Report", margin, y);

    y += 10;

    pdf.line(margin, y, pageWidth - margin, y);

    y += 14;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Overall Health Intelligence Score", margin, y);

    y += 12;

    pdf.setFontSize(28);
    pdf.text(`${overallScore}/100`, margin, y);

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

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("Organ Assessment Summary", margin, y);

    y += 10;

    assessments.forEach((item, index) => {
      if (y > pageHeight - 50) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(`${index + 1}. ${item.organ_name}`, margin, y);

      y += 7;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(`Score: ${item.score}/100`, margin + 5, y);

      y += 6;

      pdf.text(`Risk Level: ${item.risk_level}`, margin + 5, y);

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

    if (labReport) {
      if (y > pageHeight - 60) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.text("Lab Analyzer Summary", margin, y);

      y += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(`Lab Score: ${labReport.score}/100`, margin + 5, y);

      y += 6;

      pdf.text(`Status: ${getStatus(labReport.score)}`, margin + 5, y);

      y += 6;

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
                    <h3>{item.risk_level}</h3>
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
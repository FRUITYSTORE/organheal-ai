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

export default function OrganReportPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAssessments();
  }, []);

  async function fetchAssessments() {
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

    const { data, error } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level, notes, created_at")
      .eq("user_id", user.id)
      .order("organ_name", { ascending: true });

    if (error) {
      setMessage("Database error: " + error.message);
      setLoading(false);
      return;
    }

    setAssessments(data || []);
    setLoading(false);
  }

  const overallScore =
    assessments.length > 0
      ? Math.round(
          assessments.reduce((sum, item) => sum + item.score, 0) /
            assessments.length
        )
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
    pdf.text("Comprehensive Organ Health Report", margin, y);

    y += 10;

    pdf.setDrawColor(80);
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

    y += 10;

    pdf.setFontSize(10);
    pdf.text(
      `Generated on: ${new Date().toLocaleString()}`,
      margin,
      y
    );

    y += 14;

    pdf.setDrawColor(120);
    pdf.line(margin, y, pageWidth - margin, y);

    y += 12;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("Organ Assessment Summary", margin, y);

    y += 10;

    assessments.forEach((item, index) => {
      if (y > pageHeight - 45) {
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

      pdf.setDrawColor(220);
      pdf.line(margin, y, pageWidth - margin, y);

      y += 9;
    });

    if (y > pageHeight - 40) {
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
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
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
            This report summarizes your saved organ assessments from Supabase.
          </p>
        </div>

        <div className="chatWindow">
          {loading && <p>Loading your report...</p>}

          {!loading && message && <p>{message}</p>}

          {!loading && !message && assessments.length === 0 && (
            <p>No organ assessments found yet.</p>
          )}

          {!loading && assessments.length > 0 && (
            <>
              <button className="primaryBtn" onClick={generateProfessionalPDF}>
                Download Professional PDF Report
              </button>

              <div className="resultBox">
                <p className="sectionLabel">Overall Organ Health Score</p>
                <h2>{overallScore}/100</h2>
                <h3>{getStatus(overallScore)}</h3>
                <p>
                  This score is calculated from the average of your saved organ
                  assessment scores.
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
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
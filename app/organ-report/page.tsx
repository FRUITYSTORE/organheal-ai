"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";
import { getTranslations } from "../../lib/translations";

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

type DailyCheckIn = {
  mood: string;
  wellness_score: number;
  created_at: string;
};

const organOrder = ["Heart", "Lung", "Kidney", "Liver", "Brain", "Metabolic"];

export default function OrganReportPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">("en");

useEffect(() => {
  const savedLanguage =
    (localStorage.getItem("organheal-language") as "en" | "ar") || "en";

  setLanguage(savedLanguage);
}, []);

const t = getTranslations(language);
const isArabic = language === "ar";

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Please login or sign up to access your health report.");
      setLoading(false);
      return;
    }

    const user = userData.user;
    setUserEmail(user.email || "");

    const { data: organData, error: organError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (organError) {
      setMessage("Database error: " + organError.message);
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
      setMessage("Database error: " + labError.message);
      setLoading(false);
      return;
    }

    const { data: checkInData, error: checkInError } = await supabase
      .from("daily_checkins")
      .select("mood, wellness_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (checkInError && checkInError.code !== "PGRST116") {
      setMessage("Database error: " + checkInError.message);
      setLoading(false);
      return;
    }

    setAssessments(sortedOrganData);
    setLabReport(labData || null);
    setDailyCheckIn(checkInData || null);
    setLoading(false);
  }

  const allScores = [
    ...assessments.map((item) => item.score),
    ...(labReport ? [labReport.score] : []),
    ...(dailyCheckIn ? [dailyCheckIn.wellness_score] : []),
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

  function formatValue(value: number | null) {
    if (value === null || value === undefined) return "Not available";
    return String(value);
  }

  function getAIRecommendation(moduleName: string | null) {
    if (!moduleName) return "Complete assessments to receive health insights.";

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

  function generateExecutiveSummary() {
    const strongest = getStrongestAssessment();
    const weakest = getWeakestAssessment();

    if (!strongest || !weakest) {
      return "No assessment data available yet.";
    }

    return `Overall Health Intelligence Score: ${overallScore}/100.

Strongest Area: ${strongest.organ_name} (${strongest.score}/100).

Priority Area: ${weakest.organ_name} (${weakest.score}/100).

${
  labReport
    ? `Latest Lab Intelligence Score: ${labReport.score}/100.`
    : "No lab report found."
}

${
  dailyCheckIn
    ? `Latest Daily Wellness Score: ${dailyCheckIn.wellness_score}/100 with mood: ${dailyCheckIn.mood}.`
    : "No daily check-in found."
}

Recommended Focus: ${getAIRecommendation(weakest.organ_name)}

This report is educational and intended to support health awareness and better conversations with licensed healthcare professionals.`;
  }

  function generateProfessionalPDF() {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    let y = 24;

    const strongest = getStrongestAssessment();
    const weakest = getWeakestAssessment();

    function footer() {
      const totalPages = pdf.getNumberOfPages();

      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text("OrganHeal AI", margin, pageHeight - 10);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, {
          align: "center",
        });
      }
    }

    function addSectionTitle(title: string) {
      if (y > pageHeight - 40) {
        pdf.addPage();
        y = 24;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(15, 23, 42);
      pdf.text(title, margin, y);
      y += 9;
      pdf.setDrawColor(20, 184, 166);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;
    }

    function addWrappedText(text: string, fontSize = 10) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(fontSize);
      pdf.setTextColor(40, 40, 40);

      const lines = pdf.splitTextToSize(text, pageWidth - margin * 2);
      pdf.text(lines, margin, y);
      y += lines.length * 5 + 6;
    }

    function addScoreBadge(label: string, score: number, x: number, yPos: number) {
      if (score >= 80) pdf.setFillColor(34, 197, 94);
      else if (score >= 50) pdf.setFillColor(245, 158, 11);
      else pdf.setFillColor(239, 68, 68);

      pdf.roundedRect(x, yPos, 50, 24, 4, 4, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(`${score}/100`, x + 25, yPos + 11, { align: "center" });

      pdf.setFontSize(8);
      pdf.text(label, x + 25, yPos + 19, { align: "center" });
    }

    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(30);
    pdf.text("OrganHeal AI", pageWidth / 2, 48, { align: "center" });

    pdf.setFontSize(18);
    pdf.text("Professional Health Intelligence Report", pageWidth / 2, 65, {
      align: "center",
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(`User: ${userEmail || "Unknown user"}`, pageWidth / 2, 84, {
      align: "center",
    });
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 92, {
      align: "center",
    });

    addScoreBadge("Overall Score", overallScore, pageWidth / 2 - 25, 120);

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text(`Status: ${getStatus(overallScore)}`, pageWidth / 2, 160, {
      align: "center",
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      "Educational health intelligence report. Not a medical diagnosis.",
      pageWidth / 2,
      260,
      { align: "center" }
    );

    pdf.addPage();
    y = 24;

    addSectionTitle("1. Executive Summary");
    addWrappedText(generateExecutiveSummary(), 10);

    if (strongest && weakest) {
      addSectionTitle("2. Health Intelligence Highlights");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`Top Strength: ${strongest.organ_name}`, margin, y);
      y += 7;

      pdf.text(`Priority Area: ${weakest.organ_name}`, margin, y);
      y += 7;

      pdf.text(`Overall Status: ${getStatus(overallScore)}`, margin, y);
      y += 10;

      addWrappedText(`Recommended Focus: ${getAIRecommendation(weakest.organ_name)}`);
    }

    addSectionTitle("3. Organ Assessment Breakdown");

    if (assessments.length === 0) {
      addWrappedText("No organ assessments available.");
    } else {
      assessments.forEach((item) => {
        if (y > pageHeight - 40) {
          pdf.addPage();
          y = 24;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`${item.organ_name}`, margin, y);

        pdf.setFont("helvetica", "normal");
        pdf.text(`${item.score}/100 - ${getStatus(item.score)}`, margin + 60, y);

        y += 7;

        pdf.setFillColor(230, 230, 230);
        pdf.rect(margin, y, 120, 5, "F");

        if (item.score >= 80) pdf.setFillColor(34, 197, 94);
        else if (item.score >= 50) pdf.setFillColor(245, 158, 11);
        else pdf.setFillColor(239, 68, 68);

        pdf.rect(margin, y, (item.score / 100) * 120, 5, "F");

        y += 10;

        addWrappedText(item.notes || "No notes available.", 9);
      });
    }

    if (labReport) {
      addSectionTitle("4. Lab Analyzer Summary");

      addWrappedText(`Latest Lab Intelligence Score: ${labReport.score}/100`);
      addWrappedText(`Status: ${getStatus(labReport.score)}`);

      const labValues = [
        `Total Cholesterol: ${formatValue(labReport.total_cholesterol)}`,
        `LDL: ${formatValue(labReport.ldl)}`,
        `HDL: ${formatValue(labReport.hdl)}`,
        `Triglycerides: ${formatValue(labReport.triglycerides)}`,
        `HbA1c: ${formatValue(labReport.hba1c)}`,
        `Vitamin D: ${formatValue(labReport.vitamin_d)}`,
      ];

      labValues.forEach((value) => addWrappedText(value, 9));
      addWrappedText(`Interpretation: ${labReport.interpretation}`, 9);
    }

    if (dailyCheckIn) {
      addSectionTitle("5. Daily Wellness Summary");

      addWrappedText(`Latest Wellness Score: ${dailyCheckIn.wellness_score}/100`);
      addWrappedText(`Mood: ${dailyCheckIn.mood}`);
      addWrappedText(
        `Last Check-In: ${new Date(dailyCheckIn.created_at).toLocaleString()}`
      );
    }

    addSectionTitle("6. Personalized Recommendations");

    if (weakest) {
      addWrappedText(getAIRecommendation(weakest.organ_name));
      addWrappedText(
        `Suggested next step: Focus on improving ${weakest.organ_name} and repeat the assessment after following your health plan.`
      );
    } else {
      addWrappedText("Complete your first organ assessment to unlock recommendations.");
    }

    addSectionTitle("7. Important Educational Disclaimer");

    addWrappedText(
      "This report is for educational and wellness tracking purposes only. It does not provide a medical diagnosis, treatment plan, or emergency medical advice. Please discuss concerning symptoms or abnormal results with a licensed healthcare professional."
    );

    footer();

    pdf.save("OrganHeal_Professional_Report_v2.pdf");
  }
async function generateShareCode() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    setShareCode(
      isArabic
        ? "يرجى تسجيل الدخول لإنشاء كود مشاركة."
        : "Please login to generate a share code."
    );
    return;
  }

  const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newShareCode = `OH-${randomCode}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await supabase.from("shared_reports").insert({
    user_id: userData.user.id,
    share_code: newShareCode,
    report_type: "organ_report",
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    setShareCode(
      isArabic
        ? "حدث خطأ أثناء إنشاء كود المشاركة."
        : "Error generating share code."
    );
    return;
  }

  setShareCode(newShareCode);
}
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">{t.report.badge}</p>

<h1>{t.report.title}</h1>

<p>{t.report.description}</p>
        </div>

        <div className="chatWindow">
         {isArabic ? "جاري تحميل التقرير..." : "Loading your report..."}

          {!loading && message && (
            <div className="resultBox">
            {isArabic ? "تسجيل الدخول مطلوب" : "Login Required"}
             {isArabic ? "الوصول محمي" : "Access Protected"}
              <p>{message}</p>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <Link href="/login">
                  <button className="primaryBtn">Login</button>
                </Link>

                <Link href="/signup">
                  <button className="secondaryBtn">Sign Up</button>
                </Link>
              </div>
            </div>
          )}

          {!loading && !message && allScores.length === 0 && (
            <p>No saved organ assessments, check-ins, or lab reports found yet.</p>
          )}

          {!loading && !message && allScores.length > 0 && (
            <>
              <div
  style={{
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
  }}
>
  <button className="primaryBtn" onClick={generateProfessionalPDF}>
    {t.report.download}
  </button>

  <button className="secondaryBtn" onClick={generateShareCode}>
    {isArabic ? "إنشاء كود مشاركة للطبيب" : "Generate Doctor Share Code"}
  </button>
</div>

{shareCode && (
  <div className="resultBox">
    <p className="sectionLabel">
      {isArabic ? "كود مشاركة الطبيب" : "Doctor Share Code"}
    </p>

    <h2>{shareCode}</h2>

    <p>
      {isArabic
        ? "شارك هذا الكود مع الطبيب للسماح بمراجعة مؤقتة للتقرير."
        : "Share this code with a doctor to allow temporary report review."}
    </p>

    <p>{isArabic ? "صلاحية تجريبية: 7 أيام" : "Demo validity: 7 days"}</p>
  </div>
)}

              <div className="resultBox">
                <p className="sectionLabel">Overall Health Intelligence Score</p>
                <h2>{overallScore}/100</h2>
                <h3>{getStatus(overallScore)}</h3>
                <p>
                  This score is calculated from your saved organ assessments,
                  latest lab analyzer score, and latest daily wellness check-in.
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
                    <p>{labReport.interpretation}</p>
                  </div>
                )}

                {dailyCheckIn && (
                  <div className="resultBox">
                    <p className="sectionLabel">Daily Wellness</p>
                    <h2>{dailyCheckIn.wellness_score}/100</h2>
                    <h3>{dailyCheckIn.mood}</h3>
                    <p>
                      Last check-in:{" "}
                      {new Date(dailyCheckIn.created_at).toLocaleString()}
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
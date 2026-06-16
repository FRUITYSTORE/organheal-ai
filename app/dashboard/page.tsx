"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import DashboardEmptyState from "../components/DashboardEmptyState";
import { getTranslations } from "../../lib/translations";
import { buildHealthIntelligence } from "../../lib/intelligenceBuilder";

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

type DailyCheckIn = {
  mood: string;
  wellness_score: number;
  created_at: string;
};

type Language = "en" | "ar";

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
const [message, setMessage] = useState("");
const [language, setLanguage] = useState<Language>("en");
const [username, setUsername] = useState("");

  useEffect(() => {
    fetchDashboardData();

    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";
      setLanguage(currentLanguage);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const t = getTranslations(language);
  const isArabic = language === "ar";

  async function fetchDashboardData() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

   if (userError || !userData.user) {
  window.location.href = "/login";
  return;
}

    const user = userData.user;
    const { data: profileData } = await supabase
  .from("profiles")
  .select("username")
  .eq("id", user.id)
  .single();

setUsername(profileData?.username || user.email || "User");

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

    const { data: labData, error: labError } = await supabase
      .from("lab_reports")
      .select("score, interpretation, created_at")
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

    setAssessments(organData || []);
    setLabReport(labData || null);
    setDailyCheckIn(checkInData || null);
    setLoading(false);
  }

  function getStatus(score: number) {
    if (isArabic) {
      if (score >= 80) return "جيد";
      if (score >= 50) return "متوسط";
      return "مرتفع الخطورة";
    }

    if (score >= 80) return "Good";
    if (score >= 50) return "Moderate";
    return "High Risk";
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 50) return "moderateScore";
    return "riskScore";
  }

  const intelligence = buildHealthIntelligence({
    assessments: assessments.map((item) => ({
      organ_name: item.organ_name,
      score: item.score,
      created_at: item.created_at,
    })),
    labReport,
    dailyCheckIn,
    isArabic,
  });

  const allScores = [
    ...assessments.map((item) => item.score),
    ...(labReport ? [labReport.score] : []),
    ...(dailyCheckIn ? [dailyCheckIn.wellness_score] : []),
  ];

  const latestAssessment = assessments[0] || null;

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">{t.dashboard.badge}</p>
          <h1>{isArabic ? "لوحة التحكم" : "Dashboard"}</h1>
          <p>
            {isArabic
              ? "ملخص مختصر يساعدك على معرفة حالتك الحالية والخطوة التالية."
              : "A focused overview of your current health status and next best action."}
          </p>
        </div>
<div className="dashboardWelcomeCard">
  <div>
    <p className="sectionLabel">
      {isArabic ? "مرحباً بعودتك" : "Welcome Back"}
    </p>

    <h2>
      {username ? username : isArabic ? "المستخدم" : "User"}
    </h2>

    <p>
      {isArabic
        ? "هذه لوحة التحكم الصحية الخاصة بك. ابدأ بتقييم أو ارفع تقريراً طبياً لبناء ملفك الصحي."
        : "This is your personal health dashboard. Start an assessment or upload a report to build your health profile."}
    </p>
  </div>

  <div className="dashboardWelcomeActions">
    <Link href="/assessment">
      <button className="primaryBtn">
        {isArabic ? "ابدأ تقييم" : "Start Assessment"}
      </button>
    </Link>
     <Link href="/lab-upload">
      <button className="secondaryBtn">
        {isArabic ? "ارفع تقرير" : "Upload Report"}
      </button>
    </Link>
  </div>
</div>

 <div className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">
                {isArabic ? "تحميل لوحة التحكم" : "Loading Dashboard"}
              </p>
              <h2>
                {isArabic
                  ? "جاري تجهيز ملخصك الصحي..."
                  : "Preparing your health overview..."}
              </h2>
            </div>
          )}

          {!loading && !message && allScores.length === 0 && (
            <DashboardEmptyState
              title={isArabic ? "لوحة التحكم جاهزة" : "Your Dashboard Is Ready"}
              description={
                isArabic
                  ? "ابدأ أول تقييم صحي لفتح الذكاء الصحي والتقرير الاحترافي."
                  : "Start your first health assessment to unlock health intelligence and professional reporting."
              }
              buttonText={isArabic ? "ابدأ أول تقييم" : "Start First Assessment"}
              href="/assessment"
            />
          )}

          {!loading && !message && allScores.length > 0 && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "الملخص التنفيذي" : "Executive Health Overview"}
                </p>

                <h2 className={getScoreClass(intelligence.overallScore)}>
                  {intelligence.overallScore}/100
                </h2>

                <h3>{getStatus(intelligence.overallScore)}</h3>

                <p>
                  {isArabic
                    ? `منطقة الأولوية الحالية: ${
                        intelligence.priorityOrgan || "الصحة العامة"
                      }.`
                    : `Current priority area: ${
                        intelligence.priorityOrgan || "General Health"
                      }.`}
                </p>

                <p>
                  <strong>{isArabic ? "الخطوة التالية:" : "Next best action:"}</strong>{" "}
                  {intelligence.bestNextAction}
                </p>

                <div style={{ marginTop: "20px" }}>
                  <Link href="/intelligence">
                    <button className="primaryBtn">
                      {isArabic ? "افتح مركز الذكاء الصحي" : "Open Intelligence Center"}
                    </button>
                  </Link>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <div className="resultBox">
                  <p className="sectionLabel">{isArabic ? "الدرجة" : "Health Score"}</p>
                  <h2 className={getScoreClass(intelligence.overallScore)}>
                    {intelligence.overallScore}/100
                  </h2>
                  <p>{getStatus(intelligence.overallScore)}</p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">{isArabic ? "الأولوية" : "Priority Area"}</p>
                  <h2>{intelligence.priorityOrgan || "N/A"}</h2>
                  <p>
                    {isArabic
                      ? "أكثر منطقة تحتاج إلى متابعة."
                      : "The area that needs the most attention."}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">{isArabic ? "الإمكانات" : "Potential"}</p>
                  <h2>{intelligence.potentialScore}/100</h2>
                  <p>
                    {isArabic
                      ? `فرصة تحسن: +${intelligence.potentialGain}`
                      : `Possible gain: +${intelligence.potentialGain}`}
                  </p>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "الوصول السريع" : "Quick Actions"}
                </p>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                  <Link href="/intelligence">
                    <button className="primaryBtn">
                      {isArabic ? "مركز الذكاء" : "Intelligence"}
                    </button>
                  </Link>

                  <Link href="/assessment">
                    <button className="secondaryBtn">
                      {isArabic ? "التقييمات" : "Assessments"}
                    </button>
                  </Link>

                  <Link href="/lab-analyzer">
                    <button className="secondaryBtn">
                      {isArabic ? "تحليل المختبر" : "Lab Analyzer"}
                    </button>
                  </Link>

                  <Link href="/checkin">
                    <button className="secondaryBtn">
                      {isArabic ? "التسجيل اليومي" : "Daily Check-In"}
                    </button>
                  </Link>

                  <Link href="/history">
                    <button className="secondaryBtn">
                      {isArabic ? "السجل" : "History"}
                    </button>
                  </Link>

                  <Link href="/organ-report">
                    <button className="secondaryBtn">
                      {isArabic ? "التقرير" : "Report"}
                    </button>
                  </Link>

                  <Link href="/assistant">
                    <button className="secondaryBtn">
                      {isArabic ? "المساعد" : "Assistant"}
                    </button>
                  </Link>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "آخر النشاطات" : "Latest Activity"}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <strong>{isArabic ? "آخر تقييم" : "Latest Assessment"}</strong>
                    <p>
                      {latestAssessment
                        ? `${latestAssessment.organ_name} - ${latestAssessment.score}/100`
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <strong>{isArabic ? "آخر تسجيل يومي" : "Latest Check-In"}</strong>
                    <p>
                      {dailyCheckIn
                        ? `${dailyCheckIn.wellness_score}/100 - ${dailyCheckIn.mood}`
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <strong>{isArabic ? "آخر مختبر" : "Latest Lab"}</strong>
                    <p>{labReport ? `${labReport.score}/100` : "N/A"}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
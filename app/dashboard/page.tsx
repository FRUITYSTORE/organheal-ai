"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import DashboardEmptyState from "../components/DashboardEmptyState";
import { buildHealthIntelligence } from "../../lib/intelligenceBuilder";

type Assessment = {
  organ_name: string;
  score: number;
  risk_level: string | null;
  notes: string | null;
  created_at: string;
};

type DailyCheckIn = {
  mood: string;
  wellness_score: number;
  created_at: string;
};

type ReportStats = {
  uploadedReports: number;
  savedIntelligence: number;
  latestReportDate: string | null;
};

type HealthInsightRecord = {
  id: number;
  ai_status: string | null;
  created_at: string | null;
};

type Language = "en" | "ar";

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [reportStats, setReportStats] = useState<ReportStats>({
    uploadedReports: 0,
    savedIntelligence: 0,
    latestReportDate: null,
  });

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

  const isArabic = language === "ar";

  async function fetchDashboardData() {
    setLoading(true);
    setMessage("");

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

    const { count: uploadedReportCount } = await supabase
      .from("uploaded_lab_files")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data: insightData } = await supabase
      .from("health_insights")
      .select("id, ai_status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const insights = (insightData || []) as HealthInsightRecord[];

    const savedIntelligenceCount = insights.filter(
      (item) => item.ai_status === "Generated"
    ).length;

    setAssessments((organData || []) as Assessment[]);
    setDailyCheckIn((checkInData || null) as DailyCheckIn | null);
    setReportStats({
      uploadedReports: uploadedReportCount || 0,
      savedIntelligence: savedIntelligenceCount,
      latestReportDate: insights[0]?.created_at || null,
    });

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
    labReport: null,
    dailyCheckIn,
    isArabic,
  });

  const allScores = [
    ...assessments.map((item) => item.score),
    ...(dailyCheckIn ? [dailyCheckIn.wellness_score] : []),
  ];

  const latestAssessment = assessments[0] || null;
  const hasScoreData = allScores.length > 0;
  const hasAnyData =
    hasScoreData ||
    reportStats.uploadedReports > 0 ||
    reportStats.savedIntelligence > 0;

  const recommendedNextStep =
    assessments.length === 0
      ? {
          label: isArabic
            ? "ابدأ بأول تقييم صحي"
            : "Start your first health assessment",
          description: isArabic
            ? "ابدأ بتقييم عضو واحد حتى يستطيع OrganHeal بناء أول صورة صحية لك."
            : "Start with one organ assessment so OrganHeal can build your first health picture.",
          href: "/assessment",
          buttonText: isArabic ? "ابدأ التقييم" : "Start Assessment",
        }
      : reportStats.uploadedReports === 0
      ? {
          label: isArabic
            ? "ارفع أول تقرير طبي"
            : "Upload your first medical report",
          description: isArabic
            ? "ارفع تقرير مختبر أو تقرير طبي حتى يتم ربط التقييمات مع بيانات طبية فعلية."
            : "Upload a lab or medical report so your assessments can connect with real medical data.",
          href: "/lab-upload",
          buttonText: isArabic ? "ارفع تقريرًا" : "Upload Report",
        }
      : !dailyCheckIn
      ? {
          label: isArabic
            ? "أكمل أول تسجيل صحي"
            : "Complete your first wellness check-in",
          description: isArabic
            ? "أضف النوم، التوتر، الطاقة، والمزاج حتى تصبح خطة المتابعة أكثر واقعية."
            : "Add sleep, stress, energy, and mood so your follow-up plan becomes more realistic.",
          href: "/checkin",
          buttonText: isArabic ? "افتح التسجيل الصحي" : "Open Check-In",
        }
      : reportStats.savedIntelligence === 0
      ? {
          label: isArabic
            ? "ولّد الذكاء الصحي للتقارير"
            : "Generate report intelligence",
          description: isArabic
            ? "افتح مركز الذكاء لتحويل تقاريرك إلى ملخصات مفهومة وخطوات متابعة."
            : "Open Intelligence Center to turn your reports into summaries and follow-up steps.",
          href: "/intelligence",
          buttonText: isArabic ? "افتح مركز الذكاء" : "Open Intelligence",
        }
      : {
          label: isArabic
            ? "تابع خطة الصحة"
            : "Continue your health plan",
          description: isArabic
            ? "راجع خطة المتابعة، المهام، والتذكيرات المستقبلية بناءً على بياناتك."
            : "Review your follow-up plan, tasks, and future reminder preview based on your data.",
          href: "/health-plan",
          buttonText: isArabic ? "افتح خطة الصحة" : "Open Health Plan",
        };

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">
            {isArabic ? "لوحة الصحة الشخصية" : "PERSONAL HEALTH DASHBOARD"}
          </p>

          <h1>{isArabic ? "لوحة التحكم" : "Dashboard"}</h1>

          <p>
            {isArabic
              ? "نقطة البداية لرحلتك الصحية: التقييمات، التقارير، الذكاء الصحي، خطة المتابعة، والتسجيل الصحي."
              : "Your starting point for assessments, reports, intelligence, follow-up planning, and wellness check-ins."}
          </p>
        </div>

        <div className="dashboardWelcomeCard">
          <div>
            <p className="sectionLabel">
              {isArabic ? "مرحبًا بعودتك" : "Welcome Back"}
            </p>

            <h2>{username || (isArabic ? "المستخدم" : "User")}</h2>

            <p>
              {isArabic
                ? "استخدم هذه اللوحة لمعرفة أين تقف الآن وما هي الخطوة التالية الأفضل داخل OrganHeal."
                : "Use this dashboard to understand where you are now and what the best next step is inside OrganHeal."}
            </p>
          </div>

          <div className="dashboardWelcomeActions">
            <Link href={recommendedNextStep.href} className="primaryBtn">
              {recommendedNextStep.buttonText}
            </Link>

            <Link href="/intelligence" className="secondaryBtn">
              {isArabic ? "مركز الذكاء" : "Intelligence Center"}
            </Link>

            <Link href="/health-plan" className="secondaryBtn">
              {isArabic ? "خطة المتابعة" : "Health Plan"}
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
                  ? "جارِ تجهيز ملخصك الصحي..."
                  : "Preparing your health overview..."}
              </h2>
            </div>
          )}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">
                {isArabic ? "تنبيه" : "Dashboard Notice"}
              </p>
              <h2>{isArabic ? "تعذر تحميل البيانات" : "Could not load data"}</h2>
              <p>{message}</p>
            </div>
          )}

          {!loading && !message && !hasAnyData && (
            <DashboardEmptyState
              title={
                isArabic
                  ? "لوحة التحكم جاهزة"
                  : "Your Dashboard Is Ready"
              }
              description={
                isArabic
                  ? "ابدأ بأول تقييم صحي أو ارفع تقريرًا طبيًا لبناء ملفك الصحي."
                  : "Start your first health assessment or upload a medical report to build your health profile."
              }
              buttonText={isArabic ? "ابدأ أول تقييم" : "Start First Assessment"}
              href="/assessment"
            />
          )}

          {!loading && !message && hasAnyData && (
            <>
              {hasScoreData ? (
                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic
                      ? "الملخص الصحي التنفيذي"
                      : "Executive Health Overview"}
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
                    <strong>
                      {isArabic ? "الخطوة التالية:" : "Next best action:"}
                    </strong>{" "}
                    {intelligence.bestNextAction}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      marginTop: "20px",
                    }}
                  >
                    <Link href="/intelligence" className="primaryBtn">
                      {isArabic ? "افتح مركز الذكاء" : "Open Intelligence"}
                    </Link>

                    <Link href="/health-plan" className="secondaryBtn">
                      {isArabic ? "افتح خطة المتابعة" : "Open Health Plan"}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "تقارير جاهزة" : "Reports Found"}
                  </p>

                  <h2>{reportStats.uploadedReports}</h2>

                  <p>
                    {isArabic
                      ? "لديك تقارير محفوظة. أكمل تقييمًا صحيًا أو افتح مركز الذكاء للحصول على فهم أعمق."
                      : "You have saved reports. Complete an assessment or open Intelligence Center for deeper understanding."}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      marginTop: "20px",
                    }}
                  >
                    <Link href="/assessment" className="primaryBtn">
                      {isArabic ? "ابدأ التقييم" : "Start Assessment"}
                    </Link>

                    <Link href="/intelligence" className="secondaryBtn">
                      {isArabic ? "مركز الذكاء" : "Intelligence Center"}
                    </Link>
                  </div>
                </div>
              )}

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "الخطوة الذكية التالية" : "Smart Next Step"}
                </p>

                <h2>{recommendedNextStep.label}</h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    maxWidth: "720px",
                    margin: "0 auto 20px",
                  }}
                >
                  {recommendedNextStep.description}
                </p>

                <Link href={recommendedNextStep.href} className="primaryBtn">
                  {recommendedNextStep.buttonText}
                </Link>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "16px",
                }}
              >
                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "التقييمات" : "Assessments"}
                  </p>
                  <h2>{assessments.length}</h2>
                  <p>
                    {latestAssessment
                      ? `${latestAssessment.organ_name} · ${latestAssessment.score}/100`
                      : isArabic
                      ? "لم يتم تسجيل تقييم بعد"
                      : "No assessment yet"}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "التقارير" : "Reports"}
                  </p>
                  <h2>{reportStats.uploadedReports}</h2>
                  <p>
                    {reportStats.uploadedReports > 0
                      ? isArabic
                        ? "تقارير محفوظة في مكتبة التقارير"
                        : "Reports saved in your reports library"
                      : isArabic
                      ? "لم يتم رفع تقارير بعد"
                      : "No reports uploaded yet"}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "الذكاء المحفوظ" : "Saved Intelligence"}
                  </p>
                  <h2>{reportStats.savedIntelligence}</h2>
                  <p>
                    {reportStats.savedIntelligence > 0
                      ? isArabic
                        ? "نتائج ذكاء صحي محفوظة"
                        : "Saved intelligence results available"
                      : isArabic
                      ? "لم يتم حفظ ذكاء صحي بعد"
                      : "No saved intelligence yet"}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "التسجيل الصحي" : "Check-In"}
                  </p>
                  <h2>{dailyCheckIn ? `${dailyCheckIn.wellness_score}/100` : "N/A"}</h2>
                  <p>
                    {dailyCheckIn
                      ? `${dailyCheckIn.mood} · ${new Date(
                          dailyCheckIn.created_at
                        ).toLocaleDateString()}`
                      : isArabic
                      ? "لم يتم تسجيل متابعة بعد"
                      : "No wellness check-in yet"}
                  </p>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "رحلة OrganHeal" : "OrganHeal Journey"}
                </p>

                <h2>
                  {isArabic
                    ? "تابع رحلتك بدون تشتت"
                    : "Continue without getting lost"}
                </h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    maxWidth: "760px",
                    margin: "0 auto 22px",
                  }}
                >
                  {isArabic
                    ? "لوحة التحكم تعرض فقط أهم المسارات: الملف الصحي، التقارير، الذكاء، خطة المتابعة، والتسجيل الصحي."
                    : "The dashboard now keeps the main paths clear: profile, reports, intelligence, health plan, and check-ins."}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <Link href="/profile" className="secondaryBtn">
                    {isArabic ? "الملف الصحي" : "Profile"}
                  </Link>

                  <Link href="/reports" className="secondaryBtn">
                    {isArabic ? "مكتبة التقارير" : "Reports"}
                  </Link>

                  <Link href="/intelligence" className="primaryBtn">
                    {isArabic ? "مركز الذكاء" : "Intelligence"}
                  </Link>

                  <Link href="/health-plan" className="secondaryBtn">
                    {isArabic ? "خطة المتابعة" : "Health Plan"}
                  </Link>

                  <Link href="/checkin" className="secondaryBtn">
                    {isArabic ? "التسجيل الصحي" : "Check-In"}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
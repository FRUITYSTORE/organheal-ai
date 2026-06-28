"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { buildHealthIntelligence } from "../../lib/intelligenceBuilder";

type Language = "en" | "ar";

type Assessment = {
  organ_name: string;
  score: number;
  risk_level: string | null;
  notes: string | null;
  created_at: string;
};

type DailyCheckIn = {
  mood: string | null;
  wellness_score: number;
  created_at: string;
};

type ReportStats = {
  uploadedReports: number;
  savedIntelligence: number;
  latestIntelligenceDate: string | null;
};

type NextStep = {
  label: string;
  description: string;
  href: string;
  buttonText: string;
  tag: string;
};

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [reportStats, setReportStats] = useState<ReportStats>({
    uploadedReports: 0,
    savedIntelligence: 0,
    latestIntelligenceDate: null,
  });
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";
      setLanguage(currentLanguage);
    }, 300);

    fetchDashboardData();

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
      .maybeSingle();

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
      .maybeSingle();

    if (checkInError) {
      setMessage("Database error: " + checkInError.message);
      setLoading(false);
      return;
    }

    const { count: uploadedReportCount } = await supabase
      .from("uploaded_lab_files")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    let savedIntelligenceCount = 0;
    let latestIntelligenceDate: string | null = null;

    const { data: generatedResults, error: generatedError } = await supabase
      .from("generated_intelligence_results")
      .select("id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!generatedError && generatedResults) {
      savedIntelligenceCount = generatedResults.length;
      latestIntelligenceDate = generatedResults[0]?.created_at || null;
    } else {
      const { data: insightData } = await supabase
        .from("health_insights")
        .select("id, ai_status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const generatedInsights = (insightData || []).filter(
        (item) => item.ai_status === "Generated"
      );

      savedIntelligenceCount = generatedInsights.length;
      latestIntelligenceDate = generatedInsights[0]?.created_at || null;
    }

    setAssessments((organData || []) as Assessment[]);
    setDailyCheckIn((checkInData || null) as DailyCheckIn | null);
    setReportStats({
      uploadedReports: uploadedReportCount || 0,
      savedIntelligence: savedIntelligenceCount,
      latestIntelligenceDate,
    });

    setLoading(false);
  }

  function getStatus(score: number) {
    if (isArabic) {
      if (score >= 80) return "جيد";
      if (score >= 50) return "متوسط";
      return "يحتاج متابعة";
    }

    if (score >= 80) return "Good";
    if (score >= 50) return "Moderate";
    return "Needs Follow-Up";
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "good";
    if (score >= 50) return "moderate";
    return "risk";
  }

  function formatDate(value: string | null) {
    if (!value) return isArabic ? "غير متاح" : "Not available";
    return new Date(value).toLocaleDateString();
  }

  const hasAssessments = assessments.length > 0;
  const hasReports = reportStats.uploadedReports > 0;
  const hasSavedIntelligence = reportStats.savedIntelligence > 0;
  const hasCheckIn = Boolean(dailyCheckIn);
  const hasAnyData =
    hasAssessments || hasReports || hasSavedIntelligence || hasCheckIn;

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

  const latestAssessment = assessments[0] || null;

  const completedSteps = [
    hasAssessments,
    hasReports,
    hasSavedIntelligence,
    hasCheckIn,
  ].filter(Boolean).length;

  const progressPercent = Math.round((completedSteps / 4) * 100);

  const nextStep: NextStep = !hasAssessments && !hasReports
    ? {
        tag: isArabic ? "ابدأ هنا" : "Start here",
        label: isArabic
          ? "ابدأ بأول تقييم صحي"
          : "Start your first health assessment",
        description: isArabic
          ? "ابدأ بتقييم بسيط لصحة الأعضاء حتى يستطيع OrganHeal بناء أول صورة صحية لك."
          : "Start with a simple organ health assessment so OrganHeal can build your first health picture.",
        href: "/assessment",
        buttonText: isArabic ? "ابدأ التقييم" : "Start Assessment",
      }
    : hasAssessments && !hasReports
    ? {
        tag: isArabic ? "الخطوة التالية" : "Next step",
        label: isArabic
          ? "ارفع أول تقرير طبي"
          : "Upload your first medical report",
        description: isArabic
          ? "أضف تقرير مختبر أو تقرير طبي مكتوب حتى تربط التقييمات ببيانات صحية فعلية."
          : "Add a lab result or written medical report to connect your assessment with real health data.",
        href: "/lab-upload",
        buttonText: isArabic ? "ارفع تقريرًا" : "Upload Report",
      }
    : hasReports && !hasSavedIntelligence
    ? {
        tag: isArabic ? "جاهز للذكاء" : "Ready for intelligence",
        label: isArabic
          ? "ولّد ذكاء التقرير"
          : "Generate report intelligence",
        description: isArabic
          ? "افتح مركز الذكاء لتحويل تقاريرك إلى ملخص مفهوم للمريض وملخص جاهز للطبيب."
          : "Open the Intelligence Center to turn your reports into a patient-friendly summary and doctor-ready brief.",
        href: "/intelligence",
        buttonText: isArabic ? "افتح مركز الذكاء" : "Open Intelligence",
      }
    : hasSavedIntelligence && !hasCheckIn
    ? {
        tag: isArabic ? "اجعل المتابعة واقعية" : "Make follow-up realistic",
        label: isArabic
          ? "أكمل أول تسجيل صحي"
          : "Complete your first check-in",
        description: isArabic
          ? "أضف النوم، التوتر، الطاقة، والمزاج حتى تصبح خطة المتابعة أقرب لحياتك اليومية."
          : "Add sleep, stress, energy, and mood so your follow-up plan becomes closer to your daily life.",
        href: "/checkin",
        buttonText: isArabic ? "افتح التسجيل الصحي" : "Open Check-In",
      }
    : {
        tag: isArabic ? "استمر" : "Continue",
        label: isArabic ? "راجع خطة المتابعة" : "Review your health plan",
        description: isArabic
          ? "لديك بيانات كافية لبدء مراجعة الخطة الصحية، المهام، والاتجاهات القادمة."
          : "You have enough data to review your health plan, tasks, and upcoming follow-up direction.",
        href: "/health-plan",
        buttonText: isArabic ? "افتح خطة الصحة" : "Open Health Plan",
      };

  const overviewCards = [
    {
      label: isArabic ? "التقييمات" : "Assessments",
      value: String(assessments.length),
      detail: latestAssessment
        ? `${latestAssessment.organ_name} · ${latestAssessment.score}/100`
        : isArabic
        ? "لم يبدأ بعد"
        : "Not started yet",
      href: "/assessment",
    },
    {
      label: isArabic ? "التقارير" : "Reports",
      value: String(reportStats.uploadedReports),
      detail: hasReports
        ? isArabic
          ? "تقارير محفوظة"
          : "Reports saved"
        : isArabic
        ? "لا يوجد تقارير بعد"
        : "No reports yet",
      href: "/reports",
    },
    {
      label: isArabic ? "الذكاء المحفوظ" : "Saved Intelligence",
      value: String(reportStats.savedIntelligence),
      detail: hasSavedIntelligence
        ? `${isArabic ? "آخر نتيجة" : "Latest"}: ${formatDate(
            reportStats.latestIntelligenceDate
          )}`
        : isArabic
        ? "لم يتم التوليد بعد"
        : "Not generated yet",
      href: "/intelligence",
    },
    {
      label: isArabic ? "التسجيل الصحي" : "Check-In",
      value: dailyCheckIn ? `${dailyCheckIn.wellness_score}/100` : "N/A",
      detail: dailyCheckIn
        ? `${dailyCheckIn.mood || (isArabic ? "مسجل" : "Logged")} · ${formatDate(
            dailyCheckIn.created_at
          )}`
        : isArabic
        ? "لا يوجد تسجيل بعد"
        : "No check-in yet",
      href: "/checkin",
    },
  ];

  const startCards = [
    {
      icon: "🫀",
      title: isArabic ? "ابدأ بتقييم" : "Start assessment",
      text: isArabic
        ? "أفضل بداية لبناء صورة صحية أولية."
        : "The best first step to build your first health picture.",
      href: "/assessment",
    },
    {
      icon: "📄",
      title: isArabic ? "ارفع تقريرًا" : "Upload report",
      text: isArabic
        ? "ارفع مختبرات أو تقريرًا طبيًا مكتوبًا."
        : "Upload labs or a written medical report.",
      href: "/lab-upload",
    },
    {
      icon: "🧠",
      title: isArabic ? "افتح الذكاء" : "Open Intelligence",
      text: isArabic
        ? "بعد إضافة بياناتك، ولّد ملخصًا صحيًا واضحًا."
        : "After adding data, generate a clear health summary.",
      href: "/intelligence",
    },
  ];

  return (
    <main className="smartDashboardPage" dir={isArabic ? "rtl" : "ltr"}>
      <section className="smartDashboardHero">
        <div>
          <p className="launchEyebrow">
            {isArabic ? "لوحة الصحة الشخصية" : "Personal Health Dashboard"}
          </p>

          <h1>
            {isArabic
              ? `مرحبًا ${username || "بك"}`
              : `Welcome, ${username || "User"}`}
          </h1>

          <p>
            {isArabic
              ? "هذه الصفحة تقرأ حالة رحلتك الصحية وتعرض لك الخطوة التالية الأفضل داخل OrganHeal."
              : "This page reads your health journey state and shows the best next action inside OrganHeal."}
          </p>
        </div>

        <div className="dashboardProgressCard">
          <span>{isArabic ? "تقدم الملف الصحي" : "Health profile progress"}</span>
          <strong>{progressPercent}%</strong>
          <div>
            <i style={{ width: `${progressPercent}%` }}></i>
          </div>
          <small>
            {completedSteps}/4{" "}
            {isArabic ? "خطوات أساسية مكتملة" : "core steps completed"}
          </small>
        </div>
      </section>

      <section className="dashboardNextAction">
        <div>
          <p>{nextStep.tag}</p>
          <h2>{nextStep.label}</h2>
          <span>{nextStep.description}</span>
        </div>

        <Link href={nextStep.href} className="launchPrimary">
          {nextStep.buttonText}
        </Link>
      </section>

      {loading && (
        <section className="dashboardPanel">
          <p className="launchEyebrow">
            {isArabic ? "تحميل" : "Loading"}
          </p>
          <h2>
            {isArabic
              ? "جاري تجهيز ملخصك الصحي..."
              : "Preparing your health overview..."}
          </h2>
        </section>
      )}

      {!loading && message && (
        <section className="dashboardPanel">
          <p className="launchEyebrow">
            {isArabic ? "تنبيه" : "Dashboard Notice"}
          </p>
          <h2>{isArabic ? "تعذر تحميل البيانات" : "Could not load data"}</h2>
          <p>{message}</p>
        </section>
      )}

      {!loading && !message && (
        <>
          {!hasAnyData ? (
            <section className="dashboardStartSection">
              <div className="dashboardSectionHeader">
                <p className="launchEyebrow">
                  {isArabic ? "ابدأ هنا" : "Start here"}
                </p>
                <h2>
                  {isArabic
                    ? "لوحتك جاهزة، لكنها تحتاج أول بيانات"
                    : "Your dashboard is ready, but it needs your first data"}
                </h2>
                <p>
                  {isArabic
                    ? "ابدأ بخطوة واحدة فقط. لا تحتاج إلى إدخال كل شيء الآن."
                    : "Start with one step only. You do not need to add everything now."}
                </p>
              </div>

              <div className="dashboardStartGrid">
                {startCards.map((item) => (
                  <Link href={item.href} className="dashboardStartCard" key={item.title}>
                    <div>{item.icon}</div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <>
              <section className="dashboardOverviewGrid">
                {overviewCards.map((card) => (
                  <Link href={card.href} className="dashboardMetricCard" key={card.label}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <p>{card.detail}</p>
                  </Link>
                ))}
              </section>

              <section className="dashboardInsightPanel">
                <div>
                  <p className="launchEyebrow">
                    {isArabic ? "ملخص ذكي" : "Smart Summary"}
                  </p>

                  <h2>
                    {hasAssessments || hasCheckIn
                      ? `${intelligence.overallScore}/100`
                      : isArabic
                      ? "التقارير جاهزة"
                      : "Reports ready"}
                  </h2>

                  {(hasAssessments || hasCheckIn) && (
                    <strong className={`dashboardScore ${getScoreClass(intelligence.overallScore)}`}>
                      {getStatus(intelligence.overallScore)}
                    </strong>
                  )}

                  <p>
                    {hasAssessments || hasCheckIn
                      ? isArabic
                        ? `منطقة الأولوية الحالية: ${
                            intelligence.priorityOrgan || "الصحة العامة"
                          }.`
                        : `Current priority area: ${
                            intelligence.priorityOrgan || "General Health"
                          }.`
                      : isArabic
                      ? "لديك تقارير محفوظة. الخطوة التالية هي توليد ذكاء التقرير أو إضافة تقييم صحي."
                      : "You have saved reports. The next step is to generate report intelligence or add a health assessment."}
                  </p>
                </div>

                <div className="dashboardInsightActions">
                  <Link href="/intelligence" className="launchPrimary">
                    {isArabic ? "مركز الذكاء" : "Intelligence Center"}
                  </Link>

                  <Link href="/health-plan" className="launchSecondary">
                    {isArabic ? "خطة المتابعة" : "Health Plan"}
                  </Link>
                </div>
              </section>
            </>
          )}

          <section className="dashboardPathPanel">
            <div>
              <p className="launchEyebrow">
                {isArabic ? "المسارات الرئيسية" : "Main paths"}
              </p>
              <h2>
                {isArabic
                  ? "تابع رحلتك بدون تشتيت"
                  : "Continue your journey without getting lost"}
              </h2>
              <p>
                {isArabic
                  ? "استخدم هذه الروابط للوصول السريع إلى أهم أجزاء OrganHeal."
                  : "Use these links to quickly reach the most important parts of OrganHeal."}
              </p>
            </div>

            <div className="dashboardPathLinks">
              <Link href="/profile">{isArabic ? "الملف الصحي" : "Profile"}</Link>
              <Link href="/reports">{isArabic ? "التقارير" : "Reports"}</Link>
              <Link href="/intelligence">{isArabic ? "الذكاء" : "Intelligence"}</Link>
              <Link href="/health-plan">{isArabic ? "خطة الصحة" : "Health Plan"}</Link>
              <Link href="/checkin">{isArabic ? "التسجيل الصحي" : "Check-In"}</Link>
              <Link href="/history">{isArabic ? "السجل الصحي" : "History"}</Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
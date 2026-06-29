"use client";

import { useEffect, useMemo, useState } from "react";
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

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function localizeOrganName(value: string | null | undefined, isArabic: boolean) {
  if (!isArabic) return value || "General Health";

  const clean = (value || "").trim();

  const map: Record<string, string> = {
    Heart: "القلب",
    Liver: "الكبد",
    Lung: "الرئة",
    Kidney: "الكلى",
    Brain: "الدماغ",
    Metabolic: "الأيض",
    General: "الصحة العامة",
    "General Health": "الصحة العامة",
  };

  return map[clean] || clean || "الصحة العامة";
}

function localizeMood(value: string | null | undefined, isArabic: boolean) {
  if (!isArabic) return value || "Logged";

  const clean = (value || "").trim();

  const map: Record<string, string> = {
    Excellent: "ممتاز",
    Good: "جيد",
    Average: "متوسط",
    Poor: "ضعيف",
  };

  return map[clean] || "مسجل";
}

function getStatus(score: number, isArabic: boolean) {
  if (score >= 80) return isArabic ? "جيد" : "Good";
  if (score >= 50) return isArabic ? "متوسط" : "Moderate";
  return isArabic ? "يحتاج متابعة" : "Needs Follow-Up";
}

function getScoreClass(score: number) {
  if (score >= 80) return "good";
  if (score >= 50) return "moderate";
  return "risk";
}

function formatDate(value: string | null, isArabic: boolean) {
  if (!value) return isArabic ? "غير متاح" : "Not available";

  try {
    return new Date(value).toLocaleDateString(isArabic ? "ar" : "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

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
    function syncLanguage() {
      setLanguage(getStoredLanguage());
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("focus", syncLanguage);
    window.addEventListener("click", syncLanguage);

    fetchDashboardData();

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("focus", syncLanguage);
      window.removeEventListener("click", syncLanguage);
    };
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

  const currentPriority = localizeOrganName(
    intelligence.priorityOrgan || latestAssessment?.organ_name || "General Health",
    isArabic
  );

  const nextStep: NextStep = !hasAssessments && !hasReports
    ? {
        tag: isArabic ? "ابدأ هنا" : "Start here",
        label: isArabic ? "ابدأ بأول تقييم صحي" : "Start your first health assessment",
        description: isArabic
          ? "ابدأ بتقييم بسيط لصحة الأعضاء حتى يستطيع OrganHeal بناء أول صورة صحية لك."
          : "Start with a simple organ health assessment so OrganHeal can build your first health picture.",
        href: "/assessment",
        buttonText: isArabic ? "ابدأ التقييم" : "Start Assessment",
      }
    : hasAssessments && !hasReports
    ? {
        tag: isArabic ? "الخطوة التالية" : "Next step",
        label: isArabic ? "ارفع أول تقرير طبي" : "Upload your first medical report",
        description: isArabic
          ? "أضف تقرير مختبر أو تقريرًا طبيًا مكتوبًا حتى تربط التقييمات ببيانات صحية فعلية."
          : "Add a lab result or written medical report to connect your assessment with real health data.",
        href: "/lab-upload",
        buttonText: isArabic ? "ارفع تقريرًا" : "Upload Report",
      }
    : hasReports && !hasSavedIntelligence
    ? {
        tag: isArabic ? "جاهز للذكاء" : "Ready for intelligence",
        label: isArabic ? "ولّد ذكاء التقرير" : "Generate report intelligence",
        description: isArabic
          ? "افتح مركز الذكاء لتحويل تقاريرك إلى ملخص مفهوم للمريض وملخص جاهز للطبيب."
          : "Open the Intelligence Center to turn your reports into a patient-friendly summary and doctor-ready brief.",
        href: "/intelligence",
        buttonText: isArabic ? "افتح مركز الذكاء" : "Open Intelligence",
      }
    : hasSavedIntelligence && !hasCheckIn
    ? {
        tag: isArabic ? "اجعل المتابعة واقعية" : "Make follow-up realistic",
        label: isArabic ? "أكمل أول تحديث صحي" : "Complete your first check-in",
        description: isArabic
          ? "أضف النوم، الضغط النفسي، الطاقة، والمزاج حتى تصبح خطة المتابعة أقرب لحياتك اليومية."
          : "Add sleep, stress, energy, and mood so your follow-up plan becomes closer to your daily life.",
        href: "/checkin",
        buttonText: isArabic ? "افتح التحديث الصحي" : "Open Check-In",
      }
    : {
        tag: isArabic ? "استمر" : "Continue",
        label: isArabic ? "راجع خطة المتابعة" : "Review your health plan",
        description: isArabic
          ? "لديك بيانات كافية لبدء مراجعة الخطة الصحية، المهام، والاتجاهات القادمة."
          : "You have enough data to review your health plan, tasks, and upcoming follow-up direction.",
        href: "/health-plan",
        buttonText: isArabic ? "افتح خطة المتابعة" : "Open Health Plan",
      };

  const overviewCards = [
    {
      label: isArabic ? "التقييمات" : "Assessments",
      value: String(assessments.length),
      detail: latestAssessment
        ? `${localizeOrganName(latestAssessment.organ_name, isArabic)} · ${
            latestAssessment.score
          }/100`
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
            reportStats.latestIntelligenceDate,
            isArabic
          )}`
        : isArabic
        ? "لم يتم التوليد بعد"
        : "Not generated yet",
      href: "/intelligence",
    },
    {
      label: isArabic ? "التحديث الصحي" : "Check-In",
      value: dailyCheckIn ? `${dailyCheckIn.wellness_score}/100` : "N/A",
      detail: dailyCheckIn
        ? `${localizeMood(dailyCheckIn.mood, isArabic)} · ${formatDate(
            dailyCheckIn.created_at,
            isArabic
          )}`
        : isArabic
        ? "لا يوجد تحديث بعد"
        : "No check-in yet",
      href: "/checkin",
    },
  ];

  const commandCards = [
    {
      label: isArabic ? "أولوية اليوم" : "Today priority",
      value: currentPriority,
      note: isArabic
        ? "مبنية على التقييمات والتحديث الصحي."
        : "Based on assessments and latest check-in.",
      href: "/health-plan",
    },
    {
      label: isArabic ? "حالة المتابعة" : "Follow-up status",
      value: hasCheckIn
        ? getStatus(dailyCheckIn?.wellness_score || 0, isArabic)
        : isArabic
        ? "بحاجة تحديث"
        : "Needs check-in",
      note: hasCheckIn
        ? isArabic
          ? "آخر تحديث صحي متصل بالخطة."
          : "Latest check-in is connected to your plan."
        : isArabic
        ? "أكمل تحديثًا صحيًا لجعل الخطة واقعية."
        : "Complete a check-in to make the plan realistic.",
      href: "/checkin",
    },
    {
      label: isArabic ? "جاهزية الرحلة" : "Journey readiness",
      value: `${progressPercent}%`,
      note: isArabic
        ? `${completedSteps} من 4 عناصر أساسية مكتملة.`
        : `${completedSteps} of 4 core elements completed.`,
      href: "/dashboard",
    },
  ];

  const quickActions = [
    {
      title: isArabic ? "التقييم الصحي" : "Assessment",
      text: isArabic ? "تحديث تقييم صحة الأعضاء." : "Update organ health assessment.",
      href: "/assessment",
    },
    {
      title: isArabic ? "التحديث الصحي" : "Check-In",
      text: isArabic ? "أضف حالة اليوم وخلي الخطة واقعية." : "Add today status and keep your plan realistic.",
      href: "/checkin",
    },
    {
      title: isArabic ? "مركز الذكاء" : "Intelligence",
      text: isArabic ? "راجع ملخص المريض وملخص الطبيب." : "Review patient and doctor-ready summaries.",
      href: "/intelligence",
    },
    {
      title: isArabic ? "خطة المتابعة" : "Health Plan",
      text: isArabic ? "راجع المهام وخطة 7/30/90 يوم." : "Review tasks and 7/30/90-day plan.",
      href: "/health-plan",
    },
  ];

  return (
    <main className="smartDashboardPage dashboardCommandCenterPage" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <style>{`
        /* ORGANHEAL_DASHBOARD_VISUAL_POLISH_STEP2 */
        .dashboardCommandCenterPage .dashboardProgressCard strong {
          color: #ffffff !important;
          text-shadow: 0 0 22px rgba(103, 232, 249, 0.35);
        }

        .dashboardCommandCenterPage .dashboardProgressCard p {
          color: #cbd5e1 !important;
          line-height: 1.75;
        }

        .dashboardCommandCenterPage .dashboardProgressCard span {
          color: #67e8f9 !important;
        }

        .dashboardCommandCenterPage .dashboardCommandHero {
          align-items: stretch;
        }

        .dashboardCommandCenterPage .dashboardCommandHero > div:first-child {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .dashboardCommandCenterPage .dashboardCommandCard,
        .dashboardCommandCenterPage .dashboardCommandPanel,
        .dashboardCommandCenterPage .dashboardNextActionPanel {
          color: #0f172a !important;
        }

        .dashboardCommandCenterPage .dashboardCommandCard strong,
        .dashboardCommandCenterPage .dashboardCommandPanel h2,
        .dashboardCommandCenterPage .dashboardNextActionPanel h2,
        .dashboardCommandCenterPage .dashboardSignalGrid strong,
        .dashboardCommandCenterPage .dashboardQuickActionGrid strong {
          color: #0f172a !important;
        }

        .dashboardCommandCenterPage .dashboardCommandCard p,
        .dashboardCommandCenterPage .dashboardCommandPanel p,
        .dashboardCommandCenterPage .dashboardNextActionPanel p,
        .dashboardCommandCenterPage .dashboardSignalGrid p,
        .dashboardCommandCenterPage .dashboardQuickActionGrid p {
          color: #475569 !important;
        }

        .dashboardCommandCenterPage .dashboardScore.good {
          color: #0891b2 !important;
        }

        .dashboardCommandCenterPage .dashboardScore.moderate {
          color: #0f766e !important;
        }

        .dashboardCommandCenterPage .dashboardScore.risk {
          color: #b45309 !important;
        }

        .dashboardCommandCenterPage[dir="rtl"] .dashboardActionRow,
        .dashboardCommandCenterPage[dir="rtl"] .dashboardQuickActionGrid {
          direction: rtl;
        }

        .dashboardCommandCenterPage .dashboardCommandCard {
          min-height: 132px;
        }

        .dashboardCommandCenterPage .dashboardSignalGrid article {
          min-height: 138px;
        }

        .dashboardCommandCenterPage {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(34, 211, 238, 0.2), transparent 35%),
            linear-gradient(180deg, #ecfeff 0%, #f8fafc 45%, #ffffff 100%) !important;
          color: #0f172a;
          padding: 28px 18px 56px;
        }

        .dashboardCommandCenterPage[dir="rtl"] {
          text-align: right;
        }

        .dashboardCommandShell {
          max-width: 1180px;
          margin: 0 auto;
        }

        .dashboardCommandHero,
        .dashboardCommandCard,
        .dashboardCommandPanel,
        .dashboardNextActionPanel {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 28px;
          box-shadow: 0 24px 65px rgba(15, 23, 42, 0.08);
        }

        .dashboardCommandHero {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
          gap: 20px;
          padding: 28px;
          margin-bottom: 22px;
        }

        .dashboardCommandHero h1 {
          font-size: clamp(2.2rem, 5vw, 4rem);
          line-height: 1.15;
          margin: 10px 0 14px;
          color: #0f172a;
        }

        .dashboardCommandHero p {
          color: #475569;
          line-height: 1.85;
          max-width: 780px;
        }

        .dashboardProgressCard {
          background: #020617;
          color: #ffffff;
          border-radius: 24px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 220px;
        }

        .dashboardProgressCard span {
          color: #67e8f9;
          font-weight: 900;
          font-size: 0.82rem;
        }

        .dashboardProgressCard strong {
          font-size: 3.4rem;
          line-height: 1;
          margin: 10px 0;
        }

        .dashboardProgressCard div {
          height: 10px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.16);
          margin: 12px 0;
        }

        .dashboardProgressCard i {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(135deg, #06b6d4, #14b8a6);
        }

        .dashboardCommandGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .dashboardCommandCard {
          padding: 20px;
          text-decoration: none;
          color: inherit;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .dashboardCommandCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 30px 70px rgba(15, 23, 42, 0.11);
        }

        .dashboardCommandCard span,
        .dashboardCommandPanel span,
        .dashboardNextActionPanel span {
          display: block;
          color: #0891b2;
          font-weight: 900;
          font-size: 0.78rem;
          margin-bottom: 8px;
        }

        .dashboardCommandCard strong {
          display: block;
          font-size: 1.8rem;
          color: #0f172a;
          line-height: 1.2;
        }

        .dashboardCommandCard p {
          color: #475569;
          line-height: 1.65;
          margin: 8px 0 0;
        }

        .dashboardCommandLayout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
          gap: 20px;
          align-items: start;
        }

        .dashboardCommandPanel,
        .dashboardNextActionPanel {
          padding: 24px;
        }

        .dashboardCommandPanel h2,
        .dashboardNextActionPanel h2 {
          margin: 8px 0 10px;
          font-size: clamp(1.7rem, 3vw, 2.5rem);
          color: #0f172a;
        }

        .dashboardCommandPanel p,
        .dashboardNextActionPanel p {
          color: #475569;
          line-height: 1.8;
        }

        .dashboardSignalGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .dashboardSignalGrid article,
        .dashboardQuickActionGrid a {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 18px;
          padding: 16px;
        }

        .dashboardSignalGrid strong {
          display: block;
          color: #0f172a;
          font-size: 1.05rem;
          line-height: 1.45;
        }

        .dashboardQuickActionGrid {
          display: grid;
          gap: 12px;
          margin-top: 16px;
        }

        .dashboardQuickActionGrid a {
          display: block;
          text-decoration: none;
          color: inherit;
        }

        .dashboardQuickActionGrid strong {
          display: block;
          color: #0f172a;
          font-size: 1.05rem;
        }

        .dashboardActionRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }

        .dashboardActionRow a {
          border-radius: 999px;
          padding: 11px 16px;
          font-weight: 900;
          text-decoration: none;
        }

        .dashboardPrimaryAction {
          background: linear-gradient(135deg, #06b6d4, #14b8a6);
          color: #ffffff;
          box-shadow: 0 18px 38px rgba(20, 184, 166, 0.24);
        }

        .dashboardSecondaryAction {
          background: #ffffff;
          color: #0f766e;
          border: 1px solid #99f6e4;
        }

        .dashboardErrorBox {
          padding: 18px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 18px;
          color: #9a3412;
          margin-bottom: 18px;
        }

        @media (max-width: 980px) {
          .dashboardCommandHero,
          .dashboardCommandLayout {
            grid-template-columns: 1fr;
          }

          .dashboardCommandGrid,
          .dashboardSignalGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .dashboardCommandGrid,
          .dashboardSignalGrid {
            grid-template-columns: 1fr;
          }

          .dashboardCommandHero,
          .dashboardCommandPanel,
          .dashboardNextActionPanel {
            padding: 20px;
            border-radius: 22px;
          }
        }
      `}</style>

      <div className="dashboardCommandShell">
        <section className="dashboardCommandHero">
          <div>
            <p className="launchEyebrow">
              {isArabic ? "مركز قيادة الصحة الشخصية" : "Personal Health Command Center"}
            </p>

            <h1>
              {isArabic ? `مرحبًا، ${username}` : `Welcome, ${username}`}
            </h1>

            <p>
              {isArabic
                ? "هذه الصفحة تجمع التقييمات، التحديث الصحي، التقارير، الذكاء الصحي، وخطة المتابعة في مكان واحد لتعرف خطوتك التالية بوضوح."
                : "This page connects assessments, check-ins, reports, intelligence, and your follow-up plan in one command center."}
            </p>
          </div>

          <div className="dashboardProgressCard">
            <span>{isArabic ? "جاهزية الرحلة الصحية" : "Health journey readiness"}</span>
            <strong>{progressPercent}%</strong>
            <div>
              <i style={{ width: `${progressPercent}%` }} />
            </div>
            <p>
              {isArabic
                ? `${completedSteps} من 4 عناصر أساسية مكتملة.`
                : `${completedSteps} of 4 core elements completed.`}
            </p>
          </div>
        </section>

        {message && <div className="dashboardErrorBox">{message}</div>}

        {loading ? (
          <section className="dashboardCommandPanel">
            <span>{isArabic ? "تحميل" : "Loading"}</span>
            <h2>
              {isArabic
                ? "جاري تجهيز لوحة القيادة الصحية..."
                : "Preparing your health command center..."}
            </h2>
          </section>
        ) : (
          <>
            <section className="dashboardCommandGrid">
              {overviewCards.map((card) => (
                <Link href={card.href} key={card.label} className="dashboardCommandCard">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <p>{card.detail}</p>
                </Link>
              ))}
            </section>

            <section className="dashboardCommandLayout">
              <div className="dashboardCommandPanel">
                <span>{isArabic ? "ملخص الذكاء الصحي" : "Health intelligence snapshot"}</span>

                <h2>
                  {hasAssessments || hasCheckIn
                    ? `${intelligence.overallScore}/100`
                    : hasReports
                    ? isArabic
                      ? "التقارير جاهزة"
                      : "Reports ready"
                    : isArabic
                    ? "ابدأ رحلتك الصحية"
                    : "Start your health journey"}
                </h2>

                {(hasAssessments || hasCheckIn) && (
                  <strong className={`dashboardScore ${getScoreClass(intelligence.overallScore)}`}>
                    {getStatus(intelligence.overallScore, isArabic)}
                  </strong>
                )}

                <p>
                  {hasAssessments || hasCheckIn
                    ? isArabic
                      ? `منطقة الأولوية الحالية: ${currentPriority}.`
                      : `Current priority area: ${currentPriority}.`
                    : hasReports
                    ? isArabic
                      ? "لديك تقارير محفوظة. الخطوة التالية هي توليد ذكاء التقرير أو إضافة تقييم صحي."
                      : "You have saved reports. The next step is to generate report intelligence or add a health assessment."
                    : isArabic
                    ? "ابدأ بتقييم صحي أو ارفع تقريرًا طبيًا حتى يبدأ OrganHeal ببناء الصورة الصحية."
                    : "Start with an assessment or upload a report so OrganHeal can build your health picture."}
                </p>

                <div className="dashboardSignalGrid">
                  {commandCards.map((card) => (
                    <article key={card.label}>
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                      <p>{card.note}</p>
                    </article>
                  ))}
                </div>

                <div className="dashboardActionRow">
                  <Link href="/intelligence" className="dashboardPrimaryAction">
                    {isArabic ? "مركز الذكاء" : "Intelligence Center"}
                  </Link>

                  <Link href="/health-plan" className="dashboardSecondaryAction">
                    {isArabic ? "خطة المتابعة" : "Health Plan"}
                  </Link>
                </div>
              </div>

              <aside className="dashboardNextActionPanel">
                <span>{nextStep.tag}</span>
                <h2>{nextStep.label}</h2>
                <p>{nextStep.description}</p>

                <div className="dashboardActionRow">
                  <Link href={nextStep.href} className="dashboardPrimaryAction">
                    {nextStep.buttonText}
                  </Link>
                </div>

                <div className="dashboardQuickActionGrid">
                  {quickActions.map((action) => (
                    <Link href={action.href} key={action.title}>
                      <strong>{action.title}</strong>
                      <p>{action.text}</p>
                    </Link>
                  ))}
                </div>
              </aside>
            </section>

            {!hasAnyData && (
              <section className="dashboardCommandPanel" style={{ marginTop: "20px" }}>
                <span>{isArabic ? "بداية جديدة" : "Fresh start"}</span>
                <h2>
                  {isArabic
                    ? "ابدأ بثلاث خطوات بسيطة"
                    : "Start with three simple steps"}
                </h2>
                <p>
                  {isArabic
                    ? "ابدأ بتقييم صحي، ارفع تقريرًا إن وجد، ثم استخدم مركز الذكاء لتكوين ملخص واضح."
                    : "Start with an assessment, upload a report if available, then use Intelligence Center to create a clear summary."}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

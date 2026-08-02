"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getDashboardSummary } from "@/lib/services/dashboard/dashboard.service";
import DashboardIntelligenceCard from "@/app/components/dashboard/DashboardIntelligenceCard";
import HealthDirectionCard from "@/app/components/health-intelligence/HealthDirectionCard";
import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";
import HealthEvidenceCard from "@/app/components/health-intelligence/HealthEvidenceCard";
import RecommendedKnowledgeCard from "@/app/components/health-intelligence/RecommendedKnowledgeCard";

import type { PersonalizedKnowledgeRecommendations } from "@/lib/services/knowledge/knowledge-recommendation.service";
import DashboardTimelinePreview from "@/app/components/health-intelligence/DashboardTimelinePreview";
import DashboardHeroIntelligence from "@/app/components/dashboard/DashboardHeroIntelligence";

import type {
  DashboardIntelligenceViewModel,
} from "@/lib/application/dashboard/dashboard-intelligence.view-model";
import DashboardJourneySection from "@/app/components/dashboard/DashboardJourneySection";
import DashboardNextActionSection from "@/app/components/dashboard/DashboardNextActionSection";
import DashboardOverviewSection from "@/app/components/dashboard/DashboardOverviewSection";
import {
  buildDashboardViewState,
} from "@/app/components/dashboard/dashboard-view-state";

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
  const [
    dashboardIntelligence,
    setDashboardIntelligence,
  ] = useState<
    DashboardIntelligenceViewModel | null
  >(null);

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
  setDashboardIntelligence(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      window.location.href = "/login";
      return;
    }

    const user = userData.user;

   try {
  const dashboardSummary = await getDashboardSummary(user.id);

  setUsername(dashboardSummary.profile?.username || user.email || "User");
  setAssessments(dashboardSummary.assessments as Assessment[]);
  setDailyCheckIn(dashboardSummary.latestCheckIn as DailyCheckIn | null);
  setReportStats(dashboardSummary.reportStats);
    try {
    const decisionResponse =
      await fetch(
        "/api/dashboard-decision",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            userId:
              user.id,

            patient:
              dashboardSummary
                .patientSummary,

            language:
              getStoredLanguage(),

            audience:
              "general",
          }),
        }
      );

    if (!decisionResponse.ok) {
      const errorPayload =
        (await decisionResponse
          .json()
          .catch(() => null)) as
          | {
              error?: string;
            }
          | null;

      throw new Error(
        errorPayload?.error ||
          "Could not load dashboard intelligence."
      );
    }

    const dashboardDecision =
      (await decisionResponse.json()) as {
        dashboardIntelligence:
          DashboardIntelligenceViewModel | null;
      };

    setDashboardIntelligence(
      dashboardDecision
        .dashboardIntelligence
    );
  } catch (decisionError) {
    console.error(
      "Could not load Dashboard Intelligence:",
      decisionError
    );

    setDashboardIntelligence(null);
  }
  const intelligence =
  dashboardSummary.healthIntelligence;

setHealthIntelligence(intelligence);
setKnowledgeRecommendations(null);

try {
  const knowledgeResponse = await fetch(
    "/api/knowledge-recommendations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intelligence,
        language:
          getStoredLanguage() === "ar"
            ? "ar"
            : "en",
      }),
    }
  );

  if (knowledgeResponse.ok) {
    const recommendations =
      (await knowledgeResponse.json()) as PersonalizedKnowledgeRecommendations;

    setKnowledgeRecommendations(recommendations);
  }
} catch (knowledgeError) {
  console.error(
    "Could not load knowledge recommendations:",
    knowledgeError
  );

  setKnowledgeRecommendations(null);
}
} catch (error) {
  setMessage(
    error instanceof Error ? "Database error: " + error.message : "Database error"
  );
  setLoading(false);
  return;
}

    setLoading(false);
  }

  const hasAssessments = assessments.length > 0;
  const hasReports = reportStats.uploadedReports > 0;
  const hasSavedIntelligence = reportStats.savedIntelligence > 0;
  const hasCheckIn = Boolean(dailyCheckIn);
  const hasAnyData =
    hasAssessments || hasReports || hasSavedIntelligence || hasCheckIn;
const [healthIntelligence, setHealthIntelligence] =
  useState<HealthIntelligenceResult | null>(null);
  const [
  knowledgeRecommendations,
  setKnowledgeRecommendations,
] = useState<PersonalizedKnowledgeRecommendations | null>(null);

  const latestAssessment = assessments[0] || null;

  const completedSteps = [
    hasAssessments,
    hasReports,
    hasSavedIntelligence,
    hasCheckIn,
  ].filter(Boolean).length;

  const progressPercent = Math.round((completedSteps / 4) * 100);

 const currentPriority = localizeOrganName(
  healthIntelligence?.priority.data.priorityOrgan||
    latestAssessment?.organ_name ||
    "General Health",
  isArabic
);


const dashboardHealthScore =
  healthIntelligence?.healthScore.data.score ?? null;

const dashboardTrendSummary =
  healthIntelligence?.trendSummary.data;

const dashboardTrendConfidence =
  healthIntelligence?.trendSummary.confidence;

const dashboardEvidence =
  healthIntelligence?.evidence.data;

const dashboardEvidenceConfidence =
  healthIntelligence?.evidence.confidence;

const dashboardTimeline =
  healthIntelligence?.timeline.data;

const dashboardTimelineConfidence =
  healthIntelligence?.timeline.confidence;

const dashboardActionSummary =
  healthIntelligence?.risk.data.recommendation;

const dashboardFindings =
  healthIntelligence?.findings ?? [];
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
        tag: isArabic ? "جاهز للتحليل" : "Ready for analysis",
        label: isArabic ? "حلّل التقرير" : "Analyze report",
        description: isArabic
          ? "افتح مكتبة التقارير لتحويل تقاريرك إلى ملخص مفهوم للمريض وملخص جاهز للطبيب."
          : "Open the Reports Library to turn your reports into a patient-friendly summary and doctor-ready brief.",
        href: "/reports",
        buttonText: isArabic ? "افتح مكتبة التقارير" : "Review Analysis",
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
      label: isArabic ? "التحليل المحفوظ" : "Saved Analysis",
      value: String(reportStats.savedIntelligence),
      detail: hasSavedIntelligence
        ? `${isArabic ? "آخر نتيجة" : "Latest"}: ${formatDate(
            reportStats.latestIntelligenceDate,
            isArabic
          )}`
        : isArabic
        ? "لم يتم التوليد بعد"
        : "Not generated yet",
      href: "/reports",
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
      title: isArabic ? "مكتبة التقارير" : "Analysis",
      text: isArabic ? "راجع ملخص المريض وملخص الطبيب." : "Review patient and doctor-ready summaries.",
      href: "/reports",
    },
    {
      title: isArabic ? "خطة المتابعة" : "Health Plan",
      text: isArabic ? "راجع المهام وخطة 7/30/90 يوم." : "Review tasks and 7/30/90-day plan.",
      href: "/health-plan",
    },
  ];
  const dashboardViewState =
    buildDashboardViewState({
      isArabic,

      dashboardIntelligence,

      healthScore:
        dashboardHealthScore,

      trendSummary:
        dashboardTrendSummary,

      trendConfidence:
        dashboardTrendConfidence,


      evidence:
        dashboardEvidence,

      evidenceConfidence:
        dashboardEvidenceConfidence,


      timeline:
        dashboardTimeline,

      timelineConfidence:
        dashboardTimelineConfidence,


      findings:
        dashboardFindings,

      actionSummary:
        dashboardActionSummary,

      journey: {
        nextStep: {
          label:
            nextStep.label,

          href:
            nextStep.href,
        },

        hasAssessments,
        hasReports,
        hasSavedIntelligence,
        hasCheckIn,
      },

      nextAction: {
        nextStep,
        progressPercent,
        completedSteps,
        currentPriority,
      },

      overview: {
        cards:
          overviewCards,
      },
    });
  return (
    <main className="smartDashboardPage dashboardCommandCenterPage" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      {dashboardViewState.hero && (
  <DashboardHeroIntelligence
    {...dashboardViewState.hero}
  />
)}
      <style>{`
      /* ORGANHEAL_TODAYS_ACTIONS_V1 */
.dashboardTodayActions {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.dashboardTodayAction {
  min-height: 86px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  border-radius: 18px;
  text-decoration: none;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.dashboardTodayAction span {
  display: block;
  margin: 0;
  font-size: 0.98rem;
  font-weight: 950;
  line-height: 1.35;
}

.dashboardTodayAction small {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
}

.dashboardTodayActionPrimary {
  color: #042f2e;
  background:
    linear-gradient(
      135deg,
      #67e8f9,
      #2dd4bf
    );
  border: 1px solid
    rgba(13, 148, 136, 0.28);
  box-shadow:
    0 14px 30px
    rgba(45, 212, 191, 0.22);
}

.dashboardTodayActionPrimary small {
  color: #115e59;
}

.dashboardTodayActionSecondary {
  color: #0f766e;
  background: #ffffff;
  border: 1px solid
    rgba(15, 118, 110, 0.28);
}

.dashboardTodayActionSecondary small {
  color: #64748b;
}

.dashboardTodayActionPrimary:hover,
.dashboardTodayActionSecondary:hover {
  transform: translateY(-2px);
  box-shadow:
    0 18px 36px
    rgba(15, 23, 42, 0.1);
}

.dashboardTodayActionDisabled {
  color: #64748b;
  background: #f1f5f9;
  border: 1px dashed #cbd5e1;
  cursor: not-allowed;
}

.dashboardTodayActionDisabled small {
  color: #94a3b8;
}

.dashboardCommandCenterPage[dir="rtl"]
.dashboardTodayActions {
  direction: rtl;
}

@media (max-width: 760px) {
  .dashboardTodayActions {
    grid-template-columns: 1fr;
  }

  .dashboardTodayAction {
    min-height: 76px;
  }
}
      /* ORGANHEAL_DASHBOARD_INTELLIGENCE_HERO_V1 */
.dashboardIntelligenceHero {
  max-width: 1180px;
  margin: 0 auto 22px;
  padding: 28px;
  display: grid;
  grid-template-columns:
    minmax(0, 1.25fr)
    minmax(300px, 0.75fr);
  gap: 22px;
  align-items: stretch;
  border-radius: 30px;
  overflow: hidden;
  color: #ffffff;
  background:
    radial-gradient(
      circle at 92% 8%,
      rgba(45, 212, 191, 0.28),
      transparent 34%
    ),
    linear-gradient(
      135deg,
      #020617 0%,
      #0f172a 52%,
      #115e59 100%
    );
  border: 1px solid
    rgba(255, 255, 255, 0.14);
  box-shadow:
    0 30px 80px
    rgba(15, 23, 42, 0.26);
}

/* ORGANHEAL_DASHBOARD_COMPACT_WELCOME_V1 */
.dashboardWelcomeStrip {
  max-width: 1180px;
  margin: 0 auto 22px;
  padding: 20px 24px;
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    minmax(420px, 0.85fr);
  gap: 24px;
  align-items: center;
  border-radius: 24px;
  background:
    rgba(255, 255, 255, 0.94);
  border: 1px solid
    rgba(15, 118, 110, 0.18);
  box-shadow:
    0 18px 50px
    rgba(15, 23, 42, 0.08);
}

.dashboardWelcomeIdentity > span {
  display: block;
  color: #0891b2;
  font-size: 0.74rem;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.dashboardWelcomeIdentity h1 {
  margin: 7px 0 5px;
  color: #0f172a;
  font-size:
    clamp(1.45rem, 3vw, 2.15rem);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.dashboardWelcomeIdentity p {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.dashboardWelcomeMetrics {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.dashboardWelcomeMetrics article {
  min-width: 0;
  padding: 14px;
  border-radius: 17px;
  background: #f8fafc;
  border: 1px solid
    rgba(148, 163, 184, 0.18);
}

.dashboardWelcomeMetrics span {
  display: block;
  color: #64748b;
  font-size: 0.71rem;
  font-weight: 800;
}

.dashboardWelcomeMetrics strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 1.1rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.dashboardCommandCenterPage[dir="rtl"]
.dashboardWelcomeStrip {
  direction: rtl;
  text-align: right;
}

@media (max-width: 900px) {
  .dashboardWelcomeStrip {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .dashboardWelcomeStrip {
    padding: 18px;
    border-radius: 20px;
  }

  .dashboardWelcomeMetrics {
    grid-template-columns: 1fr;
  }
}

.dashboardIntelligenceHeroContent {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.dashboardIntelligenceHeroKicker {
  display: inline-flex;
  width: fit-content;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  color: #67e8f9;
  background:
    rgba(8, 145, 178, 0.14);
  border: 1px solid
    rgba(103, 232, 249, 0.24);
  font-size: 0.76rem;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dashboardIntelligenceHero h2 {
  max-width: 820px;
  margin: 0;
  color: #ffffff;
  font-size:
    clamp(2rem, 4.5vw, 3.7rem);
  line-height: 1.08;
}

.dashboardIntelligenceHeroNarrative {
  max-width: 850px;
  margin: 16px 0 0;
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1.8;
}

.dashboardIntelligenceHeroSignals {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.dashboardIntelligenceHeroSignals article {
  min-width: 0;
  padding: 16px;
  border-radius: 18px;
  background:
    rgba(255, 255, 255, 0.07);
  border: 1px solid
    rgba(255, 255, 255, 0.12);
}

.dashboardIntelligenceHeroSignals span,
.dashboardIntelligenceHeroSignals small {
  display: block;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 800;
}

.dashboardIntelligenceHeroSignals strong {
  display: block;
  margin: 7px 0 4px;
  color: #ffffff;
  font-size: 1.15rem;
  overflow-wrap: anywhere;
}

.dashboardIntelligenceDecision {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px;
  border-radius: 24px;
  color: #0f172a;
  background:
    rgba(255, 255, 255, 0.96);
  box-shadow:
    0 20px 50px
    rgba(2, 6, 23, 0.18);
}

.dashboardIntelligenceDecisionUrgency {
  display: inline-flex;
  width: fit-content;
  margin-bottom: 14px;
  padding: 7px 11px;
  border-radius: 999px;
  color: #0f766e;
  background: #ccfbf1;
  font-size: 0.74rem;
  font-weight: 900;
}

.dashboardIntelligenceDecisionLabel {
  margin: 0;
  color: #0891b2;
  font-size: 0.76rem;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.dashboardIntelligenceDecision h3 {
  margin: 9px 0 10px;
  color: #0f172a;
  font-size:
    clamp(1.5rem, 3vw, 2.15rem);
  line-height: 1.18;
}

.dashboardIntelligenceDecision > p:not(
  .dashboardIntelligenceDecisionLabel
) {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.dashboardIntelligenceDecisionAction {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin-top: 20px;
  padding: 12px 17px;
  border-radius: 999px;
  color: #042f2e;
  background:
    linear-gradient(
      135deg,
      #67e8f9,
      #2dd4bf
    );
  font-weight: 950;
  text-decoration: none;
  box-shadow:
    0 14px 32px
    rgba(45, 212, 191, 0.26);
}

.dashboardIntelligenceDecisionAction:hover {
  transform: translateY(-1px);
}

.dashboardCommandCenterPage[dir="rtl"]
.dashboardIntelligenceHero {
  direction: rtl;
  text-align: right;
}

@media (max-width: 980px) {
  .dashboardIntelligenceHero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .dashboardIntelligenceHero {
    padding: 18px;
    border-radius: 24px;
  }

  .dashboardIntelligenceHeroSignals {
    grid-template-columns: 1fr;
  }

  .dashboardIntelligenceDecision {
    padding: 20px;
    border-radius: 20px;
  }
}
        /* ORGANHEAL_DASHBOARD_FLOW_ALIGNMENT_V1 */
.dashboardBadge {
  display: inline-flex !important;
  align-items: center;
  border-radius: 999px;
  padding: 8px 14px;
  background: #ecfeff;
  color: #0f766e !important;
  border: 1px solid #99f6e4;
  font-weight: 900;
  font-size: 0.85rem;
}
  /* ORGANHEAL_DASHBOARD_TYPOGRAPHY_AUDIT_V1 */
.dashboardSectionTitle,
.healthDirectionTitle,
.healthEvidenceHeader h2,
.dashboardTimelinePreviewHeader h2,
.healthCommandCenterHeader h2,
.dashboardNextActionCompact h2,
.dashboardIntelligenceCard h2 {
  font-size:
    clamp(1.35rem, 2.4vw, 1.9rem);
  line-height: 1.22;
  letter-spacing: -0.015em;
}

.dashboardSectionDescription,
.healthDirectionDescription,
.healthEvidenceHeader p,
.dashboardTimelinePreviewHeader p,
.healthCommandCenterHeader p,
.dashboardNextActionCompactMain p {
  font-size: 0.95rem;
  line-height: 1.65;
}

.dashboardSectionEyebrow,
.healthDirectionKicker,
.healthEvidenceKicker,
.dashboardTimelinePreviewKicker,
.healthCommandCenterKicker,
.dashboardNextActionCompactEyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.075em;
}

.dashboardCommandCenterPage h2 {
  text-wrap: balance;
}

.dashboardCommandCenterPage p {
  text-wrap: pretty;
}

        .dashboardCommandCenterPage .dashboardCommandHero {
          background:
            radial-gradient(circle at 88% 10%, rgba(20, 184, 166, 0.36), transparent 34%),
            linear-gradient(135deg, #061826 0%, #0f172a 42%, #0f766e 100%) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          box-shadow: 0 34px 90px rgba(15, 23, 42, 0.30) !important;
        }

        .dashboardCommandCenterPage .dashboardCommandHero h1,
        .dashboardCommandCenterPage .dashboardCommandHero p,
        .dashboardCommandCenterPage .dashboardCommandHero span {
          color: #ffffff !important;
        }

        .dashboardCommandCenterPage .dashboardCommandCard {
          border-top: 6px solid #0f766e !important;
          box-shadow: 0 22px 56px rgba(15, 23, 42, 0.12) !important;
        }

        .dashboardCommandCenterPage .dashboardCommandGrid .dashboardCommandCard:nth-child(1) {
          border-top-color: #2563eb !important;
        }

        .dashboardCommandCenterPage .dashboardCommandGrid .dashboardCommandCard:nth-child(2) {
          border-top-color: #0f766e !important;
        }

        .dashboardCommandCenterPage .dashboardCommandGrid .dashboardCommandCard:nth-child(3) {
          border-top-color: #059669 !important;
        }

        .dashboardCommandCenterPage .dashboardCommandGrid .dashboardCommandCard:nth-child(4) {
          border-top-color: #d97706 !important;
        }

        .dashboardCommandCenterPage .dashboardPrimaryAction {
          background: linear-gradient(135deg, #06b6d4, #14b8a6) !important;
          color: #061826 !important;
          font-weight: 950 !important;
          box-shadow: 0 16px 40px rgba(6, 182, 212, 0.32) !important;
        }

        .dashboardCommandCenterPage .dashboardSecondaryAction {
          background: #ffffff !important;
          color: #0f766e !important;
          border: 1px solid rgba(15, 118, 110, 0.28) !important;
          font-weight: 950 !important;
        }
.dashboardSection {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 28px;
  box-shadow: 0 24px 65px rgba(15, 23, 42, 0.08);
  padding: 24px;
  margin-bottom: 22px;
}

.dashboardSectionHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.dashboardSectionEyebrow {
  display: block;
  color: #0891b2;
  font-size: 0.76rem;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dashboardSectionTitle {
  color: #0f172a;
  margin: 8px 0 10px;
  font-size: clamp(1.7rem, 3vw, 2.5rem);
}

.dashboardSectionDescription {
  color: #475569;
  line-height: 1.8;
  margin: 0;
  max-width: 760px;
}

.dashboardSectionAction {
  flex-shrink: 0;
}

.dashboardSectionContent {
  width: 100%;
}

@media (max-width: 620px) {
  .dashboardSection {
    padding: 20px;
    border-radius: 22px;
  }

  .dashboardSectionHeader {
    display: block;
  }

  .dashboardSectionAction {
    margin-top: 12px;
  }
}
        .dashboardCommandCenterPage .dashboardJourneyPanel {
          border-top: 7px solid #0f766e !important;
        }

        /* ORGANHEAL_DASHBOARD_JOURNEY_TIMELINE_STEP3 */
        .dashboardJourneyPanel {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 28px;
          box-shadow: 0 24px 65px rgba(15, 23, 42, 0.08);
          padding: 24px;
          margin-bottom: 22px;
        }
/* ORGANHEAL_DASHBOARD_SECTION_SPACING_V1 */
.dashboardCommandShell > * {
  margin-top: 0;
}

.dashboardCommandShell > * + * {
  margin-top: 18px;
}

.dashboardSection,
.dashboardIntelligenceHero,
.dashboardWelcomeStrip,
.dashboardNextActionCompact,
.dashboardIntelligenceCard,
.healthIntelligenceCommandCenter {
  margin-bottom: 0 !important;
}

.healthCommandCenterStack {
  gap: 14px;
}

.dashboardOverviewPanel
.dashboardSectionContent {
  margin-top: 2px;
}

@media (max-width: 620px) {
  .dashboardCommandShell > * + * {
    margin-top: 14px;
  }

  .healthCommandCenterStack {
    gap: 12px;
  }
}
        .dashboardJourneyHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .dashboardJourneyHeader h2 {
          color: #0f172a;
          margin: 8px 0 10px;
          font-size: clamp(1.7rem, 3vw, 2.5rem);
        }

        .dashboardJourneyHeader p {
          color: #475569;
          line-height: 1.8;
          margin: 0;
          max-width: 760px;
        }

        .dashboardJourneyNext {
          border: 1px solid #99f6e4;
          background: #ecfeff;
          color: #0f766e;
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 900;
          white-space: nowrap;
          text-decoration: none;
        }

        .dashboardJourneyTimeline {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }

        .dashboardJourneyStep {
          position: relative;
          display: block;
          text-decoration: none;
          color: inherit;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 20px;
          padding: 16px;
          min-height: 170px;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .dashboardJourneyStep:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
          border-color: #99f6e4;
        }

        .dashboardJourneyStep.ready {
          background: linear-gradient(135deg, #ecfeff, #ffffff);
          border-color: #99f6e4;
        }

        .dashboardJourneyStep.pending {
          background: #ffffff;
          border-color: #e2e8f0;
        }

        .dashboardJourneyNumber {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-weight: 900;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .dashboardJourneyStep.ready .dashboardJourneyNumber {
          background: #ccfbf1;
          color: #0f766e;
          border-color: #99f6e4;
        }

        .dashboardJourneyStep strong {
          display: block;
          color: #0f172a;
          font-size: 1rem;
          line-height: 1.4;
          margin-bottom: 8px;
        }

        .dashboardJourneyStep p {
          color: #475569;
          line-height: 1.65;
          margin: 0;
          font-size: 0.92rem;
        }

        .dashboardJourneyStatus {
          display: inline-flex;
          margin-top: 12px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 0.75rem;
          font-weight: 900;
          background: #f1f5f9;
          color: #475569;
        }

        .dashboardJourneyStep.ready .dashboardJourneyStatus {
          background: #dcfce7;
          color: #166534;
        }

        .dashboardCommandCenterPage[dir="rtl"] .dashboardJourneyHeader {
          direction: rtl;
        }
.healthDirectionCard {
  margin-bottom: 22px;
  padding: 26px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 24px 65px rgba(15, 23, 42, 0.07);
}

.healthDirectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 22px;
}

.healthDirectionKicker {
  color: #0891b2;
  font-size: 0.76rem;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.healthDirectionTitle {
  margin: 9px 0 8px;
  color: #0f172a;
  font-size: clamp(1.45rem, 3vw, 2rem);
  line-height: 1.15;
}

.healthDirectionDescription {
  max-width: 780px;
  margin: 0;
  color: #64748b;
  font-weight: 650;
  line-height: 1.65;
}

.healthDirectionStatus {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  padding: 11px 16px;
  border-radius: 999px;
  font-weight: 950;
}

.healthDirectionStatus.improving {
  color: #047857;
  background: #ecfdf5;
}

.healthDirectionStatus.worsening {
  color: #b91c1c;
  background: #fef2f2;
}

.healthDirectionStatus.stable {
  color: #0369a1;
  background: #f0f9ff;
}

.healthDirectionStatus.insufficient-data {
  color: #92400e;
  background: #fffbeb;
}

.healthDirectionMetrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 22px;
}

.healthDirectionMetrics article {
  padding: 18px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.healthDirectionMetrics span,
.healthDirectionMetrics small {
  display: block;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 800;
}

.healthDirectionMetrics strong {
  display: block;
  margin: 8px 0 5px;
  color: #0f172a;
  font-size: 1.3rem;
  font-weight: 950;
}

.healthDirectionSignals {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.healthDirectionSignalsHeader {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: #0f172a;
}

.healthDirectionSignalsHeader span {
  color: #64748b;
  font-size: 0.84rem;
  font-weight: 750;
}

.healthDirectionSignalList {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.healthDirectionSignal {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  background: #f8fafc;
  border-inline-start: 5px solid #0284c7;
}

.healthDirectionSignal.improving {
  border-inline-start-color: #059669;
}

.healthDirectionSignal.worsening {
  border-inline-start-color: #dc2626;
}

.healthDirectionSignal.stable {
  border-inline-start-color: #0284c7;
}

.healthDirectionSignal > div > span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 750;
}

.healthDirectionSignalValue {
  text-align: end;
}

.healthDirectionSignalValue strong {
  color: #0f172a;
  font-size: 1.1rem;
}

.healthDirectionSignalValue span {
  color: #64748b;
  font-size: 0.78rem;
}
  .primaryPatternCard {
  margin-bottom: 22px;
  padding: 24px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 22px 58px rgba(15, 23, 42, 0.06);
  border-inline-start: 6px solid #64748b;
}

.primaryPatternCard.critical {
  border-inline-start-color: #dc2626;
}

.primaryPatternCard.high {
  border-inline-start-color: #ea580c;
}

.primaryPatternCard.moderate {
  border-inline-start-color: #d97706;
}

.primaryPatternCard.informational {
  border-inline-start-color: #0891b2;
}

.primaryPatternCard.empty {
  border-inline-start-color: #94a3b8;
}

.primaryPatternHeader {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.primaryPatternKicker {
  color: #0891b2;
  font-size: 0.76rem;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.primaryPatternCard h2 {
  margin: 9px 0 0;
  color: #0f172a;
  font-size: clamp(1.35rem, 2.5vw, 1.85rem);
  line-height: 1.2;
}

.primaryPatternBadge {
  flex-shrink: 0;
  padding: 9px 13px;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.78rem;
  font-weight: 950;
}

.primaryPatternDescription {
  margin: 14px 0 0;
  color: #64748b;
  font-weight: 650;
  line-height: 1.65;
}

.primaryPatternMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.primaryPatternMeta span {
  padding: 8px 11px;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 850;
}

.primaryPatternAction {
  margin-top: 18px;
  padding: 16px;
  border-radius: 18px;
  background: #f8fafc;
}

.primaryPatternAction strong {
  color: #0f172a;
  font-size: 0.82rem;
}

.primaryPatternAction p {
  margin: 5px 0 0;
  color: #475569;
  line-height: 1.55;
}

.healthIntelligenceCommandCenter {
  margin-bottom: 24px;
  padding: 24px;
  border-radius: 32px;
  background:
    linear-gradient(
      145deg,
      rgba(239, 246, 255, 0.92),
      rgba(240, 253, 250, 0.9)
    );
  border: 1px solid rgba(14, 116, 144, 0.15);
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.08);
}

.healthCommandCenterHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 20px;
  padding: 4px 4px 20px;
  border-bottom: 1px solid rgba(14, 116, 144, 0.14);
}

.healthCommandCenterKicker {
  display: block;
  color: #0e7490;
  font-size: 0.76rem;
  font-weight: 950;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.healthCommandCenterHeader h2 {
  max-width: 760px;
  margin: 9px 0 8px;
  color: #0f172a;
  font-size: clamp(1.45rem, 3vw, 2rem);
  line-height: 1.2;
}

.healthCommandCenterHeader p {
  max-width: 780px;
  margin: 0;
  color: #64748b;
  font-weight: 650;
  line-height: 1.65;
}

.healthCommandCenterBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 90px;
  padding: 13px 16px;
  border-radius: 18px;
  background: #ffffff;
  color: #0f766e;
  border: 1px solid rgba(15, 118, 110, 0.16);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
  font-size: 1.1rem;
  font-weight: 950;
}

.healthCommandCenterStack {
  display: grid;
  gap: 16px;
}

.healthCommandCenterStack > .healthDirectionCard,
.healthCommandCenterStack > .primaryPatternCard {
  margin-bottom: 0;
}

.healthCommandCenterNextAction {
  margin: 0;
  box-shadow: none;
  border: 1px solid rgba(15, 118, 110, 0.18);
  background: rgba(255, 255, 255, 0.96);
}

.healthEvidenceCard {
  padding: 24px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(14, 116, 144, 0.16);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.05);
}

.healthEvidenceHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 22px;
}

.healthEvidenceKicker {
  color: #0e7490;
  font-size: 0.76rem;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.healthEvidenceHeader h2 {
  margin: 9px 0 8px;
  color: #0f172a;
  font-size: clamp(1.3rem, 2.5vw, 1.8rem);
  line-height: 1.2;
}

.healthEvidenceHeader p {
  max-width: 760px;
  margin: 0;
  color: #64748b;
  font-weight: 650;
  line-height: 1.65;
}

.healthEvidenceConfidence {
  flex-shrink: 0;
  min-width: 100px;
  padding: 13px 16px;
  border-radius: 18px;
  background: #ecfeff;
  text-align: center;
}

.healthEvidenceConfidence span {
  display: block;
  color: #0e7490;
  font-size: 0.72rem;
  font-weight: 850;
}

.healthEvidenceConfidence strong {
  display: block;
  margin-top: 5px;
  color: #0f172a;
  font-size: 1.25rem;
}

.healthEvidenceMetrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.healthEvidenceMetrics article {
  padding: 15px;
  border-radius: 17px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.healthEvidenceMetrics span {
  display: block;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 800;
}

.healthEvidenceMetrics strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 1.2rem;
}

.healthEvidenceList {
  display: grid;
  gap: 10px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.healthEvidenceListHeader {
  margin-bottom: 3px;
  color: #0f172a;
}

.healthEvidenceItem {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 17px;
  background: #f8fafc;
}

.healthEvidenceSource {
  display: block;
  margin-bottom: 4px;
  color: #0891b2;
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
}

.healthEvidenceItem strong {
  color: #0f172a;
}

.healthEvidenceItem p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.84rem;
  line-height: 1.5;
}

.healthEvidenceValue {
  flex-shrink: 0;
  color: #0f766e;
  font-weight: 950;
}
.dashboardTimelinePreview {
  padding: 24px;
  border: 1px solid rgba(14, 116, 144, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.05);
}

.dashboardTimelinePreviewHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 22px;
}

.dashboardTimelinePreviewKicker {
  color: #0891b2;
  font-size: 0.75rem;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dashboardTimelinePreviewHeader h2 {
  margin: 8px 0;
  color: #0f172a;
  font-size: 1.55rem;
}

.dashboardTimelinePreviewHeader p {
  max-width: 720px;
  margin: 0;
  color: #475569;
  line-height: 1.65;
}

.dashboardTimelinePreviewMeta {
  flex-shrink: 0;
  padding: 12px 14px;
  border-radius: 16px;
  background: #ecfeff;
  text-align: center;
}

.dashboardTimelinePreviewMeta span {
  display: block;
  color: #0e7490;
  font-size: 0.72rem;
  font-weight: 850;
}

.dashboardTimelinePreviewMeta strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 1.15rem;
}

.dashboardTimelinePreviewList {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.dashboardTimelinePreviewItem {
  display: block;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #f8fafc;
  color: inherit;
  text-decoration: none;
}

.dashboardTimelinePreviewItem:hover {
  border-color: #67e8f9;
  background: #ecfeff;
}

.dashboardTimelinePreviewItemTop {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
}

.dashboardTimelinePreviewItemTop > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dashboardTimelinePreviewItemTop time {
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 750;
}

.dashboardTimelineSeverity,
.dashboardTimelineType {
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 900;
}

.dashboardTimelineType {
  background: #e2e8f0;
  color: #475569;
}

.dashboardTimelineSeverity.information {
  background: #dbeafe;
  color: #1d4ed8;
}

.dashboardTimelineSeverity.success {
  background: #dcfce7;
  color: #15803d;
}

.dashboardTimelineSeverity.warning {
  background: #fef3c7;
  color: #b45309;
}

.dashboardTimelineSeverity.critical {
  background: #fee2e2;
  color: #b91c1c;
}

.dashboardTimelineTitle {
  display: block;
  margin-top: 12px;
  color: #0f172a;
}

.dashboardTimelineDescription {
  margin: 6px 0 0;
  color: #475569;
  font-size: 0.88rem;
  line-height: 1.6;
}

.dashboardTimelineSignals {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.dashboardTimelineSignals span {
  padding: 6px 9px;
  border-radius: 9px;
  background: #ffffff;
  color: #0f766e;
  font-size: 0.72rem;
  font-weight: 850;
}

.dashboardTimelinePreviewFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid #e2e8f0;
}

.dashboardTimelinePreviewFooter > div span {
  display: block;
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 800;
}

.dashboardTimelinePreviewFooter > div strong {
  display: block;
  margin-top: 3px;
  color: #0f172a;
  font-size: 1.2rem;
}
        @media (max-width: 1100px) {
          .dashboardJourneyTimeline {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .dashboardJourneyHeader {
            display: block;
          }
            .healthEvidenceHeader {
  flex-direction: column;
}

.healthEvidenceMetrics {
  grid-template-columns: 1fr;
}

.dashboardTimelinePreviewHeader,
.dashboardTimelinePreviewFooter {
  flex-direction: column;
  align-items: stretch;
}

.dashboardTimelinePreviewItemTop {
  align-items: flex-start;
  flex-direction: column;
}

.healthEvidenceItem {
  align-items: flex-start;
}

.healthIntelligenceCommandCenter {
  padding: 16px;
  border-radius: 24px;
}

.healthCommandCenterHeader {
  flex-direction: column;
}

.healthCommandCenterBadge {
  min-width: 0;
}
          .primaryPatternHeader {
  flex-direction: column;
}

          .dashboardJourneyNext {
            display: inline-flex;
            margin-top: 12px;
          }

          .dashboardJourneyTimeline {
            grid-template-columns: 1fr;
          }

          .dashboardJourneyPanel {
            padding: 20px;
            border-radius: 22px;
          }
        }

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
.healthDirectionMetrics {
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
          }.healthDirectionHeader,
.healthDirectionSignalsHeader {
  flex-direction: column;
}

.healthDirectionMetrics {
  grid-template-columns: 1fr;
}

.healthDirectionSignal {
  align-items: flex-start;
}

          .dashboardCommandHero,
          .dashboardCommandPanel,
          .dashboardNextActionPanel {
            padding: 20px;
            border-radius: 22px;
          }
        }/* ORGANHEAL_DASHBOARD_COMPACT_NEXT_ACTION_V1 */
.dashboardNextActionCompact {
  padding: 22px;
  margin-bottom: 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(15, 118, 110, 0.18);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
}

.dashboardNextActionCompactMain {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 28px;
}

.dashboardNextActionCompactEyebrow {
  display: block;
  color: #0891b2;
  font-size: 0.74rem;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.dashboardNextActionCompact h2 {
  margin: 7px 0;
  color: #0f172a;
  font-size: clamp(1.55rem, 3vw, 2.2rem);
  line-height: 1.2;
}

.dashboardNextActionCompactMain p {
  max-width: 720px;
  margin: 0;
  color: #64748b;
  line-height: 1.65;
}

.dashboardNextActionCompactButtons {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.dashboardNextActionCompactButtons a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 11px 16px;
  border-radius: 999px;
  text-decoration: none;
}

.dashboardNextActionCompactMeta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.dashboardNextActionCompactMeta article {
  min-width: 0;
  padding: 13px 15px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.dashboardNextActionCompactMeta span,
.dashboardNextActionCompactMeta small {
  display: block;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 800;
}

.dashboardNextActionCompactMeta strong {
  display: block;
  margin: 5px 0 3px;
  color: #0f172a;
  font-size: 1rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.dashboardCommandCenterPage[dir="rtl"] .dashboardNextActionCompact {
  direction: rtl;
  text-align: right;
}

.dashboardCommandCenterPage[dir="rtl"] .dashboardNextActionCompactButtons {
  justify-content: flex-start;
}

@media (max-width: 820px) {
  .dashboardNextActionCompactMain {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboardNextActionCompactButtons {
    justify-content: flex-start;
  }
}

@media (max-width: 620px) {
  .dashboardNextActionCompact {
    padding: 18px;
    border-radius: 20px;
  }

  .dashboardNextActionCompactMeta {
    grid-template-columns: 1fr;
  }

  .dashboardNextActionCompactButtons a {
    width: 100%;
  }
}/* ORGANHEAL_DASHBOARD_ACTION_SYSTEM_V1 */
.dashboardIntelligenceDecisionAction,
.dashboardPrimaryAction,
.dashboardSecondaryAction,
.dashboardJourneyNext {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 17px;
  border-radius: 999px;
  line-height: 1.2;
  font-size: 0.88rem;
  font-weight: 900;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.dashboardIntelligenceDecisionAction:hover,
.dashboardPrimaryAction:hover,
.dashboardSecondaryAction:hover,
.dashboardJourneyNext:hover {
  transform: translateY(-2px);
}

.dashboardIntelligenceDecisionAction:focus-visible,
.dashboardPrimaryAction:focus-visible,
.dashboardSecondaryAction:focus-visible,
.dashboardJourneyNext:focus-visible,
.dashboardTodayAction:focus-visible {
  outline: 3px solid rgba(6, 182, 212, 0.3);
  outline-offset: 3px;
}

.dashboardPrimaryAction,
.dashboardIntelligenceDecisionAction {
  border: 1px solid rgba(13, 148, 136, 0.24);
  box-shadow: 0 12px 28px rgba(20, 184, 166, 0.2);
}

.dashboardSecondaryAction,
.dashboardJourneyNext {
  background: #ffffff;
  color: #0f766e;
  border: 1px solid rgba(15, 118, 110, 0.25);
}

.dashboardSecondaryAction:hover,
.dashboardJourneyNext:hover {
  border-color: rgba(15, 118, 110, 0.48);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.dashboardTodayAction {
  min-height: 82px;
  box-sizing: border-box;
}

@media (max-width: 620px) {
  .dashboardIntelligenceDecisionAction,
  .dashboardNextActionCompactButtons
    .dashboardPrimaryAction,
  .dashboardNextActionCompactButtons
    .dashboardSecondaryAction {
    width: 100%;
  }
}
      `}</style>

      <div className="dashboardCommandShell">
        <section className="dashboardWelcomeStrip">
  <div className="dashboardWelcomeIdentity">
    <span>
      {isArabic
        ? "مركز الصحة الشخصية"
        : "Personal Health Command Center"}
    </span>

    <h1>
      {isArabic
        ? `مرحبًا، ${username}`
        : `Welcome, ${username}`}
    </h1>

    <p>
      {isArabic
        ? "بياناتك الصحية الأساسية مترابطة وجاهزة للمتابعة."
        : "Your core health information is connected and ready for follow-up."}
    </p>
  </div>

  <div className="dashboardWelcomeMetrics">
    <article>
      <span>
        {isArabic
          ? "جاهزية الرحلة"
          : "Journey readiness"}
      </span>

      <strong>
        {progressPercent}%
      </strong>
    </article>

    <article>
      <span>
        {isArabic
          ? "العناصر المكتملة"
          : "Completed elements"}
      </span>

      <strong>
        {completedSteps}/4
      </strong>
    </article>

    <article>
      <span>
        {isArabic
          ? "الأولوية الحالية"
          : "Current priority"}
      </span>

      <strong>
        {currentPriority}
      </strong>
    </article>
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

          <DashboardNextActionSection
            {...dashboardViewState.nextAction}
          />
           <DashboardJourneySection
  {...dashboardViewState.journey}
/>
<DashboardOverviewSection
            {...dashboardViewState.overview}
          />
{healthIntelligence && (
  <section className="healthIntelligenceCommandCenter">
    <div className="healthCommandCenterHeader">
      <div>
        <span className="healthCommandCenterKicker">
          {isArabic
            ? "مركز الذكاء الصحي"
            : "Health Intelligence Command Center"}
        </span>

        <h2>
          {isArabic
            ? "افهم الاتجاه، النمط، وحالة صحتك في مكان واحد"
            : "Understand your direction, pattern, and health status in one place"}
        </h2>

        <p>
          {isArabic
            ? "يجمع هذا القسم أهم نتائج محرك OrganHeal ويحوّل بياناتك إلى صورة صحية مترابطة."
            : "This section combines OrganHeal’s most important intelligence signals into one connected health picture."}
        </p>
      </div>

      <span className="healthCommandCenterBadge">
        {dashboardViewState.healthScore}/100
      </span>
    </div>

    <div className="healthCommandCenterStack">
      {dashboardViewState.healthDirection && (
  <HealthDirectionCard
    {...dashboardViewState.healthDirection}
  />
)}

{dashboardViewState.healthIntelligenceCard && (
  <DashboardIntelligenceCard
    {...dashboardViewState.healthIntelligenceCard}
  />
)}
{dashboardViewState.healthEvidence && (
  <HealthEvidenceCard
    {...dashboardViewState.healthEvidence}
  />
)}

{dashboardViewState.healthTimeline && (
  <DashboardTimelinePreview
    {...dashboardViewState.healthTimeline}
  />
)}

{knowledgeRecommendations && (
  <RecommendedKnowledgeCard
    recommendations={knowledgeRecommendations}
  />
)}


</div>
  </section>
)}

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
                    ? "ابدأ بتقييم صحي، ارفع تقريرًا إن وجد، ثم استخدم مكتبة التقارير لتكوين ملخص واضح."
                    : "Start with an assessment, upload a report if available, then use Reports Library to create a clear summary."}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}




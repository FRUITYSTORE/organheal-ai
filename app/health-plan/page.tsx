"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import WeeklyTasksPanel from "@/app/components/health-plan/WeeklyTasksPanel";
import FollowUpRoadmap from "@/app/components/health-plan/FollowUpRoadmap";
import HealthMetricsGrid from "@/app/components/health-plan/HealthMetricsGrid";
import MedicalSafetyNotice from "@/app/components/health-plan/MedicalSafetyNotice";
import LoadingPanel from "@/app/components/health-plan/LoadingPanel";
import HealthPlanHero from "@/app/components/health-plan/HealthPlanHero";
import { getHealthPlanSummary } from "@/lib/services/health-plan/health-plan.service";
import TodaysHealthMission from "@/app/components/health-plan/TodaysHealthMission";
import { buildFallbackNextAction } from "@/lib/services/health-plan/health-plan-fallback";
import { buildFallbackTasks } from "@/lib/services/health-plan/task-library";
import HealthScoreBreakdown from "@/app/components/health-plan/HealthScoreBreakdown";

type Language = "en" | "ar";

type PriorityAssessment = {
  organ_name: string | null;
  score: number | null;
  risk_level: string | null;
};

type DailyCheckIn = {
  mood: string | null;
  wellness_score: number | null;
  created_at: string | null;
};

type UploadedReport = {
  id: number;
  file_name: string | null;
  extraction_status: string | null;
  created_at: string | null;
  extracted_at: string | null;
};

type HealthInsight = {
  id: number;
  report_id: number | null;
  ai_status: string | null;
  risk_level: string | null;
  summary: string | null;
  next_best_action: string | null;
  created_at: string | null;
};

type GeneratedResult = {
  insight_id: number | null;
  report_id: number | null;
  updated_at: string | null;
};

type HealthPlanView = {
  healthScore: {
  score: number;
  level:
    | "critical"
    | "high-concern"
    | "moderate"
    | "stable"
    | "strong";
  confidence: number;
  dataCompleteness: number;
  summary: string;
  contributors: Array<{
    id:
      | "assessment"
      | "checkin"
      | "reports"
      | "analysis"
      | "history"
      | "findings";
    label: string;
    score: number;
    weight: number;
    weightedScore: number;
    available: boolean;
    explanation: string;
  }>;
};

  todaysMission: {
    title: string;
    primaryAction: string;
  };

  nextAction: {
    title: string;
    detail: string;
    href: string;
    button: string;
    priority: "urgent" | "high" | "routine";
  };

  weeklyTasks: string[];
  nextReviewDays: number;
};


function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const saved =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("language") ||
    "";

  return saved.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function localize(value: string | null | undefined, isArabic: boolean) {
  if (!isArabic) return value || "Not available";

  const clean = (value || "").trim();

  const map: Record<string, string> = {
    Heart: "القلب",
    Liver: "الكبد",
    Lung: "الرئة",
    Kidney: "الكلى",
    Brain: "الدماغ",
    Metabolic: "الأيض",
    General: "عام",
    High: "مرتفع",
    Moderate: "متوسط",
    Low: "منخفض",
    Normal: "طبيعي",
    "High Risk": "خطورة مرتفعة",
    "Moderate Risk": "خطورة متوسطة",
    "Low Risk": "خطورة منخفضة",
    "Not available": "غير متاح",
  };

  return map[clean] || clean || "غير متاح";
}



function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

export default function HealthPlanPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [priorityAssessment, setPriorityAssessment] =
    useState<PriorityAssessment | null>(null);
  const [latestCheckIn, setLatestCheckIn] = useState<DailyCheckIn | null>(null);
  const [uploadedReports, setUploadedReports] = useState<UploadedReport[]>([]);
  const [healthInsights, setHealthInsights] = useState<HealthInsight[]>([]);
  const [generatedResults, setGeneratedResults] = useState<GeneratedResult[]>([]);
  const [healthPlanView, setHealthPlanView] =
  useState<HealthPlanView | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  const isArabic = language === "ar";

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  useEffect(() => {
    function syncLanguage() {
      const currentLanguage = getStoredLanguage();
      setLanguage(currentLanguage);
      document.documentElement.lang = currentLanguage;
      document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    fetchHealthPlanData();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priorityOrgan = priorityAssessment?.organ_name || "General";
  const priorityScore =
    typeof priorityAssessment?.score === "number"
      ? priorityAssessment.score
      : null;

  const priorityScoreValue = priorityScore ?? 0;
  const priorityOrganDisplay = localize(priorityOrgan, isArabic);
  const riskLevelDisplay = localize(priorityAssessment?.risk_level, isArabic);

  const latestReport = uploadedReports[0] || null;
  const latestGenerated = generatedResults[0] || null;
  const latestGeneratedInsight = latestGenerated?.insight_id
    ? healthInsights.find((item) => item.id === latestGenerated.insight_id)
    : null;
  const latestInsight = latestGeneratedInsight || healthInsights[0] || null;

  const latestAnalysisReportId =
    latestGenerated?.report_id ||
    latestGeneratedInsight?.report_id ||
    latestReport?.id ||
    null;

  const latestAnalysisHref = latestAnalysisReportId
    ? `/intelligence?reportId=${latestAnalysisReportId}${
        generatedResults.length > 0 ? "" : "&auto=1"
      }`
    : "/reports";

  const completedExtractionCount = uploadedReports.filter(
    (report) => report.extraction_status === "Completed"
  ).length;

  const generatedCount = generatedResults.length;
  const hasAssessment = Boolean(priorityAssessment);
  const hasReports = uploadedReports.length > 0;
  const hasGenerated = generatedCount > 0;
  const hasCheckIn = Boolean(latestCheckIn);

const healthScoreLevelDisplay = healthPlanView
  ? text(
      healthPlanView.healthScore.level
        .replace("-", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase()),
      {
        critical: "حرج",
        "high-concern": "يحتاج متابعة مكثفة",
        moderate: "متوسط",
        stable: "مستقر",
        strong: "قوي",
      }[healthPlanView.healthScore.level]
    )
  : text("Not available", "غير متاح");


 const fallbackNextAction = buildFallbackNextAction({
  hasAssessment,
  hasReports,
  hasGenerated,
  hasCheckIn,
  latestAnalysisHref,
  text,
});

const activeNextAction =
  healthPlanView?.nextAction ?? fallbackNextAction;

  const taskStorageKey = `organheal-health-plan-tasks-${priorityOrgan}`;

  const planTasks = buildFallbackTasks({
  priorityOrgan,
  isArabic,
  hasGenerated,
  hasReports,
  hasCheckIn,
  text,
});

 const activeTasks =
  healthPlanView?.weeklyTasks.length
    ? healthPlanView.weeklyTasks
    : planTasks;

const completedCount = completedTasks.filter((task) =>
  activeTasks.includes(task)
).length;

const progressPercent =
  activeTasks.length > 0
    ? Math.round((completedCount / activeTasks.length) * 100)
    : 0;

  const sevenDayPlan = [
    text("Day 1: Review your priority and next best action.", "اليوم 1: راجع الأولوية والخطوة التالية."),
    text("Day 2: Complete a check-in.", "اليوم 2: أكمل Check-In."),
    text("Day 3: Review or analyze the latest report.", "اليوم 3: راجع أو حلّل آخر تقرير."),
    text("Day 4: Complete one task from the plan.", "اليوم 4: نفذ مهمة واحدة من الخطة."),
    text("Day 5: Check improvement or worsening signals.", "اليوم 5: راجع مؤشرات التحسن أو التراجع."),
    text("Day 6: Prepare questions for your doctor.", "اليوم 6: جهز أسئلة للطبيب."),
    text("Day 7: Decide next week focus.", "اليوم 7: حدد تركيز الأسبوع القادم."),
  ];

  const roadmap = [
    text("Week 1: Build your baseline from assessments and reports.", "الأسبوع 1: بناء خط الأساس من التقييمات والتقارير."),
    text("Week 2: Track check-ins and complete realistic actions.", "الأسبوع 2: متابعة التحديثات وتنفيذ خطوات واقعية."),
    text("Week 3: Review patterns from reports and analysis.", "الأسبوع 3: مراجعة الأنماط من التقارير والتحليل."),
    text("Week 4: Repeat the priority assessment and compare progress.", "الأسبوع 4: إعادة تقييم الأولوية ومقارنة التقدم."),
  ];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(taskStorageKey);
      setCompletedTasks(saved ? JSON.parse(saved) : []);
    } catch {
      setCompletedTasks([]);
    }
  }, [taskStorageKey]);

  async function fetchHealthPlanData() {
    setLoading(true);
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage(
        text(
          "Please login to view your health plan.",
          "يرجى تسجيل الدخول لعرض خطة الصحة."
        )
      );
      setLoading(false);
      return;
    }

    const userId = userData.user.id;
try {
  const summary = await getHealthPlanSummary(userId);

  setPriorityAssessment(summary.priorityAssessment as PriorityAssessment | null);
  setLatestCheckIn(summary.latestCheckIn as DailyCheckIn | null);
  setUploadedReports(summary.uploadedReports as UploadedReport[]);
  setHealthInsights(summary.healthInsights as HealthInsight[]);
  setGeneratedResults(summary.generatedResults as GeneratedResult[]);
  setHealthPlanView(summary.healthPlanView);
} catch (error) {
  setMessage(
    error instanceof Error ? "Database error: " + error.message : "Database error"
  );
  setLoading(false);
  return;
}
    setLoading(false);
  }

  function toggleTask(task: string) {
    const next = completedTasks.includes(task)
      ? completedTasks.filter((item) => item !== task)
      : [...completedTasks, task];

    setCompletedTasks(next);
    localStorage.setItem(taskStorageKey, JSON.stringify(next));
  }

  return (
    <main className="healthPlanV2" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .healthPlanV2,
        .healthPlanV2 * {
          box-sizing: border-box;
        }

        .healthPlanV2 {
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 5%, rgba(6, 182, 212, 0.24), transparent 28%),
            radial-gradient(circle at 88% 18%, rgba(15, 118, 110, 0.26), transparent 34%),
            linear-gradient(180deg, #dbeafe 0%, #e2e8f0 44%, #f8fafc 100%);
          color: #0f172a;
          padding: 26px 0 64px;
        }

        .healthPlanV2 a {
          color: inherit;
          text-decoration: none;
        }

        .hpContainer {
          width: min(1180px, calc(100% - 28px));
          margin: 0 auto;
          display: grid;
          gap: 22px;
        }

        .hpBack {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          background: #0f172a;
          color: white;
          font-weight: 950;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24);
        }

        .hpHero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(310px, 0.44fr);
          gap: 24px;
          align-items: stretch;
          padding: 34px;
          border-radius: 34px;
          background:
            radial-gradient(circle at 88% 10%, rgba(20, 184, 166, 0.48), transparent 36%),
            linear-gradient(135deg, #061826 0%, #0f172a 42%, #0f766e 100%);
          color: white;
          box-shadow: 0 34px 90px rgba(15, 23, 42, 0.36);
          border: 1px solid rgba(255,255,255,0.14);
        }

        .hpEyebrow {
          display: inline-flex;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(209, 250, 229, 0.16);
          color: #d1fae5;
          border: 1px solid rgba(209, 250, 229, 0.30);
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .hpTitle {
          font-size: clamp(2.45rem, 5vw, 4.8rem);
          line-height: 0.94;
          letter-spacing: -0.06em;
          margin: 0;
          color: white;
        }

        .hpLead {
          margin: 18px 0 0;
          max-width: 760px;
          color: rgba(226, 232, 240, 0.94);
          font-size: 1.04rem;
          font-weight: 720;
          line-height: 1.75;
        }

        .hpActions {
          display: flex;
          flex-wrap: wrap;
          gap: 11px;
          margin-top: 24px;
        }

        .hpPrimary,
        .hpSecondary,
        .hpDark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 18px;
          border-radius: 999px;
          font-weight: 950;
          border: 0;
          cursor: pointer;
        }

        .hpPrimary {
          background: linear-gradient(135deg, #06b6d4, #14b8a6);
          color: #061826;
          box-shadow: 0 16px 40px rgba(6, 182, 212, 0.34);
        }

        .hpSecondary {
          background: rgba(255,255,255,0.96);
          color: #0f766e;
          border: 1px solid rgba(15, 118, 110, 0.30);
        }

        .hpDark {
          background: #0f172a;
          color: white;
        }

        .hpPriorityCard {
          position: relative;
          overflow: hidden;
          padding: 24px;
          border-radius: 28px;
          background:
            radial-gradient(circle at 90% 8%, rgba(255,255,255,0.20), transparent 36%),
            linear-gradient(135deg, rgba(255,255,255,0.17), rgba(255,255,255,0.08));
          border: 1px solid rgba(255,255,255,0.28);
          box-shadow: 0 30px 78px rgba(0,0,0,0.24);
          min-height: 260px;
        }

        .hpPriorityLabel {
          display: inline-flex;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(20, 184, 166, 0.26);
          color: #d1fae5;
          border: 1px solid rgba(209, 250, 229, 0.36);
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hpPriorityValue {
          margin: 22px 0 6px;
          font-size: 3.1rem;
          line-height: 1;
          color: white;
          font-weight: 950;
        }

        .hpPrioritySub {
          color: rgba(226, 232, 240, 0.92);
          font-weight: 760;
          line-height: 1.6;
        }

        .hpProgressWrap {
          margin-top: 22px;
          height: 12px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.18);
        }

        .hpProgressFill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #22d3ee, #2dd4bf, #a7f3d0);
        }

        .hpToolGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .hpToolCard {
          min-height: 150px;
          padding: 20px;
          border-radius: 26px;
          color: white;
          overflow: hidden;
          position: relative;
          box-shadow: 0 24px 62px rgba(15, 23, 42, 0.24);
        }

        .hpToolCard::after {
          content: "";
          position: absolute;
          right: -44px;
          bottom: -48px;
          width: 140px;
          height: 140px;
          border-radius: 999px;
          background: rgba(255,255,255,0.17);
        }

        .hpToolCard.blue {
          background: linear-gradient(135deg, #1d4ed8, #0f766e);
        }

        .hpToolCard.teal {
          background: linear-gradient(135deg, #0f766e, #06b6d4);
        }

        .hpToolCard.green {
          background: linear-gradient(135deg, #047857, #10b981);
        }

        .hpToolCard.amber {
          background: linear-gradient(135deg, #b45309, #f59e0b);
        }

        .hpToolLabel {
          position: relative;
          z-index: 1;
          font-size: 0.76rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          opacity: 0.96;
        }

        .hpToolValue {
          position: relative;
          z-index: 1;
          margin-top: 13px;
          font-size: 2.18rem;
          line-height: 1;
          font-weight: 950;
        }

        .hpToolHint {
          position: relative;
          z-index: 1;
          margin-top: 10px;
          font-weight: 800;
          opacity: 0.96;
          line-height: 1.45;
        }

        .hpPanel {
          background: white;
          border: 1px solid rgba(15, 23, 42, 0.14);
          border-radius: 30px;
          padding: 24px;
          box-shadow: 0 22px 58px rgba(15, 23, 42, 0.13);
        }

        .hpPanelHeader {
          padding: 18px;
          border-radius: 24px;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #061826, #0f766e);
          color: white;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.18);
        }

        .hpPanelKicker {
          font-size: 0.74rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #d1fae5;
          margin-bottom: 8px;
        }

        .hpPanelTitle {
          margin: 0;
          color: white;
          font-size: 1.45rem;
          font-weight: 950;
        }

        .hpPanelText {
          margin: 8px 0 0;
          color: rgba(226, 232, 240, 0.92);
          font-weight: 720;
          line-height: 1.65;
        }

        .hpSignalText {
          margin-top: 6px;
          color: #475569;
          font-weight: 720;
          line-height: 1.55;
        }

             .hpBadge {
          display: inline-flex;
          min-height: 30px;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 950;
        }

        .hpBadge.good {
          background: #dcfce7;
          color: #047857;
          border: 1px solid rgba(5, 150, 105, 0.28);
        }

        .hpBadge.warn {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid rgba(217, 119, 6, 0.28);
        }

        .hpTasks {
          display: grid;
          gap: 12px;
        }

        .hpTask {
          display: grid;
          grid-template-columns: auto auto minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 15px;
          border-radius: 18px;
          background: white;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-inline-start: 7px solid #d97706;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.07);
        }

        .hpTask.done {
          background: #dcfce7;
          border-inline-start-color: #059669;
          border-color: rgba(5, 150, 105, 0.32);
        }

        .hpTaskNumber {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: #0f766e;
          color: white;
          font-weight: 950;
        }

        .hpTask input {
          width: 18px;
          height: 18px;
          accent-color: #0f766e;
        }

        .hpTaskText {
          color: #0f172a;
          font-weight: 900;
          line-height: 1.55;
        }

        .hpList {
          display: grid;
          gap: 10px;
        }

        .hpListItem {
          padding: 14px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-inline-start: 6px solid #0f766e;
          color: #0f172a;
          font-weight: 860;
          line-height: 1.55;
        }

        .hpSafety {
          padding: 18px;
          border-radius: 24px;
          background: #eff6ff;
          border: 1px solid rgba(37, 99, 235, 0.18);
          border-inline-start: 7px solid #2563eb;
          color: #1e293b;
          font-weight: 760;
          line-height: 1.7;
        }


        .hpHero .hpSecondary {
          background: #ffffff !important;
          color: #0f766e !important;
          border: 1px solid rgba(255, 255, 255, 0.78) !important;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18) !important;
        }

        .hpHero .hpSecondary,
        .hpHero .hpSecondary * {
          color: #0f766e !important;
          text-shadow: none !important;
        }

        .hpHero .hpPrimary,
        .hpHero .hpPrimary * {
          color: #061826 !important;
          text-shadow: none !important;
        }
          .hpScoreSummaryGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.hpScoreSummaryItem {
  padding: 18px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid rgba(15, 23, 42, 0.1);
}

.hpScoreSummaryItem span {
  display: block;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hpScoreSummaryItem strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 1.65rem;
  font-weight: 950;
}

.hpContributorGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.hpContributorCard {
  padding: 18px;
  border-radius: 22px;
  background: #f8fafc;
  border: 1px solid rgba(15, 23, 42, 0.1);
}

.hpContributorCard.available {
  border-inline-start: 6px solid #0f766e;
}

.hpContributorCard.missing {
  border-inline-start: 6px solid #d97706;
}

.hpContributorTop {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.hpContributorLabel {
  display: block;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hpContributorScore {
  display: block;
  margin-top: 7px;
  color: #0f172a;
  font-size: 1.3rem;
  font-weight: 950;
}

.hpContributorProgress {
  height: 10px;
  margin-top: 16px;
  border-radius: 999px;
  overflow: hidden;
  background: #e2e8f0;
}

.hpContributorProgress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #06b6d4, #10b981);
}

.hpContributorText {
  margin: 13px 0 0;
  color: #475569;
  font-weight: 720;
  line-height: 1.55;
}
       @media (max-width: 980px) {
  .hpHero {
    grid-template-columns: 1fr;
  }

  .hpToolGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hpScoreSummaryGrid,
  .hpContributorGrid {
    grid-template-columns: 1fr;
  }
}

        @media (max-width: 640px) {
          .hpToolGrid {
            grid-template-columns: 1fr;
          }

          .hpHero {
            padding: 24px;
          }

          .hpTask {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .hpTask .hpBadge {
            grid-column: 1 / -1;
            width: fit-content;
          }
        }
      `}</style>

      <div className="hpContainer">
        <Link href="/dashboard" className="hpBack">
          {text("← Back to Dashboard", "← العودة إلى لوحة التحكم")}
        </Link>

       <HealthPlanHero
  eyebrow={text("Personal follow-up intelligence", "خطة متابعة شخصية")}
  title={
    isArabic
      ? `خطة ${priorityOrganDisplay} الشخصية`
      : `${priorityOrgan} Personal Health Plan`
  }
  lead={text(
    "A guided plan that connects assessments, medical reports, report analysis, check-ins, and practical weekly follow-up.",
    "خطة موجهة تربط التقييمات، التقارير الطبية، تحليل التقارير، Check-In، والمتابعة العملية الأسبوعية."
  )}
  primaryHref={activeNextAction.href}
primaryLabel={activeNextAction.button}
  analysisHref={latestAnalysisHref}
  analysisLabel={
    hasGenerated
      ? text("Review Analysis", "مراجعة التحليل")
      : text("Analyze Report", "تحليل التقرير")
  }
  reportsLabel={text("Reports", "التقارير")}
  priority={{
    label: text("Patient priority", "أولوية المريض"),
    organ: priorityOrganDisplay,
    riskLabel: text("Risk level", "مستوى الخطورة"),
    riskLevel: riskLevelDisplay,
    scoreLabel: text("Priority score", "نتيجة الأولوية"),
    scoreText: priorityScore === null ? "—" : `${priorityScore}/100`,
    progressPercent: clamp(100 - priorityScoreValue),
  }}
/>

<TodaysHealthMission
  isArabic={isArabic}
  priorityOrgan={priorityOrganDisplay}
  priorityScore={priorityScore}
  primaryAction={
  healthPlanView?.todaysMission.primaryAction ??
  activeNextAction.detail
}
/>

        {message && (
          <section className="hpSafety">
            {message}
          </section>
        )}

        <HealthMetricsGrid
  items={[
    {
  tone: "blue",
  label: text("Health intelligence", "الذكاء الصحي"),
  value: healthPlanView?.healthScore.score ?? "—",
  hint: healthPlanView
    ? `${healthScoreLevelDisplay} · ${healthPlanView.healthScore.confidence}% ${text(
        "confidence",
        "ثقة"
      )}`
    : text("Calculating score", "جاري حساب النتيجة"),
},
    {
      tone: "teal",
      label: text("Reports", "التقارير"),
      value: uploadedReports.length,
      hint: `${completedExtractionCount} ${text(
        "ready for analysis",
        "جاهزة للتحليل"
      )}`,
    },
    {
      tone: "green",
      label: text("Analysis", "التحليل"),
      value: generatedCount,
      hint: hasGenerated
        ? text("saved results", "نتائج محفوظة")
        : text("needs analysis", "يحتاج تحليل"),
    },
    {
      tone: "amber",
      label: "Check-In",
      value: latestCheckIn?.wellness_score ?? "—",
      hint: latestCheckIn
        ? text("latest wellness score", "آخر نتيجة صحية")
        : text("not updated yet", "لم يتم التحديث"),
    },
  ]}
/>
{healthPlanView && (
  <HealthScoreBreakdown
    isArabic={isArabic}
    score={healthPlanView.healthScore.score}
    confidence={healthPlanView.healthScore.confidence}
    dataCompleteness={
      healthPlanView.healthScore.dataCompleteness
    }
    summary={healthPlanView.healthScore.summary}
    contributors={healthPlanView.healthScore.contributors}
  />
)}

        <article className="hpPanel">
  <div className="hpPanelHeader">
    <div className="hpPanelKicker">
      {text("Reports and analysis", "التقارير والتحليل")}
    </div>

    <h2 className="hpPanelTitle">
      {hasGenerated
        ? text("Analysis is saved", "التحليل محفوظ")
        : text("Analysis is still needed", "التحليل ما زال مطلوبًا")}
    </h2>
  </div>

  <p className="hpSignalText">
    {latestInsight?.next_best_action ||
      latestInsight?.summary ||
      text(
        "Analyze your latest report so this plan can become more specific and useful.",
        "حلّل آخر تقرير حتى تصبح الخطة أكثر دقة وفائدة."
      )}
  </p>

  <div className="hpActions">
    <Link href={latestAnalysisHref} className="hpPrimary">
      {hasGenerated
        ? text("Review Analysis", "مراجعة التحليل")
        : text("Analyze Latest Report", "تحليل آخر تقرير")}
    </Link>

    <Link href="/reports" className="hpSecondary">
      {text("Reports Library", "مكتبة التقارير")}
    </Link>
  </div>
</article>

        <WeeklyTasksPanel
  kicker={text("Action tasks", "مهام المتابعة")}
  title={`${completedCount} / ${activeTasks.length} ${text(
  "completed",
  "مكتملة"
)}`}
  description={text(
    "Choose simple tasks. Progress is saved on this device.",
    "اختر مهام بسيطة. يتم حفظ التقدم على هذا الجهاز."
  )}
 tasks={activeTasks}

  completedTasks={completedTasks}
  progressPercent={progressPercent}
  doneLabel={text("Done", "تم")}
  todoLabel={text("To do", "مطلوب")}
  resetLabel={text("Reset Weekly Tasks", "إعادة مهام الأسبوع")}
  checkInLabel={text("Open Check-In", "فتح Check-In")}
  onToggleTask={toggleTask}
  onResetTasks={() => {
    setCompletedTasks([]);
    localStorage.removeItem(taskStorageKey);
  }}
/>

        <FollowUpRoadmap
  sevenDayKicker={text("7-day follow-up plan", "خطة 7 أيام")}
  sevenDayTitle={text(
    "Start with small realistic actions",
    "ابدأ بخطوات واقعية صغيرة"
  )}
  sevenDayItems={sevenDayPlan}
  roadmapKicker={text("30-day improvement roadmap", "خارطة تحسين 30 يوم")}
  roadmapTitle={text("From data to follow-up", "من البيانات إلى المتابعة")}
  roadmapItems={roadmap}
/>

        <MedicalSafetyNotice
  title={text("Medical safety reminder", "تذكير السلامة الطبية")}
  description={text(
    "This plan is educational and organizational. It does not diagnose disease, prescribe treatment, or replace medical care. Seek urgent care for severe symptoms or emergency warning signs.",
    "هذه الخطة تعليمية وتنظيمية. لا تشخص الأمراض ولا تصف العلاج ولا تستبدل الرعاية الطبية. اطلب الرعاية العاجلة عند وجود أعراض شديدة أو علامات طارئة."
  )}
/>

        {loading && (
  <LoadingPanel
    kicker={text("Loading", "تحميل")}
    title={text("Preparing your plan...", "جاري تجهيز الخطة...")}
  />
)}
      </div>
    </main>
  );
}




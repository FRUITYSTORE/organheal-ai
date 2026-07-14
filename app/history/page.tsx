"use client";

import PageBackActions from "../components/PageBackActions";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import type { TimelineModuleResult } from "@/lib/modules/timeline";
import type { PassportModuleResult } from "@/lib/modules/passport";
import HistoryOverviewCard from "@/app/components/history/HistoryOverviewCard";
import HistoryTrendCard from "@/app/components/history/HistoryTrendCard";
import HistoryPriorityCard from "@/app/components/history/HistoryPriorityCard";

type Language = "en" | "ar";

type HealthHistory = {
  id: string;
  module_name: string;
  score: number;
  status: string | null;
  notes: string | null;
  created_at: string;
};

type DailyCheckIn = {
  id: string;
  mood: string;
  energy_level: number;
  stress_level: number;
  sleep_quality: number;
  hydration: number;
  physical_activity: number;
  wellness_score: number;
  created_at: string;
};

type UploadedReport = {
  id: number;
  file_name: string | null;
  extraction_status: string | null;
  created_at: string;
};

type HealthInsight = {
  id: number;
  report_id: number | null;
  ai_status: string | null;
  insight_title: string | null;
  created_at: string | null;
};

type SavedAnalysis = {
  insight_id: number;
  updated_at: string | null;
};

type TimelineItem = {
  id: string;
  type:
  | "Assessment"
  | "Check-In"
  | "Report"
  | "Analysis"
  | "Trend";
  title: string;
  subtitle: string;
  score?: number | null;
  date: string;
  href: string;
};

export default function HistoryPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [history, setHistory] = useState<HealthHistory[]>([]);
  const [dailyCheckIns, setDailyCheckIns] = useState<DailyCheckIn[]>([]);
  const [uploadedReports, setUploadedReports] = useState<UploadedReport[]>([]);
  const [healthInsights, setHealthInsights] = useState<HealthInsight[]>([]);
  const [savedAnalysis, setSavedAnalysis] = useState<SavedAnalysis[]>(
    []
  );
const [officialTimeline, setOfficialTimeline] =
  useState<TimelineModuleResult | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
const [officialPassport, setOfficialPassport] =
  useState<PassportModuleResult | null>(null);

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    fetchHistory();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  function getCurrentLanguage() {
    return (localStorage.getItem("organheal-language") as Language | null) || "en";
  }

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  function formatDateTime(value: string | null | undefined) {
    if (!value) return text("Not available", "غير متاح");

    return new Date(value).toLocaleString(isArabic ? "ar-AE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function localizeModuleName(value: string | null | undefined) {
    if (!value) return text("N/A", "غير متاح");
    if (!isArabic) return value;

    const normalized = value.toLowerCase();

    if (normalized.includes("heart")) return "القلب";
    if (normalized.includes("lung")) return "الرئة";
    if (normalized.includes("kidney")) return "الكلى";
    if (normalized.includes("liver")) return "الكبد";
    if (normalized.includes("brain")) return "الدماغ";
    if (normalized.includes("metabolic")) return "الأيض";

    return value;
  }

  function localizeStatus(value: string | null | undefined) {
    if (!value) return text("Assessment saved", "تم حفظ التقييم");
    if (!isArabic) return value;

    if (value === "Low Risk") return "خطورة منخفضة";
    if (value === "Moderate Risk") return "خطورة متوسطة";
    if (value === "High Risk") return "خطورة مرتفعة";

    if (value === "Good Kidney Health Pattern") return "نمط صحي جيد للكلى";
    if (value === "Moderate Kidney Risk") return "خطورة كلوية متوسطة";
    if (value === "Higher Kidney Risk") return "خطورة كلوية أعلى";

    if (value === "Good Liver Health Pattern") return "نمط صحي جيد للكبد";
    if (value === "Moderate Liver Risk") return "خطورة كبدية متوسطة";
    if (value === "Higher Liver Risk") return "خطورة كبدية أعلى";

    if (value === "Good Metabolic Health Pattern") return "نمط أيضي صحي جيد";
    if (value === "Moderate Metabolic Risk") return "خطورة أيضية متوسطة";
    if (value === "Higher Metabolic Risk") return "خطورة أيضية أعلى";

    if (value === "Good Brain Health Pattern") return "نمط صحي جيد للدماغ";
    if (value === "Moderate Brain Wellness Risk") return "خطورة متوسطة لصحة الدماغ";
    if (value === "Higher Brain Wellness Risk") return "خطورة أعلى لصحة الدماغ";

    if (value === "Good Lung Health Pattern") return "نمط صحي جيد للرئة";
    if (value === "Moderate Respiratory Risk") return "خطورة تنفسية متوسطة";
    if (value === "Higher Respiratory Risk") return "خطورة تنفسية أعلى";

    if (value === "Uploaded") return "تم الرفع";
    if (value === "Completed") return "مكتمل";
    if (value === "Generated") return "تم التوليد";

    return value;
  }

  function localizeType(
  value: TimelineItem["type"]
) {
  if (!isArabic) return value;

  if (value === "Assessment") return "تقييم";
  if (value === "Check-In") return "Check-In";
  if (value === "Report") return "تقرير";
  if (value === "Analysis") return "تحليل صحي";
  if (value === "Trend") return "اتجاه صحي";

  return value;
}

  function getTimelineIcon(value: TimelineItem["type"]) {
    if (value === "Assessment") return "🧭";
    if (value === "Check-In") return "✅";
    if (value === "Report") return "📄";
    if (value === "Analysis") return "🧠";
    if (value === "Trend") return "📈";
    return "•";
  }

  async function fetchHistory() {
    setLoading(true);
    setMessage("");

    const currentLanguage = getCurrentLanguage();
    const currentIsArabic = currentLanguage === "ar";

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage(
        currentIsArabic
          ? "يرجى تسجيل الدخول أو إنشاء حساب لعرض التاريخ الصحي."
          : "Please login or sign up to view your health history."
      );
      setLoading(false);
      return;
    }

    const userId = userData.user.id;
    let timelineDecision: TimelineModuleResult | null = null;
    setOfficialPassport(null);

try {
  const response = await fetch(
    "/api/history-decision",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        language:
          currentLanguage === "ar"
            ? "ar"
            : "en",
        audience: "general",
      }),
    }
  );

  if (response.ok) {
    const decision = (await response.json()) as {
  timeline: TimelineModuleResult;
  passport: PassportModuleResult;
};

timelineDecision = decision.timeline;
setOfficialPassport(decision.passport);
  } else {
    console.error(
      "History decision request failed:",
      await response.text()
    );
  }
} catch (error) {
  console.error(
    "Could not load official health timeline:",
    error
  );
}

    const { data: historyData, error: historyError } = await supabase
      .from("health_history")
      .select("id, module_name, score, status, notes, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (historyError) {
      setMessage(
        currentIsArabic
          ? "حدث خطأ في قاعدة البيانات: " + historyError.message
          : "Database error: " + historyError.message
      );
      setLoading(false);
      return;
    }

    const { data: checkInData, error: checkInError } = await supabase
      .from("daily_checkins")
      .select(
        "id, mood, energy_level, stress_level, sleep_quality, hydration, physical_activity, wellness_score, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (checkInError) {
      setMessage(
        currentIsArabic
          ? "حدث خطأ في قاعدة البيانات: " + checkInError.message
          : "Database error: " + checkInError.message
      );
      setLoading(false);
      return;
    }

    const { data: reportData } = await supabase
      .from("uploaded_lab_files")
      .select("id, file_name, extraction_status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: insightData } = await supabase
      .from("health_insights")
      .select("id, report_id, ai_status, insight_title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const insightIds = (insightData || []).map((item) => item.id);

    let savedDataRows: SavedAnalysis[] = [];

    if (insightIds.length > 0) {
      const { data: savedData } = await supabase
        .from("generated_intelligence_results")
        .select("insight_id, updated_at")
        .eq("user_id", userId)
        .in("insight_id", insightIds)
        .order("updated_at", { ascending: false });

      savedDataRows = savedData || [];
    }

    setHistory((historyData || []) as HealthHistory[]);
    setDailyCheckIns((checkInData || []) as DailyCheckIn[]);
    setUploadedReports((reportData || []) as UploadedReport[]);
    setHealthInsights((insightData || []) as HealthInsight[]);
    setSavedAnalysis(savedDataRows);
    setOfficialTimeline(timelineDecision);
    setLoading(false);
  }

  function getScoreStatus(score: number) {
    if (score >= 80) return text("Strong", "قوي");
    if (score >= 60) return text("Stable", "مستقر");
    if (score >= 40) return text("Needs Attention", "يحتاج انتباه");
    return text("Recovery Needed", "يحتاج تعافي");
  }

  function getTone(score: number) {
    if (score >= 80) return "good";
    if (score >= 60) return "moderate";
    return "risk";
  }

  const allScores = [
    ...history.map((item) => item.score),
    ...dailyCheckIns.map((item) => item.wellness_score),
  ];

  const overallProgressScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
      : 0;
const effectiveProgressScore =
  officialPassport?.data.overallScore ??
  overallProgressScore;

const hasOfficialProgress =
  officialPassport !== null &&
  officialPassport.status === "ready";

const progressDataAvailable =
  hasOfficialProgress ||
  allScores.length > 0;

  const getOfficialSourceCount = (
  sourceId:
    | "assessments"
    | "checkin"
    | "reports"
    | "analysis"
    | "history",
  fallback: number
) => {
  return (
    officialPassport?.data.sources.find(
      (source) => source.id === sourceId
    )?.count ?? fallback
  );
};

const assessmentCount =
  getOfficialSourceCount(
    "assessments",
    history.length
  );

const checkInCount =
  getOfficialSourceCount(
    "checkin",
    dailyCheckIns.length
  );

const reportCount =
  getOfficialSourceCount(
    "reports",
    uploadedReports.length
  );

const analysisCount =
  getOfficialSourceCount(
    "analysis",
    savedAnalysis.length
  );

  const latestCheckIn = dailyCheckIns[0] || null;

  const bestAssessment =
    history.length > 0 ? [...history].sort((a, b) => b.score - a.score)[0] : null;

  const priorityAssessment =
    history.length > 0 ? [...history].sort((a, b) => a.score - b.score)[0] : null;

  const processedReports = uploadedReports.filter(
    (item) => item.extraction_status === "Completed"
  ).length;

  const pendingReports = uploadedReports.filter(
    (item) => item.extraction_status !== "Completed"
  ).length;

  const savedAnalysisIds = new Set(
    savedAnalysis.map((item) => item.insight_id)
  );

  const generatedInsights = healthInsights.filter(
    (item) => item.ai_status === "Generated" || savedAnalysisIds.has(item.id)
  );

  const assessmentTrend = useMemo(() => {
    if (history.length < 2) {
      return {
        label: isArabic ? "اتجاه التقييم غير جاهز" : "Assessment trend not ready",
        description: isArabic
          ? "أكمل تقييمين على الأقل لمقارنة التقدم مع الوقت."
          : "Complete at least two assessments to compare progress over time.",
        tone: "neutral",
      };
    }

    const latest = history[0];
    const previous = history[1];
    const difference = latest.score - previous.score;
    const moduleName = localizeModuleName(latest.module_name);

    if (difference > 0) {
      return {
        label: isArabic ? "التقييم يتحسن" : "Assessment progress improving",
        description: isArabic
          ? `${moduleName} تحسن بمقدار ${difference} نقطة مقارنة بالسجل السابق.`
          : `${latest.module_name} improved by ${difference} points compared with the previous record.`,
        tone: "good",
      };
    }

    if (difference < 0) {
      return {
        label: isArabic ? "التقييم انخفض" : "Assessment progress declined",
        description: isArabic
          ? `${moduleName} انخفض بمقدار ${Math.abs(
              difference
            )} نقطة. راجع خطة المتابعة وأعد التقييم بعد 4 أسابيع.`
          : `${latest.module_name} declined by ${Math.abs(
              difference
            )} points. Review your follow-up plan and reassess after 4 weeks.`,
        tone: "risk",
      };
    }

    return {
      label: isArabic ? "التقييم مستقر" : "Assessment progress stable",
      description: isArabic
        ? "آخر مؤشر تقييم لديك مستقر مقارنة بالسجل السابق."
        : "Your latest assessment score is stable compared with the previous record.",
      tone: "moderate",
    };
  }, [history, isArabic]);

  const wellnessTrend = useMemo(() => {
    if (dailyCheckIns.length < 2) {
      return {
        label: isArabic ? "اتجاه العافية غير جاهز" : "Wellness trend not ready",
        description: isArabic
          ? "أكمل Check-In مرتين على الأقل لمقارنة حركة العافية."
          : "Complete at least two check-ins to compare wellness movement.",
        tone: "neutral",
      };
    }

    const latest = dailyCheckIns[0];
    const previous = dailyCheckIns[1];
    const difference = latest.wellness_score - previous.wellness_score;

    if (difference > 0) {
      return {
        label: isArabic ? "العافية تتحسن" : "Wellness improving",
        description: isArabic
          ? `تحسن مؤشر العافية لديك بمقدار ${difference} نقطة مقارنة بآخر Check-In.`
          : `Your wellness score improved by ${difference} points compared with your previous check-in.`,
        tone: "good",
      };
    }

    if (difference < 0) {
      return {
        label: isArabic ? "العافية تحتاج انتباه" : "Wellness needs attention",
        description: isArabic
          ? `انخفض مؤشر العافية لديك بمقدار ${Math.abs(
              difference
            )} نقطة. ركز اليوم على النوم، التوتر، الترطيب، والتعافي.`
          : `Your wellness score decreased by ${Math.abs(
              difference
            )} points. Focus on sleep, stress, hydration, and recovery today.`,
        tone: "risk",
      };
    }

    return {
      label: isArabic ? "العافية مستقرة" : "Wellness stable",
      description: isArabic
        ? "مؤشر العافية لديك بقي ثابتًا مقارنة بآخر Check-In."
        : "Your wellness score stayed the same compared with your previous check-in.",
      tone: "moderate",
    };
  }, [dailyCheckIns, isArabic]);

  const legacyTimelineItems: TimelineItem[] = [
    ...history.map((item) => ({
      id: `assessment-${item.id}`,
      type: "Assessment" as const,
      title: localizeModuleName(item.module_name),
      subtitle: localizeStatus(item.status || "Assessment saved"),
      score: item.score,
      date: item.created_at,
      href: "/assessment",
    })),

    ...dailyCheckIns.map((item) => ({
      id: `checkin-${item.id}`,
      type: "Check-In" as const,
      title: isArabic
        ? `Check-In صحي · ${item.mood}`
        : `Wellness Check-In · ${item.mood}`,
      subtitle: isArabic
        ? `الطاقة ${item.energy_level}/5 · النوم ${item.sleep_quality}/5 · التوتر ${item.stress_level}/5`
        : `Energy ${item.energy_level}/5 · Sleep ${item.sleep_quality}/5 · Stress ${item.stress_level}/5`,
      score: item.wellness_score,
      date: item.created_at,
      href: "/checkin",
    })),

    ...uploadedReports.map((item) => ({
      id: `report-${item.id}`,
      type: "Report" as const,
      title: item.file_name || text("Medical report", "تقرير طبي"),
      subtitle: localizeStatus(item.extraction_status || "Uploaded"),
      score: null,
      date: item.created_at,
      href: "/reports",
    })),

    ...generatedInsights.map((item) => ({
      id: `intelligence-${item.id}`,
      type: "Analysis" as const,
      title: item.insight_title || text("Saved health analysis", "تحليل صحي محفوظ"),
      subtitle:
        item.ai_status === "Generated"
          ? text("Saved analysis result", "نتيجة تحليل صحي مولدة")
          : text("Saved intelligence result", "نتيجة تحليل صحي محفوظة"),
      score: null,
      date: item.created_at || new Date().toISOString(),
      href: "/reports",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
const officialTimelineItems: TimelineItem[] =
  officialTimeline?.data.events.map(
    (event) => {
      const typeMap: Record<
        typeof event.type,
        TimelineItem["type"]
      > = {
        assessment: "Assessment",
        checkin: "Check-In",
        report: "Report",
        analysis: "Analysis",
        trend: "Trend",
      };

      return {
        id: event.id,
        type: typeMap[event.type],
        title: event.organ
          ? localizeModuleName(event.organ)
          : event.title,
        subtitle: event.description,
        score: event.score,
        date: event.date,
        href: event.href || "/history",
      };
    }
  ) ?? [];

const timelineItems =
  officialTimelineItems.length > 0
    ? officialTimelineItems
    : legacyTimelineItems;

  const filters = [
    { value: "All", label: text("All", "الكل") },
    { value: "Assessment", label: text("Assessment", "التقييمات") },
    { value: "Check-In", label: "Check-In" },
    { value: "Report", label: text("Report", "التقارير") },
    { value: "Analysis", label: text("Analysis", "التحليل الصحي") },
    {
  value: "Trend",
  label: text(
    "Trend",
    "الاتجاهات"
  ),
},
  ];

  const filteredTimeline =
    selectedFilter === "All"
      ? timelineItems
      : timelineItems.filter((item) => item.type === selectedFilter);

  const recommendedAction =
    history.length === 0
      ? {
          label: text("Start your progress history", "ابدأ تاريخ التقدم الصحي"),
          description: text(
            "Complete an assessment so OrganHeal can begin building your progress timeline.",
            "أكمل تقييمًا حتى يبدأ OrganHeal ببناء مسار تقدمك الصحي."
          ),
          href: "/assessment",
          buttonText: text("Start Assessment", "ابدأ التقييم"),
        }
      : dailyCheckIns.length === 0
      ? {
          label: text("Add wellness tracking", "أضف متابعة العافية"),
          description: text(
            "Complete a daily check-in so your progress timeline reflects how you feel today.",
            "أكمل Check-In يومي حتى يعكس مسار التقدم حالتك اليوم."
          ),
          href: "/checkin",
          buttonText: text("Open Check-In", "افتح Check-In"),
        }
      : uploadedReports.length === 0
      ? {
          label: text("Add medical reports", "أضف تقارير طبية"),
          description: text(
            "Upload a medical report to connect your progress timeline with report intelligence.",
            "ارفع تقريرًا طبيًا لربط مسار التقدم بذكاء التقارير."
          ),
          href: "/lab-upload",
          buttonText: text("Upload Report", "رفع تقرير"),
        }
      : savedAnalysis.length === 0
      ? {
          label: text("Generate saved intelligence", "ولّد تحليل صحي محفوظ"),
          description: text(
            "Open Report Analysis to generate and save report-based health analysis.",
            "افتح تحليل التقارير لتوليد وحفظ تحليل صحي مبني على التقارير."
          ),
          href: "/reports",
          buttonText: text("Review Analysis", "افتح تحليل التقارير"),
        }
      : {
          label: text("Continue your follow-up plan", "تابع خطة المتابعة"),
          description: text(
            "Your history has assessments, check-ins, reports, and saved intelligence. Continue with your health plan.",
            "يحتوي تاريخك الصحي على تقييمات، Check-Ins، تقارير، وتحليل صحي محفوظ. تابع إلى الخطة الصحية."
          ),
          href: "/health-plan",
          buttonText: text("Open Health Plan", "افتح الخطة الصحية"),
        };

  const hasAnyHistory = timelineItems.length > 0;

  return (
    <main className="ohPageShell followUpCleanV4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        {loading && (
          <section className="ohHero">
            <p className="ohEyebrow">
              {text("Loading History", "تحميل التاريخ الصحي")}
            </p>
            <h1 className="ohTitle">
              {text("Preparing your progress timeline...", "جاري تحضير مسار التقدم...")}
            </h1>
            <p className="ohLead">
              {text(
                "OrganHeal is connecting assessments, check-ins, reports, and saved intelligence into one timeline.",
                "يقوم OrganHeal بربط التقييمات، Check-Ins، التقارير، والتحليل الصحي المحفوظ في مسار واحد."
              )}
            </p>
          </section>
        )}

        {!loading && message && (
          <section className="ohEmptyState">
            <h2>{text("Access Protected", "الوصول محمي")}</h2>
            <p>{message}</p>
            <div className="ohButtonRow" style={{ justifyContent: "center", marginTop: "20px" }}>
              <Link href="/login" className="primaryBtn">
                {text("Login", "تسجيل الدخول")}
              </Link>
            </div>
          </section>
        )}

        {!loading && !message && (
          <>
            <section className="ohHero">
  <div className="ohHeroGrid">
    <div>
      <p className="ohEyebrow">
        {text(
          "Health Journey Command Timeline",
          "مسار قيادة الرحلة الصحية"
        )}
      </p>

      <h1 className="ohTitle">
        {text(
          "Progress Timeline",
          "مسار التقدم"
        )}
      </h1>

      <p className="ohLead">
        {text(
          "Review your assessments, wellness check-ins, uploaded reports, saved intelligence, trends, and the next best action in one connected view.",
          "راجع التقييمات، Check-Ins، التقارير المرفوعة، التحليل الصحي المحفوظ، الاتجاهات، والخطوة التالية الأفضل في عرض واحد مترابط."
        )}
      </p>

      <div
        className="ohButtonRow"
        style={{ marginTop: "24px" }}
      >
        <Link
          href={recommendedAction.href}
          className="primaryBtn"
        >
          {recommendedAction.buttonText}
        </Link>

        <Link
          href="/dashboard"
          className="secondaryBtn"
        >
          {text(
            "Open Dashboard",
            "فتح لوحة التحكم"
          )}
        </Link>
      </div>
    </div>

    <HistoryOverviewCard
      overallScore={effectiveProgressScore}
      progressDataAvailable={progressDataAvailable}
      passport={officialPassport}
      assessmentCount={assessmentCount}
      checkInCount={checkInCount}
      reportCount={reportCount}
      analysisCount={analysisCount}
      isArabic={isArabic}
    />
  </div>
</section>

            <section className="ohActionPanel">
              <div className="ohCardHeader" style={{ marginBottom: 0 }}>
                <div>
                  <p className="ohMetricLabel">
                    {text("Recommended Next Step", "الخطوة التالية المقترحة")}
                  </p>
                  <h2 className="ohCardTitle" style={{ fontSize: "1.55rem" }}>
                    {recommendedAction.label}
                  </h2>
                  <p className="ohCardText">{recommendedAction.description}</p>
                </div>

                <Link href={recommendedAction.href} className="primaryBtn">
                  {recommendedAction.buttonText}
                </Link>
              </div>
            </section>
<section className="ohMetricGrid">
  <article className="ohMetricCard">
    <span className="ohMetricLabel">
      {text(
        "Assessments",
        "التقييمات"
      )}
    </span>

    <span className="ohMetricValue">
      {assessmentCount}
    </span>

    <span className="ohMetricHint">
      {officialPassport?.status === "ready"
        ? text(
            "Connected to your official Health Passport",
            "مرتبطة بجواز الصحة الرسمي"
          )
        : text(
            "Saved assessment records",
            "سجلات تقييم محفوظة"
          )}
    </span>
  </article>

  <article className="ohMetricCard">
    <span className="ohMetricLabel">
      Check-Ins
    </span>

    <span className="ohMetricValue">
      {checkInCount}
    </span>

    <span className="ohMetricHint">
      {officialPassport?.status === "ready"
        ? text(
            "Included in your health timeline",
            "مدرجة في المسار الصحي"
          )
        : text(
            "Wellness updates saved",
            "تحديثات عافية محفوظة"
          )}
    </span>
  </article>

  <article className="ohMetricCard">
    <span className="ohMetricLabel">
      {text(
        "Reports",
        "التقارير"
      )}
    </span>

    <span className="ohMetricValue">
      {reportCount}
    </span>

    <span className="ohMetricHint">
      {isArabic
        ? `${processedReports} مكتمل · ${pendingReports} قيد الانتظار`
        : `${processedReports} processed · ${pendingReports} pending`}
    </span>
  </article>

  <article className="ohMetricCard">
    <span className="ohMetricLabel">
      {text(
        "Saved Analysis",
        "التحليل الصحي المحفوظ"
      )}
    </span>

    <span className="ohMetricValue">
      {analysisCount}
    </span>

    <span className="ohMetricHint">
      {officialPassport?.status === "ready"
        ? text(
            "Connected intelligence results",
            "نتائج ذكاء صحي مترابطة"
          )
        : text(
            "Connected to your reports",
            "مرتبطة بتقاريرك"
          )}
    </span>
  </article>
</section>
            <section className="ohGrid cols2">
  <HistoryTrendCard
    assessmentTrend={assessmentTrend}
    wellnessTrend={wellnessTrend}
    isArabic={isArabic}
  />

  <HistoryPriorityCard
    priorityAssessment={
      priorityAssessment
        ? {
            module: localizeModuleName(
              priorityAssessment.module_name
            ),
            score: priorityAssessment.score,
          }
        : null
    }
    bestAssessment={
      bestAssessment
        ? {
            module: localizeModuleName(
              bestAssessment.module_name
            ),
            score: bestAssessment.score,
          }
        : null
    }
    isArabic={isArabic}
  />
</section>

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Filter Timeline", "تصفية المسار")}
                  </p>
                  <h2 className="ohCardTitle">
                    {text("Focus your health history", "ركّز التاريخ الصحي")}
                  </h2>
                </div>
              </div>

              <div className="ohButtonRow">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    className={
                      selectedFilter === filter.value ? "primaryBtn" : "secondaryBtn"
                    }
                    onClick={() => setSelectedFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Progress Timeline", "مسار التقدم")}
                  </p>
                  <h2 className="ohCardTitle">
                    {text("Every health event in one place", "كل حدث صحي في مكان واحد")}
                  </h2>
                </div>

                <span className="ohStatusBadge neutral">
                  {filteredTimeline.length}{" "}
                  {text("record(s)", "سجل")}
                </span>
              </div>

              {!hasAnyHistory ? (
                <div className="ohEmptyState">
                  <h2>{text("No saved progress yet", "لا يوجد تقدم محفوظ بعد")}</h2>
                  <p>
                    {text(
                      "Start with an assessment or daily check-in to build your progress timeline.",
                      "ابدأ بتقييم أو Check-In يومي لبناء مسار التقدم الخاص بك."
                    )}
                  </p>

                  <div className="ohButtonRow" style={{ justifyContent: "center", marginTop: "18px" }}>
                    <Link href="/assessment" className="primaryBtn">
                      {text("Start Assessment", "ابدأ التقييم")}
                    </Link>

                    <Link href="/checkin" className="secondaryBtn">
                      {text("Open Check-In", "افتح Check-In")}
                    </Link>
                  </div>
                </div>
              ) : filteredTimeline.length === 0 ? (
                <div className="ohEmptyState">
                  <h2>{text("No records found", "لا توجد سجلات")}</h2>
                  <p>
                    {text(
                      "No records were found for this filter.",
                      "لا توجد سجلات لهذا الفلتر."
                    )}
                  </p>
                </div>
              ) : (
                <div className="ohTimeline">
                  {filteredTimeline.map((item) => (
                    <div className="ohTimelineItem" key={item.id}>
                      <span className="ohTimelineDot" />

                      <div>
                        <p className="ohTimelineTitle">
                          {getTimelineIcon(item.type)} {localizeType(item.type)}:{" "}
                          {item.title}
                        </p>

                        <p className="ohTimelineMeta">
                          {item.score !== null && item.score !== undefined
                            ? `${item.score}/100 · `
                            : ""}
                          {item.subtitle}
                        </p>

                        <p className="ohTimelineMeta">{formatDateTime(item.date)}</p>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                          flexWrap: "wrap",
                          justifyContent: isArabic ? "flex-start" : "flex-end",
                        }}
                      >
                        {item.score !== null && item.score !== undefined && (
                          <span className={`ohStatusBadge ${getTone(item.score)}`}>
                            {getScoreStatus(item.score)}
                          </span>
                        )}

                        <Link href={item.href} className="secondaryBtn">
                          {text("Open", "فتح")}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="ohTrustNotice">
              <span aria-hidden="true">🛡️</span>
              <div>
                <strong>
                  {text("Medical safety reminder", "تذكير السلامة الطبية")}
                </strong>
                <br />
                {text(
                  "This timeline organizes health information for education and follow-up preparation. It does not diagnose disease or replace emergency care or a licensed clinician.",
                  "هذا المسار ينظم المعلومات الصحية للتعليم والتحضير للمتابعة. لا يشخّص المرض ولا يستبدل الرعاية الطارئة أو الطبيب المختص."
                )}
              </div>
            </section>

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("History Journey", "رحلة التاريخ الصحي")}
                  </p>
                  <h2 className="ohCardTitle">
                    {text(
                      "Continue from your progress timeline",
                      "تابع من مسار التقدم الخاص بك"
                    )}
                  </h2>
                  <p className="ohCardText">
                    {text(
                      "Your history connects assessments, wellness check-ins, reports, saved intelligence, and your follow-up plan.",
                      "يربط تاريخك الصحي بين التقييمات، Check-Ins، التقارير، التحليل الصحي المحفوظ، وخطة المتابعة."
                    )}
                  </p>
                </div>
              </div>

              <div className="ohButtonRow">
                <Link href="/dashboard" className="secondaryBtn">
                  {text("Dashboard", "لوحة التحكم")}
                </Link>

                <Link href="/profile" className="secondaryBtn">
                  {text("Profile", "الملف الشخصي")}
                </Link>

                <Link href="/checkin" className="secondaryBtn">
                  Check-In
                </Link>

                <Link href="/reports" className="secondaryBtn">
                  {text("Reports", "التقارير")}
                </Link>

                <Link href="/reports" className="secondaryBtn">
                  {text("Analysis", "تحليل التقارير")}
                </Link>

                <Link href="/health-plan" className="primaryBtn">
                  {text("Health Plan", "الخطة الصحية")}
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
      <style>{`
        /* ORGANHEAL_FOLLOWUP_CLEAN_V4 */

        .followUpCleanV4 {
          min-height: 100vh !important;
          background:
            radial-gradient(circle at 12% 5%, rgba(6, 182, 212, 0.22), transparent 28%),
            radial-gradient(circle at 88% 18%, rgba(15, 118, 110, 0.26), transparent 34%),
            linear-gradient(180deg, #dbeafe 0%, #d9e5ec 45%, #f8fafc 100%) !important;
          color: #0f172a !important;
        }

        .followUpCleanV4 .ohContainer,
        .followUpCleanV4 [class*="Container"] {
          max-width: 1180px !important;
        }

        .followUpCleanV4 .organhealBackButton,
        .followUpCleanV4 .ohContainer > a[href="/dashboard"],
        .followUpCleanV4 .ohContainer > div:first-child a[href="/dashboard"] {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: fit-content !important;
          min-height: 44px !important;
          padding: 0 18px !important;
          margin: 0 0 18px 0 !important;
          border-radius: 999px !important;
          background: #0f172a !important;
          color: #ffffff !important;
          border: 1px solid rgba(15, 23, 42, 0.25) !important;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24) !important;
          font-weight: 950 !important;
          font-size: 0.9rem !important;
          text-decoration: none !important;
        }

        /* Main hero only */
        .followUpCleanV4 .ohHero,
        .followUpCleanV4 [class*="Hero"],
        .followUpCleanV4 .ohContainer > section:first-of-type {
          border-radius: 32px !important;
          background:
            radial-gradient(circle at 86% 10%, rgba(20, 184, 166, 0.46), transparent 36%),
            linear-gradient(135deg, #061826 0%, #0f172a 42%, #0f766e 100%) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          box-shadow: 0 34px 90px rgba(15, 23, 42, 0.36) !important;
        }

        .followUpCleanV4 .ohHero :is(h1,h2,h3,h4,p,span,strong,small,label),
        .followUpCleanV4 [class*="Hero"] :is(h1,h2,h3,h4,p,span,strong,small,label),
        .followUpCleanV4 .ohContainer > section:first-of-type :is(h1,h2,h3,h4,p,span,strong,small,label) {
          color: #ffffff !important;
        }

        .followUpCleanV4 .ohEyebrow,
        .followUpCleanV4 [class*="Eyebrow"] {
          background: rgba(209, 250, 229, 0.18) !important;
          color: #d1fae5 !important;
          border: 1px solid rgba(209, 250, 229, 0.34) !important;
          font-weight: 950 !important;
        }

        /* Normal content panels must stay white with dark readable text */
        .followUpCleanV4 .ohContainer > section:not(:first-of-type),
        .followUpCleanV4 .ohCard,
        .followUpCleanV4 .ohActionPanel,
        .followUpCleanV4 form,
        .followUpCleanV4 article {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid rgba(15, 23, 42, 0.14) !important;
          border-radius: 28px !important;
          box-shadow: 0 22px 58px rgba(15, 23, 42, 0.13) !important;
        }

        .followUpCleanV4 .ohContainer > section:not(:first-of-type) :is(h1,h2,h3,h4,p,span,strong,small,label,li,div),
        .followUpCleanV4 .ohCard :is(h1,h2,h3,h4,p,span,strong,small,label,li,div),
        .followUpCleanV4 .ohActionPanel :is(h1,h2,h3,h4,p,span,strong,small,label,li,div),
        .followUpCleanV4 form :is(h1,h2,h3,h4,p,span,strong,small,label,li,div),
        .followUpCleanV4 article :is(h1,h2,h3,h4,p,span,strong,small,label,li,div) {
          color: #0f172a !important;
        }

        .followUpCleanV4 p,
        .followUpCleanV4 small,
        .followUpCleanV4 li {
          color: #334155 !important;
          font-weight: 720 !important;
          line-height: 1.65 !important;
        }

        .followUpCleanV4 h1,
        .followUpCleanV4 h2,
        .followUpCleanV4 h3,
        .followUpCleanV4 h4,
        .followUpCleanV4 strong,
        .followUpCleanV4 label {
          color: #0f172a !important;
          font-weight: 950 !important;
        }

        /* Section title bars only */
        .followUpCleanV4 .ohCardHeader {
          background: linear-gradient(135deg, #061826, #0f766e) !important;
          border-radius: 22px !important;
          padding: 16px !important;
          border: 0 !important;
          margin-bottom: 18px !important;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.18) !important;
        }

        .followUpCleanV4 .ohCardHeader,
        .followUpCleanV4 .ohCardHeader * {
          color: #ffffff !important;
        }

        /* Strong stat cards only */
        .followUpCleanV4 .ohMetricGrid > *,
        .followUpCleanV4 [class*="MetricGrid"] > *,
        .followUpCleanV4 [class*="StatsGrid"] > * {
          min-height: 142px !important;
          border: 0 !important;
          overflow: hidden !important;
          color: #ffffff !important;
          border-radius: 24px !important;
          box-shadow: 0 24px 62px rgba(15, 23, 42, 0.24) !important;
        }

        .followUpCleanV4 .ohMetricGrid > *:nth-child(1),
        .followUpCleanV4 [class*="MetricGrid"] > *:nth-child(1),
        .followUpCleanV4 [class*="StatsGrid"] > *:nth-child(1) {
          background: linear-gradient(135deg, #1d4ed8, #0f766e) !important;
        }

        .followUpCleanV4 .ohMetricGrid > *:nth-child(2),
        .followUpCleanV4 [class*="MetricGrid"] > *:nth-child(2),
        .followUpCleanV4 [class*="StatsGrid"] > *:nth-child(2) {
          background: linear-gradient(135deg, #0f766e, #06b6d4) !important;
        }

        .followUpCleanV4 .ohMetricGrid > *:nth-child(3),
        .followUpCleanV4 [class*="MetricGrid"] > *:nth-child(3),
        .followUpCleanV4 [class*="StatsGrid"] > *:nth-child(3) {
          background: linear-gradient(135deg, #047857, #10b981) !important;
        }

        .followUpCleanV4 .ohMetricGrid > *:nth-child(4),
        .followUpCleanV4 [class*="MetricGrid"] > *:nth-child(4),
        .followUpCleanV4 [class*="StatsGrid"] > *:nth-child(4) {
          background: linear-gradient(135deg, #b45309, #f59e0b) !important;
        }

        .followUpCleanV4 .ohMetricGrid > * *,
        .followUpCleanV4 [class*="MetricGrid"] > * *,
        .followUpCleanV4 [class*="StatsGrid"] > * * {
          color: #ffffff !important;
        }

        /* Buttons: force readable contrast */
        .followUpCleanV4 button,
        .followUpCleanV4 a[href] {
          font-weight: 950 !important;
          text-decoration: none !important;
        }

        .followUpCleanV4 .primaryBtn,
        .followUpCleanV4 button[type="submit"],
        .followUpCleanV4 a[class*="Primary"],
        .followUpCleanV4 button[class*="Primary"],
        .followUpCleanV4 .ohHero a[href],
        .followUpCleanV4 [class*="Hero"] a[href] {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 42px !important;
          padding: 0 16px !important;
          border-radius: 999px !important;
          background: linear-gradient(135deg, #06b6d4, #14b8a6) !important;
          color: #061826 !important;
          border: 0 !important;
          box-shadow: 0 16px 40px rgba(6, 182, 212, 0.35) !important;
        }

        .followUpCleanV4 .primaryBtn *,
        .followUpCleanV4 button[type="submit"] *,
        .followUpCleanV4 a[class*="Primary"] *,
        .followUpCleanV4 button[class*="Primary"] *,
        .followUpCleanV4 .ohHero a[href] *,
        .followUpCleanV4 [class*="Hero"] a[href] * {
          color: #061826 !important;
        }

        .followUpCleanV4 .secondaryBtn,
        .followUpCleanV4 a[class*="Secondary"],
        .followUpCleanV4 button[class*="Secondary"],
        .followUpCleanV4 .ohContainer > section:not(:first-of-type) a[href] {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 38px !important;
          padding: 0 14px !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #0f766e !important;
          border: 1px solid rgba(15, 118, 110, 0.34) !important;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10) !important;
        }

        .followUpCleanV4 .secondaryBtn *,
        .followUpCleanV4 a[class*="Secondary"] *,
        .followUpCleanV4 button[class*="Secondary"] *,
        .followUpCleanV4 .ohContainer > section:not(:first-of-type) a[href] * {
          color: #0f766e !important;
        }

        .followUpCleanV4 input,
        .followUpCleanV4 select,
        .followUpCleanV4 textarea {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid rgba(15, 23, 42, 0.22) !important;
          border-radius: 14px !important;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08) !important;
        }

        .followUpCleanV4 input::placeholder,
        .followUpCleanV4 textarea::placeholder {
          color: #64748b !important;
          opacity: 1 !important;
        }

        .followUpCleanV4 input[type="range"] {
          accent-color: #0f766e !important;
          box-shadow: none !important;
        }

        /* Safety: any white pills must show text */
        .followUpCleanV4 [style*="background: white"],
        .followUpCleanV4 [style*="background:#fff"],
        .followUpCleanV4 [style*="background: #fff"],
        .followUpCleanV4 [style*="background-color: white"],
        .followUpCleanV4 [style*="background-color:#fff"],
        .followUpCleanV4 [style*="background-color: #fff"] {
          color: #0f172a !important;
        }

        .followUpCleanV4 [style*="background: white"] *,
        .followUpCleanV4 [style*="background:#fff"] *,
        .followUpCleanV4 [style*="background: #fff"] *,
        .followUpCleanV4 [style*="background-color: white"] *,
        .followUpCleanV4 [style*="background-color:#fff"] *,
        .followUpCleanV4 [style*="background-color: #fff"] * {
          color: #0f172a !important;
        }
      `}</style>
      <style>{`
        /* ORGANHEAL_FOLLOWUP_FINISH_V5 */

        /* Fix dark section title bars: text must be white, not hidden */
        .followUpCleanV4 .ohContainer > section:not(:first-of-type) > div:first-child,
        .followUpCleanV4 .ohCard > div:first-child,
        .followUpCleanV4 article > div:first-child,
        .followUpCleanV4 form > div:first-child {
          padding: 18px !important;
          border-radius: 22px !important;
          background: linear-gradient(135deg, #061826 0%, #0f766e 100%) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.18) !important;
          margin-bottom: 18px !important;
        }

        .followUpCleanV4 .ohContainer > section:not(:first-of-type) > div:first-child :is(h1,h2,h3,h4,p,span,strong,small,label,div),
        .followUpCleanV4 .ohCard > div:first-child :is(h1,h2,h3,h4,p,span,strong,small,label,div),
        .followUpCleanV4 article > div:first-child :is(h1,h2,h3,h4,p,span,strong,small,label,div),
        .followUpCleanV4 form > div:first-child :is(h1,h2,h3,h4,p,span,strong,small,label,div) {
          color: #ffffff !important;
          opacity: 1 !important;
        }

        .followUpCleanV4 .ohContainer > section:not(:first-of-type) > div:first-child p,
        .followUpCleanV4 .ohCard > div:first-child p,
        .followUpCleanV4 article > div:first-child p,
        .followUpCleanV4 form > div:first-child p {
          color: rgba(226, 232, 240, 0.94) !important;
          font-weight: 760 !important;
        }

        /* But keep inputs/selects inside forms readable */
        .followUpCleanV4 form > div:first-child input,
        .followUpCleanV4 form > div:first-child select,
        .followUpCleanV4 form > div:first-child textarea,
        .followUpCleanV4 .ohContainer > section:not(:first-of-type) > div:first-child input,
        .followUpCleanV4 .ohContainer > section:not(:first-of-type) > div:first-child select,
        .followUpCleanV4 .ohContainer > section:not(:first-of-type) > div:first-child textarea {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid rgba(15, 23, 42, 0.22) !important;
        }

        /* Fix buttons on dark bars */
        .followUpCleanV4 .ohContainer > section:not(:first-of-type) > div:first-child a[href],
        .followUpCleanV4 .ohContainer > section:not(:first-of-type) > div:first-child button,
        .followUpCleanV4 .ohCard > div:first-child a[href],
        .followUpCleanV4 .ohCard > div:first-child button,
        .followUpCleanV4 article > div:first-child a[href],
        .followUpCleanV4 article > div:first-child button {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 40px !important;
          padding: 0 16px !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #0f766e !important;
          border: 1px solid rgba(255, 255, 255, 0.78) !important;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18) !important;
          font-weight: 950 !important;
          text-decoration: none !important;
        }

        .followUpCleanV4 .ohContainer > section:not(:first-of-type) > div:first-child a[href] *,
        .followUpCleanV4 .ohContainer > section:not(:first-of-type) > div:first-child button *,
        .followUpCleanV4 .ohCard > div:first-child a[href] *,
        .followUpCleanV4 .ohCard > div:first-child button *,
        .followUpCleanV4 article > div:first-child a[href] *,
        .followUpCleanV4 article > div:first-child button * {
          color: #0f766e !important;
        }

        /* Improve hero right preview card */
        .followUpCleanV4 .ohHero aside,
        .followUpCleanV4 [class*="Hero"] aside,
        .followUpCleanV4 .ohHero .ohCard,
        .followUpCleanV4 [class*="Hero"] .ohCard,
        .followUpCleanV4 .ohContainer > section:first-of-type aside,
        .followUpCleanV4 .ohContainer > section:first-of-type .ohCard {
          min-width: 260px !important;
          min-height: 300px !important;
          padding: 24px !important;
          border-radius: 26px !important;
          background: #ffffff !important;
          color: #0f172a !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          box-shadow: 0 30px 78px rgba(0, 0, 0, 0.24) !important;
        }

        .followUpCleanV4 .ohHero aside *,
        .followUpCleanV4 [class*="Hero"] aside *,
        .followUpCleanV4 .ohHero .ohCard *,
        .followUpCleanV4 [class*="Hero"] .ohCard *,
        .followUpCleanV4 .ohContainer > section:first-of-type aside *,
        .followUpCleanV4 .ohContainer > section:first-of-type .ohCard * {
          color: #0f172a !important;
        }

        .followUpCleanV4 .ohHero aside > div:first-child,
        .followUpCleanV4 [class*="Hero"] aside > div:first-child,
        .followUpCleanV4 .ohHero .ohCard > div:first-child,
        .followUpCleanV4 [class*="Hero"] .ohCard > div:first-child,
        .followUpCleanV4 .ohContainer > section:first-of-type aside > div:first-child,
        .followUpCleanV4 .ohContainer > section:first-of-type .ohCard > div:first-child {
          background: linear-gradient(135deg, #061826, #0f766e) !important;
          color: #ffffff !important;
          border-radius: 18px !important;
          padding: 14px !important;
          margin-bottom: 18px !important;
        }

        .followUpCleanV4 .ohHero aside > div:first-child *,
        .followUpCleanV4 [class*="Hero"] aside > div:first-child *,
        .followUpCleanV4 .ohHero .ohCard > div:first-child *,
        .followUpCleanV4 [class*="Hero"] .ohCard > div:first-child *,
        .followUpCleanV4 .ohContainer > section:first-of-type aside > div:first-child *,
        .followUpCleanV4 .ohContainer > section:first-of-type .ohCard > div:first-child * {
          color: #ffffff !important;
        }

        /* Make empty right-side circle stronger and useful visually */
        .followUpCleanV4 .ohHero svg,
        .followUpCleanV4 [class*="Hero"] svg,
        .followUpCleanV4 .ohContainer > section:first-of-type svg {
          width: 132px !important;
          height: 132px !important;
          display: block !important;
          margin: 14px auto !important;
          filter: drop-shadow(0 14px 24px rgba(15, 23, 42, 0.18)) !important;
        }

        .followUpCleanV4 .ohHero aside::after,
        .followUpCleanV4 [class*="Hero"] aside::after,
        .followUpCleanV4 .ohHero .ohCard::after,
        .followUpCleanV4 [class*="Hero"] .ohCard::after,
        .followUpCleanV4 .ohContainer > section:first-of-type aside::after,
        .followUpCleanV4 .ohContainer > section:first-of-type .ohCard::after {
          content: "Live health signal";
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          border-radius: 14px;
          background: #f8fafc;
          color: #0f766e;
          border: 1px solid rgba(15, 118, 110, 0.18);
          font-weight: 950;
          margin-top: 14px;
        }

        /* Fix text too close to dark box edges */
        .followUpCleanV4 .ohHero,
        .followUpCleanV4 [class*="Hero"],
        .followUpCleanV4 .ohContainer > section:first-of-type {
          padding: 38px !important;
        }

        .followUpCleanV4 .ohHero h1,
        .followUpCleanV4 [class*="Hero"] h1,
        .followUpCleanV4 .ohContainer > section:first-of-type h1 {
          line-height: 1.02 !important;
          letter-spacing: -0.045em !important;
          max-width: 740px !important;
        }

        .followUpCleanV4 .ohHero p,
        .followUpCleanV4 [class*="Hero"] p,
        .followUpCleanV4 .ohContainer > section:first-of-type p {
          max-width: 760px !important;
          line-height: 1.75 !important;
          margin-top: 14px !important;
        }

        /* Improve white pills/buttons visibility everywhere */
        .followUpCleanV4 a[href],
        .followUpCleanV4 button {
          opacity: 1 !important;
          text-shadow: none !important;
        }

        .followUpCleanV4 a[href]:not(.organhealBackButton):not([class*="Primary"]),
        .followUpCleanV4 button:not([class*="Primary"]) {
          color: #0f766e !important;
        }

        .followUpCleanV4 a[href]:not(.organhealBackButton):not([class*="Primary"]) *,
        .followUpCleanV4 button:not([class*="Primary"]) * {
          color: #0f766e !important;
        }
      `}</style></main>
  );
}



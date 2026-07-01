"use client";

import PageBackActions from "../components/PageBackActions";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

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

type SavedIntelligence = {
  insight_id: number;
  updated_at: string | null;
};

type TimelineItem = {
  id: string;
  type: "Assessment" | "Check-In" | "Report" | "Analysis";
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
  const [savedIntelligence, setSavedIntelligence] = useState<SavedIntelligence[]>(
    []
  );

  const [selectedFilter, setSelectedFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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

  function localizeType(value: TimelineItem["type"]) {
    if (!isArabic) return value;

    if (value === "Assessment") return "تقييم";
    if (value === "Check-In") return "Check-In";
    if (value === "Report") return "تقرير";
    if (value === "Analysis") return "ذكاء صحي";

    return value;
  }

  function getTimelineIcon(value: TimelineItem["type"]) {
    if (value === "Assessment") return "🧭";
    if (value === "Check-In") return "✅";
    if (value === "Report") return "📄";
    if (value === "Analysis") return "🧠";
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

    let savedDataRows: SavedIntelligence[] = [];

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
    setSavedIntelligence(savedDataRows);
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

  const savedIntelligenceIds = new Set(
    savedIntelligence.map((item) => item.insight_id)
  );

  const generatedInsights = healthInsights.filter(
    (item) => item.ai_status === "Generated" || savedIntelligenceIds.has(item.id)
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

  const timelineItems: TimelineItem[] = [
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
      title: item.insight_title || text("Saved health analysis", "ذكاء صحي محفوظ"),
      subtitle:
        item.ai_status === "Generated"
          ? text("Saved analysis result", "نتيجة ذكاء صحي مولدة")
          : text("Saved intelligence result", "نتيجة ذكاء صحي محفوظة"),
      score: null,
      date: item.created_at || new Date().toISOString(),
      href: "/reports",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filters = [
    { value: "All", label: text("All", "الكل") },
    { value: "Assessment", label: text("Assessment", "التقييمات") },
    { value: "Check-In", label: "Check-In" },
    { value: "Report", label: text("Report", "التقارير") },
    { value: "Analysis", label: text("Analysis", "التحليل الصحي") },
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
      : savedIntelligence.length === 0
      ? {
          label: text("Generate saved intelligence", "ولّد ذكاء صحي محفوظ"),
          description: text(
            "Open Report Analysis to generate and save report-based health analysis.",
            "افتح تحليل التقارير لتوليد وحفظ ذكاء صحي مبني على التقارير."
          ),
          href: "/reports",
          buttonText: text("Review Analysis", "افتح تحليل التقارير"),
        }
      : {
          label: text("Continue your follow-up plan", "تابع خطة المتابعة"),
          description: text(
            "Your history has assessments, check-ins, reports, and saved intelligence. Continue with your health plan.",
            "يحتوي تاريخك الصحي على تقييمات، Check-Ins، تقارير، وذكاء صحي محفوظ. تابع إلى الخطة الصحية."
          ),
          href: "/health-plan",
          buttonText: text("Open Health Plan", "افتح الخطة الصحية"),
        };

  const hasAnyHistory = timelineItems.length > 0;

  const scoreRingStyle = {
    "--score": Math.max(0, Math.min(100, overallProgressScore)),
  } as CSSProperties;

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"}>
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
                    {text("Health Journey Command Timeline", "مسار قيادة الرحلة الصحية")}
                  </p>

                  <h1 className="ohTitle">
                    {text("Progress Timeline", "مسار التقدم")}
                  </h1>

                  <p className="ohLead">
                    {text(
                      "Review your assessments, wellness check-ins, uploaded reports, saved intelligence, trends, and the next best action in one connected view.",
                      "راجع التقييمات، Check-Ins، التقارير المرفوعة، التحليل الصحي المحفوظ، الاتجاهات، والخطوة التالية الأفضل في عرض واحد مترابط."
                    )}
                  </p>

                  <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                    <Link href={recommendedAction.href} className="primaryBtn">
                      {recommendedAction.buttonText}
                    </Link>

                    <Link href="/dashboard" className="secondaryBtn">
                      {text("Open Dashboard", "فتح لوحة التحكم")}
                    </Link>
                  </div>
                </div>

                <div className="ohCard">
                  <div className="ohCardHeader">
                    <div>
                      <p className="ohMetricLabel">
                        {text("Overall Progress Score", "مؤشر التقدم العام")}
                      </p>
                      <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                        {allScores.length > 0
                          ? getScoreStatus(overallProgressScore)
                          : text("No Data Yet", "لا توجد بيانات بعد")}
                      </h2>
                    </div>

                    <span
                      className={`ohStatusBadge ${
                        allScores.length > 0 ? getTone(overallProgressScore) : "neutral"
                      }`}
                    >
                      {allScores.length > 0
                        ? `${overallProgressScore}/100`
                        : text("Pending", "بانتظار")}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      placeItems: "center",
                      margin: "18px 0",
                    }}
                  >
                    <div className="ohScoreRing" style={scoreRingStyle}>
                      <div>
                        <strong>{allScores.length > 0 ? overallProgressScore : 0}</strong>
                        <span>{text("progress", "تقدم")}</span>
                      </div>
                    </div>
                  </div>

                  <p className="ohCardText">
                    {text(
                      "This score averages saved assessments and wellness check-ins.",
                      "هذا المؤشر يحسب متوسط التقييمات المحفوظة و Check-Ins الصحية."
                    )}
                  </p>
                </div>
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
                  {text("Assessments", "التقييمات")}
                </span>
                <span className="ohMetricValue">{history.length}</span>
                <span className="ohMetricHint">
                  {text("Saved assessment records", "سجلات تقييم محفوظة")}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">Check-Ins</span>
                <span className="ohMetricValue">{dailyCheckIns.length}</span>
                <span className="ohMetricHint">
                  {text("Wellness updates saved", "تحديثات عافية محفوظة")}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Reports", "التقارير")}
                </span>
                <span className="ohMetricValue">{uploadedReports.length}</span>
                <span className="ohMetricHint">
                  {isArabic
                    ? `${processedReports} مكتمل · ${pendingReports} قيد الانتظار`
                    : `${processedReports} processed · ${pendingReports} pending`}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Saved Analysis", "التحليل الصحي المحفوظ")}
                </span>
                <span className="ohMetricValue">{savedIntelligence.length}</span>
                <span className="ohMetricHint">
                  {text("Connected to your reports", "مرتبط بتقاريرك")}
                </span>
              </article>
            </section>

            <section className="ohGrid cols2">
              <article className="ohCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text("Progress Trends", "اتجاهات التقدم")}
                    </p>
                    <h2 className="ohCardTitle">
                      {text("What changed recently?", "ما الذي تغيّر مؤخرًا؟")}
                    </h2>
                  </div>
                </div>

                <div className="ohStack">
                  <div>
                    <span className={`ohStatusBadge ${assessmentTrend.tone}`}>
                      {assessmentTrend.label}
                    </span>
                    <p className="ohCardText">{assessmentTrend.description}</p>
                  </div>

                  <div>
                    <span className={`ohStatusBadge ${wellnessTrend.tone}`}>
                      {wellnessTrend.label}
                    </span>
                    <p className="ohCardText">{wellnessTrend.description}</p>
                  </div>
                </div>
              </article>

              <article className="ohCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text("Priority & Best Records", "الأولوية وأفضل السجلات")}
                    </p>
                    <h2 className="ohCardTitle">
                      {text("Signals from your timeline", "إشارات من مسارك")}
                    </h2>
                  </div>
                </div>

                <div className="ohStack">
                  <div>
                    <strong>{text("Priority Focus", "الأولوية الصحية")}</strong>
                    <p className="ohCardText">
                      {priorityAssessment
                        ? isArabic
                          ? `${localizeModuleName(priorityAssessment.module_name)} · أقل مؤشر: ${priorityAssessment.score}/100`
                          : `${priorityAssessment.module_name} · Lowest score: ${priorityAssessment.score}/100`
                        : text(
                            "Complete assessments to identify a priority area.",
                            "أكمل التقييمات لتحديد منطقة الأولوية."
                          )}
                    </p>
                  </div>

                  <div>
                    <strong>{text("Best Assessment", "أفضل تقييم")}</strong>
                    <p className="ohCardText">
                      {bestAssessment
                        ? `${localizeModuleName(bestAssessment.module_name)} · ${bestAssessment.score}/100`
                        : text("No assessment yet", "لا يوجد تقييم بعد")}
                    </p>
                  </div>

                  <div>
                    <strong>{text("Latest Check-In", "آخر Check-In")}</strong>
                    <p className="ohCardText">
                      {latestCheckIn
                        ? `${latestCheckIn.wellness_score}/100 · ${latestCheckIn.mood}`
                        : text("No check-in yet", "لا يوجد Check-In بعد")}
                    </p>
                  </div>
                </div>
              </article>
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
    </main>
  );
}



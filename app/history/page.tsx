"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useMemo, useState } from "react";
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
  type: "Assessment" | "Check-In" | "Report" | "Intelligence";
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
    if (!value) return isArabic ? "غير متاح" : "Not available";
    return new Date(value).toLocaleString(isArabic ? "ar-AE" : "en-US");
  }

  function localizeModuleName(value: string | null | undefined) {
    if (!value) return isArabic ? "غير متاح" : "N/A";
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
    if (!value) return isArabic ? "تم حفظ التقييم" : "Assessment saved";
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
    if (value === "Intelligence") return "ذكاء صحي";

    return value;
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

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 60) return "moderateScore";
    return "riskScore";
  }

  function getScoreStatus(score: number) {
    if (score >= 80) return text("Strong", "قوي");
    if (score >= 60) return text("Stable", "مستقر");
    if (score >= 40) return text("Needs Attention", "يحتاج انتباه");
    return text("Recovery Needed", "يحتاج تعافي");
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
        className: "",
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
        className: "goodScore",
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
        className: "riskScore",
      };
    }

    return {
      label: isArabic ? "التقييم مستقر" : "Assessment progress stable",
      description: isArabic
        ? "آخر مؤشر تقييم لديك مستقر مقارنة بالسجل السابق."
        : "Your latest assessment score is stable compared with the previous record.",
      className: "moderateScore",
    };
  }, [history, isArabic]);

  const wellnessTrend = useMemo(() => {
    if (dailyCheckIns.length < 2) {
      return {
        label: isArabic ? "اتجاه العافية غير جاهز" : "Wellness trend not ready",
        description: isArabic
          ? "أكمل Check-In مرتين على الأقل لمقارنة حركة العافية."
          : "Complete at least two check-ins to compare wellness movement.",
        className: "",
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
        className: "goodScore",
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
        className: "riskScore",
      };
    }

    return {
      label: isArabic ? "العافية مستقرة" : "Wellness stable",
      description: isArabic
        ? "مؤشر العافية لديك بقي ثابتًا مقارنة بآخر Check-In."
        : "Your wellness score stayed the same compared with your previous check-in.",
      className: "moderateScore",
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
      type: "Intelligence" as const,
      title: item.insight_title || text("Saved health intelligence", "ذكاء صحي محفوظ"),
      subtitle:
        item.ai_status === "Generated"
          ? text("Generated intelligence result", "نتيجة ذكاء صحي مولدة")
          : text("Saved intelligence result", "نتيجة ذكاء صحي محفوظة"),
      score: null,
      date: item.created_at || new Date().toISOString(),
      href: "/intelligence",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filters = [
    { value: "All", label: text("All", "الكل") },
    { value: "Assessment", label: text("Assessment", "التقييمات") },
    { value: "Check-In", label: "Check-In" },
    { value: "Report", label: text("Report", "التقارير") },
    { value: "Intelligence", label: text("Intelligence", "الذكاء الصحي") },
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
            "Open Intelligence Center to generate and save report-based health intelligence.",
            "افتح مركز الذكاء لتوليد وحفظ ذكاء صحي مبني على التقارير."
          ),
          href: "/intelligence",
          buttonText: text("Open Intelligence", "افتح مركز الذكاء"),
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

  return (
    <main className="assistantPage" dir={isArabic ? "rtl" : "ltr"}>
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">
            {text("HEALTH HISTORY", "التاريخ الصحي")}
          </p>
          <h1>{text("Progress Timeline", "مسار التقدم")}</h1>
          <p>
            {text(
              "Review your assessments, wellness check-ins, uploaded reports, saved intelligence, trends, and recommended next step.",
              "راجع التقييمات، Check-Ins، التقارير المرفوعة، الذكاء الصحي المحفوظ، الاتجاهات، والخطوة التالية المقترحة."
            )}
          </p>
        </div>

        <div className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">
                {text("Loading History", "تحميل التاريخ الصحي")}
              </p>
              <h2>
                {text(
                  "Preparing your progress timeline...",
                  "جاري تحضير مسار التقدم..."
                )}
              </h2>
            </div>
          )}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">
                {text("Login Required", "تسجيل الدخول مطلوب")}
              </p>
              <h2>{text("Access Protected", "الوصول محمي")}</h2>
              <p>{message}</p>

              <Link href="/login" className="primaryBtn">
                {text("Login", "تسجيل الدخول")}
              </Link>
            </div>
          )}

          {!loading && !message && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Recommended Next Step", "الخطوة التالية المقترحة")}
                </p>

                <h2>{recommendedAction.label}</h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    marginBottom: "18px",
                  }}
                >
                  {recommendedAction.description}
                </p>

                <Link href={recommendedAction.href} className="primaryBtn">
                  {recommendedAction.buttonText}
                </Link>
              </div>

              <div className="assessmentForm">
                <div className="resultBox">
                  <p className="sectionLabel">
                    {text("Overall Progress Score", "مؤشر التقدم العام")}
                  </p>
                  <h2 className={getScoreClass(overallProgressScore)}>
                    {overallProgressScore}/100
                  </h2>
                  <h3>
                    {allScores.length > 0
                      ? getScoreStatus(overallProgressScore)
                      : text("No Data Yet", "لا توجد بيانات بعد")}
                  </h3>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">{text("Assessments", "التقييمات")}</p>
                  <h2>{history.length}</h2>
                  <p>
                    {text(
                      "Total saved assessment records.",
                      "إجمالي سجلات التقييم المحفوظة."
                    )}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">Check-Ins</p>
                  <h2>{dailyCheckIns.length}</h2>
                  <p>
                    {text(
                      "Total wellness check-ins saved.",
                      "إجمالي Check-Ins الصحية المحفوظة."
                    )}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">{text("Reports", "التقارير")}</p>
                  <h2>{uploadedReports.length}</h2>
                  <p>
                    {isArabic
                      ? `${processedReports} مكتمل · ${pendingReports} قيد الانتظار`
                      : `${processedReports} processed · ${pendingReports} pending`}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {text("Saved Intelligence", "الذكاء الصحي المحفوظ")}
                  </p>
                  <h2>{savedIntelligence.length}</h2>
                  <p>
                    {text(
                      "Saved intelligence results connected to your reports.",
                      "نتائج ذكاء صحي محفوظة ومرتبطة بتقاريرك."
                    )}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {text("Priority Focus", "الأولوية الصحية")}
                  </p>
                  <h2>{localizeModuleName(priorityAssessment?.module_name)}</h2>
                  <p>
                    {priorityAssessment
                      ? isArabic
                        ? `أقل مؤشر تقييم: ${priorityAssessment.score}/100`
                        : `Lowest assessment score: ${priorityAssessment.score}/100`
                      : text(
                          "Complete assessments to identify a priority area.",
                          "أكمل التقييمات لتحديد منطقة الأولوية."
                        )}
                  </p>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Progress Trends", "اتجاهات التقدم")}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "14px",
                    textAlign: isArabic ? "right" : "left",
                  }}
                >
                  <div>
                    <strong className={assessmentTrend.className}>
                      {assessmentTrend.label}
                    </strong>
                    <p>{assessmentTrend.description}</p>
                  </div>

                  <div>
                    <strong className={wellnessTrend.className}>
                      {wellnessTrend.label}
                    </strong>
                    <p>{wellnessTrend.description}</p>
                  </div>

                  <div>
                    <strong>{text("Best Assessment", "أفضل تقييم")}</strong>
                    <p>
                      {bestAssessment
                        ? `${localizeModuleName(bestAssessment.module_name)} · ${bestAssessment.score}/100`
                        : text("No assessment yet", "لا يوجد تقييم بعد")}
                    </p>
                  </div>

                  <div>
                    <strong>{text("Latest Check-In", "آخر Check-In")}</strong>
                    <p>
                      {latestCheckIn
                        ? `${latestCheckIn.wellness_score}/100 · ${latestCheckIn.mood}`
                        : text("No check-in yet", "لا يوجد Check-In بعد")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Filter Timeline", "تصفية المسار")}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
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
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Progress Timeline", "مسار التقدم")}
                </p>

                {!hasAnyHistory ? (
                  <>
                    <h2>{text("No saved progress yet", "لا يوجد تقدم محفوظ بعد")}</h2>
                    <p>
                      {text(
                        "Start with an assessment or daily check-in to build your progress timeline.",
                        "ابدأ بتقييم أو Check-In يومي لبناء مسار التقدم الخاص بك."
                      )}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        marginTop: "18px",
                      }}
                    >
                      <Link href="/assessment" className="primaryBtn">
                        {text("Start Assessment", "ابدأ التقييم")}
                      </Link>

                      <Link href="/checkin" className="secondaryBtn">
                        {text("Open Check-In", "افتح Check-In")}
                      </Link>
                    </div>
                  </>
                ) : filteredTimeline.length === 0 ? (
                  <p>
                    {text(
                      "No records found for this filter.",
                      "لا توجد سجلات لهذا الفلتر."
                    )}
                  </p>
                ) : (
                  <div className="healthTimeline">
                    {filteredTimeline.map((item) => (
                      <div className="timelineItem active" key={item.id}>
                        <strong>
                          {localizeType(item.type)}: {item.title}
                        </strong>

                        <span>
                          {item.score !== null && item.score !== undefined
                            ? `${item.score}/100 · `
                            : ""}
                          {item.subtitle}
                        </span>

                        <span>{formatDateTime(item.date)}</span>

                        <Link href={item.href} className="secondaryBtn">
                          {text("Open", "فتح")}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {text("History Journey", "رحلة التاريخ الصحي")}
                </p>

                <h2>
                  {text(
                    "Continue from your progress timeline",
                    "تابع من مسار التقدم الخاص بك"
                  )}
                </h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    maxWidth: "760px",
                    margin: "0 auto 22px",
                  }}
                >
                  {text(
                    "Your history connects assessments, wellness check-ins, reports, saved intelligence, and your follow-up plan.",
                    "يربط تاريخك الصحي بين التقييمات، Check-Ins، التقارير، الذكاء الصحي المحفوظ، وخطة المتابعة."
                  )}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
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

                  <Link href="/intelligence" className="secondaryBtn">
                    {text("Intelligence", "مركز الذكاء")}
                  </Link>

                  <Link href="/health-plan" className="primaryBtn">
                    {text("Health Plan", "الخطة الصحية")}
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

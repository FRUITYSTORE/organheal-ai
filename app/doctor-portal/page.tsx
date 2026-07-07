"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { generateHealthEngineResult } from "../../lib/healthEngine";
import RecommendedActionPanel from "@/app/components/doctor-portal/RecommendedActionPanel";
import DoctorBriefCard from "@/app/components/doctor-portal/DoctorBriefCard";
import ReportAnalysisBrief from "@/app/components/doctor-portal/ReportAnalysisBrief";
import TrustNotice from "@/app/components/ui/TrustNotice";
import SectionHeader from "@/app/components/ui/SectionHeader";
import StatusBadge from "@/app/components/ui/StatusBadge";

type Language = "en" | "ar";

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

type UploadedReport = {
  id: number;
  file_name: string | null;
  extraction_status: string | null;
  created_at: string;
};

type HealthInsight = {
  id: number;
  report_id: number | null;
  insight_title: string | null;
  ai_status: string | null;
  summary: string | null;
  key_findings: string | null;
  recommendations: string | null;
  doctor_brief: string | null;
  created_at: string | null;
};

type SavedAnalysis = {
  insight_id: number;
  updated_at: string | null;
};

type HealthHistory = {
  id: string;
  module_name: string;
  score: number;
  status: string | null;
  created_at: string;
};

type SharedReport = {
  share_code: string;
  report_type: string | null;
  expires_at: string;
  overall_score: number | null;
  lab_score: number | null;
  priority_organ: string | null;
  latest_checkin_score: number | null;
  organ_scores: { organ: string; score: number }[] | null;
  recommendations: string | null;
  report_summary: string | null;
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

export default function DoctorPortalPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [uploadedReports, setUploadedReports] = useState<UploadedReport[]>([]);
  const [healthInsights, setHealthInsights] = useState<HealthInsight[]>([]);
  const [savedAnalysis, setSavedAnalysis] = useState<SavedAnalysis[]>([]);
  const [healthHistory, setHealthHistory] = useState<HealthHistory[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [shareCodeInput, setShareCodeInput] = useState("");
  const [sharedReport, setSharedReport] = useState<SharedReport | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [checkingShareCode, setCheckingShareCode] = useState(false);

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    fetchDoctorPortalData();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return text("Not available", "غير متاح");

    return new Date(value).toLocaleDateString(isArabic ? "ar-AE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  function localizeOrganName(value: string | null | undefined) {
    if (!value) return text("General Health", "الصحة العامة");
    if (!isArabic) return value;

    const normalized = value.toLowerCase();

    if (normalized.includes("heart")) return "القلب";
    if (normalized.includes("liver")) return "الكبد";
    if (normalized.includes("kidney")) return "الكلى";
    if (normalized.includes("lung")) return "الرئة";
    if (normalized.includes("brain")) return "الدماغ";
    if (normalized.includes("metabolic")) return "الأيض";
    if (normalized.includes("general")) return "الصحة العامة";

    return value;
  }

  function getScoreTone(score: number | null | undefined) {
    if (typeof score !== "number") return "neutral";
    if (score >= 80) return "good";
    if (score >= 60) return "moderate";
    return "risk";
  }

  async function fetchDoctorPortalData() {
    setLoading(true);
    setMessage("");

    const currentLanguage = getStoredLanguage();
    const currentIsArabic = currentLanguage === "ar";

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage(
        currentIsArabic
          ? "يرجى تسجيل الدخول للوصول إلى ملخص الطبيب الشخصي."
          : "Please login to access your personal doctor brief."
      );
      setLoading(false);
      return;
    }

    const userId = userData.user.id;

    const { data: organData, error: organError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level, notes, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (organError) {
      setMessage(
        currentIsArabic
          ? "حدث خطأ في قاعدة البيانات: " + organError.message
          : "Database error: " + organError.message
      );
      setLoading(false);
      return;
    }

    const { data: checkInData } = await supabase
      .from("daily_checkins")
      .select("mood, wellness_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: reportData } = await supabase
      .from("uploaded_lab_files")
      .select("id, file_name, extraction_status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: insightData } = await supabase
      .from("health_insights")
      .select(
        "id, report_id, insight_title, ai_status, summary, key_findings, recommendations, doctor_brief, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const insightIds = (insightData || []).map((item) => item.id);

    let savedRows: SavedAnalysis[] = [];

    if (insightIds.length > 0) {
      const { data: savedData } = await supabase
        .from("generated_intelligence_results")
        .select("insight_id, updated_at")
        .eq("user_id", userId)
        .in("insight_id", insightIds)
        .order("updated_at", { ascending: false });

      savedRows = (savedData || []) as SavedAnalysis[];
    }

    const { data: historyData } = await supabase
      .from("health_history")
      .select("id, module_name, score, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    setAssessments((organData || []) as Assessment[]);
    setDailyCheckIn((checkInData || null) as DailyCheckIn | null);
    setUploadedReports((reportData || []) as UploadedReport[]);
    setHealthInsights((insightData || []) as HealthInsight[]);
    setSavedAnalysis(savedRows);
    setHealthHistory((historyData || []) as HealthHistory[]);
    setLoading(false);
  }

  async function verifyShareCode() {
    setShareMessage("");
    setSharedReport(null);

    const cleanCode = shareCodeInput.trim().toUpperCase();

    if (!cleanCode) {
      setShareMessage(
        text("Please enter a valid share code.", "يرجى إدخال رمز مشاركة صحيح.")
      );
      return;
    }

    setCheckingShareCode(true);

    const { data, error } = await supabase
      .rpc("get_shared_report_by_code", {
        input_share_code: cleanCode,
      })
      .maybeSingle();

    if (error) {
      setShareMessage(
        text("Could not verify share code.", "تعذر التحقق من رمز المشاركة.")
      );
      setCheckingShareCode(false);
      return;
    }

    if (!data) {
      setShareMessage(
        text("Invalid or expired share code.", "رمز المشاركة غير صالح أو منتهي.")
      );
      setCheckingShareCode(false);
      return;
    }

    setSharedReport(data as SharedReport);
    setShareMessage("");
    setCheckingShareCode(false);
  }

  const assessmentScores = assessments.map((item) => item.score);
  const checkInScores = dailyCheckIn ? [dailyCheckIn.wellness_score] : [];
  const allScores = [...assessmentScores, ...checkInScores];

  const overallScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
      : 0;

  const strongestOrgan =
    assessments.length > 0
      ? [...assessments].sort((a, b) => b.score - a.score)[0]
      : null;

  const priorityOrgan =
    assessments.length > 0
      ? [...assessments].sort((a, b) => a.score - b.score)[0]
      : null;

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

  const latestDoctorBriefInsight =
    generatedInsights.find((item) => item.doctor_brief) || null;

  const latestReportSummary =
    generatedInsights.find((item) => item.summary)?.summary ||
    text(
      "No generated report summary is available yet.",
      "لا يوجد ملخص تقرير مولّد متاح بعد."
    );

  const latestDoctorBrief =
    latestDoctorBriefInsight?.doctor_brief ||
    text(
      "No saved report-specific doctor brief is available yet. Generate intelligence from the reports page to prepare one.",
      "لا يوجد ملخص طبي محفوظ خاص بالتقرير بعد. ولّد التحليل الصحي من صفحة التقارير لتحضير واحد."
    );

  const latestRecommendations =
    generatedInsights.find((item) => item.recommendations)?.recommendations ||
    text(
      "No saved report-specific recommendations are available yet.",
      "لا توجد توصيات محفوظة خاصة بالتقرير بعد."
    );

  const healthEngine = generateHealthEngineResult({
    overallScore,
    labScore: null,
    dailyCheckInScore: dailyCheckIn?.wellness_score ?? null,
    priorityOrgan: priorityOrgan?.organ_name ?? null,
    strongestOrgan: strongestOrgan?.organ_name ?? null,
    isArabic,
  });

  const doctorBriefReadiness =
    assessments.length > 0 &&
    dailyCheckIn &&
    uploadedReports.length > 0 &&
    generatedInsights.length > 0
      ? text("Ready", "جاهز")
      : assessments.length > 0 || dailyCheckIn || uploadedReports.length > 0
      ? text("Building", "قيد البناء")
      : text("Not Started", "لم يبدأ");

  const readinessTone =
    doctorBriefReadiness === text("Ready", "جاهز")
      ? "good"
      : doctorBriefReadiness === text("Building", "قيد البناء")
      ? "moderate"
      : "neutral";

  const recommendedAction =
    assessments.length === 0
      ? {
          label: text(
            "Start with patient assessment data",
            "ابدأ ببيانات تقييم المريض"
          ),
          description: text(
            "Complete at least one organ assessment so the doctor brief can identify a priority area.",
            "أكمل تقييمًا واحدًا على الأقل حتى يستطيع ملخص الطبيب تحديد منطقة الأولوية."
          ),
          href: "/assessment",
          buttonText: text("Start Assessment", "ابدأ التقييم"),
        }
      : uploadedReports.length === 0
      ? {
          label: text("Upload clinical documents", "ارفع المستندات السريرية"),
          description: text(
            "Upload lab reports, radiology reports, discharge summaries, or prescriptions to strengthen the doctor brief.",
            "ارفع تقارير المختبر، الأشعة، ملخصات الخروج، أو الوصفات لتقوية ملخص الطبيب."
          ),
          href: "/lab-upload",
          buttonText: text("Upload Report", "رفع تقرير"),
        }
      : generatedInsights.length === 0
      ? {
          label: text("Analyze report", "حلّل التقرير"),
          description: text(
            "Open Report Analysis to generate report summaries, recommendations, and doctor-ready interpretation.",
            "افتح تحليل التقارير لتحليل التقارير، التوصيات، والتفسير الجاهز للطبيب."
          ),
          href: "/reports",
          buttonText: text("Review Analysis", "افتح تحليل التقارير"),
        }
      : !dailyCheckIn
      ? {
          label: text("Add latest wellness context", "أضف آخر تحديث صحي"),
          description: text(
            "Complete a wellness check-in so the brief includes the latest patient-reported status.",
            "أكمل Check-In صحي حتى يتضمن الملخص أحدث حالة أبلغ عنها المريض."
          ),
          href: "/checkin",
          buttonText: text("Open Check-In", "افتح Check-In"),
        }
      : {
          label: text("Review follow-up readiness", "راجع جاهزية المتابعة"),
          description: text(
            "The brief has enough data to support a structured clinical discussion. Continue with the follow-up plan.",
            "يحتوي الملخص على بيانات كافية لدعم نقاش سريري منظم. تابع إلى خطة المتابعة."
          ),
          href: "/health-plan",
          buttonText: text("Open Health Plan", "افتح الخطة الصحية"),
        };

  const dataSources = [
    {
      label: text("Assessments", "التقييمات"),
      value: assessments.length,
      note: text("organ assessments", "تقييمات الأعضاء"),
      ready: assessments.length > 0,
    },
    {
      label: text("Reports", "التقارير"),
      value: uploadedReports.length,
      note: `${processedReports} ${text("processed", "مكتمل")} · ${pendingReports} ${text("pending", "قيد الانتظار")}`,
      ready: uploadedReports.length > 0,
    },
    {
      label: text("Generated Insights", "الذكاء المولد"),
      value: generatedInsights.length,
      note: text("doctor-ready results", "نتائج جاهزة للطبيب"),
      ready: generatedInsights.length > 0,
    },
    {
      label: text("History Records", "سجلات التاريخ"),
      value: healthHistory.length,
      note: text("recent records", "سجلات حديثة"),
      ready: healthHistory.length > 0,
    },
    {
      label: text("Latest Check-In", "آخر Check-In"),
      value: dailyCheckIn ? text("Available", "متاح") : text("Missing", "غير متوفر"),
      note: dailyCheckIn ? formatDate(dailyCheckIn.created_at) : text("not completed", "غير مكتمل"),
      ready: Boolean(dailyCheckIn),
    },
  ];

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Doctor Portal Command Center", "مركز بوابة الطبيب")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Doctor Brief & Shared Health Summary",
                  "ملخص الطبيب والملخص الصحي المشترك"
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "A structured educational pre-visit summary built from assessments, check-ins, uploaded reports, saved intelligence, and health history.",
                  "ملخص تعليمي منظم قبل الزيارة، مبني على التقييمات، Check-Ins، التقارير المرفوعة، التحليل الصحي المحفوظ، والتاريخ الصحي."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href={recommendedAction.href} className="primaryBtn">
                  {recommendedAction.buttonText}
                </Link>

                <Link href="/reports" className="secondaryBtn">
                  {text("Reports", "التقارير")}
                </Link>

                <Link href="/health-plan" className="secondaryBtn">
                  {text("Health Plan", "الخطة الصحية")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Doctor Brief Readiness", "جاهزية ملخص الطبيب")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {doctorBriefReadiness}
                  </h2>
                </div>

               <StatusBadge tone={readinessTone}>
  {allScores.length > 0 ? `${overallScore}/100` : "N/A"}
</StatusBadge>
              </div>

              <p className="ohCardText">
                {text(
                  "Based on assessments, reports, saved intelligence, and latest wellness check-in.",
                  "يعتمد على التقييمات، التقارير، التحليل الصحي المحفوظ، وآخر Check-In صحي."
                )}
              </p>

              <div className="ohDivider" />

              <p className="ohMetricLabel">
                {text("Priority Area", "منطقة الأولوية")}
              </p>

              <p className="ohMetricValue" style={{ fontSize: "1.45rem" }}>
                {localizeOrganName(priorityOrgan?.organ_name)}
              </p>
            </div>
          </div>
        </section>

          {loading && (
          <section className="ohCard">
            <p className="ohEyebrow">
              {text("Loading Brief", "تحميل الملخص")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Preparing doctor intelligence brief...",
                "جاري تحضير ملخص الذكاء للطبيب..."
              )}
            </h2>
          </section>
        )}

        {!loading && message && (
          <section className="ohCard">
            <p className="ohEyebrow">
              {text("Access Status", "حالة الوصول")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Personal Doctor Brief Unavailable",
                "ملخص الطبيب الشخصي غير متاح"
              )}
            </h2>

            <p className="ohCardText">{message}</p>

            <Link href="/login" className="primaryBtn">
              {text("Login", "تسجيل الدخول")}
            </Link>
          </section>
        )}

        {!loading && !message && (
          <>
            <RecommendedActionPanel
  eyebrow={text("Recommended Next Step", "الخطوة التالية المقترحة")}
  title={recommendedAction.label}
  description={recommendedAction.description}
  href={recommendedAction.href}
  buttonText={recommendedAction.buttonText}
/>
<DoctorBriefCard
  eyebrow={text("Doctor Brief", "ملخص الطبيب")}
  title={text("Pre-Visit Summary", "ملخص قبل الزيارة")}
  readiness={doctorBriefReadiness}
  readinessTone={readinessTone}
  brief={healthEngine.doctorBrief}
/>
            <section className="ohGrid cols2">
<article className="ohCard">
    <div className="ohCardHeader">
      <div>
        <p className="ohMetricLabel">
          {text("Available Clinical Data", "البيانات السريرية المتاحة")}
        </p>

        <h2 className="ohCardTitle">
          {text("Data readiness", "جاهزية البيانات")}
        </h2>
      </div>

      <span className={`ohStatusBadge ${readinessTone}`}>
        {doctorBriefReadiness}
      </span>
    </div>

    <div className="ohTimeline">
      <div className="ohTimelineItem">
        <span className="ohTimelineDot" />
        <div>
          <p className="ohTimelineTitle">
            {text("Assessments", "التقييمات")}
          </p>
          <p className="ohTimelineMeta">{assessments.length}</p>
        </div>
      </div>

      <div className="ohTimelineItem">
        <span className="ohTimelineDot" />
        <div>
          <p className="ohTimelineTitle">
            {text("Reports", "التقارير")}
          </p>
          <p className="ohTimelineMeta">
            {uploadedReports.length} · {processedReports} {text("processed", "مكتمل")}
          </p>
        </div>
      </div>

      <div className="ohTimelineItem">
        <span className="ohTimelineDot" />
        <div>
          <p className="ohTimelineTitle">
            {text("Saved Analysis", "التحليل المحفوظ")}
          </p>
          <p className="ohTimelineMeta">{savedAnalysis.length}</p>
        </div>
      </div>
    </div>
  </article>
</section>

            <section className="ohGrid cols2">
             <article className="ohCard">
  <div className="ohCardHeader">
    <div>
      <p className="ohMetricLabel">
        {text("Patient Clinical Snapshot", "الملخص السريري للمريض")}
      </p>

      <h2 className="ohCardTitle">
        {healthEngine.healthProfile}
      </h2>
    </div>

    <span className={`ohStatusBadge ${getScoreTone(overallScore)}`}>
      {allScores.length > 0 ? `${overallScore}/100` : "N/A"}
    </span>
  </div>

  <div className="ohTimeline">
    <div className="ohTimelineItem">
      <span className="ohTimelineDot" />
      <div>
        <p className="ohTimelineTitle">
          {text("Priority Organ", "العضو ذو الأولوية")}
        </p>

        <p className="ohTimelineMeta">
          {localizeOrganName(priorityOrgan?.organ_name)}
        </p>
      </div>
    </div>

    <div className="ohTimelineItem">
      <span className="ohTimelineDot" />
      <div>
        <p className="ohTimelineTitle">
          {text("Strongest Organ", "أفضل عضو")}
        </p>

        <p className="ohTimelineMeta">
          {localizeOrganName(strongestOrgan?.organ_name)}
        </p>
      </div>
    </div>

    <div className="ohTimelineItem">
      <span className="ohTimelineDot" />
      <div>
        <p className="ohTimelineTitle">
          {text("Risk Pattern", "نمط الخطورة")}
        </p>

        <p className="ohTimelineMeta">
          {healthEngine.riskPattern}
        </p>
      </div>
    </div>

    <div className="ohTimelineItem">
      <span className="ohTimelineDot" />
      <div>
        <p className="ohTimelineTitle">
          {text("Latest Check-In", "آخر Check-In")}
        </p>

        <p className="ohTimelineMeta">
          {dailyCheckIn
            ? `${dailyCheckIn.wellness_score}/100 · ${dailyCheckIn.mood} · ${formatDate(dailyCheckIn.created_at)}`
            : text("No check-in yet", "لا يوجد Check-In بعد")}
        </p>
      </div>
    </div>
  </div>
</article>

                         </section>

           <ReportAnalysisBrief
  eyebrow={text("Report Analysis Brief", "ملخص ذكاء التقارير")}
  title={text(
    "Saved Report-Based Clinical Summary",
    "ملخص سريري مبني على التقارير المحفوظة"
  )}
  count={generatedInsights.length}
  countTone={generatedInsights.length > 0 ? "good" : "moderate"}
  generatedLabel={text("Generated Insights", "الذكاء المولد")}
  processedLabel={text("Processed Reports", "تقارير مكتملة")}
  pendingLabel={text("Pending Reports", "تقارير بانتظار")}
  generatedCount={generatedInsights.length}
  processedCount={processedReports}
  pendingCount={pendingReports}
  summaryLabel={text("Summary", "الملخص")}
  summary={latestReportSummary}
  recommendationsLabel={text("Recommendations", "التوصيات")}
  recommendations={latestRecommendations}
  doctorBriefLabel={text("Doctor Brief:", "ملخص الطبيب:")}
  doctorBrief={latestDoctorBrief}
/>
      <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Shared Report Access", "الوصول إلى التقرير المشترك")}
              </p>

              <h2 className="ohCardTitle">
                {text("Enter Patient Share Code", "أدخل رمز مشاركة المريض")}
              </h2>

              <p className="ohCardText">
                {text(
                  "Doctors can view a temporary educational OrganHeal summary using a patient-provided share code.",
                  "يمكن للطبيب عرض ملخص OrganHeal تعليمي مؤقت باستخدام رمز مشاركة يقدمه المريض."
                )}
              </p>
            </div>

            <span className="ohStatusBadge neutral">
              {text("Secure Link", "رابط مؤقت")}
            </span>
          </div>

          <div className="ohGrid cols2" style={{ alignItems: "end" }}>
            <div className="formGroup">
              <label>{text("Share Code", "رمز المشاركة")}</label>
              <input
                type="text"
                placeholder={text("Example: OH-ABC123", "مثال: OH-ABC123")}
                value={shareCodeInput}
                onChange={(event) => setShareCodeInput(event.target.value)}
              />
            </div>

            <button
              type="button"
              className="primaryBtn"
              onClick={verifyShareCode}
              disabled={checkingShareCode}
            >
              {checkingShareCode
                ? text("Checking...", "جاري التحقق...")
                : text("View Shared Report", "عرض التقرير المشترك")}
            </button>
          </div>

          {shareMessage && (
            <div className="ohTrustNotice" style={{ marginTop: "16px" }}>
              <span aria-hidden="true">ℹ️</span>
              <div>{shareMessage}</div>
            </div>
          )}
        </section>

        {sharedReport && (
          <section className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Shared Patient Report", "تقرير المريض المشترك")}
                </p>

                <h2 className="ohCardTitle">
                  {sharedReport.overall_score !== null
                    ? `${sharedReport.overall_score}/100`
                    : "N/A"}
                </h2>
              </div>

              <StatusBadge tone={getScoreTone(sharedReport.overall_score)}>
  {text("Shared", "مشترك")}
</StatusBadge>
            </div>

            <div className="ohMetricGrid">
              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Priority Organ", "العضو ذو الأولوية")}
                </span>
                <span className="ohMetricValue" style={{ fontSize: "1.2rem" }}>
                  {localizeOrganName(sharedReport.priority_organ)}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Latest Check-In", "آخر Check-In")}
                </span>
                <span className="ohMetricValue">
                  {sharedReport.latest_checkin_score ?? "N/A"}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Lab Score", "مؤشر المختبر")}
                </span>
                <span className="ohMetricValue">
                  {sharedReport.lab_score ?? "N/A"}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Expires", "ينتهي في")}
                </span>
                <span className="ohMetricValue" style={{ fontSize: "1rem" }}>
                  {formatDateTime(sharedReport.expires_at)}
                </span>
              </article>
            </div>

            <div className="ohGrid cols2">
              <article className="ohActionPanel">
                <p className="ohMetricLabel">
                  {text("Shared Report Summary", "ملخص التقرير المشترك")}
                </p>
                <p className="ohCardText">
                  {sharedReport.report_summary ||
                    text("No summary available.", "لا يوجد ملخص متاح.")}
                </p>
              </article>

              <article className="ohActionPanel">
                <p className="ohMetricLabel">
                  {text("Shared Recommendations", "التوصيات المشتركة")}
                </p>
                <p className="ohCardText">
                  {sharedReport.recommendations ||
                    text("No recommendations available.", "لا توجد توصيات متاحة.")}
                </p>
              </article>
            </div>

            <div className="ohDivider" />

            <h3 className="ohCardTitle" style={{ fontSize: "1.25rem" }}>
              {text("Shared Organ Scores", "مؤشرات الأعضاء المشتركة")}
            </h3>

            {sharedReport.organ_scores && sharedReport.organ_scores.length > 0 ? (
              <div className="ohMetricGrid">
                {sharedReport.organ_scores.map((item) => (
                  <article className="ohMetricCard" key={item.organ}>
                    <span className="ohMetricLabel">
                      {localizeOrganName(item.organ)}
                    </span>
                    <span className="ohMetricValue">{item.score}/100</span>
                    <span className={`ohStatusBadge ${getScoreTone(item.score)}`}>
                      {text("Score", "المؤشر")}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ohEmptyState">
                <p>{text("No organ scores available.", "لا توجد مؤشرات أعضاء متاحة.")}</p>
              </div>
            )}
          </section>
        )}
                   <TrustNotice
  title={text("Medical safety disclaimer", "تنبيه طبي")}
  description={text(
    "OrganHeal AI provides educational health analysis support. It does not diagnose, treat, replace clinical judgment, or provide emergency medical advice.",
    "OrganHeal AI يقدم دعمًا تعليميًا لتنظيم وفهم المعلومات الصحية. لا يقدم تشخيصًا أو علاجًا ولا يستبدل الحكم الطبي أو يقدم نصائح طبية طارئة."
  )}
/>
          </>
        )}
      </div>
    </main>
  );
}



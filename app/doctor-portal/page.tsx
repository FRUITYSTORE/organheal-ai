"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { generateHealthEngineResult } from "../../lib/healthEngine";

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

type SavedIntelligence = {
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

export default function DoctorPortalPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [uploadedReports, setUploadedReports] = useState<UploadedReport[]>([]);
  const [healthInsights, setHealthInsights] = useState<HealthInsight[]>([]);
  const [savedIntelligence, setSavedIntelligence] = useState<SavedIntelligence[]>(
    []
  );
  const [healthHistory, setHealthHistory] = useState<HealthHistory[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [shareCodeInput, setShareCodeInput] = useState("");
  const [sharedReport, setSharedReport] = useState<SharedReport | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [checkingShareCode, setCheckingShareCode] = useState(false);

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    fetchDoctorPortalData();

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

  function formatDate(value: string | null | undefined) {
    if (!value) return isArabic ? "غير متاح" : "Not available";
    return new Date(value).toLocaleDateString(isArabic ? "ar-AE" : "en-US");
  }

  function formatDateTime(value: string | null | undefined) {
    if (!value) return isArabic ? "غير متاح" : "Not available";
    return new Date(value).toLocaleString(isArabic ? "ar-AE" : "en-US");
  }

  function localizeOrganName(value: string | null | undefined) {
    if (!value) return isArabic ? "الصحة العامة" : "General Health";
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

  async function fetchDoctorPortalData() {
    setLoading(true);
    setMessage("");

    const currentLanguage = getCurrentLanguage();
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

    const { data: checkInData, error: checkInError } = await supabase
      .from("daily_checkins")
      .select("mood, wellness_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (checkInError && checkInError.code !== "PGRST116") {
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
      .select(
        "id, report_id, insight_title, ai_status, summary, key_findings, recommendations, doctor_brief, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const insightIds = (insightData || []).map((item) => item.id);

    let savedRows: SavedIntelligence[] = [];

    if (insightIds.length > 0) {
      const { data: savedData } = await supabase
        .from("generated_intelligence_results")
        .select("insight_id, updated_at")
        .eq("user_id", userId)
        .in("insight_id", insightIds)
        .order("updated_at", { ascending: false });

      savedRows = savedData || [];
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
    setSavedIntelligence(savedRows);
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

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 60) return "moderateScore";
    return "riskScore";
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

  const savedIntelligenceIds = new Set(
    savedIntelligence.map((item) => item.insight_id)
  );

  const generatedInsights = healthInsights.filter(
    (item) => item.ai_status === "Generated" || savedIntelligenceIds.has(item.id)
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
      "لا يوجد ملخص طبي محفوظ خاص بالتقرير بعد. ولّد الذكاء الصحي من صفحة التقارير لتحضير واحد."
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
          label: text("Generate report intelligence", "ولّد ذكاء التقرير"),
          description: text(
            "Open Intelligence Center to generate report summaries, recommendations, and doctor-ready interpretation.",
            "افتح مركز الذكاء لتوليد ملخصات التقارير، التوصيات، والتفسير الجاهز للطبيب."
          ),
          href: "/intelligence",
          buttonText: text("Open Intelligence", "افتح مركز الذكاء"),
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

  return (
    <main className="assistantPage" dir={isArabic ? "rtl" : "ltr"}>
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">
            {text("DOCTOR PORTAL", "بوابة الطبيب")}
          </p>
          <h1>
            {text(
              "Doctor Brief & Shared Health Summary",
              "ملخص الطبيب والملخص الصحي المشترك"
            )}
          </h1>
          <p>
            {text(
              "A structured educational pre-visit summary built from assessments, check-ins, uploaded reports, saved intelligence, and health history.",
              "ملخص تعليمي منظم قبل الزيارة، مبني على التقييمات، Check-Ins، التقارير المرفوعة، الذكاء الصحي المحفوظ، والتاريخ الصحي."
            )}
          </p>
        </div>

        <div className="chatWindow">
          <div className="resultBox">
            <p className="sectionLabel">
              {text("Shared Report Access", "الوصول إلى التقرير المشترك")}
            </p>
            <h2>{text("Enter Patient Share Code", "أدخل رمز مشاركة المريض")}</h2>
            <p>
              {text(
                "Doctors can view a temporary educational OrganHeal summary using a patient-provided share code.",
                "يمكن للطبيب عرض ملخص OrganHeal تعليمي مؤقت باستخدام رمز مشاركة يقدمه المريض."
              )}
            </p>

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
              className="primaryBtn"
              onClick={verifyShareCode}
              disabled={checkingShareCode}
            >
              {checkingShareCode
                ? text("Checking...", "جاري التحقق...")
                : text("View Shared Report", "عرض التقرير المشترك")}
            </button>

            {shareMessage && <p>{shareMessage}</p>}
          </div>

          {sharedReport && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Shared Patient Report", "تقرير المريض المشترك")}
                </p>
                <h2>
                  {sharedReport.overall_score !== null
                    ? `${sharedReport.overall_score}/100`
                    : "N/A"}
                </h2>

                <p>
                  <strong>{text("Priority Organ:", "العضو ذو الأولوية:")}</strong>{" "}
                  {localizeOrganName(sharedReport.priority_organ)}
                </p>

                <p>
                  <strong>{text("Latest Check-In:", "آخر Check-In:")}</strong>{" "}
                  {sharedReport.latest_checkin_score ?? "N/A"}
                </p>

                <p>
                  <strong>{text("Expires:", "ينتهي في:")}</strong>{" "}
                  {formatDateTime(sharedReport.expires_at)}
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Shared Report Summary", "ملخص التقرير المشترك")}
                </p>
                <p>
                  {sharedReport.report_summary ||
                    text("No summary available.", "لا يوجد ملخص متاح.")}
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Shared Recommendations", "التوصيات المشتركة")}
                </p>
                <p>
                  {sharedReport.recommendations ||
                    text("No recommendations available.", "لا توجد توصيات متاحة.")}
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Shared Organ Scores", "مؤشرات الأعضاء المشتركة")}
                </p>

                {sharedReport.organ_scores && sharedReport.organ_scores.length > 0 ? (
                  <div className="assessmentForm">
                    {sharedReport.organ_scores.map((item) => (
                      <div className="resultBox" key={item.organ}>
                        <p className="sectionLabel">{localizeOrganName(item.organ)}</p>
                        <h2>{item.score}/100</h2>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{text("No organ scores available.", "لا توجد مؤشرات أعضاء متاحة.")}</p>
                )}
              </div>
            </>
          )}

          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">
                {text("Loading Brief", "تحميل الملخص")}
              </p>
              <h2>
                {text(
                  "Preparing doctor intelligence brief...",
                  "جاري تحضير ملخص الذكاء للطبيب..."
                )}
              </h2>
            </div>
          )}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">
                {text("Access Status", "حالة الوصول")}
              </p>
              <h2>
                {text(
                  "Personal Doctor Brief Unavailable",
                  "ملخص الطبيب الشخصي غير متاح"
                )}
              </h2>
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
                    {text("Doctor Brief Readiness", "جاهزية ملخص الطبيب")}
                  </p>
                  <h2>{doctorBriefReadiness}</h2>
                  <p>
                    {text(
                      "Based on assessments, reports, saved intelligence, and latest wellness check-in.",
                      "يعتمد على التقييمات، التقارير، الذكاء الصحي المحفوظ، وآخر Check-In صحي."
                    )}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {text("Clinical Overview", "النظرة السريرية العامة")}
                  </p>
                  <h2 className={allScores.length > 0 ? getScoreClass(overallScore) : ""}>
                    {allScores.length > 0 ? `${overallScore}/100` : "N/A"}
                  </h2>
                  <p>
                    {text(
                      "Generated from available organ assessments and latest wellness check-in data.",
                      "تم توليده من تقييمات الأعضاء المتاحة وآخر بيانات Check-In صحية."
                    )}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {text("Assessments", "التقييمات")}
                  </p>
                  <h2>{assessments.length}</h2>
                  <p>
                    {text(
                      "Total saved organ assessments.",
                      "إجمالي تقييمات الأعضاء المحفوظة."
                    )}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {text("Uploaded Reports", "التقارير المرفوعة")}
                  </p>
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
                      "Saved generated intelligence results.",
                      "نتائج الذكاء الصحي المولدة والمحفوظة."
                    )}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {text("Latest Check-In", "آخر Check-In")}
                  </p>
                  <h2>
                    {dailyCheckIn ? `${dailyCheckIn.wellness_score}/100` : "N/A"}
                  </h2>
                  <p>
                    {dailyCheckIn
                      ? `${dailyCheckIn.mood} · ${formatDate(dailyCheckIn.created_at)}`
                      : text("No check-in yet", "لا يوجد Check-In بعد")}
                  </p>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Digital Health Profile", "الملف الصحي الرقمي")}
                </p>
                <h2>{healthEngine.healthProfile}</h2>

                <p>
                  {text("Strongest area:", "أقوى منطقة:")}{" "}
                  <strong>{localizeOrganName(strongestOrgan?.organ_name)}</strong>
                </p>

                <p>
                  {text("Priority area:", "منطقة الأولوية:")}{" "}
                  <strong>{localizeOrganName(priorityOrgan?.organ_name)}</strong>
                </p>

                <p>
                  {text("Risk pattern:", "نمط الخطورة:")}{" "}
                  <strong>{healthEngine.riskPattern}</strong>
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">{text("Doctor Brief", "ملخص الطبيب")}</p>
                <h2>{text("Pre-Visit Summary", "ملخص قبل الزيارة")}</h2>
                <p>{healthEngine.doctorBrief}</p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Report Intelligence Brief", "ملخص ذكاء التقارير")}
                </p>
                <h2>
                  {text(
                    "Saved Report-Based Clinical Summary",
                    "ملخص سريري مبني على التقارير المحفوظة"
                  )}
                </h2>

                <p>
                  <strong>{text("Summary:", "الملخص:")}</strong>{" "}
                  {latestReportSummary}
                </p>

                <p>
                  <strong>{text("Doctor Brief:", "ملخص الطبيب:")}</strong>{" "}
                  {latestDoctorBrief}
                </p>

                <p>
                  <strong>{text("Recommendations:", "التوصيات:")}</strong>{" "}
                  {latestRecommendations}
                </p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Available Data Sources", "مصادر البيانات المتاحة")}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                    gap: "14px",
                    textAlign: isArabic ? "right" : "left",
                  }}
                >
                  <div>
                    <strong>{text("Assessments", "التقييمات")}</strong>
                    <p>{assessments.length}</p>
                  </div>

                  <div>
                    <strong>{text("Reports", "التقارير")}</strong>
                    <p>{uploadedReports.length}</p>
                  </div>

                  <div>
                    <strong>{text("Generated Insights", "الذكاء المولد")}</strong>
                    <p>{generatedInsights.length}</p>
                  </div>

                  <div>
                    <strong>{text("History Records", "سجلات التاريخ")}</strong>
                    <p>{healthHistory.length}</p>
                  </div>

                  <div>
                    <strong>{text("Latest Check-In", "آخر Check-In")}</strong>
                    <p>
                      {dailyCheckIn
                        ? text("Available", "متاح")
                        : text("Missing", "غير متوفر")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {text("Doctor Brief Journey", "رحلة ملخص الطبيب")}
                </p>

                <h2>
                  {text(
                    "Prepare for a safer clinical discussion",
                    "التحضير لنقاش سريري أوضح وأكثر أمانًا"
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
                    "This page organizes the patient profile, assessments, reports, intelligence, check-ins, and history into a concise educational brief for discussion with a licensed clinician.",
                    "تنظم هذه الصفحة ملف المريض، التقييمات، التقارير، الذكاء الصحي، Check-Ins، والتاريخ الصحي في ملخص تعليمي مختصر لمناقشته مع طبيب مرخص."
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
                  <Link href="/profile" className="secondaryBtn">
                    {text("Profile", "الملف الشخصي")}
                  </Link>

                  <Link href="/reports" className="secondaryBtn">
                    {text("Reports", "التقارير")}
                  </Link>

                  <Link href="/intelligence" className="primaryBtn">
                    {text("Intelligence", "مركز الذكاء")}
                  </Link>

                  <Link href="/history" className="secondaryBtn">
                    {text("History", "التاريخ")}
                  </Link>

                  <Link href="/checkin" className="secondaryBtn">
                    Check-In
                  </Link>

                  <Link href="/health-plan" className="secondaryBtn">
                    {text("Health Plan", "الخطة الصحية")}
                  </Link>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">{text("Disclaimer", "تنبيه طبي")}</p>
                <p>
                  {text(
                    "OrganHeal AI provides educational health intelligence support. It does not diagnose, treat, replace clinical judgment, or provide emergency medical advice.",
                    "OrganHeal AI يقدم دعمًا تعليميًا لتنظيم وفهم المعلومات الصحية. لا يقدم تشخيصًا أو علاجًا ولا يستبدل الحكم الطبي أو يقدم نصائح طبية طارئة."
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

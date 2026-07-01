"use client";

import PageBackActions from "../components/PageBackActions";
import { type CSSProperties, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

type Assessment = {
  organ_name: string;
  score: number;
  created_at: string;
};

type DailyCheckIn = {
  mood: string;
  wellness_score: number;
  created_at: string;
};

type Profile = {
  username: string | null;
  email: string | null;
  created_at: string | null;
};

type UploadedReport = {
  id: number;
  created_at: string;
  extraction_status: string | null;
};

type HealthInsight = {
  id: number;
  ai_status: string | null;
  created_at: string | null;
};

type SavedAnalysis = {
  insight_id: number;
  updated_at: string | null;
};

export default function ProfilePage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [memberSince, setMemberSince] = useState<string | null>(null);

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [uploadedReports, setUploadedReports] = useState<UploadedReport[]>([]);
  const [healthInsights, setHealthInsights] = useState<HealthInsight[]>([]);
  const [savedAnalysis, setSavedAnalysis] = useState<SavedAnalysis[]>(
    []
  );

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
    fetchProfileData();

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
    if (!value) {
      return text("Not available", "غير متاح");
    }

    return new Date(value).toLocaleDateString(isArabic ? "ar-AE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function localizeOrganName(value: string | null | undefined) {
    if (!value) return text("N/A", "غير متاح");
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

  async function fetchProfileData() {
    setLoading(true);
    setMessage("");

    const currentLanguage = getCurrentLanguage();
    const currentIsArabic = currentLanguage === "ar";

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      window.location.href = "/login";
      return;
    }

    const user = userData.user;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, email, created_at, plan")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    setEmail(profile?.email || user.email || "");
    setUsername(profile?.username || "");
    setMemberSince(profile?.created_at || null);

    const { data: organData, error: organError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, created_at")
      .eq("user_id", user.id)
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
      .eq("user_id", user.id)
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

    const { data: uploadedReportsData } = await supabase
      .from("uploaded_lab_files")
      .select("id, created_at, extraction_status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: insightsData } = await supabase
      .from("health_insights")
      .select("id, ai_status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const insightIds = (insightsData || []).map((item) => item.id);

    let savedAnalysisData: SavedAnalysis[] = [];

    if (insightIds.length > 0) {
      const { data: savedData } = await supabase
        .from("generated_intelligence_results")
        .select("insight_id, updated_at")
        .eq("user_id", user.id)
        .in("insight_id", insightIds)
        .order("updated_at", { ascending: false });

      savedAnalysisData = savedData || [];
    }

    setAssessments((organData || []) as Assessment[]);
    setDailyCheckIn((checkInData || null) as DailyCheckIn | null);
    setUploadedReports((uploadedReportsData || []) as UploadedReport[]);
    setHealthInsights((insightsData || []) as HealthInsight[]);
    setSavedAnalysis(savedAnalysisData);
    setLoading(false);
  }

  const displayName = username || email || text("User", "مستخدم");
  const memberSinceLabel = memberSince ? formatDate(memberSince) : text("Recently", "حديثًا");

  const uploadedReportsCount = uploadedReports.length;

  const processedReports = uploadedReports.filter(
    (item) => item.extraction_status === "Completed"
  ).length;

  const pendingReports = uploadedReports.filter(
    (item) => item.extraction_status !== "Completed"
  ).length;

  const latestReportDate =
    uploadedReports.length > 0 ? formatDate(uploadedReports[0].created_at) : "";

  const latestAssessment = assessments[0] || null;

  const firstAssessment =
    assessments.length > 0 ? assessments[assessments.length - 1] : null;

  const priorityAssessment =
    assessments.length > 0
      ? [...assessments].sort((a, b) => a.score - b.score)[0]
      : null;

  const scoreInputs = [
    ...assessments.map((item) => item.score),
    ...(dailyCheckIn ? [dailyCheckIn.wellness_score] : []),
  ];

  const overallScore =
    scoreInputs.length > 0
      ? Math.round(
          scoreInputs.reduce((sum, score) => sum + score, 0) / scoreInputs.length
        )
      : 0;

  const generatedInsightCount = healthInsights.filter(
    (item) => item.ai_status === "Generated"
  ).length;

  function getStatus(score: number) {
    if (score >= 80) return text("Good", "جيد");
    if (score >= 50) return text("Moderate", "متوسط");
    return text("High Risk", "مرتفع الخطورة");
  }

  function getTone(score: number) {
    if (score >= 80) return "good";
    if (score >= 50) return "moderate";
    return "risk";
  }

  let completion = 0;

  if (assessments.length > 0) completion += 30;
  if (uploadedReportsCount > 0) completion += 25;
  if (dailyCheckIn) completion += 20;
  if (savedAnalysis.length > 0) completion += 25;

  const healthProfileStatus =
    completion === 0
      ? text("Not Started", "لم يبدأ")
      : completion < 75
      ? text("Building", "قيد البناء")
      : text("Active", "نشط");

  const completionTone =
    completion >= 75 ? "good" : completion >= 30 ? "moderate" : "neutral";

  const recommendedAction =
    assessments.length === 0
      ? {
          label: text("Start your first health assessment", "ابدأ أول تقييم صحي"),
          description: text(
            "Complete one organ assessment so OrganHeal can begin building your saved health identity.",
            "أكمل تقييمًا واحدًا حتى يبدأ OrganHeal ببناء هويتك الصحية المحفوظة."
          ),
          href: "/assessment",
          buttonText: text("Start Assessment", "ابدأ التقييم"),
        }
      : uploadedReportsCount === 0
      ? {
          label: text("Upload your first medical report", "ارفع أول تقرير طبي"),
          description: text(
            "Add a lab report, radiology report, or medical document to strengthen your health profile.",
            "أضف تقرير مختبر أو أشعة أو مستندًا طبيًا لتقوية ملفك الصحي."
          ),
          href: "/lab-upload",
          buttonText: text("Upload Report", "رفع تقرير"),
        }
      : savedAnalysis.length === 0
      ? {
          label: text(
            "Generate saved health analysis",
            "ولّد التحليل الصحي المحفوظ"
          ),
          description: text(
            "Open Report Analysis to generate and save insights from your reports.",
            "افتح تحليل التقارير لتوليد وحفظ ملخصات التقارير من تقاريرك."
          ),
          href: "/reports",
          buttonText: text("Review Analysis", "افتح تحليل التقارير"),
        }
      : !dailyCheckIn
      ? {
          label: text(
            "Complete your first wellness check-in",
            "أكمل أول تحديث صحي"
          ),
          description: text(
            "Add your latest sleep, mood, stress, hydration, energy, and activity status.",
            "أضف آخر حالة للنوم، المزاج، الضغط، الترطيب، الطاقة، والنشاط."
          ),
          href: "/checkin",
          buttonText: text("Open Check-In", "افتح Check-In"),
        }
      : {
          label: text("Continue your follow-up plan", "تابع خطة المتابعة الصحية"),
          description: text(
            "Your profile is active. Review your health plan, action tasks, and follow-up rhythm.",
            "ملفك الصحي نشط الآن. راجع الخطة الصحية، المهام، وإيقاع المتابعة."
          ),
          href: "/health-plan",
          buttonText: text("Open Health Plan", "افتح الخطة الصحية"),
        };

  const scoreRingStyle = {
    "--score": Math.max(0, Math.min(100, completion)),
  } as CSSProperties;

  const healthScoreRingStyle = {
    "--score": Math.max(0, Math.min(100, overallScore)),
  } as CSSProperties;

  return (
    <main className="ohPageShell followUpCleanV4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        {loading && (
          <section className="ohHero">
            <p className="ohEyebrow">
              {text("Loading Profile", "تحميل الملف")}
            </p>
            <h1 className="ohTitle">
              {text(
                "Preparing your health identity...",
                "جاري تحضير هويتك الصحية..."
              )}
            </h1>
            <p className="ohLead">
              {text(
                "OrganHeal is connecting your profile, assessments, reports, check-ins, and saved intelligence.",
                "يقوم OrganHeal بربط ملفك، التقييمات، التقارير، Check-Ins، والتحليل الصحي المحفوظ."
              )}
            </p>
          </section>
        )}

        {!loading && message && (
          <section className="ohEmptyState">
            <h2>{text("Could not load profile", "تعذر تحميل الملف")}</h2>
            <p>{message}</p>
          </section>
        )}

        {!loading && !message && (
          <>
            <section className="ohHero">
              <div className="ohHeroGrid">
                <div>
                  <p className="ohEyebrow">
                    {text("Health Profile Command Center", "مركز قيادة الملف الصحي")}
                  </p>

                  <h1 className="ohTitle">
                    {text("Your OrganHeal Profile", "ملفك في OrganHeal")}
                  </h1>

                  <p className="ohLead">
                    {text(
                      "A clear view of your saved health identity, assessments, reports, intelligence, check-ins, and the next best action.",
                      "نظرة واضحة على هويتك الصحية المحفوظة، التقييمات، التقارير، التحليل الصحي، Check-Ins، والخطوة التالية الأفضل."
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
                        {text("Saved Identity", "الهوية المحفوظة")}
                      </p>
                      <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                        {displayName}
                      </h2>
                      <p className="ohCardText">{email}</p>
                    </div>

                    <span className={`ohStatusBadge ${completionTone}`}>
                      {healthProfileStatus}
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
                        <strong>{completion}</strong>
                        <span>{text("% complete", "% مكتمل")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="ohDivider" />

                  <p className="ohCardText">
                    <strong>{text("Member since:", "عضو منذ:")}</strong>{" "}
                    {memberSinceLabel}
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
                  {text("Overall Health Score", "المؤشر الصحي العام")}
                </span>
                <span className="ohMetricValue">
                  {scoreInputs.length > 0 ? overallScore : "—"}
                </span>
                <span className="ohMetricHint">
                  {scoreInputs.length > 0
                    ? `${getStatus(overallScore)} · ${overallScore}/100`
                    : text("No Data Yet", "لا توجد بيانات بعد")}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Assessments", "التقييمات")}
                </span>
                <span className="ohMetricValue">{assessments.length}</span>
                <span className="ohMetricHint">
                  {text("Saved organ modules", "وحدات تقييم أعضاء محفوظة")}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Reports", "التقارير")}
                </span>
                <span className="ohMetricValue">{uploadedReportsCount}</span>
                <span className="ohMetricHint">
                  {isArabic
                    ? `${processedReports} مكتمل · ${pendingReports} قيد الانتظار`
                    : `${processedReports} processed · ${pendingReports} pending`}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">Check-In</span>
                <span className="ohMetricValue">
                  {dailyCheckIn ? dailyCheckIn.wellness_score : "—"}
                </span>
                <span className="ohMetricHint">
                  {dailyCheckIn
                    ? `${dailyCheckIn.mood} · ${formatDate(dailyCheckIn.created_at)}`
                    : text("Not started yet", "لم يبدأ بعد")}
                </span>
              </article>
            </section>

            <section className="ohGrid cols2">
              <article className="ohCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text("Profile Readiness", "جاهزية الملف الصحي")}
                    </p>
                    <h2 className="ohCardTitle">
                      {text("Data connected to your health journey", "بيانات مرتبطة برحلتك الصحية")}
                    </h2>
                  </div>

                  <span className={`ohStatusBadge ${completionTone}`}>
                    {completion}%
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr",
                    gap: "22px",
                    alignItems: "center",
                  }}
                >
                  <div className="ohScoreRing" style={healthScoreRingStyle}>
                    <div>
                      <strong>{scoreInputs.length > 0 ? overallScore : 0}</strong>
                      <span>{text("health", "صحي")}</span>
                    </div>
                  </div>

                  <div className="ohStack">
                    <div>
                      <strong>{text("Priority organ", "العضو ذو الأولوية")}</strong>
                      <p className="ohCardText">
                        {priorityAssessment
                          ? `${localizeOrganName(priorityAssessment.organ_name)} · ${priorityAssessment.score}/100`
                          : text(
                              "Complete assessments to identify your priority organ.",
                              "أكمل التقييمات لتحديد العضو الذي يحتاج أولوية."
                            )}
                      </p>
                    </div>

                    <div>
                      <strong>{text("Saved intelligence", "التحليل الصحي المحفوظ")}</strong>
                      <p className="ohCardText">
                        {isArabic
                          ? `${savedAnalysis.length} نتيجة محفوظة · ${generatedInsightCount} نتيجة مولدة`
                          : `${savedAnalysis.length} saved · ${generatedInsightCount} generated`}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="ohCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text("Account Summary", "ملخص الحساب")}
                    </p>
                    <h2 className="ohCardTitle">{displayName}</h2>
                  </div>

                  <span className="ohStatusBadge neutral">
                    {text("Protected", "محمي")}
                  </span>
                </div>

                <div className="ohStack">
                  <p className="ohCardText">
                    <strong>{text("Email:", "البريد الإلكتروني:")}</strong>{" "}
                    {email || text("Not available", "غير متاح")}
                  </p>

                  <p className="ohCardText">
                    <strong>{text("Member since:", "عضو منذ:")}</strong>{" "}
                    {memberSinceLabel}
                  </p>

                  <p className="ohCardText">
                    <strong>{text("Latest report:", "آخر تقرير:")}</strong>{" "}
                    {latestReportDate || text("No reports uploaded yet", "لا توجد تقارير مرفوعة بعد")}
                  </p>
                </div>
              </article>
            </section>

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Health Journey Timeline", "مسار الرحلة الصحية")}
                  </p>
                  <h2 className="ohCardTitle">
                    {text("Your progress in one connected view", "تقدمك في عرض واحد مترابط")}
                  </h2>
                </div>

                <Link href="/history" className="secondaryBtn">
                  {text("View Full Timeline", "عرض المسار الكامل")}
                </Link>
              </div>

              <div className="ohTimeline">
                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Account Created", "تم إنشاء الحساب")}
                    </p>
                    <p className="ohTimelineMeta">{memberSinceLabel}</p>
                  </div>
                  <span className="ohStatusBadge good">
                    {text("Done", "تم")}
                  </span>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {text("First Assessment", "أول تقييم")}
                    </p>
                    <p className="ohTimelineMeta">
                      {firstAssessment
                        ? `${localizeOrganName(firstAssessment.organ_name)} · ${formatDate(
                            firstAssessment.created_at
                          )}`
                        : text("Not started yet", "لم يبدأ بعد")}
                    </p>
                  </div>
                  <Link href="/assessment" className="secondaryBtn">
                    {firstAssessment ? text("Update", "تحديث") : text("Start", "ابدأ")}
                  </Link>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Latest Assessment", "آخر تقييم")}
                    </p>
                    <p className="ohTimelineMeta">
                      {latestAssessment
                        ? `${localizeOrganName(latestAssessment.organ_name)} · ${latestAssessment.score}/100`
                        : text("No latest assessment", "لا يوجد تقييم حديث")}
                    </p>
                  </div>
                  <span
                    className={`ohStatusBadge ${
                      latestAssessment ? getTone(latestAssessment.score) : "neutral"
                    }`}
                  >
                    {latestAssessment
                      ? getStatus(latestAssessment.score)
                      : text("Pending", "بانتظار")}
                  </span>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Medical Reports Uploaded", "تم رفع التقارير الطبية")}
                    </p>
                    <p className="ohTimelineMeta">
                      {uploadedReportsCount > 0
                        ? isArabic
                          ? `${uploadedReportsCount} تقرير · آخر تقرير: ${latestReportDate}`
                          : `${uploadedReportsCount} report(s) · Latest: ${latestReportDate}`
                        : text("No reports uploaded yet", "لا توجد تقارير مرفوعة بعد")}
                    </p>
                  </div>
                  <Link href="/lab-upload" className="secondaryBtn">
                    {uploadedReportsCount > 0 ? text("Add", "إضافة") : text("Upload", "رفع")}
                  </Link>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Health Analysis Saved", "تم حفظ التحليل الصحي")}
                    </p>
                    <p className="ohTimelineMeta">
                      {savedAnalysis.length > 0
                        ? isArabic
                          ? `${savedAnalysis.length} نتيجة محفوظة`
                          : `${savedAnalysis.length} saved result(s)`
                        : text("No saved intelligence yet", "لا يوجد تحليل صحي محفوظ بعد")}
                    </p>
                  </div>
                  <Link href="/reports" className="secondaryBtn">
                    {text("Open", "فتح")}
                  </Link>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">Wellness Check-In</p>
                    <p className="ohTimelineMeta">
                      {dailyCheckIn
                        ? `${dailyCheckIn.wellness_score}/100 · ${dailyCheckIn.mood}`
                        : text("No check-in yet", "لا يوجد Check-In بعد")}
                    </p>
                  </div>
                  <Link href="/checkin" className="secondaryBtn">
                    {dailyCheckIn ? text("Update", "تحديث") : text("Start", "ابدأ")}
                  </Link>
                </div>
              </div>
            </section>

            <section className="ohTrustNotice">
              <span aria-hidden="true">🛡️</span>
              <div>
                <strong>
                  {text("Medical safety reminder", "تذكير السلامة الطبية")}
                </strong>
                <br />
                {text(
                  "OrganHeal organizes health information for education and preparation. It does not replace diagnosis, treatment, emergency care, or a licensed clinician.",
                  "يقوم OrganHeal بتنظيم المعلومات الصحية للتعليم والتحضير. لا يستبدل التشخيص أو العلاج أو الرعاية الطارئة أو الطبيب المختص."
                )}
              </div>
            </section>

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Profile Journey", "رحلة الملف")}
                  </p>
                  <h2 className="ohCardTitle">
                    {text(
                      "Continue from your saved identity",
                      "تابع من هويتك الصحية المحفوظة"
                    )}
                  </h2>
                  <p className="ohCardText">
                    {text(
                      "Your profile connects your account, assessments, reports, intelligence results, check-ins, and follow-up plan.",
                      "ملفك يربط الحساب، التقييمات، التقارير، نتائج التحليل الصحي، Check-Ins، وخطة المتابعة في مكان واحد."
                    )}
                  </p>
                </div>
              </div>

              <div className="ohButtonRow">
                <Link href="/dashboard" className="secondaryBtn">
                  {text("Dashboard", "لوحة التحكم")}
                </Link>

                <Link href="/reports" className="secondaryBtn">
                  {text("Reports", "التقارير")}
                </Link>

                <Link href="/reports" className="primaryBtn">
                  {text("Analysis", "تحليل التقارير")}
                </Link>

                <Link href="/health-plan" className="secondaryBtn">
                  {text("Health Plan", "الخطة الصحية")}
                </Link>

                <Link href="/checkin" className="secondaryBtn">
                  Check-In
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



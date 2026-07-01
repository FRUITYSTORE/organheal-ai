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

type SavedIntelligence = {
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
  const [savedIntelligence, setSavedIntelligence] = useState<SavedIntelligence[]>(
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
      .select("username, email, created_at")
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

    let savedIntelligenceData: SavedIntelligence[] = [];

    if (insightIds.length > 0) {
      const { data: savedData } = await supabase
        .from("generated_intelligence_results")
        .select("insight_id, updated_at")
        .eq("user_id", user.id)
        .in("insight_id", insightIds)
        .order("updated_at", { ascending: false });

      savedIntelligenceData = savedData || [];
    }

    setAssessments((organData || []) as Assessment[]);
    setDailyCheckIn((checkInData || null) as DailyCheckIn | null);
    setUploadedReports((uploadedReportsData || []) as UploadedReport[]);
    setHealthInsights((insightsData || []) as HealthInsight[]);
    setSavedIntelligence(savedIntelligenceData);
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
  if (savedIntelligence.length > 0) completion += 25;

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
      : savedIntelligence.length === 0
      ? {
          label: text(
            "Generate saved health analysis",
            "ولّد التحليل الصحي المحفوظ"
          ),
          description: text(
            "Open Report Analysis to generate and save insights from your reports.",
            "افتح تحليل التقارير لتوليد وحفظ ملخصات ذكية من تقاريرك."
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
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"}>
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
                          ? `${savedIntelligence.length} نتيجة محفوظة · ${generatedInsightCount} نتيجة مولدة`
                          : `${savedIntelligence.length} saved · ${generatedInsightCount} generated`}
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
                      {savedIntelligence.length > 0
                        ? isArabic
                          ? `${savedIntelligence.length} نتيجة محفوظة`
                          : `${savedIntelligence.length} saved result(s)`
                        : text("No saved intelligence yet", "لا يوجد ذكاء صحي محفوظ بعد")}
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
    </main>
  );
}



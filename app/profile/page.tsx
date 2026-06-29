"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
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
  const [memberSince, setMemberSince] = useState("");

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

  function formatDate(value: string | null | undefined) {
    if (!value) {
      return isArabic ? "غير متاح" : "Not available";
    }

    return new Date(value).toLocaleDateString(isArabic ? "ar-AE" : "en-US");
  }

  function localizeOrganName(value: string | null | undefined) {
    if (!value) return isArabic ? "غير متاح" : "N/A";
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
    setUsername(profile?.username || (currentIsArabic ? "مستخدم" : "User"));
    setMemberSince(
      profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString(
            currentIsArabic ? "ar-AE" : "en-US"
          )
        : currentIsArabic
        ? "حديثًا"
        : "Recently"
    );

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
          scoreInputs.reduce((sum, score) => sum + score, 0) /
            scoreInputs.length
        )
      : 0;

  function getStatus(score: number) {
    if (score >= 80) return isArabic ? "جيد" : "Good";
    if (score >= 50) return isArabic ? "متوسط" : "Moderate";
    return isArabic ? "مرتفع الخطورة" : "High Risk";
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 50) return "moderateScore";
    return "riskScore";
  }

  let completion = 0;

  if (assessments.length > 0) completion += 30;
  if (uploadedReportsCount > 0) completion += 25;
  if (dailyCheckIn) completion += 20;
  if (savedIntelligence.length > 0) completion += 25;

  const healthProfileStatus =
    completion === 0
      ? isArabic
        ? "لم يبدأ"
        : "Not Started"
      : completion < 75
      ? isArabic
        ? "قيد البناء"
        : "Building"
      : isArabic
      ? "نشط"
      : "Active";

  const recommendedAction =
    assessments.length === 0
      ? {
          label: isArabic
            ? "ابدأ أول تقييم صحي"
            : "Start your first health assessment",
          description: isArabic
            ? "أكمل تقييمًا واحدًا حتى يبدأ OrganHeal ببناء هويتك الصحية المحفوظة."
            : "Complete one organ assessment so OrganHeal can begin building your saved health identity.",
          href: "/assessment",
          buttonText: isArabic ? "ابدأ التقييم" : "Start Assessment",
        }
      : uploadedReportsCount === 0
      ? {
          label: isArabic
            ? "ارفع أول تقرير طبي"
            : "Upload your first medical report",
          description: isArabic
            ? "أضف تقرير مختبر أو أشعة أو مستندًا طبيًا لتقوية ملفك الصحي."
            : "Add a lab report, radiology report, or medical document to strengthen your health profile.",
          href: "/lab-upload",
          buttonText: isArabic ? "رفع تقرير" : "Upload Report",
        }
      : savedIntelligence.length === 0
      ? {
          label: isArabic
            ? "ولّد الذكاء الصحي المحفوظ"
            : "Generate saved health intelligence",
          description: isArabic
            ? "افتح مركز الذكاء لتوليد وحفظ ملخصات ذكية من تقاريرك."
            : "Open Intelligence Center to generate and save insights from your reports.",
          href: "/intelligence",
          buttonText: isArabic ? "افتح مركز الذكاء" : "Open Intelligence",
        }
      : !dailyCheckIn
      ? {
          label: isArabic
            ? "أكمل أول تحديث صحي"
            : "Complete your first wellness check-in",
          description: isArabic
            ? "أضف آخر حالة للنوم، المزاج، الضغط، الترطيب، الطاقة، والنشاط."
            : "Add your latest sleep, mood, stress, hydration, energy, and activity status.",
          href: "/checkin",
          buttonText: isArabic ? "افتح Check-In" : "Open Check-In",
        }
      : {
          label: isArabic
            ? "تابع خطة المتابعة الصحية"
            : "Continue your follow-up plan",
          description: isArabic
            ? "ملفك الصحي نشط الآن. راجع الخطة الصحية، المهام، وإيقاع المتابعة."
            : "Your profile is active. Review your health plan, action tasks, and follow-up rhythm.",
          href: "/health-plan",
          buttonText: isArabic ? "افتح الخطة الصحية" : "Open Health Plan",
        };

  return (
    <main className="assistantPage" dir={isArabic ? "rtl" : "ltr"}>
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">
            {isArabic ? "الملف الشخصي" : "USER PROFILE"}
          </p>
          <h1>{isArabic ? "ملفك في OrganHeal" : "Your OrganHeal Profile"}</h1>
          <p>
            {isArabic
              ? "هويتك الصحية المحفوظة، ملخص الحساب، تقدم البيانات الصحية، التقارير، الذكاء الصحي، والخطوة التالية المقترحة."
              : "Your saved health identity, account summary, health data progress, reports, intelligence, and recommended next step."}
          </p>
        </div>

        <div className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">
                {isArabic ? "تحميل الملف" : "Loading Profile"}
              </p>
              <h2>
                {isArabic
                  ? "جاري تحضير هويتك الصحية..."
                  : "Preparing your health identity..."}
              </h2>
            </div>
          )}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">
                {isArabic ? "تنبيه الملف" : "Profile Notice"}
              </p>
              <h2>
                {isArabic ? "تعذر تحميل الملف" : "Could not load profile"}
              </h2>
              <p>{message}</p>
            </div>
          )}

          {!loading && !message && (
            <>
              <div className="healthIdentityHero">
                <div>
                  <p className="sectionLabel">
                    {isArabic ? "الهوية الصحية" : "Health Identity"}
                  </p>
                  <h2>{username}</h2>
                  <p>{email}</p>
                  <p>
                    {isArabic ? "عضو منذ: " : "Member since: "}
                    {memberSince}
                  </p>
                  <p>
                    {isArabic
                      ? `اكتمال الملف الصحي: ${completion}%`
                      : `Health Profile Completion: ${completion}%`}
                  </p>
                </div>

                <div className="healthIdentityStatus">
                  <span>{completion}%</span>
                  <p>{healthProfileStatus}</p>
                </div>
              </div>

              <div
                className="resultBox"
                style={{
                  marginTop: "18px",
                  marginBottom: "20px",
                  border: "1px solid rgba(34,211,238,0.22)",
                }}
              >
                <p className="sectionLabel">
                  {isArabic ? "الخطوة التالية المقترحة" : "Recommended Next Step"}
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
                    {isArabic ? "المؤشر الصحي العام" : "Overall Health Score"}
                  </p>
                  <h2 className={getScoreClass(overallScore)}>
                    {overallScore}/100
                  </h2>
                  <h3>
                    {scoreInputs.length > 0
                      ? getStatus(overallScore)
                      : isArabic
                      ? "لا توجد بيانات بعد"
                      : "No Data Yet"}
                  </h3>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic
                      ? "تقييمات الأعضاء المحفوظة"
                      : "Saved Organ Assessments"}
                  </p>
                  <h2>{assessments.length}</h2>
                  <p>
                    {isArabic
                      ? "إجمالي وحدات تقييم الأعضاء المحفوظة."
                      : "Total saved organ modules."}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "التقارير المرفوعة" : "Uploaded Reports"}
                  </p>
                  <h2>{uploadedReportsCount}</h2>
                  <p>
                    {isArabic
                      ? `${processedReports} مكتمل · ${pendingReports} قيد الانتظار`
                      : `${processedReports} processed · ${pendingReports} pending`}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "الذكاء الصحي المحفوظ" : "Saved Intelligence"}
                  </p>
                  <h2>{savedIntelligence.length}</h2>
                  <p>
                    {isArabic
                      ? "نتائج ذكاء صحي محفوظة ومرتبطة بتقاريرك."
                      : "Saved intelligence results connected to your reports."}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "آخر Check-In" : "Latest Check-In"}
                  </p>
                  <h2>
                    {dailyCheckIn ? `${dailyCheckIn.wellness_score}/100` : "N/A"}
                  </h2>
                  <p>
                    {dailyCheckIn
                      ? `${dailyCheckIn.mood} · ${formatDate(dailyCheckIn.created_at)}`
                      : isArabic
                      ? "لا يوجد تحديث صحي بعد"
                      : "No wellness check-in yet"}
                  </p>
                </div>

                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "العضو ذو الأولوية" : "Priority Organ"}
                  </p>
                  <h2>{localizeOrganName(priorityAssessment?.organ_name)}</h2>
                  <p>
                    {priorityAssessment
                      ? isArabic
                        ? `أقل مؤشر حالي: ${priorityAssessment.score}/100`
                        : `Lowest current score: ${priorityAssessment.score}/100`
                      : isArabic
                      ? "أكمل التقييمات لتحديد العضو الذي يحتاج أولوية."
                      : "Complete assessments to identify your priority organ."}
                  </p>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "ملخص البيانات المحفوظة" : "Saved Data Summary"}
                </p>

                <h2>
                  {isArabic ? `${completion}% مكتمل` : `${completion}% Complete`}
                </h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    marginBottom: "18px",
                  }}
                >
                  {isArabic
                    ? "هذا الملخص يوضح أهم البيانات المرتبطة حاليًا بملفك في OrganHeal."
                    : "This summary shows the main data currently connected to your OrganHeal profile."}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <div>
                    <strong>{isArabic ? "التقييمات" : "Assessments"}</strong>
                    <p>{assessments.length}</p>
                  </div>

                  <div>
                    <strong>{isArabic ? "التقارير" : "Reports"}</strong>
                    <p>{uploadedReportsCount}</p>
                  </div>

                  <div>
                    <strong>
                      {isArabic ? "الذكاء المحفوظ" : "Saved Intelligence"}
                    </strong>
                    <p>{savedIntelligence.length}</p>
                  </div>

                  <div>
                    <strong>Check-In</strong>
                    <p>
                      {dailyCheckIn
                        ? isArabic
                          ? "نشط"
                          : "Active"
                        : isArabic
                        ? "لم يبدأ"
                        : "Not started"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "مسار الرحلة الصحية" : "Health Journey Timeline"}
                </p>

                <div className="healthTimeline">
                  <div className="timelineItem active">
                    <strong>{isArabic ? "تم إنشاء الحساب" : "Account Created"}</strong>
                    <span>{memberSince}</span>
                  </div>

                  <div
                    className={firstAssessment ? "timelineItem active" : "timelineItem"}
                  >
                    <strong>{isArabic ? "أول تقييم" : "First Assessment"}</strong>
                    <span>
                      {firstAssessment
                        ? `${localizeOrganName(firstAssessment.organ_name)} · ${formatDate(
                            firstAssessment.created_at
                          )}`
                        : isArabic
                        ? "لم يبدأ بعد"
                        : "Not started yet"}
                    </span>
                  </div>

                  <div
                    className={latestAssessment ? "timelineItem active" : "timelineItem"}
                  >
                    <strong>{isArabic ? "آخر تقييم" : "Latest Assessment"}</strong>
                    <span>
                      {latestAssessment
                        ? `${localizeOrganName(latestAssessment.organ_name)} · ${latestAssessment.score}/100`
                        : isArabic
                        ? "لا يوجد تقييم حديث"
                        : "No latest assessment"}
                    </span>
                  </div>

                  <div
                    className={
                      uploadedReportsCount > 0 ? "timelineItem active" : "timelineItem"
                    }
                  >
                    <strong>
                      {isArabic ? "تم رفع التقارير الطبية" : "Medical Reports Uploaded"}
                    </strong>
                    <span>
                      {uploadedReportsCount > 0
                        ? isArabic
                          ? `${uploadedReportsCount} تقرير · آخر تقرير: ${latestReportDate}`
                          : `${uploadedReportsCount} report(s) · Latest: ${latestReportDate}`
                        : isArabic
                        ? "لا توجد تقارير مرفوعة بعد"
                        : "No reports uploaded yet"}
                    </span>
                  </div>

                  <div
                    className={
                      savedIntelligence.length > 0
                        ? "timelineItem active"
                        : "timelineItem"
                    }
                  >
                    <strong>
                      {isArabic
                        ? "تم حفظ الذكاء الصحي"
                        : "Health Intelligence Saved"}
                    </strong>
                    <span>
                      {savedIntelligence.length > 0
                        ? isArabic
                          ? `${savedIntelligence.length} نتيجة محفوظة`
                          : `${savedIntelligence.length} saved result(s)`
                        : isArabic
                        ? "لا يوجد ذكاء صحي محفوظ بعد"
                        : "No saved intelligence yet"}
                    </span>
                  </div>

                  <div className={dailyCheckIn ? "timelineItem active" : "timelineItem"}>
                    <strong>Wellness Check-In</strong>
                    <span>
                      {dailyCheckIn
                        ? `${dailyCheckIn.wellness_score}/100 · ${dailyCheckIn.mood}`
                        : isArabic
                        ? "لا يوجد Check-In بعد"
                        : "No check-in yet"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "رحلة الملف" : "Profile Journey"}
                </p>

                <h2>
                  {isArabic
                    ? "تابع من هويتك الصحية المحفوظة"
                    : "Continue from your saved identity"}
                </h2>

                <p
                  style={{
                    opacity: 0.82,
                    lineHeight: 1.7,
                    maxWidth: "760px",
                    margin: "0 auto 22px",
                  }}
                >
                  {isArabic
                    ? "ملفك يربط الحساب، التقييمات، التقارير، نتائج الذكاء الصحي، Check-Ins، وخطة المتابعة في مكان واحد."
                    : "Your profile connects your account, assessments, reports, intelligence results, check-ins, and follow-up plan."}
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
                    {isArabic ? "لوحة التحكم" : "Dashboard"}
                  </Link>

                  <Link href="/reports" className="secondaryBtn">
                    {isArabic ? "التقارير" : "Reports"}
                  </Link>

                  <Link href="/intelligence" className="primaryBtn">
                    {isArabic ? "مركز الذكاء" : "Intelligence"}
                  </Link>

                  <Link href="/health-plan" className="secondaryBtn">
                    {isArabic ? "الخطة الصحية" : "Health Plan"}
                  </Link>

                  <Link href="/checkin" className="secondaryBtn">
                    Check-In
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

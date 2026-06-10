"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import DashboardEmptyState from "../components/DashboardEmptyState";
import { getTranslations } from "../../lib/translations";

type Assessment = {
  organ_name: string;
  score: number;
  risk_level: string;
  notes: string;
  created_at: string;
};

type LabReport = {
  score: number;
  interpretation: string;
  created_at: string;
};

type DailyCheckIn = {
  mood: string;
  wellness_score: number;
  created_at: string;
};

type Language = "en" | "ar";

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [labReport, setLabReport] = useState<LabReport | null>(null);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    fetchDashboardData();

    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";

      setLanguage(currentLanguage);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const t = getTranslations(language);
  const isArabic = language === "ar";

  async function fetchDashboardData() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage(
        isArabic
          ? "يرجى تسجيل الدخول أو إنشاء حساب للوصول إلى لوحة التحكم."
          : "Please login or sign up to access your dashboard."
      );
      setLoading(false);
      return;
    }

    const user = userData.user;

    const { data: organData, error: organError } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (organError) {
      setMessage("Database error: " + organError.message);
      setLoading(false);
      return;
    }

    const { data: labData, error: labError } = await supabase
      .from("lab_reports")
      .select("score, interpretation, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (labError && labError.code !== "PGRST116") {
      setMessage("Database error: " + labError.message);
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
      setMessage("Database error: " + checkInError.message);
      setLoading(false);
      return;
    }

    setAssessments(organData || []);
    setLabReport(labData || null);
    setDailyCheckIn(checkInData || null);
    setLoading(false);
  }

  function getStatus(score: number) {
    if (isArabic) {
      if (score >= 80) return "جيد";
      if (score >= 50) return "متوسط";
      return "مرتفع الخطورة";
    }

    if (score >= 80) return "Good";
    if (score >= 50) return "Moderate";
    return "High Risk";
  }

  function getScoreClass(score: number) {
    if (score >= 80) return "goodScore";
    if (score >= 50) return "moderateScore";
    return "riskScore";
  }

  function getProgressColor(score: number) {
    if (score >= 80) return "linear-gradient(90deg, #22c55e, #38bdf8)";
    if (score >= 50) return "linear-gradient(90deg, #f59e0b, #facc15)";
    return "linear-gradient(90deg, #ef4444, #f97316)";
  }

  function getAIRecommendation(moduleName: string | null) {
    if (isArabic) {
      switch (moduleName) {
        case "Heart":
          return "راقب ضغط الدم، الكوليسترول، النشاط البدني، والوزن.";
        case "Lung":
          return "تجنب التدخين والتعرض للدخان، وراقب السعال أو ضيق التنفس.";
        case "Kidney":
          return "حافظ على الترطيب، راقب ضغط الدم، وناقش وظائف الكلى مع مختص صحي عند الحاجة.";
        case "Liver":
          return "ركز على التغذية الصحية، التحكم بالوزن، وتقليل العوامل التي تجهد الكبد.";
        case "Brain":
          return "حسن جودة النوم، النشاط البدني، وتقليل التوتر.";
        case "Metabolic":
          return "ركز على ضبط السكر، الوزن الصحي، النشاط البدني، والتغذية.";
        default:
          return "استمر في المتابعة الصحية الوقائية وإكمال التقييمات.";
      }
    }

    switch (moduleName) {
      case "Heart":
        return "Monitor blood pressure, cholesterol, physical activity, and body weight.";
      case "Lung":
        return "Avoid smoking exposure and monitor cough, wheezing, or shortness of breath.";
      case "Kidney":
        return "Maintain hydration, monitor blood pressure, and consider kidney function follow-up.";
      case "Liver":
        return "Focus on healthy nutrition, weight control, and reducing liver stressors.";
      case "Brain":
        return "Improve sleep quality, physical activity, and stress reduction habits.";
      case "Metabolic":
        return "Focus on blood sugar control, healthy weight, physical activity, and nutrition.";
      default:
        return "Continue regular health monitoring and preventive assessments.";
    }
  }

  function generateCoachMessage(
    priorityOrgan: string,
    strongestOrgan: string,
    currentOverallScore: number
  ) {
    if (isArabic) {
      let coachMessage = "";

      if (currentOverallScore >= 80) {
        coachMessage += "تقدم ممتاز. ملفك الصحي العام يبدو قويًا حاليًا. ";
      } else if (currentOverallScore >= 60) {
        coachMessage +=
          "ملفك الصحي يظهر أداءً متوسطًا مع وجود فرص للتحسين. ";
      } else {
        coachMessage += "هناك عدة مناطق صحية تحتاج إلى متابعة واهتمام أكبر. ";
      }

      coachMessage += `أقوى منطقة لديك هي ${strongestOrgan}. `;
      coachMessage += `منطقة الأولوية الحالية هي ${priorityOrgan}. `;
      coachMessage += getAIRecommendation(priorityOrgan);

      return coachMessage;
    }

    let coachMessage = "";

    if (currentOverallScore >= 80) {
      coachMessage +=
        "Excellent progress. Your overall health profile is currently strong. ";
    } else if (currentOverallScore >= 60) {
      coachMessage +=
        "Your health profile shows moderate performance with opportunities for improvement. ";
    } else {
      coachMessage +=
        "Several health areas require closer attention and follow-up. ";
    }

    coachMessage += `Your strongest area is ${strongestOrgan}. `;
    coachMessage += `Your current priority area is ${priorityOrgan}. `;
    coachMessage += getAIRecommendation(priorityOrgan);

    return coachMessage;
  }

  function generateTodayMission(priorityOrgan: string, currentScore: number) {
    const targetScore = currentScore < 50 ? 70 : currentScore < 80 ? 85 : 95;
    const progress = Math.min(
      100,
      Math.round((currentScore / targetScore) * 100)
    );

    return {
      priorityOrgan,
      currentScore,
      targetScore,
      progress,
      nextReview: isArabic ? "7 أيام" : "7 days",
    };
  }

  const allScores = [
    ...assessments.map((item) => item.score),
    ...(labReport ? [labReport.score] : []),
    ...(dailyCheckIn ? [dailyCheckIn.wellness_score] : []),
  ];

  const overallScore =
    allScores.length > 0
      ? Math.round(
          allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        )
      : 0;

  const topStrength =
    assessments.length > 0
      ? [...assessments].sort((a, b) => b.score - a.score)[0]
      : null;

  const priorityAttention =
    assessments.length > 0
      ? [...assessments].sort((a, b) => a.score - b.score)[0]
      : null;

  const latestDate = [...assessments.map((item) => item.created_at)]
    .concat(labReport ? [labReport.created_at] : [])
    .concat(dailyCheckIn ? [dailyCheckIn.created_at] : [])
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const todayMission = priorityAttention
    ? generateTodayMission(priorityAttention.organ_name, priorityAttention.score)
    : null;

  const forecastDirection =
    overallScore >= 80
      ? isArabic
        ? "مستقر"
        : "Stable"
      : overallScore >= 60
      ? isArabic
        ? "قابل للتحسن"
        : "Improving Potential"
      : isArabic
      ? "يحتاج اهتمام"
      : "Needs Attention";

  const expectedNextScore =
    overallScore >= 80
      ? Math.min(100, overallScore + 3)
      : overallScore >= 60
      ? Math.min(100, overallScore + 8)
      : Math.min(100, overallScore + 12);

  const forecastConfidence =
    allScores.length >= 4
      ? isArabic
        ? "مرتفع"
        : "High"
      : allScores.length >= 2
      ? isArabic
        ? "متوسط"
        : "Moderate"
      : isArabic
      ? "منخفض"
      : "Low";

  const forecastMessage = isArabic
    ? `بناءً على بياناتك الحالية، قد تصل درجتك الصحية المتوقعة خلال 30 يومًا إلى ${expectedNextScore}/100 إذا استمريت في التقييمات اليومية والخطة الصحية.`
    : `Based on your current data, your expected health score in 30 days may reach ${expectedNextScore}/100 if you continue daily tracking and your health plan.`;

  const healthCoachMessage =
    assessments.length > 0
      ? generateCoachMessage(
          priorityAttention?.organ_name || "General Health",
          topStrength?.organ_name || "General Health",
          overallScore
        )
      : isArabic
      ? "أكمل أول تقييم صحي للحصول على إرشادات صحية شخصية."
      : "Complete your first organ assessment to receive personalized health guidance.";

  const latestLabFinding = labReport
    ? isArabic
      ? `آخر نتيجة مختبرية: ${labReport.score}/100`
      : `Latest lab score: ${labReport.score}/100`
    : isArabic
    ? "لا يوجد تقرير مختبر محفوظ بعد."
    : "No lab report saved yet.";

  const healthIntelligenceSummary = isArabic
    ? `الحالة الصحية الحالية ${getStatus(
        overallScore
      )} بدرجة ${overallScore}/100. منطقة الأولوية هي ${
        priorityAttention?.organ_name || "الصحة العامة"
      }. ${latestLabFinding} الإجراء الموصى به: ${getAIRecommendation(
        priorityAttention?.organ_name || null
      )}`
    : `Current health status is ${getStatus(
        overallScore
      )} with a score of ${overallScore}/100. Priority area is ${
        priorityAttention?.organ_name || "General Health"
      }. ${latestLabFinding}. Recommended focus: ${getAIRecommendation(
        priorityAttention?.organ_name || null
      )}`;

  const onboardingSteps = [
    {
      title: isArabic ? "إكمال التقييم" : "Complete Assessment",
      completed: assessments.length > 0,
    },
    {
      title: isArabic ? "إكمال التسجيل الصحي اليومي" : "Complete Daily Check-In",
      completed: !!dailyCheckIn,
    },
    {
      title: isArabic ? "إنشاء أول تقرير" : "Generate First Report",
      completed: assessments.length > 0,
    },
  ];

  const completedSteps = onboardingSteps.filter((step) => step.completed).length;

  const onboardingProgress = Math.round(
    (completedSteps / onboardingSteps.length) * 100
  );

  const notifications: string[] = [];

  if (assessments.length === 0) {
    notifications.push(
      isArabic
        ? "أكمل أول تقييم للأعضاء لفتح الذكاء الصحي."
        : "Complete your first organ assessment to unlock health intelligence."
    );
  }

  if (!dailyCheckIn) {
    notifications.push(
      isArabic
        ? "التسجيل الصحي اليومي لم يكتمل بعد. تابع حالتك الصحية اليوم."
        : "Daily Check-In pending. Track today's wellness status."
    );
  }

  if (!labReport) {
    notifications.push(
      isArabic
        ? "لا يوجد تقرير مختبر محفوظ. أضف نتائج المختبر للحصول على فهم أعمق."
        : "No lab report found. Upload laboratory results for deeper insights."
    );
  }

  if (priorityAttention) {
    notifications.push(
      isArabic
        ? `${priorityAttention.organ_name} هي منطقة تحتاج إلى اهتمام أكبر حاليًا.`
        : `${priorityAttention.organ_name} currently requires the most attention.`
    );
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">{t.dashboard.badge}</p>
          <h1>{t.dashboard.title}</h1>
          <p>{t.dashboard.description}</p>
        </div>

        <div className="chatWindow">
          {loading && (
            <div className="resultBox">
              <p className="sectionLabel">
                {isArabic ? "تحميل لوحة التحكم" : "Loading Dashboard"}
              </p>
              <h2>
                {isArabic
                  ? "جاري تجهيز الذكاء الصحي الخاص بك..."
                  : "Preparing your health intelligence..."}
              </h2>

              <div style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    style={{
                      height: "90px",
                      borderRadius: "18px",
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(34,211,238,0.18), rgba(255,255,255,0.08))",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && message && (
            <div className="resultBox">
              <p className="sectionLabel">
                {isArabic ? "تسجيل الدخول مطلوب" : "Login Required"}
              </p>
              <h2>{isArabic ? "الوصول محمي" : "Access Protected"}</h2>
              <p>{message}</p>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <Link href="/login">
                  <button className="primaryBtn">
                    {isArabic ? "تسجيل الدخول" : "Login"}
                  </button>
                </Link>

                <Link href="/signup">
                  <button className="secondaryBtn">
                    {isArabic ? "إنشاء حساب" : "Sign Up"}
                  </button>
                </Link>
              </div>
            </div>
          )}

          {!loading && !message && allScores.length === 0 && (
            <DashboardEmptyState
              title={
                isArabic ? "لوحة التحكم جاهزة" : "Your Dashboard Is Ready"
              }
              description={
                isArabic
                  ? "ابدأ أول تقييم للأعضاء لفتح الدرجة الصحية، الخطة الصحية، والتقرير الاحترافي."
                  : "Start your first organ assessment to unlock your health score, health plan, and professional report."
              }
              buttonText={
                isArabic ? "ابدأ أول تقييم" : "Start First Assessment"
              }
              href="/assessment"
            />
          )}

          {!loading && !message && allScores.length > 0 && (
            <>
              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "🚀 البداية" : "🚀 Getting Started"}
                </p>

                <h2>{t.dashboard.onboarding}</h2>

                <p>
                  {isArabic
                    ? "أكمل إعداد ملفك الصحي لفتح تجربة OrganHeal الكاملة."
                    : "Complete your health setup to unlock the full OrganHeal experience."}
                </p>

                <div
                  style={{
                    width: "100%",
                    height: "12px",
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: "999px",
                    overflow: "hidden",
                    marginTop: "18px",
                  }}
                >
                  <div
                    style={{
                      width: `${onboardingProgress}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #22c55e, #38bdf8)",
                    }}
                  />
                </div>

                <p style={{ marginTop: "12px" }}>
                  {isArabic ? "التقدم" : "Progress"}: {onboardingProgress}%
                </p>

                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginTop: "18px",
                    textAlign: isArabic ? "right" : "left",
                  }}
                >
                  {onboardingSteps.map((step, index) => (
                    <div key={index}>
                      {step.completed ? "✅" : "⬜"} {step.title}
                    </div>
                  ))}
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic
                    ? "🧠 ملخص الذكاء الصحي"
                    : "🧠 Health Intelligence Summary"}
                </p>

                <h2>
                  {isArabic ? "ملخصك الصحي الذكي" : "Your Smart Health Summary"}
                </h2>

                <p>{healthIntelligenceSummary}</p>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic
                    ? "الذكاء الصحي العام"
                    : "Overall Health Intelligence"}
                </p>

                <h2 className={getScoreClass(overallScore)}>
                  {overallScore}/100
                </h2>

                <h3>{getStatus(overallScore)}</h3>

                <p>
                  {isArabic ? "مصادر البيانات المكتملة" : "Completed data sources"}:{" "}
                  {assessments.length +
                    (labReport ? 1 : 0) +
                    (dailyCheckIn ? 1 : 0)}
                </p>

                {latestDate && (
                  <p>
                    {isArabic ? "آخر تحديث" : "Last updated"}:{" "}
                    {new Date(latestDate).toLocaleString()}
                  </p>
                )}

                <div
                  style={{
                    width: "100%",
                    height: "14px",
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: "999px",
                    overflow: "hidden",
                    marginTop: "16px",
                  }}
                >
                  <div
                    style={{
                      width: `${overallScore}%`,
                      height: "100%",
                      background: getProgressColor(overallScore),
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic
                    ? "🔮 توقعات الذكاء الصحي"
                    : "🔮 Forecast Intelligence"}
                </p>

                <h2 className={getScoreClass(expectedNextScore)}>
                  {expectedNextScore}/100
                </h2>

                <h3>{forecastDirection}</h3>

                <p>{forecastMessage}</p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "14px",
                    marginTop: "18px",
                  }}
                >
                  <div>
                    <strong>{isArabic ? "الدرجة الحالية" : "Current Score"}</strong>
                    <p>{overallScore}/100</p>
                  </div>

                  <div>
                    <strong>{isArabic ? "الدرجة المتوقعة" : "Expected Score"}</strong>
                    <p>{expectedNextScore}/100</p>
                  </div>

                  <div>
                    <strong>{isArabic ? "الثقة" : "Confidence"}</strong>
                    <p>{forecastConfidence}</p>
                  </div>

                  <div>
                    <strong>{isArabic ? "المدة" : "Outlook"}</strong>
                    <p>{isArabic ? "30 يومًا" : "30 days"}</p>
                  </div>
                </div>
              </div>

              {priorityAttention && (
                <div className="priorityAlert">
                  <h3>
                    {isArabic
                      ? "🚨 تنبيه أولوية صحية"
                      : "🚨 Health Priority Alert"}
                  </h3>
                  <p>
                    <strong>{priorityAttention.organ_name}</strong>{" "}
                    {isArabic
                      ? `لديها حاليًا أقل درجة (${priorityAttention.score}/100).`
                      : `currently has the lowest score (${priorityAttention.score}/100).`}
                  </p>
                  <p>{getAIRecommendation(priorityAttention.organ_name)}</p>
                </div>
              )}

              {todayMission && (
                <div className="resultBox">
                  <p className="sectionLabel">
                    {isArabic ? "🎯 مهمة الصحة اليوم" : "🎯 Today's Health Mission"}
                  </p>

                  <h2>{todayMission.priorityOrgan}</h2>

                  <p>
                    {isArabic ? "الدرجة الحالية" : "Current Score"}:{" "}
                    {todayMission.currentScore}/100
                  </p>
                  <p>
                    {isArabic ? "الهدف" : "Target Score"}:{" "}
                    {todayMission.targetScore}/100
                  </p>
                  <p>
                    {isArabic ? "التقدم" : "Progress"}: {todayMission.progress}%
                  </p>

                  <p style={{ marginTop: "14px" }}>
                    {isArabic ? "الإجراء الموصى به" : "Recommended Action"}:{" "}
                    {getAIRecommendation(todayMission.priorityOrgan)}
                  </p>

                  <p>
                    {isArabic ? "المراجعة القادمة" : "Next Review"}:{" "}
                    {todayMission.nextReview}
                  </p>

                  <Link href="/health-plan">
                    <button className="primaryBtn">
                      {isArabic ? "ابدأ المهمة" : "Start Mission"}
                    </button>
                  </Link>
                </div>
              )}

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "☀️ آخر تسجيل صحي يومي" : "☀️ Latest Daily Check-In"}
                </p>

                {dailyCheckIn ? (
                  <>
                    <h2 className={getScoreClass(dailyCheckIn.wellness_score)}>
                      {dailyCheckIn.wellness_score}/100
                    </h2>

                    <h3>{dailyCheckIn.mood}</h3>

                    <p>
                      {isArabic ? "آخر تسجيل" : "Last check-in"}:{" "}
                      {new Date(dailyCheckIn.created_at).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <>
                    <h2>{isArabic ? "لا يوجد تسجيل بعد" : "No check-in yet"}</h2>
                    <p>
                      {isArabic
                        ? "أكمل التسجيل الصحي اليومي لتتبع أنماط العافية."
                        : "Complete your daily check-in to track wellness patterns."}
                    </p>

                    <Link href="/checkin">
                      <button className="primaryBtn">
                        {isArabic
                          ? "ابدأ التسجيل اليومي"
                          : "Start Daily Check-In"}
                      </button>
                    </Link>
                  </>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "🔔 مركز الإشعارات" : "🔔 Notifications Center"}
                </p>
                <h2>{t.dashboard.notifications}</h2>

                {notifications.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                      marginTop: "18px",
                    }}
                  >
                    {notifications.map((notification, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "14px",
                          borderRadius: "14px",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {notification}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{isArabic ? "لا توجد إشعارات نشطة." : "No active notifications."}</p>
                )}
              </div>

              <div className="resultBox">
                <p className="sectionLabel">
                  {isArabic ? "🤖 المدرب الصحي الذكي" : "🤖 AI Health Coach"}
                </p>
                <h2>{isArabic ? "توجيهات شخصية" : "Personalized Guidance"}</h2>
                <p>{healthCoachMessage}</p>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Link href="/health-plan">
                  <button className="primaryBtn">
                    {isArabic ? "الخطة الصحية" : "Health Plan"}
                  </button>
                </Link>

                <Link href="/history">
                  <button className="secondaryBtn">
                    {isArabic ? "السجل الصحي" : "Health History"}
                  </button>
                </Link>

                <Link href="/organ-report">
                  <button className="secondaryBtn">
                    {isArabic ? "التقرير الكامل" : "Full Report"}
                  </button>
                </Link>

                <Link href="/checkin">
                  <button className="secondaryBtn">
                    {isArabic ? "التسجيل اليومي" : "Daily Check-In"}
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
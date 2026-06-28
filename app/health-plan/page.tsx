"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageBackActions from "../components/PageBackActions";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";

type PriorityAssessment = {
  organ_name: string | null;
  score: number | null;
  risk_level: string | null;
};

type DailyCheckIn = {
  mood: string | null;
  wellness_score: number | null;
  created_at: string;
};

type UploadedReport = {
  id: number;
  file_name: string | null;
  extraction_status: string | null;
  created_at: string;
  extracted_at: string | null;
};

type HealthInsight = {
  id: number;
  report_id: number | null;
  ai_status: string | null;
  risk_level: string | null;
  summary: string | null;
  next_best_action: string | null;
  created_at: string;
};

type GeneratedResult = {
  insight_id: number | null;
  report_id: number | null;
  updated_at: string | null;
};

type HistoryItem = {
  id: number;
  created_at: string | null;
};

const organTaskPlans: Record<string, string[]> = {
  Heart: [
    "Check blood pressure at least 3 times this week.",
    "Reduce salty or heavily processed food for the next 7 days.",
    "Walk for 20 minutes on at least 4 days this week.",
    "Review any chest pain, shortness of breath, or palpitation pattern.",
  ],
  Kidney: [
    "Track hydration and urine changes for the next 7 days.",
    "Review blood pressure and avoid unnecessary NSAID use.",
    "Prepare latest creatinine, eGFR, and urine results for review.",
    "Reduce high-salt meals this week.",
  ],
  Liver: [
    "Review liver enzymes and medication or supplement exposure.",
    "Avoid alcohol and unnecessary supplements.",
    "Track abdominal discomfort, fatigue, or yellowing symptoms.",
    "Prepare previous liver-related reports for comparison.",
  ],
  Lung: [
    "Track cough, breathing difficulty, and activity tolerance.",
    "Avoid smoke, dust, and strong respiratory irritants.",
    "Record oxygen saturation if clinically relevant and available.",
    "Review inhaler or respiratory medication adherence if applicable.",
  ],
  Brain: [
    "Track sleep quality, headache pattern, focus, and stress level.",
    "Reduce late screen exposure for the next 7 days.",
    "Practice a short breathing or relaxation routine daily.",
    "Review any dizziness, weakness, or neurological warning symptoms.",
  ],
  Metabolic: [
    "Track weight, waist, or glucose-related changes weekly.",
    "Reduce sugary drinks and refined carbohydrates.",
    "Walk or exercise for at least 20 minutes on 4 days this week.",
    "Prepare lipid, glucose, HbA1c, or metabolic lab reports.",
  ],
  General: [
    "Complete one wellness check-in this week.",
    "Review your latest reports and generated intelligence.",
    "Choose one realistic lifestyle action for the next 7 days.",
    "Repeat your priority assessment after 4 weeks.",
  ],
};

const organAssessmentLinks: Record<string, string> = {
  Heart: "/heart",
  Kidney: "/kidney",
  Liver: "/liver",
  Lung: "/lung",
  Brain: "/brain",
  Metabolic: "/metabolic",
  General: "/assessment",
};

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
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";
      setLanguage(currentLanguage);
    }, 300);

    fetchHealthPlanData();

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";
  const priorityOrgan = priorityAssessment?.organ_name || "General";
  const priorityScore =
    typeof priorityAssessment?.score === "number"
      ? priorityAssessment.score
      : null;
  const riskLevel = priorityAssessment?.risk_level || "Not available";

  const taskStorageKey = `organheal-health-plan-tasks-${priorityOrgan}`;

  const completedExtractionCount = uploadedReports.filter(
    (report) => report.extraction_status === "Completed"
  ).length;

  const pendingExtractionCount = uploadedReports.filter(
    (report) =>
      !report.extraction_status || report.extraction_status === "Pending"
  ).length;

  const generatedCount = generatedResults.length;
  const latestGenerated = generatedResults[0] || null;
  const latestInsight = healthInsights[0] || null;

  const hasAssessment = Boolean(priorityAssessment);
  const hasReports = uploadedReports.length > 0;
  const hasGeneratedIntelligence = generatedCount > 0;
  const hasCheckIn = Boolean(latestCheckIn);
  const hasHistory = historyItems.length > 0;

  const planReadinessScore = [
    hasAssessment,
    hasReports,
    hasGeneratedIntelligence,
    hasCheckIn,
    hasHistory,
  ].filter(Boolean).length * 20;

  const planIntensity =
    priorityScore === null
      ? isArabic
        ? "بانتظار التقييم"
        : "Waiting for assessment"
      : priorityScore < 50
      ? isArabic
        ? "متابعة عالية"
        : "High follow-up"
      : priorityScore < 80
      ? isArabic
        ? "متابعة متوسطة"
        : "Moderate follow-up"
      : isArabic
      ? "متابعة وقائية"
      : "Preventive follow-up";

  const latestCheckInText = latestCheckIn
    ? `${new Date(latestCheckIn.created_at).toLocaleDateString()} - ${
        latestCheckIn.wellness_score ?? "N/A"
      }/100 - ${latestCheckIn.mood || "Mood not recorded"}`
    : isArabic
    ? "لا يوجد Check-In بعد"
    : "No check-in yet";

  const followUpRhythm =
    priorityScore === null
      ? isArabic
        ? "ابدأ بتقييم صحي"
        : "Start with an assessment"
      : priorityScore < 50
      ? isArabic
        ? "متابعة أسبوعية مقترحة"
        : "Weekly follow-up recommended"
      : priorityScore < 80
      ? isArabic
        ? "Check-In مرتين إلى ثلاث مرات أسبوعيًا"
        : "Check in 2 to 3 times per week"
      : isArabic
      ? "متابعة وقائية أسبوعية"
      : "Weekly preventive check-in";

  const nextBestAction = !hasAssessment
    ? {
        label: isArabic ? "ابدأ بالتقييم" : "Start your assessment",
        description: isArabic
          ? "أكمل تقييمًا واحدًا على الأقل حتى يحدد OrganHeal أولوية الخطة."
          : "Complete at least one assessment so OrganHeal can identify the priority area for your plan.",
        href: "/assessment",
        button: isArabic ? "ابدأ التقييم" : "Start Assessment",
      }
    : !hasReports
    ? {
        label: isArabic ? "أضف تقريرًا طبيًا" : "Add a medical report",
        description: isArabic
          ? "ارفع تقرير مختبر أو أشعة أو ملخص طبي حتى تصبح الخطة مبنية على بيانات أكثر."
          : "Upload a lab, radiology, or clinical report so your plan can use more health data.",
        href: "/lab-upload",
        button: isArabic ? "رفع تقرير" : "Upload Report",
      }
    : !hasGeneratedIntelligence
    ? {
        label: isArabic ? "ولّد الذكاء الصحي" : "Generate health intelligence",
        description: isArabic
          ? "لديك تقارير محفوظة. افتح مركز الذكاء لتوليد ملخص المريض وDoctor Brief."
          : "You have saved reports. Open Intelligence Center to generate a patient summary and doctor-ready brief.",
        href: "/intelligence",
        button: isArabic ? "مركز الذكاء" : "Intelligence Center",
      }
    : !hasCheckIn
    ? {
        label: isArabic ? "أكمل Check-In اليوم" : "Complete today check-in",
        description: isArabic
          ? "أضف تحديث النوم، الضغط النفسي، النشاط، الطاقة، والمزاج حتى تصبح الخطة أكثر شخصية."
          : "Add sleep, stress, activity, energy, and mood updates so the plan becomes more personal.",
        href: "/checkin",
        button: isArabic ? "افتح Check-In" : "Open Check-In",
      }
    : {
        label: isArabic ? "تابع خطة الأسبوع" : "Continue this week plan",
        description: isArabic
          ? "الخطة فعالة الآن. أكمل المهام، وراجع التقارير، وحدث Check-In بشكل منتظم."
          : "Your plan is active. Complete tasks, review reports, and keep check-ins updated.",
        href: "#action-tasks-section",
        button: isArabic ? "متابعة المهام" : "Continue Tasks",
      };

  const baseTasks = organTaskPlans[priorityOrgan] || organTaskPlans.General;

  const dynamicTasks = [
    !hasGeneratedIntelligence && hasReports
      ? isArabic
        ? "ولّد الذكاء الصحي لأحدث تقرير محفوظ."
        : "Generate intelligence for the latest saved report."
      : null,
    hasGeneratedIntelligence
      ? isArabic
        ? "راجع ملخص المريض وDoctor Brief من مركز الذكاء."
        : "Review the patient summary and doctor-ready brief in Intelligence Center."
      : null,
    !hasCheckIn
      ? isArabic
        ? "أكمل Wellness Check-In هذا الأسبوع."
        : "Complete a wellness check-in this week."
      : null,
    completedExtractionCount > 0
      ? isArabic
        ? "راجع التقارير التي اكتمل استخراجها واربطها بالخطة."
        : "Review extracted reports and connect them to this plan."
      : null,
    hasHistory
      ? isArabic
        ? "راجع Health History لمقارنة التقدم السابق."
        : "Review Health History to compare previous progress."
      : null,
  ].filter(Boolean) as string[];

  const planTasks = [...dynamicTasks, ...baseTasks].slice(0, 8);

  const sevenDayPlan = [
    isArabic
      ? "اليوم 1: راجع الأولوية الصحية والخطوة التالية."
      : "Day 1: Review your priority area and next best action.",
    isArabic
      ? "اليوم 2: أكمل Check-In وحدد أهم عرض أو عادة تحتاج متابعة."
      : "Day 2: Complete a check-in and identify the main symptom or habit to track.",
    isArabic
      ? "اليوم 3: راجع آخر تقرير أو ولّد الذكاء الصحي إن لم يكن موجودًا."
      : "Day 3: Review the latest report or generate intelligence if missing.",
    isArabic
      ? "اليوم 4: نفذ مهمة واحدة من قائمة الخطة."
      : "Day 4: Complete one action task from the plan.",
    isArabic
      ? "اليوم 5: راجع مؤشرات التحسن أو التراجع."
      : "Day 5: Review improvement or worsening signals.",
    isArabic
      ? "اليوم 6: جهز أسئلة للطبيب إذا توجد نتائج مقلقة."
      : "Day 6: Prepare doctor questions if there are concerning results.",
    isArabic
      ? "اليوم 7: راجع التقدم وحدد الأسبوع القادم."
      : "Day 7: Review progress and decide next week focus.",
  ];

  const thirtyDayRoadmap = [
    isArabic
      ? "الأسبوع 1: تثبيت البيانات الأساسية والتقارير."
      : "Week 1: Build your baseline from assessments and reports.",
    isArabic
      ? "الأسبوع 2: متابعة Check-Ins وتنفيذ المهام الواقعية."
      : "Week 2: Track check-ins and complete realistic actions.",
    isArabic
      ? "الأسبوع 3: مراجعة الأنماط من التقارير والذكاء الصحي."
      : "Week 3: Review patterns from reports and generated intelligence.",
    isArabic
      ? "الأسبوع 4: إعادة تقييم الأولوية ومقارنة Health History."
      : "Week 4: Repeat the priority assessment and compare Health History.",
  ];

  const completedTaskCount = completedTasks.length;
  const totalTasks = planTasks.length;
  const taskProgress =
    totalTasks > 0 ? Math.round((completedTaskCount / totalTasks) * 100) : 0;

  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem(taskStorageKey);
      setCompletedTasks(savedTasks ? JSON.parse(savedTasks) : []);
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
        isArabic
          ? "يرجى تسجيل الدخول لعرض خطة المتابعة."
          : "Please login to view your follow-up plan."
      );
      setLoading(false);
      return;
    }

    const userId = userData.user.id;

    const [
      assessmentResponse,
      checkInResponse,
      reportsResponse,
      insightsResponse,
      generatedResponse,
      historyResponse,
    ] = await Promise.all([
      supabase
        .from("organ_assessments")
        .select("organ_name, score, risk_level")
        .eq("user_id", userId)
        .order("score", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_checkins")
        .select("mood, wellness_score, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("uploaded_lab_files")
        .select("id, file_name, extraction_status, created_at, extracted_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("health_insights")
        .select("id, report_id, ai_status, risk_level, summary, next_best_action, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("generated_intelligence_results")
        .select("insight_id, report_id, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(10),
      supabase
        .from("health_history")
        .select("id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (assessmentResponse.error) {
      setPriorityAssessment(null);
    } else {
      setPriorityAssessment(assessmentResponse.data || null);
    }

    if (checkInResponse.error) {
      setLatestCheckIn(null);
    } else {
      setLatestCheckIn(checkInResponse.data || null);
    }

    setUploadedReports((reportsResponse.data || []) as UploadedReport[]);
    setHealthInsights((insightsResponse.data || []) as HealthInsight[]);
    setGeneratedResults((generatedResponse.data || []) as GeneratedResult[]);
    setHistoryItems((historyResponse.data || []) as HistoryItem[]);

    setLoading(false);
  }

  function toggleTask(task: string) {
    const nextTasks = completedTasks.includes(task)
      ? completedTasks.filter((item) => item !== task)
      : [...completedTasks, task];

    setCompletedTasks(nextTasks);
    localStorage.setItem(taskStorageKey, JSON.stringify(nextTasks));
  }

  return (
    <main className="healthPlanIntelligencePage" dir={isArabic ? "rtl" : "ltr"}>
      <div className="healthPlanShell">
        <PageBackActions />

        <section className="healthPlanHero">
          <div>
            <p className="launchEyebrow">
              {isArabic ? "خطة المتابعة الذكية" : "Personal Follow-Up Intelligence"}
            </p>

            <h1>
              {isArabic
                ? `خطة ${priorityOrgan} الشخصية`
                : `${priorityOrgan} Personal Health Plan`}
            </h1>

            <p>
              {isArabic
                ? "خطة متابعة تجمع التقييمات، التقارير، الذكاء الصحي، Check-Ins، والتاريخ الصحي لتوجيه الخطوة التالية."
                : "A follow-up plan that connects assessments, reports, generated intelligence, check-ins, and health history into a clear next step."}
            </p>
          </div>

          <div className="healthPlanHeroCard">
            <span>{isArabic ? "جاهزية الخطة" : "Plan readiness"}</span>
            <strong>{planReadinessScore}%</strong>
            <p>
              {isArabic
                ? "كلما أضفت بيانات أكثر أصبحت الخطة أكثر شخصية."
                : "The more data you add, the more personalized this plan becomes."}
            </p>

            <Link href={nextBestAction.href} className="launchPrimary">
              {nextBestAction.button}
            </Link>
          </div>
        </section>

        {loading ? (
          <section className="healthPlanPanel">
            <p className="launchEyebrow">
              {isArabic ? "تحميل الخطة" : "Loading plan"}
            </p>
            <h2>
              {isArabic
                ? "جاري تحضير خطة المتابعة..."
                : "Preparing your personalized follow-up plan..."}
            </h2>
          </section>
        ) : message ? (
          <section className="healthPlanPanel">
            <p className="launchEyebrow">
              {isArabic ? "الخطة غير جاهزة" : "Plan not ready"}
            </p>
            <h2>{message}</h2>
            <Link href="/login" className="launchPrimary">
              {isArabic ? "تسجيل الدخول" : "Login"}
            </Link>
          </section>
        ) : (
          <>
            <section className="healthPlanMetricsGrid">
              <article>
                <span>{isArabic ? "الأولوية" : "Priority"}</span>
                <strong>{priorityOrgan}</strong>
                <p>
                  {priorityScore !== null
                    ? `${priorityScore}/100`
                    : isArabic
                    ? "لا يوجد تقييم"
                    : "No assessment"}
                </p>
              </article>

              <article>
                <span>{isArabic ? "التقارير" : "Reports"}</span>
                <strong>{uploadedReports.length}</strong>
                <p>
                  {completedExtractionCount}{" "}
                  {isArabic ? "استخراج مكتمل" : "extracted"}
                </p>
              </article>

              <article>
                <span>{isArabic ? "الذكاء" : "Intelligence"}</span>
                <strong>{generatedCount}</strong>
                <p>
                  {hasGeneratedIntelligence
                    ? isArabic
                      ? "نتائج محفوظة"
                      : "saved results"
                    : isArabic
                    ? "بحاجة توليد"
                    : "needs generation"}
                </p>
              </article>

              <article>
                <span>Check-In</span>
                <strong>
                  {latestCheckIn?.wellness_score
                    ? `${latestCheckIn.wellness_score}/100`
                    : "--"}
                </strong>
                <p>{latestCheckIn?.mood || (isArabic ? "غير متاح" : "Not available")}</p>
              </article>
            </section>

            <section className="healthPlanPanel healthPlanNextPanel">
              <div>
                <p className="launchEyebrow">
                  {isArabic ? "الخطوة التالية" : "Next best action"}
                </p>
                <h2>{nextBestAction.label}</h2>
                <p>{nextBestAction.description}</p>
              </div>

              <Link href={nextBestAction.href} className="launchPrimary">
                {nextBestAction.button}
              </Link>
            </section>

            <section className="healthPlanGrid">
              <article className="healthPlanCard">
                <p className="launchEyebrow">
                  {isArabic ? "ملخص الخطة" : "Plan summary"}
                </p>
                <h2>{planIntensity}</h2>

                <div className="healthPlanInfoList">
                  <div>
                    <span>{isArabic ? "آخر Check-In" : "Latest check-in"}</span>
                    <strong>{latestCheckInText}</strong>
                  </div>

                  <div>
                    <span>{isArabic ? "إيقاع المتابعة" : "Follow-up rhythm"}</span>
                    <strong>{followUpRhythm}</strong>
                  </div>

                  <div>
                    <span>{isArabic ? "مستوى الخطورة" : "Risk level"}</span>
                    <strong>{riskLevel}</strong>
                  </div>

                  <div>
                    <span>{isArabic ? "Health History" : "Health History"}</span>
                    <strong>{historyItems.length}</strong>
                  </div>
                </div>
              </article>

              <article className="healthPlanCard">
                <p className="launchEyebrow">
                  {isArabic ? "التقارير والذكاء" : "Reports and intelligence"}
                </p>
                <h2>
                  {hasGeneratedIntelligence
                    ? isArabic
                      ? "الذكاء الصحي محفوظ"
                      : "Generated intelligence is saved"
                    : isArabic
                    ? "الذكاء الصحي غير مكتمل"
                    : "Generated intelligence is incomplete"}
                </h2>

                <p>
                  {latestInsight?.next_best_action ||
                    latestInsight?.summary ||
                    (isArabic
                      ? "ارفع تقريرًا أو ولّد الذكاء الصحي لتحسين الخطة."
                      : "Upload a report or generate health intelligence to improve this plan.")}
                </p>

                <div className="healthPlanActionRow">
                  <Link href="/reports" className="launchSecondary">
                    {isArabic ? "التقارير" : "Reports"}
                  </Link>
                  <Link href="/intelligence" className="launchPrimary">
                    {isArabic ? "مركز الذكاء" : "Intelligence"}
                  </Link>
                </div>

                {latestGenerated?.updated_at && (
                  <small>
                    {isArabic ? "آخر توليد: " : "Latest generated: "}
                    {new Date(latestGenerated.updated_at).toLocaleString()}
                  </small>
                )}
              </article>
            </section>

            <section className="healthPlanPanel">
              <p className="launchEyebrow">
                {isArabic ? "خطة 7 أيام" : "7-Day follow-up plan"}
              </p>

              <h2>
                {isArabic
                  ? "ابدأ بخطوات صغيرة قابلة للتنفيذ"
                  : "Start with small, realistic actions"}
              </h2>

              <div className="healthPlanRoadmap">
                {sevenDayPlan.map((item, index) => (
                  <div key={item}>
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="healthPlanPanel">
              <p className="launchEyebrow">
                {isArabic ? "خريطة 30 يوم" : "30-Day improvement roadmap"}
              </p>

              <h2>
                {isArabic
                  ? "من البيانات إلى المتابعة"
                  : "From data to follow-up"}
              </h2>

              <div className="healthPlanRoadmap month">
                {thirtyDayRoadmap.map((item, index) => (
                  <div key={item}>
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="healthPlanPanel" id="action-tasks-section">
              <div className="healthPlanSectionHeader">
                <div>
                  <p className="launchEyebrow">
                    {isArabic ? "مهام المتابعة" : "Action tasks"}
                  </p>

                  <h2>
                    {completedTaskCount} {isArabic ? "من" : "of"} {totalTasks}{" "}
                    {isArabic ? "مكتملة" : "completed"}
                  </h2>

                  <p>
                    {isArabic
                      ? "اختر مهام بسيطة. يتم حفظ التقدم على نفس الجهاز."
                      : "Choose simple tasks. Progress is saved on this device."}
                  </p>
                </div>

                <strong>{taskProgress}%</strong>
              </div>

              <div className="healthPlanProgressBar">
                <div style={{ width: `${taskProgress}%` }} />
              </div>

              <div className="healthPlanTaskList">
                {planTasks.map((task) => {
                  const isCompleted = completedTasks.includes(task);

                  return (
                    <label
                      key={task}
                      className={`healthPlanTaskItem ${
                        isCompleted ? "completed" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => toggleTask(task)}
                      />
                      <span>{task}</span>
                      <small>{isCompleted ? "Done" : "To do"}</small>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="healthPlanBottomNav">
              <div>
                <p className="launchEyebrow">
                  {isArabic ? "استمرار الرحلة" : "Continue the journey"}
                </p>

                <h2>
                  {isArabic
                    ? "راجع، حدّث، وكرر"
                    : "Review, update, and reassess"}
                </h2>

                <p>
                  {pendingExtractionCount > 0
                    ? isArabic
                      ? "يوجد تقارير بانتظار الاستخراج. شغّل الاستخراج أو افتح مركز الذكاء."
                      : "Some reports are pending extraction. Run extraction or open Intelligence Center."
                    : isArabic
                    ? "استمر في تحديث Check-Ins ومراجعة Health History."
                    : "Keep updating check-ins and reviewing Health History."}
                </p>
              </div>

              <div className="healthPlanActionRow">
                <Link href="/checkin">{isArabic ? "Check-In" : "Check-In"}</Link>
                <Link href="/history">{isArabic ? "التاريخ" : "History"}</Link>
                <Link href="/doctor-portal">
                  {isArabic ? "بوابة الطبيب" : "Doctor Portal"}
                </Link>
                <Link href="/dashboard">
                  {isArabic ? "لوحة التحكم" : "Dashboard"}
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
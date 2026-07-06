"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import PriorityCard from "@/app/components/health-plan/PriorityCard";
import WeeklyTasksPanel from "@/app/components/health-plan/WeeklyTasksPanel";
import FollowUpRoadmap from "@/app/components/health-plan/FollowUpRoadmap";
import HealthMetricsGrid from "@/app/components/health-plan/HealthMetricsGrid";
import MedicalSafetyNotice from "@/app/components/health-plan/MedicalSafetyNotice";
import LoadingPanel from "@/app/components/health-plan/LoadingPanel";
import HealthPlanHero from "@/app/components/health-plan/HealthPlanHero";

type Language = "en" | "ar";

type PriorityAssessment = {
  organ_name: string | null;
  score: number | null;
  risk_level: string | null;
};

type DailyCheckIn = {
  mood: string | null;
  wellness_score: number | null;
  created_at: string | null;
};

type UploadedReport = {
  id: number;
  file_name: string | null;
  extraction_status: string | null;
  created_at: string | null;
  extracted_at: string | null;
};

type HealthInsight = {
  id: number;
  report_id: number | null;
  ai_status: string | null;
  risk_level: string | null;
  summary: string | null;
  next_best_action: string | null;
  created_at: string | null;
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

const organTasks: Record<string, string[]> = {
  Heart: [
    "Review the latest patient summary and doctor-ready brief.",
    "Check blood pressure at least 3 times this week.",
    "Reduce salty or heavily processed food for the next 7 days.",
    "Walk for 20 minutes on at least 4 days this week.",
    "Track chest pain, shortness of breath, palpitation, or unusual fatigue.",
  ],
  Kidney: [
    "Review creatinine, eGFR, urine, and blood pressure trends.",
    "Track hydration and urine changes for the next 7 days.",
    "Avoid unnecessary NSAID painkillers unless prescribed.",
    "Reduce high-salt meals this week.",
    "Prepare questions for your doctor if swelling or urine changes appear.",
  ],
  Liver: [
    "Review liver enzymes and previous liver-related reports.",
    "Avoid alcohol and unnecessary supplements.",
    "Track fatigue, abdominal discomfort, yellowing, or dark urine.",
    "Reduce fried and high-fat meals this week.",
    "Prepare medication and supplement list for doctor review.",
  ],
  Lung: [
    "Track cough, breathing difficulty, and activity tolerance.",
    "Avoid smoke, dust, and strong respiratory irritants.",
    "Record oxygen saturation if clinically relevant and available.",
    "Review inhaler or respiratory medication adherence if applicable.",
    "Prepare questions if symptoms worsen at night or with activity.",
  ],
  Brain: [
    "Track sleep quality, headache pattern, focus, and stress level.",
    "Reduce late screen exposure before sleep.",
    "Practice a short breathing or relaxation routine daily.",
    "Review dizziness, weakness, numbness, or neurological warning symptoms.",
    "Prepare notes about sleep, headache, focus, or mood patterns.",
  ],
  Metabolic: [
    "Review glucose, HbA1c, cholesterol, weight, and waist trends.",
    "Reduce sugary drinks and refined carbohydrates.",
    "Walk or exercise for at least 20 minutes on 4 days this week.",
    "Track weight or waist measurement weekly.",
    "Choose one healthier meal replacement each day.",
  ],
  General: [
    "Review the latest report analysis.",
    "Complete one wellness check-in this week.",
    "Choose one realistic lifestyle action for the next 7 days.",
    "Repeat your priority assessment after 4 weeks.",
  ],
};

const arabicOrganTasks: Record<string, string[]> = {
  Heart: [
    "راجع ملخص المريض وملخص الطبيب من آخر تحليل.",
    "قِس ضغط الدم ثلاث مرات على الأقل هذا الأسبوع.",
    "قلل الملح والأطعمة المصنعة خلال الأيام القادمة.",
    "امشِ 20 دقيقة في 4 أيام على الأقل هذا الأسبوع.",
    "تابع ألم الصدر، ضيق النفس، الخفقان، أو التعب غير المعتاد.",
  ],
  Kidney: [
    "راجع الكرياتينين، eGFR، البول، وضغط الدم.",
    "تابع شرب الماء وتغيرات البول خلال 7 أيام.",
    "تجنب المسكنات غير الضرورية إلا إذا وصفها الطبيب.",
    "قلل الوجبات عالية الملح هذا الأسبوع.",
    "جهز أسئلة للطبيب إذا ظهر تورم أو تغير في البول.",
  ],
  Liver: [
    "راجع إنزيمات الكبد والتقارير السابقة.",
    "تجنب الكحول والمكملات غير الضرورية.",
    "تابع التعب، ألم البطن، الاصفرار، أو تغير لون البول.",
    "قلل المقليات والدهون هذا الأسبوع.",
    "جهز قائمة الأدوية والمكملات لمراجعتها مع الطبيب.",
  ],
  Lung: [
    "تابع السعال، ضيق التنفس، وتحمل النشاط.",
    "تجنب الدخان والغبار والروائح القوية.",
    "سجل الأكسجين إذا كان مناسبًا ومتاحًا.",
    "راجع الالتزام بالبخاخات أو أدوية التنفس إن وجدت.",
    "جهز أسئلة إذا زادت الأعراض ليلًا أو مع الحركة.",
  ],
  Brain: [
    "تابع النوم، الصداع، التركيز، ومستوى التوتر.",
    "قلل استخدام الشاشات قبل النوم.",
    "مارس تنفسًا هادئًا أو استرخاء قصيرًا يوميًا.",
    "راجع الدوخة، الضعف، التنميل، أو أي أعراض عصبية مقلقة.",
    "جهز ملاحظات عن النوم أو الصداع أو التركيز أو المزاج.",
  ],
  Metabolic: [
    "راجع السكر، HbA1c، الدهون، الوزن، ومحيط الخصر.",
    "قلل المشروبات السكرية والكربوهيدرات المكررة.",
    "امشِ أو مارس نشاطًا 20 دقيقة في 4 أيام هذا الأسبوع.",
    "تابع الوزن أو محيط الخصر أسبوعيًا.",
    "اختر وجبة واحدة يوميًا تكون صحية أكثر.",
  ],
  General: [
    "راجع آخر تحليل للتقرير الطبي.",
    "أكمل تحديثًا صحيًا واحدًا هذا الأسبوع.",
    "اختر عادة صحية واقعية للأيام السبعة القادمة.",
    "أعد تقييم الأولوية الصحية بعد 4 أسابيع.",
  ],
};

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const saved =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("language") ||
    "";

  return saved.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function localize(value: string | null | undefined, isArabic: boolean) {
  if (!isArabic) return value || "Not available";

  const clean = (value || "").trim();

  const map: Record<string, string> = {
    Heart: "القلب",
    Liver: "الكبد",
    Lung: "الرئة",
    Kidney: "الكلى",
    Brain: "الدماغ",
    Metabolic: "الأيض",
    General: "عام",
    High: "مرتفع",
    Moderate: "متوسط",
    Low: "منخفض",
    Normal: "طبيعي",
    "High Risk": "خطورة مرتفعة",
    "Moderate Risk": "خطورة متوسطة",
    "Low Risk": "خطورة منخفضة",
    "Not available": "غير متاح",
  };

  return map[clean] || clean || "غير متاح";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

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

  const isArabic = language === "ar";

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  useEffect(() => {
    function syncLanguage() {
      const currentLanguage = getStoredLanguage();
      setLanguage(currentLanguage);
      document.documentElement.lang = currentLanguage;
      document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    fetchHealthPlanData();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priorityOrgan = priorityAssessment?.organ_name || "General";
  const priorityScore =
    typeof priorityAssessment?.score === "number"
      ? priorityAssessment.score
      : null;

  const priorityScoreValue = priorityScore ?? 0;
  const priorityOrganDisplay = localize(priorityOrgan, isArabic);
  const riskLevelDisplay = localize(priorityAssessment?.risk_level, isArabic);

  const latestReport = uploadedReports[0] || null;
  const latestGenerated = generatedResults[0] || null;
  const latestGeneratedInsight = latestGenerated?.insight_id
    ? healthInsights.find((item) => item.id === latestGenerated.insight_id)
    : null;
  const latestInsight = latestGeneratedInsight || healthInsights[0] || null;

  const latestAnalysisReportId =
    latestGenerated?.report_id ||
    latestGeneratedInsight?.report_id ||
    latestReport?.id ||
    null;

  const latestAnalysisHref = latestAnalysisReportId
    ? `/intelligence?reportId=${latestAnalysisReportId}${
        generatedResults.length > 0 ? "" : "&auto=1"
      }`
    : "/reports";

  const completedExtractionCount = uploadedReports.filter(
    (report) => report.extraction_status === "Completed"
  ).length;

  const generatedCount = generatedResults.length;
  const hasAssessment = Boolean(priorityAssessment);
  const hasReports = uploadedReports.length > 0;
  const hasGenerated = generatedCount > 0;
  const hasCheckIn = Boolean(latestCheckIn);
  const hasHistory = historyItems.length > 0;

  const readinessScore = [
    hasAssessment,
    hasReports,
    hasGenerated,
    hasCheckIn,
    hasHistory,
  ].filter(Boolean).length * 20;

  const followUpLevel =
    priorityScore === null
      ? text("Start with assessment", "ابدأ بالتقييم")
      : priorityScore < 50
      ? text("High follow-up", "متابعة عالية")
      : priorityScore < 80
      ? text("Moderate follow-up", "متابعة متوسطة")
      : text("Preventive follow-up", "متابعة وقائية");

  const nextAction = !hasAssessment
    ? {
        title: text("Start your health assessment", "ابدأ التقييم الصحي"),
        detail: text(
          "Complete one assessment so OrganHeal can identify the priority area.",
          "أكمل تقييمًا واحدًا حتى يحدد OrganHeal الأولوية الصحية."
        ),
        href: "/assessment",
        button: text("Start Assessment", "ابدأ التقييم"),
      }
    : !hasReports
    ? {
        title: text("Upload your first medical report", "ارفع أول تقرير طبي"),
        detail: text(
          "A report makes the plan more specific and easier to review.",
          "وجود تقرير يجعل الخطة أدق وأسهل للمراجعة."
        ),
        href: "/lab-upload",
        button: text("Upload Report", "رفع تقرير"),
      }
    : !hasGenerated
    ? {
        title: text("Analyze the latest report", "حلّل آخر تقرير"),
        detail: text(
          "Generate a patient-friendly summary and doctor-ready brief.",
          "ولّد ملخصًا مبسطًا للمريض وملخصًا جاهزًا للطبيب."
        ),
        href: latestAnalysisHref,
        button: text("Analyze Report", "تحليل التقرير"),
      }
    : !hasCheckIn
    ? {
        title: text("Complete today check-in", "أكمل Check-In اليوم"),
        detail: text(
          "Add sleep, stress, energy, activity, and mood so the plan becomes more personal.",
          "أضف النوم، الضغط، الطاقة، النشاط، والمزاج حتى تصبح الخطة أكثر شخصية."
        ),
        href: "/checkin",
        button: text("Open Check-In", "فتح Check-In"),
      }
    : {
        title: text("Continue this week plan", "تابع خطة هذا الأسبوع"),
        detail: text(
          "Your plan is active. Continue the practical tasks below.",
          "الخطة فعالة الآن. تابع المهام العملية بالأسفل."
        ),
        href: "#tasks",
        button: text("Continue Tasks", "متابعة المهام"),
      };

  const taskStorageKey = `organheal-health-plan-tasks-${priorityOrgan}`;

  const baseTasks = isArabic
    ? arabicOrganTasks[priorityOrgan] || arabicOrganTasks.General
    : organTasks[priorityOrgan] || organTasks.General;

  const dynamicTasks = [
    hasGenerated
      ? text(
          "Review the patient summary and doctor-ready brief from the latest analysis.",
          "راجع ملخص المريض وملخص الطبيب من آخر تحليل."
        )
      : hasReports
      ? text("Analyze the latest saved report.", "حلّل أحدث تقرير محفوظ.")
      : null,
    !hasCheckIn
      ? text("Complete a wellness check-in this week.", "أكمل تحديثًا صحيًا هذا الأسبوع.")
      : null,
    hasReports
      ? text("Review extracted reports and connect them to this plan.", "راجع التقارير واربطها بالخطة.")
      : null,
  ].filter(Boolean) as string[];

  const planTasks = useMemo(
    () => [...dynamicTasks, ...baseTasks].slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, priorityOrgan, hasGenerated, hasReports, hasCheckIn]
  );

  const completedCount = completedTasks.filter((task) =>
    planTasks.includes(task)
  ).length;

  const progressPercent =
    planTasks.length > 0 ? Math.round((completedCount / planTasks.length) * 100) : 0;

  const sevenDayPlan = [
    text("Day 1: Review your priority and next best action.", "اليوم 1: راجع الأولوية والخطوة التالية."),
    text("Day 2: Complete a check-in.", "اليوم 2: أكمل Check-In."),
    text("Day 3: Review or analyze the latest report.", "اليوم 3: راجع أو حلّل آخر تقرير."),
    text("Day 4: Complete one task from the plan.", "اليوم 4: نفذ مهمة واحدة من الخطة."),
    text("Day 5: Check improvement or worsening signals.", "اليوم 5: راجع مؤشرات التحسن أو التراجع."),
    text("Day 6: Prepare questions for your doctor.", "اليوم 6: جهز أسئلة للطبيب."),
    text("Day 7: Decide next week focus.", "اليوم 7: حدد تركيز الأسبوع القادم."),
  ];

  const roadmap = [
    text("Week 1: Build your baseline from assessments and reports.", "الأسبوع 1: بناء خط الأساس من التقييمات والتقارير."),
    text("Week 2: Track check-ins and complete realistic actions.", "الأسبوع 2: متابعة التحديثات وتنفيذ خطوات واقعية."),
    text("Week 3: Review patterns from reports and analysis.", "الأسبوع 3: مراجعة الأنماط من التقارير والتحليل."),
    text("Week 4: Repeat the priority assessment and compare progress.", "الأسبوع 4: إعادة تقييم الأولوية ومقارنة التقدم."),
  ];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(taskStorageKey);
      setCompletedTasks(saved ? JSON.parse(saved) : []);
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
        text(
          "Please login to view your health plan.",
          "يرجى تسجيل الدخول لعرض خطة الصحة."
        )
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
      setPriorityAssessment((assessmentResponse.data || null) as PriorityAssessment | null);
    }

    if (checkInResponse.error) {
      setLatestCheckIn(null);
    } else {
      setLatestCheckIn((checkInResponse.data || null) as DailyCheckIn | null);
    }

    setUploadedReports((reportsResponse.data || []) as UploadedReport[]);
    setHealthInsights((insightsResponse.data || []) as HealthInsight[]);
    setGeneratedResults((generatedResponse.data || []) as GeneratedResult[]);
    setHistoryItems((historyResponse.data || []) as HistoryItem[]);
    setLoading(false);
  }

  function toggleTask(task: string) {
    const next = completedTasks.includes(task)
      ? completedTasks.filter((item) => item !== task)
      : [...completedTasks, task];

    setCompletedTasks(next);
    localStorage.setItem(taskStorageKey, JSON.stringify(next));
  }

  return (
    <main className="healthPlanV2" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .healthPlanV2,
        .healthPlanV2 * {
          box-sizing: border-box;
        }

        .healthPlanV2 {
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 5%, rgba(6, 182, 212, 0.24), transparent 28%),
            radial-gradient(circle at 88% 18%, rgba(15, 118, 110, 0.26), transparent 34%),
            linear-gradient(180deg, #dbeafe 0%, #e2e8f0 44%, #f8fafc 100%);
          color: #0f172a;
          padding: 26px 0 64px;
        }

        .healthPlanV2 a {
          color: inherit;
          text-decoration: none;
        }

        .hpContainer {
          width: min(1180px, calc(100% - 28px));
          margin: 0 auto;
          display: grid;
          gap: 22px;
        }

        .hpBack {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          background: #0f172a;
          color: white;
          font-weight: 950;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24);
        }

        .hpHero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(310px, 0.44fr);
          gap: 24px;
          align-items: stretch;
          padding: 34px;
          border-radius: 34px;
          background:
            radial-gradient(circle at 88% 10%, rgba(20, 184, 166, 0.48), transparent 36%),
            linear-gradient(135deg, #061826 0%, #0f172a 42%, #0f766e 100%);
          color: white;
          box-shadow: 0 34px 90px rgba(15, 23, 42, 0.36);
          border: 1px solid rgba(255,255,255,0.14);
        }

        .hpEyebrow {
          display: inline-flex;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(209, 250, 229, 0.16);
          color: #d1fae5;
          border: 1px solid rgba(209, 250, 229, 0.30);
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .hpTitle {
          font-size: clamp(2.45rem, 5vw, 4.8rem);
          line-height: 0.94;
          letter-spacing: -0.06em;
          margin: 0;
          color: white;
        }

        .hpLead {
          margin: 18px 0 0;
          max-width: 760px;
          color: rgba(226, 232, 240, 0.94);
          font-size: 1.04rem;
          font-weight: 720;
          line-height: 1.75;
        }

        .hpActions {
          display: flex;
          flex-wrap: wrap;
          gap: 11px;
          margin-top: 24px;
        }

        .hpPrimary,
        .hpSecondary,
        .hpDark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 18px;
          border-radius: 999px;
          font-weight: 950;
          border: 0;
          cursor: pointer;
        }

        .hpPrimary {
          background: linear-gradient(135deg, #06b6d4, #14b8a6);
          color: #061826;
          box-shadow: 0 16px 40px rgba(6, 182, 212, 0.34);
        }

        .hpSecondary {
          background: rgba(255,255,255,0.96);
          color: #0f766e;
          border: 1px solid rgba(15, 118, 110, 0.30);
        }

        .hpDark {
          background: #0f172a;
          color: white;
        }

        .hpPriorityCard {
          position: relative;
          overflow: hidden;
          padding: 24px;
          border-radius: 28px;
          background:
            radial-gradient(circle at 90% 8%, rgba(255,255,255,0.20), transparent 36%),
            linear-gradient(135deg, rgba(255,255,255,0.17), rgba(255,255,255,0.08));
          border: 1px solid rgba(255,255,255,0.28);
          box-shadow: 0 30px 78px rgba(0,0,0,0.24);
          min-height: 260px;
        }

        .hpPriorityLabel {
          display: inline-flex;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(20, 184, 166, 0.26);
          color: #d1fae5;
          border: 1px solid rgba(209, 250, 229, 0.36);
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hpPriorityValue {
          margin: 22px 0 6px;
          font-size: 3.1rem;
          line-height: 1;
          color: white;
          font-weight: 950;
        }

        .hpPrioritySub {
          color: rgba(226, 232, 240, 0.92);
          font-weight: 760;
          line-height: 1.6;
        }

        .hpProgressWrap {
          margin-top: 22px;
          height: 12px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.18);
        }

        .hpProgressFill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #22d3ee, #2dd4bf, #a7f3d0);
        }

        .hpToolGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .hpToolCard {
          min-height: 150px;
          padding: 20px;
          border-radius: 26px;
          color: white;
          overflow: hidden;
          position: relative;
          box-shadow: 0 24px 62px rgba(15, 23, 42, 0.24);
        }

        .hpToolCard::after {
          content: "";
          position: absolute;
          right: -44px;
          bottom: -48px;
          width: 140px;
          height: 140px;
          border-radius: 999px;
          background: rgba(255,255,255,0.17);
        }

        .hpToolCard.blue {
          background: linear-gradient(135deg, #1d4ed8, #0f766e);
        }

        .hpToolCard.teal {
          background: linear-gradient(135deg, #0f766e, #06b6d4);
        }

        .hpToolCard.green {
          background: linear-gradient(135deg, #047857, #10b981);
        }

        .hpToolCard.amber {
          background: linear-gradient(135deg, #b45309, #f59e0b);
        }

        .hpToolLabel {
          position: relative;
          z-index: 1;
          font-size: 0.76rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          opacity: 0.96;
        }

        .hpToolValue {
          position: relative;
          z-index: 1;
          margin-top: 13px;
          font-size: 2.18rem;
          line-height: 1;
          font-weight: 950;
        }

        .hpToolHint {
          position: relative;
          z-index: 1;
          margin-top: 10px;
          font-weight: 800;
          opacity: 0.96;
          line-height: 1.45;
        }

        .hpPanel {
          background: white;
          border: 1px solid rgba(15, 23, 42, 0.14);
          border-radius: 30px;
          padding: 24px;
          box-shadow: 0 22px 58px rgba(15, 23, 42, 0.13);
        }

        .hpPanelHeader {
          padding: 18px;
          border-radius: 24px;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #061826, #0f766e);
          color: white;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.18);
        }

        .hpPanelKicker {
          font-size: 0.74rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #d1fae5;
          margin-bottom: 8px;
        }

        .hpPanelTitle {
          margin: 0;
          color: white;
          font-size: 1.45rem;
          font-weight: 950;
        }

        .hpPanelText {
          margin: 8px 0 0;
          color: rgba(226, 232, 240, 0.92);
          font-weight: 720;
          line-height: 1.65;
        }

        .hpTwoCol {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 20px;
        }

        .hpSignalGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .hpSignal {
          padding: 16px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-inline-start: 6px solid #0f766e;
        }

        .hpSignal:nth-child(2) {
          border-inline-start-color: #2563eb;
        }

        .hpSignal:nth-child(3) {
          border-inline-start-color: #d97706;
        }

        .hpSignalLabel {
          color: #0f766e;
          font-size: 0.73rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .hpSignalValue {
          margin-top: 8px;
          color: #0f172a;
          font-weight: 950;
          font-size: 1.15rem;
        }

        .hpSignalText {
          margin-top: 6px;
          color: #475569;
          font-weight: 720;
          line-height: 1.55;
        }

        .hpChecklist {
          display: grid;
          gap: 12px;
        }

        .hpCheckItem {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 14px;
          border-radius: 18px;
          background: white;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-inline-start: 6px solid #0f766e;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .hpDot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #0f766e;
          box-shadow: 0 0 0 5px rgba(15, 118, 110, 0.12);
        }

        .hpCheckTitle {
          color: #0f172a;
          font-weight: 950;
        }

        .hpCheckText {
          margin-top: 3px;
          color: #475569;
          font-weight: 720;
        }

        .hpBadge {
          display: inline-flex;
          min-height: 30px;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 950;
        }

        .hpBadge.good {
          background: #dcfce7;
          color: #047857;
          border: 1px solid rgba(5, 150, 105, 0.28);
        }

        .hpBadge.warn {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid rgba(217, 119, 6, 0.28);
        }

        .hpTasks {
          display: grid;
          gap: 12px;
        }

        .hpTask {
          display: grid;
          grid-template-columns: auto auto minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 15px;
          border-radius: 18px;
          background: white;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-inline-start: 7px solid #d97706;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.07);
        }

        .hpTask.done {
          background: #dcfce7;
          border-inline-start-color: #059669;
          border-color: rgba(5, 150, 105, 0.32);
        }

        .hpTaskNumber {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: #0f766e;
          color: white;
          font-weight: 950;
        }

        .hpTask input {
          width: 18px;
          height: 18px;
          accent-color: #0f766e;
        }

        .hpTaskText {
          color: #0f172a;
          font-weight: 900;
          line-height: 1.55;
        }

        .hpList {
          display: grid;
          gap: 10px;
        }

        .hpListItem {
          padding: 14px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-inline-start: 6px solid #0f766e;
          color: #0f172a;
          font-weight: 860;
          line-height: 1.55;
        }

        .hpSafety {
          padding: 18px;
          border-radius: 24px;
          background: #eff6ff;
          border: 1px solid rgba(37, 99, 235, 0.18);
          border-inline-start: 7px solid #2563eb;
          color: #1e293b;
          font-weight: 760;
          line-height: 1.7;
        }


        .hpHero .hpSecondary {
          background: #ffffff !important;
          color: #0f766e !important;
          border: 1px solid rgba(255, 255, 255, 0.78) !important;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18) !important;
        }

        .hpHero .hpSecondary,
        .hpHero .hpSecondary * {
          color: #0f766e !important;
          text-shadow: none !important;
        }

        .hpHero .hpPrimary,
        .hpHero .hpPrimary * {
          color: #061826 !important;
          text-shadow: none !important;
        }
        @media (max-width: 980px) {
          .hpHero,
          .hpTwoCol,
          .hpSignalGrid {
            grid-template-columns: 1fr;
          }

          .hpToolGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .hpToolGrid {
            grid-template-columns: 1fr;
          }

          .hpHero {
            padding: 24px;
          }

          .hpTask {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .hpTask .hpBadge {
            grid-column: 1 / -1;
            width: fit-content;
          }
        }
      `}</style>

      <div className="hpContainer">
        <Link href="/dashboard" className="hpBack">
          {text("← Back to Dashboard", "← العودة إلى لوحة التحكم")}
        </Link>

       <HealthPlanHero
  eyebrow={text("Personal follow-up intelligence", "خطة متابعة شخصية")}
  title={
    isArabic
      ? `خطة ${priorityOrganDisplay} الشخصية`
      : `${priorityOrgan} Personal Health Plan`
  }
  lead={text(
    "A guided plan that connects assessments, medical reports, report analysis, check-ins, and practical weekly follow-up.",
    "خطة موجهة تربط التقييمات، التقارير الطبية، تحليل التقارير، Check-In، والمتابعة العملية الأسبوعية."
  )}
  primaryHref={nextAction.href}
  primaryLabel={nextAction.button}
  analysisHref={latestAnalysisHref}
  analysisLabel={
    hasGenerated
      ? text("Review Analysis", "مراجعة التحليل")
      : text("Analyze Report", "تحليل التقرير")
  }
  reportsLabel={text("Reports", "التقارير")}
  priority={{
    label: text("Patient priority", "أولوية المريض"),
    organ: priorityOrganDisplay,
    riskLabel: text("Risk level", "مستوى الخطورة"),
    riskLevel: riskLevelDisplay,
    scoreLabel: text("Priority score", "نتيجة الأولوية"),
    scoreText: priorityScore === null ? "—" : `${priorityScore}/100`,
    progressPercent: clamp(100 - priorityScoreValue),
  }}
/>

        {message && (
          <section className="hpSafety">
            {message}
          </section>
        )}

        <HealthMetricsGrid
  items={[
    {
      tone: "blue",
      label: text("Priority", "الأولوية"),
      value: priorityOrganDisplay,
      hint:
        priorityScore === null
          ? text("Assessment needed", "يحتاج تقييم")
          : `${priorityScore}/100`,
    },
    {
      tone: "teal",
      label: text("Reports", "التقارير"),
      value: uploadedReports.length,
      hint: `${completedExtractionCount} ${text(
        "ready for analysis",
        "جاهزة للتحليل"
      )}`,
    },
    {
      tone: "green",
      label: text("Analysis", "التحليل"),
      value: generatedCount,
      hint: hasGenerated
        ? text("saved results", "نتائج محفوظة")
        : text("needs analysis", "يحتاج تحليل"),
    },
    {
      tone: "amber",
      label: "Check-In",
      value: latestCheckIn?.wellness_score ?? "—",
      hint: latestCheckIn
        ? text("latest wellness score", "آخر نتيجة صحية")
        : text("not updated yet", "لم يتم التحديث"),
    },
  ]}
/>

        <section className="hpPanel">
          <div className="hpPanelHeader">
            <div className="hpPanelKicker">{text("Next best action", "الخطوة التالية")}</div>
            <h2 className="hpPanelTitle">{nextAction.title}</h2>
            <p className="hpPanelText">{nextAction.detail}</p>
          </div>

          <div className="hpSignalGrid">
            <div className="hpSignal">
              <div className="hpSignalLabel">{text("Follow-up level", "مستوى المتابعة")}</div>
              <div className="hpSignalValue">{followUpLevel}</div>
              <div className="hpSignalText">
                {text("Based on the current priority and available data.", "حسب الأولوية الحالية والبيانات المتوفرة.")}
              </div>
            </div>

            <div className="hpSignal">
              <div className="hpSignalLabel">{text("Latest report", "آخر تقرير")}</div>
              <div className="hpSignalValue">
                {latestReport?.file_name || text("Not uploaded", "لم يتم الرفع")}
              </div>
              <div className="hpSignalText">
                {latestReport
                  ? formatDate(latestReport.created_at)
                  : text("Upload a report to strengthen this plan.", "ارفع تقريرًا لتقوية الخطة.")}
              </div>
            </div>

            <div className="hpSignal">
              <div className="hpSignalLabel">{text("Latest analysis", "آخر تحليل")}</div>
              <div className="hpSignalValue">
                {hasGenerated ? text("Saved", "محفوظ") : text("Missing", "غير موجود")}
              </div>
              <div className="hpSignalText">
                {latestGenerated?.updated_at
                  ? formatDate(latestGenerated.updated_at)
                  : text("Analyze the latest report for better guidance.", "حلّل آخر تقرير لتوجيه أفضل.")}
              </div>
            </div>
          </div>
        </section>

        <section className="hpTwoCol">
          <article className="hpPanel">
            <div className="hpPanelHeader">
              <div className="hpPanelKicker">{text("Plan command center", "مركز قيادة الخطة")}</div>
              <h2 className="hpPanelTitle">
                {text("What makes this plan stronger?", "ما الذي يجعل هذه الخطة أقوى؟")}
              </h2>
            </div>

            <div className="hpChecklist">
              {[
                {
                  label: text("Health assessment", "التقييم الصحي"),
                  note: text("Defines the priority area.", "يحدد الأولوية الصحية."),
                  ready: hasAssessment,
                },
                {
                  label: text("Medical reports", "التقارير الطبية"),
                  note: text("Adds clinical context.", "تضيف سياقًا طبيًا."),
                  ready: hasReports,
                },
                {
                  label: text("Report analysis", "تحليل التقرير"),
                  note: text("Turns reports into summaries.", "يحول التقرير إلى ملخصات."),
                  ready: hasGenerated,
                },
                {
                  label: "Check-In",
                  note: text("Reflects daily symptoms and habits.", "يعكس الأعراض والعادات اليومية."),
                  ready: hasCheckIn,
                },
                {
                  label: text("Health history", "التاريخ الصحي"),
                  note: text("Helps compare progress over time.", "يساعد على مقارنة التقدم."),
                  ready: hasHistory,
                },
              ].map((item) => (
                <div className="hpCheckItem" key={item.label}>
                  <span className="hpDot" />
                  <div>
                    <div className="hpCheckTitle">{item.label}</div>
                    <div className="hpCheckText">{item.note}</div>
                  </div>
                  <span className={`hpBadge ${item.ready ? "good" : "warn"}`}>
                    {item.ready ? text("Ready", "جاهز") : text("Pending", "بانتظار")}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="hpPanel">
            <div className="hpPanelHeader">
              <div className="hpPanelKicker">{text("Reports and analysis", "التقارير والتحليل")}</div>
              <h2 className="hpPanelTitle">
                {hasGenerated
                  ? text("Analysis is saved", "التحليل محفوظ")
                  : text("Analysis is still needed", "التحليل ما زال مطلوبًا")}
              </h2>
            </div>

            <p className="hpSignalText">
              {latestInsight?.next_best_action ||
                latestInsight?.summary ||
                text(
                  "Analyze your latest report so this plan can become more specific and useful.",
                  "حلّل آخر تقرير حتى تصبح الخطة أكثر دقة وفائدة."
                )}
            </p>

            <div className="hpActions">
              <Link href={latestAnalysisHref} className="hpPrimary">
                {hasGenerated
                  ? text("Review Analysis", "مراجعة التحليل")
                  : text("Analyze Latest Report", "تحليل آخر تقرير")}
              </Link>

              <Link href="/reports" className="hpSecondary">
                {text("Reports Library", "مكتبة التقارير")}
              </Link>
            </div>
          </article>
        </section>

        <WeeklyTasksPanel
  kicker={text("Action tasks", "مهام المتابعة")}
  title={`${completedCount} / ${planTasks.length} ${text("completed", "مكتملة")}`}
  description={text(
    "Choose simple tasks. Progress is saved on this device.",
    "اختر مهام بسيطة. يتم حفظ التقدم على هذا الجهاز."
  )}
  tasks={planTasks}
  completedTasks={completedTasks}
  progressPercent={progressPercent}
  doneLabel={text("Done", "تم")}
  todoLabel={text("To do", "مطلوب")}
  resetLabel={text("Reset Weekly Tasks", "إعادة مهام الأسبوع")}
  checkInLabel={text("Open Check-In", "فتح Check-In")}
  onToggleTask={toggleTask}
  onResetTasks={() => {
    setCompletedTasks([]);
    localStorage.removeItem(taskStorageKey);
  }}
/>

        <FollowUpRoadmap
  sevenDayKicker={text("7-day follow-up plan", "خطة 7 أيام")}
  sevenDayTitle={text(
    "Start with small realistic actions",
    "ابدأ بخطوات واقعية صغيرة"
  )}
  sevenDayItems={sevenDayPlan}
  roadmapKicker={text("30-day improvement roadmap", "خارطة تحسين 30 يوم")}
  roadmapTitle={text("From data to follow-up", "من البيانات إلى المتابعة")}
  roadmapItems={roadmap}
/>

        <MedicalSafetyNotice
  title={text("Medical safety reminder", "تذكير السلامة الطبية")}
  description={text(
    "This plan is educational and organizational. It does not diagnose disease, prescribe treatment, or replace medical care. Seek urgent care for severe symptoms or emergency warning signs.",
    "هذه الخطة تعليمية وتنظيمية. لا تشخص الأمراض ولا تصف العلاج ولا تستبدل الرعاية الطبية. اطلب الرعاية العاجلة عند وجود أعراض شديدة أو علامات طارئة."
  )}
/>

        {loading && (
  <LoadingPanel
    kicker={text("Loading", "تحميل")}
    title={text("Preparing your plan...", "جاري تجهيز الخطة...")}
  />
)}
      </div>
    </main>
  );
}




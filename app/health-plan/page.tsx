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


function localizeHealthPlanValue(
  value: string | null | undefined,
  isArabic: boolean
) {
  if (!isArabic) return value || "N/A";

  const clean = (value || "").trim();

  if (!clean) return "غير متاح";

  const exact: Record<string, string> = {
    Heart: "القلب",
    Liver: "الكبد",
    Lung: "الرئة",
    Kidney: "الكلى",
    Metabolic: "الأيض",
    Brain: "الدماغ",
    General: "عام",

    High: "مرتفع",
    Moderate: "متوسط",
    Low: "منخفض",
    Normal: "طبيعي",
    "Not available": "غير متاح",
    Good: "جيد",
    Fair: "متوسط",
    Poor: "ضعيف",
    Excellent: "ممتاز",
    Stable: "مستقر",

    "High Risk": "خطورة مرتفعة",
    "Moderate Risk": "خطورة متوسطة",
    "Low Risk": "خطورة منخفضة",

    "Health History": "التاريخ الصحي",
    "Doctor Brief": "ملخص الطبيب",
    "Intelligence Center": "مركز الذكاء",
    "Generated intelligence is saved": "الذكاء الصحي محفوظ",
    "Generated intelligence is incomplete": "الذكاء الصحي غير مكتمل",
  };

  if (exact[clean]) return exact[clean];

  const lower = clean.toLowerCase();

  if (lower.includes("blood pressure")) {
    return "متابعة ضغط الدم وتقليل العوامل التي قد تزيد إجهاد القلب.";
  }

  if (lower.includes("liver")) {
    return "دعم صحة الكبد من خلال التغذية، تقليل العوامل المرهقة، ومراجعة الفحوصات عند الحاجة.";
  }

  if (lower.includes("lung") || lower.includes("breathing")) {
    return "دعم صحة الرئة عبر تقليل المهيجات ومراقبة التنفس والسعال وتحمل النشاط.";
  }

  if (lower.includes("kidney")) {
    return "دعم صحة الكلى عبر الترطيب ومتابعة ضغط الدم والفحوصات ذات العلاقة.";
  }

  if (lower.includes("metabolic") || lower.includes("glucose") || lower.includes("cholesterol")) {
    return "متابعة مؤشرات الأيض مثل السكر والدهون والنشاط الغذائي.";
  }

  if (lower.includes("review") && lower.includes("doctor")) {
    return "راجع النتائج والخطة مع الطبيب عند وجود أعراض أو نتائج تحتاج متابعة.";
  }

  return clean;
}

const arabicOrganTaskPlans: Record<string, string[]> = {
  Heart: [
    "قياس ضغط الدم ثلاث مرات على الأقل هذا الأسبوع.",
    "تقليل الملح والأطعمة المصنعة خلال الأيام القادمة.",
    "المشي 20 دقيقة في 4 أيام على الأقل هذا الأسبوع.",
    "مراجعة أي ألم صدر، ضيق نفس، خفقان، أو تعب غير معتاد.",
    "تجهيز نتائج الدهون، الضغط، أو فحوصات القلب السابقة للمقارنة.",
  ],
  Liver: [
    "تقليل الأطعمة الدهنية والمقلية خلال هذا الأسبوع.",
    "تجنب الكحول والمكملات غير الضرورية.",
    "متابعة التعب، ألم البطن، اصفرار العينين، أو تغير لون البول.",
    "شرب كمية كافية من الماء حسب حالتك الصحية.",
    "تجهيز تقارير الكبد السابقة للمقارنة مع الطبيب.",
  ],
  Lung: [
    "متابعة السعال، ضيق التنفس، وتحمل النشاط اليومي.",
    "تجنب الدخان، الغبار، والروائح القوية.",
    "المشي الخفيف أو تمارين التنفس إذا كانت مناسبة لك.",
    "تسجيل أي صفير أو ضيق نفس أو أعراض ليلية.",
    "تجهيز أي أشعة أو فحوصات تنفس سابقة للمراجعة.",
  ],
  Kidney: [
    "شرب الماء بانتظام إذا لم يمنعك الطبيب من ذلك.",
    "متابعة ضغط الدم هذا الأسبوع.",
    "تجنب استخدام مسكنات الألم بكثرة بدون استشارة طبية.",
    "مراجعة أي تورم، تغير في البول، أو تعب غير مفسر.",
    "تجهيز فحوصات الكرياتينين، اليوريا، والأملاح للمقارنة.",
  ],
  Metabolic: [
    "تقليل المشروبات السكرية والكربوهيدرات المكررة.",
    "المشي أو الحركة 20 دقيقة في 4 أيام على الأقل.",
    "متابعة الوزن أو محيط الخصر مرة أسبوعيًا.",
    "مراجعة فحوصات السكر، الدهون، HbA1c إذا كانت متوفرة.",
    "اختيار وجبة واحدة يوميًا تكون صحية أكثر من المعتاد.",
  ],
  General: [
    "إكمال تحديث صحي واحد هذا الأسبوع.",
    "مراجعة آخر تقرير طبي والذكاء الصحي الناتج عنه.",
    "اختيار عادة صحية واحدة واقعية للأيام السبعة القادمة.",
    "إعادة تقييم الأولوية الصحية بعد 4 أسابيع.",
  ],
};

function getLocalizedOrganTasks(priorityOrgan: string, isArabic: boolean) {
  if (!isArabic) return organTaskPlans[priorityOrgan] || organTaskPlans.General;

  return arabicOrganTaskPlans[priorityOrgan] || arabicOrganTaskPlans.General;
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
  const priorityOrganDisplay = localizeHealthPlanValue(priorityOrgan, isArabic);
  const riskLevelDisplay = localizeHealthPlanValue(riskLevel, isArabic);

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
    ? "لا يوجد تحديث صحي بعد"
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
        ? "تحديث صحي مرتين إلى ثلاث مرات أسبوعيًا"
        : "Check in 2 to 3 times per week"
      : isArabic
      ? "متابعة وقائية أسبوعية"
      : "Weekly preventive check-in";


  const readinessItems = [
    {
      label: isArabic ? "التقييم الصحي" : "Health assessment",
      ready: hasAssessment,
      note: isArabic
        ? "يحدد أولوية الخطة الأساسية."
        : "Defines the core priority for the plan.",
    },
    {
      label: isArabic ? "التقارير الطبية" : "Medical reports",
      ready: hasReports,
      note: isArabic
        ? "تضيف بيانات سريرية أقوى للخطة."
        : "Adds stronger clinical context.",
    },
    {
      label: isArabic ? "الذكاء الصحي" : "Generated intelligence",
      ready: hasGeneratedIntelligence,
      note: isArabic
        ? "يحوّل البيانات إلى ملخصات قابلة للتنفيذ."
        : "Turns data into actionable summaries.",
    },
    {
      label: isArabic ? "التحديث الصحي" : "Wellness check-in",
      ready: hasCheckIn,
      note: isArabic
        ? "يعكس الحالة اليومية والأعراض والعادات."
        : "Reflects daily symptoms, habits, and wellbeing.",
    },
    {
      label: isArabic ? "التاريخ الصحي" : "Health history",
      ready: hasHistory,
      note: isArabic
        ? "يساعد على مقارنة التقدم عبر الزمن."
        : "Helps compare progress over time.",
    },
  ];

  const weeklyFocusTitle =
    priorityScore === null
      ? isArabic
        ? "ابدأ ببناء البيانات الأساسية"
        : "Start by building your baseline"
      : priorityScore < 50
      ? isArabic
        ? "متابعة قريبة ومنظمة هذا الأسبوع"
        : "Close and structured follow-up this week"
      : priorityScore < 80
      ? isArabic
        ? "تحسين ثابت بخطوات واقعية"
        : "Steady improvement with realistic steps"
      : isArabic
      ? "حافظ على المتابعة الوقائية"
      : "Maintain preventive follow-up";

  const weeklyFocusDescription =
    priorityScore === null
      ? isArabic
        ? "أكمل تقييمًا واحدًا وارفع تقريرًا إن وجد حتى تصبح الخطة أكثر دقة."
        : "Complete one assessment and upload a report if available to make the plan more accurate."
      : priorityScore < 50
      ? isArabic
        ? "ركز على تنفيذ مهام بسيطة، متابعة الأعراض، وتجهيز الأسئلة للطبيب."
        : "Focus on simple tasks, symptom tracking, and preparing questions for your doctor."
      : priorityScore < 80
      ? isArabic
        ? "استمر بالتحديثات الصحية ومراجعة التقارير لتحديد أي نمط متكرر."
        : "Keep check-ins updated and review reports to identify recurring patterns."
      : isArabic
      ? "استمر بخطوات وقائية صغيرة وراجع الخطة أسبوعيًا."
      : "Continue small preventive actions and review the plan weekly.";

  const clinicalFollowUpCards = [
    {
      title: isArabic ? "هذا الأسبوع" : "This week",
      value: followUpRhythm,
      note: isArabic
        ? "إيقاع المتابعة المقترح حسب البيانات المتوفرة."
        : "Suggested follow-up rhythm based on available data.",
    },
    {
      title: isArabic ? "أولوية الخطة" : "Plan priority",
      value: priorityOrganDisplay,
      note: isArabic
        ? "المنطقة الصحية التي تحتاج أكبر اهتمام حاليًا."
        : "The health area that currently needs the most attention.",
    },
    {
      title: isArabic ? "مستوى المتابعة" : "Follow-up level",
      value: planIntensity,
      note: isArabic
        ? "مؤشر عملي لقوة المتابعة المطلوبة."
        : "A practical indicator of required follow-up intensity.",
    },
  ];

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
          ? "لديك تقارير محفوظة. افتح مركز الذكاء لتوليد ملخص المريض وملخص الطبيب."
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

  const baseTasks = getLocalizedOrganTasks(priorityOrgan, isArabic);

  const dynamicTasks = [
    !hasGeneratedIntelligence && hasReports
      ? isArabic
        ? "ولّد الذكاء الصحي لأحدث تقرير محفوظ."
        : "Generate intelligence for the latest saved report."
      : null,
    hasGeneratedIntelligence
      ? isArabic
        ? "راجع ملخص المريض وملخص الطبيب من مركز الذكاء."
        : "Review the patient summary and doctor-ready brief in Intelligence Center."
      : null,
    !hasCheckIn
      ? isArabic
        ? "أكمل التحديث الصحي هذا الأسبوع."
        : "Complete a wellness check-in this week."
      : null,
    completedExtractionCount > 0
      ? isArabic
        ? "راجع التقارير التي اكتمل استخراجها واربطها بالخطة."
        : "Review extracted reports and connect them to this plan."
      : null,
    hasHistory
      ? isArabic
        ? "راجع التاريخ الصحي لمقارنة التقدم السابق."
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


  const ninetyDayStrategy = [
    isArabic
      ? "الشهر 1: بناء خط أساس واضح من التقييمات، التقارير، والتحديثات الصحية."
      : "Month 1: Build a clear baseline from assessments, reports, and check-ins.",
    isArabic
      ? "الشهر 2: متابعة الاتجاهات وتعديل العادات بناءً على النتائج."
      : "Month 2: Track patterns and adjust habits based on your results.",
    isArabic
      ? "الشهر 3: إعادة تقييم الأولوية ومقارنة التحسن مع البيانات السابقة."
      : "Month 3: Reassess your priority area and compare progress with past data.",
  ];

  const doctorDiscussionQuestions = [
    isArabic
      ? `هل تحتاج أولوية ${priorityOrganDisplay} إلى فحوصات إضافية أو متابعة قريبة؟`
      : `Does my ${priorityOrgan} priority need additional tests or closer follow-up?`,
    isArabic
      ? "هل توجد نتائج في التقارير تحتاج تفسيرًا أو مقارنة بنتائج سابقة؟"
      : "Are there any report findings that need interpretation or comparison with previous results?",
    isArabic
      ? "ما أهم تغيير واقعي أبدأ به خلال الأسبوع القادم؟"
      : "What is the most realistic change I should start this week?",
    isArabic
      ? "متى يجب إعادة الفحوصات أو التقييم؟"
      : "When should I repeat labs or reassess this area?",
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

        <style>{`
          .healthPlanIntelligencePage {
            --hp-card-border: rgba(148, 163, 184, 0.24);
            --hp-card-bg: rgba(255, 255, 255, 0.86);
            --hp-soft-bg: rgba(248, 250, 252, 0.88);
          }

          .healthPlanIntelligencePage[dir="rtl"] {
            text-align: right;
          }

          .healthPlanCommandCenter {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
            gap: 18px;
            margin: 22px 0;
          }

          .healthPlanCommandMain,
          .healthPlanReadinessCard,
          .healthPlanClinicalCard {
            border: 1px solid var(--hp-card-border);
            background: var(--hp-card-bg);
            border-radius: 24px;
            padding: 22px;
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
            backdrop-filter: blur(12px);
          }

          .healthPlanCommandMain h2,
          .healthPlanReadinessCard h2,
          .healthPlanClinicalCard h2 {
            margin: 8px 0 10px;
            line-height: 1.25;
          }

          .healthPlanCommandMain p,
          .healthPlanReadinessCard p,
          .healthPlanClinicalCard p {
            line-height: 1.75;
          }

          .healthPlanCommandStats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-top: 18px;
          }

          .healthPlanCommandStats div {
            border: 1px solid var(--hp-card-border);
            background: var(--hp-soft-bg);
            border-radius: 18px;
            padding: 14px;
          }

          .healthPlanCommandStats span,
          .healthPlanReadinessItem span,
          .healthPlanClinicalGrid span {
            display: block;
            font-size: 0.78rem;
            opacity: 0.72;
            margin-bottom: 6px;
          }

          .healthPlanCommandStats strong,
          .healthPlanClinicalGrid strong {
            display: block;
            font-size: 1.05rem;
            line-height: 1.4;
          }

          .healthPlanReadinessList {
            display: grid;
            gap: 10px;
            margin-top: 14px;
          }

          .healthPlanReadinessItem {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 12px;
            align-items: start;
            border: 1px solid var(--hp-card-border);
            background: var(--hp-soft-bg);
            border-radius: 16px;
            padding: 12px;
          }

          .healthPlanIntelligencePage[dir="rtl"] .healthPlanReadinessItem {
            grid-template-columns: 1fr auto;
          }

          .healthPlanReadinessDot {
            width: 28px;
            height: 28px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            font-size: 0.8rem;
            font-weight: 800;
            border: 1px solid var(--hp-card-border);
            background: white;
          }

          .healthPlanReadinessItem.ready .healthPlanReadinessDot {
            background: #dcfce7;
            color: #166534;
            border-color: #bbf7d0;
          }

          .healthPlanReadinessItem.pending .healthPlanReadinessDot {
            background: #fff7ed;
            color: #9a3412;
            border-color: #fed7aa;
          }

          .healthPlanClinicalGrid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
            margin-top: 14px;
          }

          .healthPlanClinicalGrid article {
            border: 1px solid var(--hp-card-border);
            background: var(--hp-soft-bg);
            border-radius: 18px;
            padding: 16px;
          }

          .healthPlanRoadmap > div,
          .healthPlanTaskItem,
          .healthPlanMetricsGrid article,
          .healthPlanCard,
          .healthPlanPanel {
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          }

          .healthPlanRoadmap > div:hover,
          .healthPlanTaskItem:hover,
          .healthPlanMetricsGrid article:hover,
          .healthPlanCard:hover,
          .healthPlanPanel:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
          }

          .healthPlanIntelligencePage[dir="rtl"] .healthPlanRoadmap div,
          .healthPlanIntelligencePage[dir="rtl"] .healthPlanTaskItem,
          .healthPlanIntelligencePage[dir="rtl"] .healthPlanInfoList div {
            text-align: right;
          }

          @media (max-width: 900px) {
            .healthPlanCommandCenter,
            .healthPlanClinicalGrid {
              grid-template-columns: 1fr;
            }

            .healthPlanCommandStats {
              grid-template-columns: 1fr;
            }
          }
        `}</style>


        <style>{`
          .healthPlanPrintToolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 14px;
          }

          .healthPlanPrintButton {
            border: 0;
            cursor: pointer;
            font: inherit;
            white-space: nowrap;
          }

          .healthPlanPrintSection {
            border: 1px solid rgba(15, 23, 42, 0.08);
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(240, 253, 250, 0.9));
          }

          .healthPlanPrintGrid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
            margin-top: 18px;
          }

          .healthPlanPrintGrid article {
            border: 1px solid rgba(148, 163, 184, 0.24);
            background: rgba(255, 255, 255, 0.82);
            border-radius: 18px;
            padding: 16px;
          }

          .healthPlanPrintGrid span {
            display: block;
            font-size: 0.78rem;
            opacity: 0.7;
            margin-bottom: 6px;
          }

          .healthPlanPrintGrid strong {
            display: block;
            font-size: 1rem;
            line-height: 1.45;
          }

          .healthPlanPrintNote {
            margin-top: 16px;
            padding: 14px 16px;
            border-radius: 16px;
            background: rgba(15, 23, 42, 0.04);
            line-height: 1.75;
          }

          @media (max-width: 900px) {
            .healthPlanPrintGrid {
              grid-template-columns: 1fr;
            }
          }

          @media print {
            @page {
              size: A4;
              margin: 14mm 12mm;
            }

            body {
              background: #ffffff !important;
              color: #0f172a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            nav,
            header,
            footer,
            .healthPlanNoPrint,
            .healthPlanPrintButton,
            .healthPlanBottomNav,
            .pageBackActions {
              display: none !important;
            }

            .healthPlanIntelligencePage {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            .healthPlanShell {
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            .healthPlanHero,
            .healthPlanCommandCenter,
            .healthPlanClinicalCard,
            .healthPlanMetricsGrid,
            .healthPlanGrid,
            .healthPlanPanel,
            .healthPlanCard,
            .healthPlanPrintSection {
              box-shadow: none !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              margin-bottom: 12mm !important;
            }

            .healthPlanPanel,
            .healthPlanCard,
            .healthPlanCommandMain,
            .healthPlanReadinessCard,
            .healthPlanClinicalCard,
            .healthPlanPrintSection {
              border: 1px solid #d1d5db !important;
              background: #ffffff !important;
            }

            .healthPlanRoadmap > div,
            .healthPlanTaskItem,
            .healthPlanReadinessItem,
            .healthPlanPrintGrid article {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            h1,
            h2,
            h3 {
              break-after: avoid !important;
              page-break-after: avoid !important;
              line-height: 1.35 !important;
            }

            p,
            li,
            strong,
            span {
              orphans: 3 !important;
              widows: 3 !important;
            }

            .healthPlanRoadmap,
            .healthPlanPrintGrid,
            .healthPlanClinicalGrid,
            .healthPlanCommandStats {
              gap: 8px !important;
            }
          }
        `}</style>


        <style>{`
          /* ORGANHEAL_SAFE_PRINT_EXPORT_PATCH */
          .healthPlanPrintOnly {
            display: none;
          }

          @media print {
            @page {
              size: A4;
              margin: 14mm 12mm;
            }

            html,
            body {
              background: #ffffff !important;
              color: #111827 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body * {
              visibility: hidden !important;
            }

            .healthPlanPrintOnly,
            .healthPlanPrintOnly * {
              visibility: visible !important;
            }

            .healthPlanPrintOnly {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #111827 !important;
              font-family: Tahoma, Arial, sans-serif !important;
              line-height: 1.7 !important;
            }

            .healthPlanPrintOnly[dir="rtl"],
            .healthPlanPrintOnly[dir="rtl"] * {
              direction: rtl !important;
              text-align: right !important;
              letter-spacing: normal !important;
              word-spacing: normal !important;
              text-transform: none !important;
              unicode-bidi: isolate !important;
            }

            .healthPlanPrintPage {
              width: 100% !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #111827 !important;
            }

            .healthPlanPrintOnlyHeader {
              border-bottom: 2px solid #0f172a !important;
              padding-bottom: 12px !important;
              margin-bottom: 18px !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .healthPlanPrintOnlyHeader p {
              margin: 0 0 6px !important;
              font-size: 11px !important;
              color: #475569 !important;
            }

            .healthPlanPrintOnlyHeader h1 {
              margin: 0 !important;
              font-size: 28px !important;
              line-height: 1.35 !important;
              color: #0f172a !important;
              break-after: avoid !important;
              page-break-after: avoid !important;
            }

            .healthPlanPrintOnlyGrid {
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 10px !important;
              margin-bottom: 16px !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .healthPlanPrintOnlyBox {
              border: 1px solid #d1d5db !important;
              border-radius: 10px !important;
              padding: 10px 12px !important;
              background: #f8fafc !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .healthPlanPrintOnlyBox span {
              display: block !important;
              font-size: 11px !important;
              color: #64748b !important;
              margin-bottom: 4px !important;
            }

            .healthPlanPrintOnlyBox strong {
              display: block !important;
              font-size: 14px !important;
              color: #0f172a !important;
              line-height: 1.5 !important;
            }

            .healthPlanPrintOnlySection {
              margin-top: 16px !important;
              padding-top: 10px !important;
              border-top: 1px solid #e5e7eb !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .healthPlanPrintOnlySection h2 {
              margin: 0 0 8px !important;
              font-size: 18px !important;
              line-height: 1.35 !important;
              color: #0f172a !important;
              break-after: avoid !important;
              page-break-after: avoid !important;
            }

            .healthPlanPrintOnlySection ul {
              margin: 0 !important;
              padding-inline-start: 20px !important;
            }

            .healthPlanPrintOnlySection li {
              margin-bottom: 6px !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              color: #111827 !important;
            }

            .healthPlanPrintOnlyNote {
              margin-top: 18px !important;
              padding: 10px 12px !important;
              border: 1px solid #d1d5db !important;
              border-radius: 10px !important;
              background: #f9fafb !important;
              font-size: 12px !important;
              color: #374151 !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            h1,
            h2,
            h3,
            p,
            li,
            strong,
            span {
              orphans: 3 !important;
              widows: 3 !important;
            }
          }
        `}</style>


        <style>{`
          /* ORGANHEAL_PRINT_NO_BLANK_PAGES_FIX */
          @media print {
            html,
            body {
              width: 100% !important;
              min-height: 0 !important;
              height: auto !important;
              overflow: visible !important;
              background: #ffffff !important;
            }

            .healthPlanIntelligencePage {
              display: block !important;
              width: 100% !important;
              min-height: 0 !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              background: #ffffff !important;
            }

            .healthPlanShell {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              min-height: 0 !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              background: #ffffff !important;
            }

            .healthPlanShell > :not(.healthPlanPrintOnly) {
              display: none !important;
            }

            .healthPlanPrintOnly {
              display: block !important;
              visibility: visible !important;
              position: static !important;
              width: 100% !important;
              max-width: 100% !important;
              min-height: 0 !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background: #ffffff !important;
            }

            .healthPlanPrintPage {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              min-height: 0 !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background: #ffffff !important;
              page-break-after: auto !important;
              break-after: auto !important;
            }

            .healthPlanPrintOnly::after,
            .healthPlanPrintPage::after {
              display: none !important;
              content: none !important;
            }

            .healthPlanBottomNav,
            .healthPlanNoPrint {
              display: none !important;
            }
          }
        `}</style>

        <PageBackActions />

        <section className="healthPlanHero">
          <div>
            <p className="launchEyebrow">
              {isArabic ? "خطة المتابعة الذكية" : "Personal Follow-Up Intelligence"}
            </p>

            <h1>
              {isArabic
                ? `خطة ${priorityOrganDisplay} الشخصية`
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

            <div className="healthPlanPrintToolbar healthPlanNoPrint">
              <Link href={nextBestAction.href} className="launchPrimary">
                {nextBestAction.button}
              </Link>

              <button
                type="button"
                className="launchSecondary healthPlanPrintButton healthPlanHeroPrintButton"
                onClick={() => window.print()}
              >
                {isArabic ? "طباعة / حفظ PDF" : "Print / Save PDF"}
              </button>
            </div>
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

            <section className="healthPlanCommandCenter">
              <div className="healthPlanCommandMain">
                <p className="launchEyebrow">
                  {isArabic ? "مركز قيادة الخطة" : "Plan command center"}
                </p>

                <h2>{weeklyFocusTitle}</h2>

                <p>{weeklyFocusDescription}</p>

                <div className="healthPlanCommandStats">
                  <div>
                    <span>{isArabic ? "جاهزية الخطة" : "Plan readiness"}</span>
                    <strong>{planReadinessScore}%</strong>
                  </div>

                  <div>
                    <span>{isArabic ? "المهام المكتملة" : "Completed tasks"}</span>
                    <strong>
                      {completedTaskCount}/{totalTasks}
                    </strong>
                  </div>

                  <div>
                    <span>{isArabic ? "التقدم الحالي" : "Current progress"}</span>
                    <strong>{taskProgress}%</strong>
                  </div>
                </div>
              </div>

              <div className="healthPlanReadinessCard">
                <p className="launchEyebrow">
                  {isArabic ? "قائمة الجاهزية" : "Readiness checklist"}
                </p>

                <h2>
                  {isArabic
                    ? "ما الذي يجعل الخطة أذكى؟"
                    : "What makes this plan smarter?"}
                </h2>

                <div className="healthPlanReadinessList">
                  {readinessItems.map((item) => (
                    <div
                      key={item.label}
                      className={`healthPlanReadinessItem ${
                        item.ready ? "ready" : "pending"
                      }`}
                    >
                      {isArabic ? (
                        <>
                          <div>
                            <strong>{item.label}</strong>
                            <span>{item.note}</span>
                          </div>
                          <div className="healthPlanReadinessDot">
                            {item.ready ? "✓" : "!"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="healthPlanReadinessDot">
                            {item.ready ? "✓" : "!"}
                          </div>
                          <div>
                            <strong>{item.label}</strong>
                            <span>{item.note}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="healthPlanClinicalCard">
              <p className="launchEyebrow">
                {isArabic ? "إيقاع المتابعة السريرية" : "Clinical follow-up rhythm"}
              </p>

              <h2>
                {isArabic
                  ? "خطة عملية حسب أولوية المستخدم"
                  : "A practical plan based on the user priority"}
              </h2>

              <div className="healthPlanClinicalGrid">
                {clinicalFollowUpCards.map((item) => (
                  <article key={item.title}>
                    <span>{item.title}</span>
                    <strong>{item.value}</strong>
                    <p>{item.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="healthPlanMetricsGrid">
              <article>
                <span>{isArabic ? "الأولوية" : "Priority"}</span>
                <strong>{priorityOrganDisplay}</strong>
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
                <span>{isArabic ? "التحديث الصحي" : "Check-In"}</span>
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
                    <strong>{localizeHealthPlanValue(riskLevelDisplay, isArabic)}</strong>
                  </div>

                  <div>
                    <span>{isArabic ? "التاريخ الصحي" : "Health History"}</span>
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
                  {isArabic
                    ? localizeHealthPlanValue(
                        latestInsight?.next_best_action ||
                          latestInsight?.summary ||
                          "ارفع تقريرًا أو ولّد الذكاء الصحي لتحسين الخطة.",
                        true
                      )
                    : latestInsight?.next_best_action ||
                      latestInsight?.summary ||
                      "Upload a report or generate health intelligence to improve this plan."}
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


            <section className="healthPlanPanel">
              <p className="launchEyebrow">
                {isArabic ? "استراتيجية 90 يوم" : "90-Day health strategy"}
              </p>

              <h2>
                {isArabic
                  ? "من المتابعة إلى التحسن المستمر"
                  : "From follow-up to sustained improvement"}
              </h2>

              <div className="healthPlanRoadmap month">
                {ninetyDayStrategy.map((item, index) => (
                  <div key={item}>
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="healthPlanPanel">
              <p className="launchEyebrow">
                {isArabic ? "أسئلة للطبيب" : "Doctor discussion guide"}
              </p>

              <h2>
                {isArabic
                  ? "حوّل الخطة إلى حوار طبي واضح"
                  : "Turn your plan into a clear medical conversation"}
              </h2>

              <div className="healthPlanRoadmap">
                {doctorDiscussionQuestions.map((item, index) => (
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


            <section className="healthPlanPanel healthPlanPrintSection">
              <div className="healthPlanSectionHeader">
                <div>
                  <p className="launchEyebrow">
                    {isArabic ? "نسخة قابلة للطباعة" : "Printable plan summary"}
                  </p>

                  <h2>
                    {isArabic
                      ? "ملخص عملي للخطة الصحية"
                      : "Practical health plan summary"}
                  </h2>

                  <p>
                    {isArabic
                      ? "استخدم هذه النسخة للمراجعة الشخصية أو لمناقشتها مع الطبيب. يمكن طباعتها أو حفظها كملف PDF من المتصفح."
                      : "Use this summary for personal review or to discuss with your doctor. You can print it or save it as a PDF from the browser."}
                  </p>
                </div>

                <button
                  type="button"
                  className="launchPrimary healthPlanPrintButton healthPlanNoPrint"
                  onClick={() => window.print()}
                >
                  {isArabic ? "طباعة الخطة" : "Print plan"}
                </button>
              </div>

              <div className="healthPlanPrintGrid">
                <article>
                  <span>{isArabic ? "الأولوية الصحية" : "Health priority"}</span>
                  <strong>{priorityOrganDisplay}</strong>
                </article>

                <article>
                  <span>{isArabic ? "جاهزية الخطة" : "Plan readiness"}</span>
                  <strong>{planReadinessScore}%</strong>
                </article>

                <article>
                  <span>{isArabic ? "مستوى المتابعة" : "Follow-up level"}</span>
                  <strong>{planIntensity}</strong>
                </article>

                <article>
                  <span>{isArabic ? "إيقاع المتابعة" : "Follow-up rhythm"}</span>
                  <strong>{followUpRhythm}</strong>
                </article>

                <article>
                  <span>{isArabic ? "المهام المكتملة" : "Completed tasks"}</span>
                  <strong>
                    {completedTaskCount}/{totalTasks}
                  </strong>
                </article>

                <article>
                  <span>{isArabic ? "مستوى الخطورة" : "Risk level"}</span>
                  <strong>{riskLevelDisplay}</strong>
                </article>
              </div>

              <p className="healthPlanPrintNote">
                {isArabic
                  ? "تنبيه: هذه الخطة تعليمية وتنظيمية ولا تستبدل تقييم الطبيب أو العلاج الطبي. راجع مقدم رعاية صحية عند وجود أعراض مقلقة أو نتائج غير طبيعية."
                  : "Note: This plan is educational and organizational. It does not replace medical evaluation or treatment. Consult a licensed healthcare professional for concerning symptoms or abnormal results."}
              </p>
            </section>


            {/* ORGANHEAL_PRINT_ONLY_SECTION */}
            <section
              className="healthPlanPrintOnly"
              dir={isArabic ? "rtl" : "ltr"}
              lang={isArabic ? "ar" : "en"}
              aria-hidden="true"
            >
              <div className="healthPlanPrintPage">
                <div className="healthPlanPrintOnlyHeader">
                  <p>OrganHeal AI</p>
                  <h1>
                    {isArabic
                      ? `خطة ${priorityOrganDisplay} الشخصية`
                      : `${priorityOrgan} Personal Health Plan`}
                  </h1>
                  <p>
                    {isArabic
                      ? "نسخة منظمة للطباعة أو الحفظ كملف PDF"
                      : "Printable plan summary for review or PDF saving"}
                  </p>
                </div>

                <div className="healthPlanPrintOnlyGrid">
                  <div className="healthPlanPrintOnlyBox">
                    <span>{isArabic ? "الأولوية الصحية" : "Health priority"}</span>
                    <strong>{priorityOrganDisplay}</strong>
                  </div>

                  <div className="healthPlanPrintOnlyBox">
                    <span>{isArabic ? "جاهزية الخطة" : "Plan readiness"}</span>
                    <strong>{planReadinessScore}%</strong>
                  </div>

                  <div className="healthPlanPrintOnlyBox">
                    <span>{isArabic ? "مستوى المتابعة" : "Follow-up level"}</span>
                    <strong>{planIntensity}</strong>
                  </div>

                  <div className="healthPlanPrintOnlyBox">
                    <span>{isArabic ? "إيقاع المتابعة" : "Follow-up rhythm"}</span>
                    <strong>{followUpRhythm}</strong>
                  </div>

                  <div className="healthPlanPrintOnlyBox">
                    <span>{isArabic ? "المهام المكتملة" : "Completed tasks"}</span>
                    <strong>
                      {completedTaskCount}/{totalTasks}
                    </strong>
                  </div>

                  <div className="healthPlanPrintOnlyBox">
                    <span>{isArabic ? "مستوى الخطورة" : "Risk level"}</span>
                    <strong>{riskLevelDisplay}</strong>
                  </div>
                </div>

                <div className="healthPlanPrintOnlySection">
                  <h2>{isArabic ? "الخطوة التالية" : "Next best action"}</h2>
                  <p>{nextBestAction.description}</p>
                </div>

                <div className="healthPlanPrintOnlySection">
                  <h2>{isArabic ? "مهام المتابعة" : "Action tasks"}</h2>
                  <ul>
                    {planTasks.slice(0, 8).map((task) => (
                      <li key={task}>{task}</li>
                    ))}
                  </ul>
                </div>

                <div className="healthPlanPrintOnlySection">
                  <h2>{isArabic ? "خطة 7 أيام" : "7-Day plan"}</h2>
                  <ul>
                    {sevenDayPlan.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="healthPlanPrintOnlySection">
                  <h2>{isArabic ? "خريطة 30 يوم" : "30-Day roadmap"}</h2>
                  <ul>
                    {thirtyDayRoadmap.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="healthPlanPrintOnlySection">
                  <h2>{isArabic ? "استراتيجية 90 يوم" : "90-Day strategy"}</h2>
                  <ul>
                    {ninetyDayStrategy.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="healthPlanPrintOnlySection">
                  <h2>{isArabic ? "أسئلة للطبيب" : "Doctor discussion guide"}</h2>
                  <ul>
                    {doctorDiscussionQuestions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <p className="healthPlanPrintOnlyNote">
                  {isArabic
                    ? "تنبيه: هذه الخطة تعليمية وتنظيمية ولا تستبدل تقييم الطبيب أو العلاج الطبي. راجع مقدم رعاية صحية عند وجود أعراض مقلقة أو نتائج غير طبيعية."
                    : "Note: This plan is educational and organizational. It does not replace medical evaluation or treatment. Consult a licensed healthcare professional for concerning symptoms or abnormal results."}
                </p>
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
                <Link href="/checkin">{isArabic ? "التحديث الصحي" : "Check-In"}</Link>
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
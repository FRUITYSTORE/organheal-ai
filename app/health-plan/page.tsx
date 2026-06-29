"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  Brain: [
    "متابعة جودة النوم، الصداع، التركيز، ومستوى التوتر.",
    "تقليل استخدام الشاشات قبل النوم خلال هذا الأسبوع.",
    "ممارسة تنفس هادئ أو استرخاء قصير يوميًا.",
    "مراجعة أي دوخة، ضعف، تنميل، أو أعراض عصبية مقلقة.",
    "تجهيز أي تقارير أو ملاحظات مرتبطة بالنوم أو الصداع أو التركيز.",
  ],
  General: [
    "إكمال تحديث صحي واحد هذا الأسبوع.",
    "مراجعة آخر تقرير طبي والذكاء الصحي الناتج عنه.",
    "اختيار عادة صحية واحدة واقعية للأيام السبعة القادمة.",
    "إعادة تقييم الأولوية الصحية بعد 4 أسابيع.",
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

  if (
    lower.includes("metabolic") ||
    lower.includes("glucose") ||
    lower.includes("cholesterol")
  ) {
    return "متابعة مؤشرات الأيض مثل السكر والدهون والنشاط الغذائي.";
  }

  if (lower.includes("review") && lower.includes("doctor")) {
    return "راجع النتائج والخطة مع الطبيب عند وجود أعراض أو نتائج تحتاج متابعة.";
  }

  return clean;
}

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

  const isArabic = language === "ar";

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
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

  const planReadinessTone =
    planReadinessScore >= 80
      ? "good"
      : planReadinessScore >= 40
      ? "moderate"
      : "risk";

  const planIntensity =
    priorityScore === null
      ? text("Waiting for assessment", "بانتظار التقييم")
      : priorityScore < 50
      ? text("High follow-up", "متابعة عالية")
      : priorityScore < 80
      ? text("Moderate follow-up", "متابعة متوسطة")
      : text("Preventive follow-up", "متابعة وقائية");

  const latestCheckInText = latestCheckIn
    ? `${new Date(latestCheckIn.created_at).toLocaleDateString(
        isArabic ? "ar-AE" : "en-US"
      )} - ${latestCheckIn.wellness_score ?? "N/A"}/100 - ${
        latestCheckIn.mood || text("Mood not recorded", "المزاج غير مسجل")
      }`
    : text("No check-in yet", "لا يوجد تحديث صحي بعد");

  const followUpRhythm =
    priorityScore === null
      ? text("Start with an assessment", "ابدأ بتقييم صحي")
      : priorityScore < 50
      ? text("Weekly follow-up recommended", "متابعة أسبوعية مقترحة")
      : priorityScore < 80
      ? text("Check in 2 to 3 times per week", "تحديث صحي مرتين إلى ثلاث مرات أسبوعيًا")
      : text("Weekly preventive check-in", "متابعة وقائية أسبوعية");

  const readinessItems = [
    {
      label: text("Health assessment", "التقييم الصحي"),
      ready: hasAssessment,
      note: text(
        "Defines the core priority for the plan.",
        "يحدد أولوية الخطة الأساسية."
      ),
    },
    {
      label: text("Medical reports", "التقارير الطبية"),
      ready: hasReports,
      note: text(
        "Adds stronger clinical context.",
        "تضيف بيانات سريرية أقوى للخطة."
      ),
    },
    {
      label: text("Generated intelligence", "الذكاء الصحي"),
      ready: hasGeneratedIntelligence,
      note: text(
        "Turns data into actionable summaries.",
        "يحوّل البيانات إلى ملخصات قابلة للتنفيذ."
      ),
    },
    {
      label: text("Wellness check-in", "التحديث الصحي"),
      ready: hasCheckIn,
      note: text(
        "Reflects daily symptoms, habits, and wellbeing.",
        "يعكس الحالة اليومية والأعراض والعادات."
      ),
    },
    {
      label: text("Health history", "التاريخ الصحي"),
      ready: hasHistory,
      note: text(
        "Helps compare progress over time.",
        "يساعد على مقارنة التقدم عبر الزمن."
      ),
    },
  ];

  const weeklyFocusTitle =
    priorityScore === null
      ? text("Start by building your baseline", "ابدأ ببناء البيانات الأساسية")
      : priorityScore < 50
      ? text(
          "Close and structured follow-up this week",
          "متابعة قريبة ومنظمة هذا الأسبوع"
        )
      : priorityScore < 80
      ? text(
          "Steady improvement with realistic steps",
          "تحسين ثابت بخطوات واقعية"
        )
      : text("Maintain preventive follow-up", "حافظ على المتابعة الوقائية");

  const weeklyFocusDescription =
    priorityScore === null
      ? text(
          "Complete one assessment and upload a report if available to make the plan more accurate.",
          "أكمل تقييمًا واحدًا وارفع تقريرًا إن وجد حتى تصبح الخطة أكثر دقة."
        )
      : priorityScore < 50
      ? text(
          "Focus on simple tasks, symptom tracking, and preparing questions for your doctor.",
          "ركز على تنفيذ مهام بسيطة، متابعة الأعراض، وتجهيز الأسئلة للطبيب."
        )
      : priorityScore < 80
      ? text(
          "Keep check-ins updated and review reports to identify recurring patterns.",
          "استمر بالتحديثات الصحية ومراجعة التقارير لتحديد أي نمط متكرر."
        )
      : text(
          "Continue small preventive actions and review the plan weekly.",
          "استمر بخطوات وقائية صغيرة وراجع الخطة أسبوعيًا."
        );

  const clinicalFollowUpCards = [
    {
      title: text("This week", "هذا الأسبوع"),
      value: followUpRhythm,
      note: text(
        "Suggested follow-up rhythm based on available data.",
        "إيقاع المتابعة المقترح حسب البيانات المتوفرة."
      ),
    },
    {
      title: text("Plan priority", "أولوية الخطة"),
      value: priorityOrganDisplay,
      note: text(
        "The health area that currently needs the most attention.",
        "المنطقة الصحية التي تحتاج أكبر اهتمام حاليًا."
      ),
    },
    {
      title: text("Follow-up level", "مستوى المتابعة"),
      value: planIntensity,
      note: text(
        "A practical indicator of required follow-up intensity.",
        "مؤشر عملي لقوة المتابعة المطلوبة."
      ),
    },
  ];

  const nextBestAction = !hasAssessment
    ? {
        label: text("Start your assessment", "ابدأ بالتقييم"),
        description: text(
          "Complete at least one assessment so OrganHeal can identify the priority area for your plan.",
          "أكمل تقييمًا واحدًا على الأقل حتى يحدد OrganHeal أولوية الخطة."
        ),
        href: "/assessment",
        button: text("Start Assessment", "ابدأ التقييم"),
      }
    : !hasReports
    ? {
        label: text("Add a medical report", "أضف تقريرًا طبيًا"),
        description: text(
          "Upload a lab, radiology, or clinical report so your plan can use more health data.",
          "ارفع تقرير مختبر أو أشعة أو ملخص طبي حتى تصبح الخطة مبنية على بيانات أكثر."
        ),
        href: "/lab-upload",
        button: text("Upload Report", "رفع تقرير"),
      }
    : !hasGeneratedIntelligence
    ? {
        label: text("Generate health intelligence", "ولّد الذكاء الصحي"),
        description: text(
          "You have saved reports. Open Intelligence Center to generate a patient summary and doctor-ready brief.",
          "لديك تقارير محفوظة. افتح مركز الذكاء لتوليد ملخص المريض وملخص الطبيب."
        ),
        href: "/intelligence",
        button: text("Intelligence Center", "مركز الذكاء"),
      }
    : !hasCheckIn
    ? {
        label: text("Complete today check-in", "أكمل Check-In اليوم"),
        description: text(
          "Add sleep, stress, activity, energy, and mood updates so the plan becomes more personal.",
          "أضف تحديث النوم، الضغط النفسي، النشاط، الطاقة، والمزاج حتى تصبح الخطة أكثر شخصية."
        ),
        href: "/checkin",
        button: text("Open Check-In", "افتح Check-In"),
      }
    : {
        label: text("Continue this week plan", "تابع خطة الأسبوع"),
        description: text(
          "Your plan is active. Complete tasks, review reports, and keep check-ins updated.",
          "الخطة فعالة الآن. أكمل المهام، وراجع التقارير، وحدث Check-In بشكل منتظم."
        ),
        href: "#action-tasks-section",
        button: text("Continue Tasks", "متابعة المهام"),
      };

  const baseTasks = getLocalizedOrganTasks(priorityOrgan, isArabic);

  const dynamicTasks = [
    !hasGeneratedIntelligence && hasReports
      ? text(
          "Generate intelligence for the latest saved report.",
          "ولّد الذكاء الصحي لأحدث تقرير محفوظ."
        )
      : null,
    hasGeneratedIntelligence
      ? text(
          "Review the patient summary and doctor-ready brief in Intelligence Center.",
          "راجع ملخص المريض وملخص الطبيب من مركز الذكاء."
        )
      : null,
    !hasCheckIn
      ? text(
          "Complete a wellness check-in this week.",
          "أكمل التحديث الصحي هذا الأسبوع."
        )
      : null,
    completedExtractionCount > 0
      ? text(
          "Review extracted reports and connect them to this plan.",
          "راجع التقارير التي اكتمل استخراجها واربطها بالخطة."
        )
      : null,
    hasHistory
      ? text(
          "Review Health History to compare previous progress.",
          "راجع التاريخ الصحي لمقارنة التقدم السابق."
        )
      : null,
  ].filter(Boolean) as string[];

  const planTasks = [...dynamicTasks, ...baseTasks].slice(0, 8);

  const sevenDayPlan = [
    text(
      "Day 1: Review your priority area and next best action.",
      "اليوم 1: راجع الأولوية الصحية والخطوة التالية."
    ),
    text(
      "Day 2: Complete a check-in and identify the main symptom or habit to track.",
      "اليوم 2: أكمل Check-In وحدد أهم عرض أو عادة تحتاج متابعة."
    ),
    text(
      "Day 3: Review the latest report or generate intelligence if missing.",
      "اليوم 3: راجع آخر تقرير أو ولّد الذكاء الصحي إن لم يكن موجودًا."
    ),
    text(
      "Day 4: Complete one action task from the plan.",
      "اليوم 4: نفذ مهمة واحدة من قائمة الخطة."
    ),
    text(
      "Day 5: Review improvement or worsening signals.",
      "اليوم 5: راجع مؤشرات التحسن أو التراجع."
    ),
    text(
      "Day 6: Prepare doctor questions if there are concerning results.",
      "اليوم 6: جهز أسئلة للطبيب إذا توجد نتائج مقلقة."
    ),
    text(
      "Day 7: Review progress and decide next week focus.",
      "اليوم 7: راجع التقدم وحدد الأسبوع القادم."
    ),
  ];

  const thirtyDayRoadmap = [
    text(
      "Week 1: Build your baseline from assessments and reports.",
      "الأسبوع 1: تثبيت البيانات الأساسية والتقارير."
    ),
    text(
      "Week 2: Track check-ins and complete realistic actions.",
      "الأسبوع 2: متابعة Check-Ins وتنفيذ المهام الواقعية."
    ),
    text(
      "Week 3: Review patterns from reports and generated intelligence.",
      "الأسبوع 3: مراجعة الأنماط من التقارير والذكاء الصحي."
    ),
    text(
      "Week 4: Repeat the priority assessment and compare Health History.",
      "الأسبوع 4: إعادة تقييم الأولوية ومقارنة Health History."
    ),
  ];

  const ninetyDayStrategy = [
    text(
      "Month 1: Build a clear baseline from assessments, reports, and check-ins.",
      "الشهر 1: بناء خط أساس واضح من التقييمات، التقارير، والتحديثات الصحية."
    ),
    text(
      "Month 2: Track patterns and adjust habits based on your results.",
      "الشهر 2: متابعة الاتجاهات وتعديل العادات بناءً على النتائج."
    ),
    text(
      "Month 3: Reassess your priority area and compare progress with past data.",
      "الشهر 3: إعادة تقييم الأولوية ومقارنة التحسن مع البيانات السابقة."
    ),
  ];

  const doctorDiscussionQuestions = [
    isArabic
      ? `هل تحتاج أولوية ${priorityOrganDisplay} إلى فحوصات إضافية أو متابعة قريبة؟`
      : `Does my ${priorityOrgan} priority need additional tests or closer follow-up?`,
    text(
      "Are there any report findings that need interpretation or comparison with previous results?",
      "هل توجد نتائج في التقارير تحتاج تفسيرًا أو مقارنة بنتائج سابقة؟"
    ),
    text(
      "What is the most realistic change I should start this week?",
      "ما أهم تغيير واقعي أبدأ به خلال الأسبوع القادم؟"
    ),
    text(
      "When should I repeat labs or reassess this area?",
      "متى يجب إعادة الفحوصات أو التقييم؟"
    ),
  ];

  const activeCompletedTasks = completedTasks.filter((task) =>
    planTasks.includes(task)
  );

  const completedTaskCount = activeCompletedTasks.length;
  const totalTasks = planTasks.length;
  const taskProgress =
    totalTasks > 0 ? Math.round((completedTaskCount / totalTasks) * 100) : 0;

  const remainingTaskCount = Math.max(totalTasks - completedTaskCount, 0);

  const nextIncompleteTask =
    planTasks.find((task) => !completedTasks.includes(task)) ||
    text("All tasks for this week are completed.", "كل مهام هذا الأسبوع مكتملة.");

  const progressMomentum =
    taskProgress === 0
      ? text("Start with one step", "ابدأ بخطوة واحدة")
      : taskProgress < 40
      ? text("Good start", "بداية جيدة")
      : taskProgress < 80
      ? text("Clear progress", "تقدم واضح")
      : taskProgress < 100
      ? text("Almost complete", "قريب من الإكمال")
      : text("Completed this week", "مكتمل هذا الأسبوع");

  const progressMomentumDescription =
    taskProgress === 0
      ? text(
          "Choose the easiest task and start today. The goal is consistency, not perfection.",
          "اختر أسهل مهمة وابدأ بها اليوم. الهدف هو الاستمرارية وليس الكمال."
        )
      : taskProgress < 40
      ? text(
          "Keep taking small steps. Completing two or three tasks can build momentum.",
          "استمر بخطوات بسيطة. إنجاز مهمتين أو ثلاث يكفي لبناء عادة."
        )
      : taskProgress < 80
      ? text(
          "You are building good follow-up. Focus on the next most realistic task.",
          "أنت تبني متابعة جيدة. ركز الآن على المهمة التالية الأكثر واقعية."
        )
      : taskProgress < 100
      ? text(
          "Almost there. Review the remaining tasks and choose one easy action today.",
          "بقي القليل. راجع المهام المتبقية واختر واحدة سهلة اليوم."
        )
      : text(
          "Great. Review your progress and decide next week focus.",
          "رائع. راجع التقدم وحدد هدف الأسبوع القادم."
        );

  const progressInsightCards = [
    {
      label: text("Progress", "التقدم"),
      value: `${taskProgress}%`,
      note: progressMomentum,
    },
    {
      label: text("Remaining", "المتبقي"),
      value: String(remainingTaskCount),
      note: text("tasks need follow-up", "مهام تحتاج متابعة"),
    },
    {
      label: text("Next task", "المهمة التالية"),
      value: nextIncompleteTask,
      note: text("start here first", "ابدأ بها أولًا"),
    },
  ];

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
      setMessage("Please login to view your follow-up plan.");
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

    try {
      localStorage.setItem(taskStorageKey, JSON.stringify(nextTasks));
    } catch {
      // Keep UI stable if localStorage is unavailable.
    }
  }

  function resetWeeklyTasks() {
    setCompletedTasks([]);

    try {
      localStorage.removeItem(taskStorageKey);
    } catch {
      // Keep UI stable if localStorage is unavailable.
    }
  }

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <style>{`
        .healthPlanProgressBar {
          height: 12px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.22);
          overflow: hidden;
          margin: 14px 0 18px;
        }

        .healthPlanProgressBar div {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(135deg, var(--oh-primary), var(--oh-info));
          transition: width 0.25s ease;
        }

        .healthPlanTaskList {
          display: grid;
          gap: 12px;
        }

        .healthPlanTaskItem {
          display: grid;
          grid-template-columns: auto auto 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 1px solid var(--oh-border);
          border-radius: 18px;
          background: var(--oh-card-soft);
          cursor: pointer;
        }

        .healthPlanTaskItem.completed {
          border-color: rgba(34, 197, 94, 0.35);
          background: rgba(240, 253, 244, 0.92);
        }

        .healthPlanTaskItem input {
          width: 18px;
          height: 18px;
          accent-color: var(--oh-primary);
        }

        .healthPlanTaskItem small {
          color: var(--oh-muted);
          font-weight: 800;
        }

        .healthPlanTaskItemNumber {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          display: inline-grid;
          place-items: center;
          border: 1px solid var(--oh-border);
          background: #ffffff;
          font-size: 0.82rem;
          font-weight: 900;
          color: var(--oh-text);
        }

        .healthPlanPrintOnly {
          display: none;
        }

        @media (max-width: 700px) {
          .healthPlanTaskItem {
            grid-template-columns: auto auto 1fr;
          }

          .healthPlanTaskItem small {
            grid-column: 3;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 14mm 12mm;
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
            inset: 0 auto auto 0 !important;
            width: 100% !important;
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
            unicode-bidi: isolate !important;
          }

          .healthPlanNoPrint {
            display: none !important;
          }

          .healthPlanPrintHeader {
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 12px !important;
            margin-bottom: 18px !important;
          }

          .healthPlanPrintHeader p {
            margin: 0 0 6px !important;
            font-size: 11px !important;
            color: #475569 !important;
          }

          .healthPlanPrintHeader h1 {
            margin: 0 !important;
            font-size: 28px !important;
            line-height: 1.35 !important;
            color: #0f172a !important;
          }

          .healthPlanPrintGrid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
            margin-bottom: 16px !important;
          }

          .healthPlanPrintBox {
            border: 1px solid #d1d5db !important;
            border-radius: 10px !important;
            padding: 10px 12px !important;
            background: #f8fafc !important;
            break-inside: avoid !important;
          }

          .healthPlanPrintBox span {
            display: block !important;
            font-size: 11px !important;
            color: #64748b !important;
            margin-bottom: 4px !important;
          }

          .healthPlanPrintBox strong {
            display: block !important;
            font-size: 14px !important;
            color: #0f172a !important;
            line-height: 1.5 !important;
          }

          .healthPlanPrintSection {
            margin-top: 16px !important;
            padding-top: 10px !important;
            border-top: 1px solid #e5e7eb !important;
            break-inside: avoid !important;
          }

          .healthPlanPrintSection h2 {
            margin: 0 0 8px !important;
            font-size: 18px !important;
            color: #0f172a !important;
          }

          .healthPlanPrintSection ul {
            margin: 0 !important;
            padding-inline-start: 20px !important;
          }

          .healthPlanPrintSection li {
            margin-bottom: 6px !important;
            break-inside: avoid !important;
            color: #111827 !important;
          }

          .healthPlanPrintNote {
            margin-top: 18px !important;
            padding: 10px 12px !important;
            border: 1px solid #d1d5db !important;
            border-radius: 10px !important;
            background: #f9fafb !important;
            font-size: 12px !important;
            color: #374151 !important;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Personal Follow-Up Intelligence", "خطة المتابعة الذكية")}
              </p>

              <h1 className="ohTitle">
                {isArabic
                  ? `خطة ${priorityOrganDisplay} الشخصية`
                  : `${priorityOrgan} Personal Health Plan`}
              </h1>

              <p className="ohLead">
                {text(
                  "A follow-up plan that connects assessments, reports, generated intelligence, check-ins, and health history into a clear next step.",
                  "خطة متابعة تجمع التقييمات، التقارير، الذكاء الصحي، Check-Ins، والتاريخ الصحي لتوجيه الخطوة التالية."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href={nextBestAction.href} className="primaryBtn">
                  {nextBestAction.button}
                </Link>

                <button
                  type="button"
                  className="secondaryBtn healthPlanNoPrint"
                  onClick={() => window.print()}
                >
                  {text("Print / Save PDF", "طباعة / حفظ PDF")}
                </button>

                <Link href="/intelligence" className="secondaryBtn">
                  {text("Intelligence", "الذكاء")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Plan Readiness", "جاهزية الخطة")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {planReadinessScore}%
                  </h2>
                </div>

                <span className={`ohStatusBadge ${planReadinessTone}`}>
                  {planIntensity}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "The more data you add, the more personalized this plan becomes.",
                  "كلما أضفت بيانات أكثر أصبحت الخطة أكثر شخصية."
                )}
              </p>

              <div className="ohDivider" />

              <p className="ohMetricLabel">
                {text("Priority", "الأولوية")}
              </p>
              <p className="ohMetricValue" style={{ fontSize: "1.55rem" }}>
                {priorityOrganDisplay}
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="ohCard">
            <p className="ohEyebrow">
              {text("Loading Plan", "تحميل الخطة")}
            </p>
            <h2 className="ohCardTitle">
              {text(
                "Preparing your personalized follow-up plan...",
                "جاري تحضير خطة المتابعة..."
              )}
            </h2>
          </section>
        ) : message ? (
          <section className="ohCard">
            <p className="ohEyebrow">
              {text("Plan Not Ready", "الخطة غير جاهزة")}
            </p>
            <h2 className="ohCardTitle">
              {isArabic ? "يرجى تسجيل الدخول لعرض خطة المتابعة." : message}
            </h2>
            <Link href="/login" className="primaryBtn">
              {text("Login", "تسجيل الدخول")}
            </Link>
          </section>
        ) : (
          <>
            <section className="ohMetricGrid">
              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Priority", "الأولوية")}
                </span>
                <span className="ohMetricValue">{priorityOrganDisplay}</span>
                <span className="ohMetricHint">
                  {priorityScore !== null
                    ? `${priorityScore}/100`
                    : text("No assessment", "لا يوجد تقييم")}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Reports", "التقارير")}
                </span>
                <span className="ohMetricValue">{uploadedReports.length}</span>
                <span className="ohMetricHint">
                  {completedExtractionCount} {text("extracted", "استخراج مكتمل")}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Intelligence", "الذكاء")}
                </span>
                <span className="ohMetricValue">{generatedCount}</span>
                <span className="ohMetricHint">
                  {hasGeneratedIntelligence
                    ? text("saved results", "نتائج محفوظة")
                    : text("needs generation", "بحاجة توليد")}
                </span>
              </article>

              <article className="ohMetricCard">
                <span className="ohMetricLabel">
                  {text("Check-In", "التحديث الصحي")}
                </span>
                <span className="ohMetricValue">
                  {latestCheckIn?.wellness_score
                    ? `${latestCheckIn.wellness_score}/100`
                    : "—"}
                </span>
                <span className="ohMetricHint">
                  {latestCheckIn?.mood || text("Not available", "غير متاح")}
                </span>
              </article>
            </section>

            <section className="ohActionPanel">
              <div className="ohCardHeader" style={{ marginBottom: 0 }}>
                <div>
                  <p className="ohMetricLabel">
                    {text("Next Best Action", "الخطوة التالية")}
                  </p>

                  <h2 className="ohCardTitle" style={{ fontSize: "1.55rem" }}>
                    {nextBestAction.label}
                  </h2>

                  <p className="ohCardText">{nextBestAction.description}</p>
                </div>

                <Link href={nextBestAction.href} className="primaryBtn">
                  {nextBestAction.button}
                </Link>
              </div>
            </section>

            <section className="ohGrid cols2">
              <article className="ohCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text("Plan Command Center", "مركز قيادة الخطة")}
                    </p>

                    <h2 className="ohCardTitle">{weeklyFocusTitle}</h2>

                    <p className="ohCardText">{weeklyFocusDescription}</p>
                  </div>

                  <span className={`ohStatusBadge ${planReadinessTone}`}>
                    {planReadinessScore}%
                  </span>
                </div>

                <div className="ohGrid cols3" style={{ gap: "12px" }}>
                  <article className="ohMetricCard">
                    <span className="ohMetricLabel">
                      {text("Plan readiness", "جاهزية الخطة")}
                    </span>
                    <span className="ohMetricValue">{planReadinessScore}%</span>
                  </article>

                  <article className="ohMetricCard">
                    <span className="ohMetricLabel">
                      {text("Completed tasks", "المهام المكتملة")}
                    </span>
                    <span className="ohMetricValue">
                      {completedTaskCount}/{totalTasks}
                    </span>
                  </article>

                  <article className="ohMetricCard">
                    <span className="ohMetricLabel">
                      {text("Current progress", "التقدم الحالي")}
                    </span>
                    <span className="ohMetricValue">{taskProgress}%</span>
                  </article>
                </div>
              </article>

              <article className="ohCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text("Readiness Checklist", "قائمة الجاهزية")}
                    </p>

                    <h2 className="ohCardTitle">
                      {text(
                        "What makes this plan smarter?",
                        "ما الذي يجعل الخطة أذكى؟"
                      )}
                    </h2>
                  </div>
                </div>

                <div className="ohTimeline">
                  {readinessItems.map((item) => (
                    <div className="ohTimelineItem" key={item.label}>
                      <span className="ohTimelineDot" />
                      <div>
                        <p className="ohTimelineTitle">{item.label}</p>
                        <p className="ohTimelineMeta">{item.note}</p>
                      </div>
                      <span className={`ohStatusBadge ${item.ready ? "good" : "moderate"}`}>
                        {item.ready ? text("Ready", "جاهز") : text("Pending", "بانتظار")}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Clinical Follow-Up Rhythm", "إيقاع المتابعة السريرية")}
                  </p>

                  <h2 className="ohCardTitle">
                    {text(
                      "A practical plan based on the user priority",
                      "خطة عملية حسب أولوية المستخدم"
                    )}
                  </h2>
                </div>
              </div>

              <div className="ohGrid cols3">
                {clinicalFollowUpCards.map((item) => (
                  <article className="ohMetricCard" key={item.title}>
                    <span className="ohMetricLabel">{item.title}</span>
                    <span className="ohMetricValue" style={{ fontSize: "1.25rem" }}>
                      {item.value}
                    </span>
                    <span className="ohMetricHint">{item.note}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="ohGrid cols2">
              <article className="ohCard">
                <p className="ohMetricLabel">
                  {text("Plan Summary", "ملخص الخطة")}
                </p>
                <h2 className="ohCardTitle">{planIntensity}</h2>

                <div className="ohTimeline">
                  <div className="ohTimelineItem">
                    <span className="ohTimelineDot" />
                    <div>
                      <p className="ohTimelineTitle">
                        {text("Latest Check-In", "آخر Check-In")}
                      </p>
                      <p className="ohTimelineMeta">{latestCheckInText}</p>
                    </div>
                  </div>

                  <div className="ohTimelineItem">
                    <span className="ohTimelineDot" />
                    <div>
                      <p className="ohTimelineTitle">
                        {text("Follow-up Rhythm", "إيقاع المتابعة")}
                      </p>
                      <p className="ohTimelineMeta">{followUpRhythm}</p>
                    </div>
                  </div>

                  <div className="ohTimelineItem">
                    <span className="ohTimelineDot" />
                    <div>
                      <p className="ohTimelineTitle">
                        {text("Risk Level", "مستوى الخطورة")}
                      </p>
                      <p className="ohTimelineMeta">{riskLevelDisplay}</p>
                    </div>
                  </div>

                  <div className="ohTimelineItem">
                    <span className="ohTimelineDot" />
                    <div>
                      <p className="ohTimelineTitle">
                        {text("Health History", "التاريخ الصحي")}
                      </p>
                      <p className="ohTimelineMeta">{historyItems.length}</p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="ohCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text("Reports and Intelligence", "التقارير والذكاء")}
                    </p>

                    <h2 className="ohCardTitle">
                      {hasGeneratedIntelligence
                        ? text(
                            "Generated intelligence is saved",
                            "الذكاء الصحي محفوظ"
                          )
                        : text(
                            "Generated intelligence is incomplete",
                            "الذكاء الصحي غير مكتمل"
                          )}
                    </h2>
                  </div>

                  <span className={`ohStatusBadge ${hasGeneratedIntelligence ? "good" : "moderate"}`}>
                    {generatedCount}
                  </span>
                </div>

                <p className="ohCardText">
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

                <div className="ohButtonRow">
                  <Link href="/reports" className="secondaryBtn">
                    {text("Reports", "التقارير")}
                  </Link>
                  <Link href="/intelligence" className="primaryBtn">
                    {text("Intelligence", "مركز الذكاء")}
                  </Link>
                </div>

                {latestGenerated?.updated_at && (
                  <p className="ohMetricHint" style={{ marginTop: "14px" }}>
                    {text("Latest generated: ", "آخر توليد: ")}
                    {new Date(latestGenerated.updated_at).toLocaleString(
                      isArabic ? "ar-AE" : "en-US"
                    )}
                  </p>
                )}
              </article>
            </section>

            <section className="ohCard" id="action-tasks-section">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Action Tasks", "مهام المتابعة")}
                  </p>

                  <h2 className="ohCardTitle">
                    {completedTaskCount} {text("of", "من")} {totalTasks}{" "}
                    {text("completed", "مكتملة")}
                  </h2>

                  <p className="ohCardText">
                    {text(
                      "Choose simple tasks. Progress is saved on this device.",
                      "اختر مهام بسيطة. يتم حفظ التقدم على نفس الجهاز."
                    )}
                  </p>
                </div>

                <span className={`ohStatusBadge ${taskProgress >= 80 ? "good" : taskProgress >= 40 ? "moderate" : "neutral"}`}>
                  {taskProgress}%
                </span>
              </div>

              <div className="healthPlanProgressBar">
                <div style={{ width: `${taskProgress}%` }} />
              </div>

              <div className="ohGrid cols3" style={{ marginBottom: "18px" }}>
                {progressInsightCards.map((card) => (
                  <article className="ohMetricCard" key={card.label}>
                    <span className="ohMetricLabel">{card.label}</span>
                    <span className="ohMetricValue" style={{ fontSize: "1.2rem" }}>
                      {card.value}
                    </span>
                    <span className="ohMetricHint">{card.note}</span>
                  </article>
                ))}
              </div>

              <div className="ohTrustNotice" style={{ marginBottom: "16px" }}>
                <span aria-hidden="true">✅</span>
                <div>
                  <strong>{progressMomentum}</strong>
                  <br />
                  {progressMomentumDescription}
                </div>
              </div>

              <div className="healthPlanTaskList">
                {planTasks.map((task, index) => {
                  const isCompleted = activeCompletedTasks.includes(task);

                  return (
                    <label
                      key={task}
                      className={`healthPlanTaskItem ${
                        isCompleted ? "completed" : ""
                      }`}
                    >
                      <span className="healthPlanTaskItemNumber">
                        {isCompleted ? "✓" : index + 1}
                      </span>

                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => toggleTask(task)}
                      />
                      <span>{task}</span>
                      <small>{isCompleted ? text("Done", "تم") : text("To do", "للعمل")}</small>
                    </label>
                  );
                })}
              </div>

              <div className="ohButtonRow" style={{ marginTop: "16px" }}>
                <button type="button" className="secondaryBtn" onClick={resetWeeklyTasks}>
                  {text("Reset Weekly Tasks", "إعادة ضبط مهام الأسبوع")}
                </button>

                <Link
                  href={organAssessmentLinks[priorityOrgan] || "/assessment"}
                  className="secondaryBtn"
                >
                  {text("Reassess Priority", "إعادة تقييم الأولوية")}
                </Link>
              </div>
            </section>

            <section className="ohGrid cols2">
              <article className="ohCard">
                <p className="ohMetricLabel">
                  {text("7-Day Follow-Up Plan", "خطة 7 أيام")}
                </p>
                <h2 className="ohCardTitle">
                  {text(
                    "Start with small, realistic actions",
                    "ابدأ بخطوات صغيرة قابلة للتنفيذ"
                  )}
                </h2>

                <div className="ohTimeline">
                  {sevenDayPlan.map((item) => (
                    <div className="ohTimelineItem" key={item}>
                      <span className="ohTimelineDot" />
                      <p className="ohTimelineTitle">{item}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="ohCard">
                <p className="ohMetricLabel">
                  {text("30-Day Improvement Roadmap", "خريطة 30 يوم")}
                </p>
                <h2 className="ohCardTitle">
                  {text("From data to follow-up", "من البيانات إلى المتابعة")}
                </h2>

                <div className="ohTimeline">
                  {thirtyDayRoadmap.map((item) => (
                    <div className="ohTimelineItem" key={item}>
                      <span className="ohTimelineDot" />
                      <p className="ohTimelineTitle">{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="ohGrid cols2">
              <article className="ohCard">
                <p className="ohMetricLabel">
                  {text("90-Day Health Strategy", "استراتيجية 90 يوم")}
                </p>
                <h2 className="ohCardTitle">
                  {text(
                    "From follow-up to sustained improvement",
                    "من المتابعة إلى التحسن المستمر"
                  )}
                </h2>

                <div className="ohTimeline">
                  {ninetyDayStrategy.map((item) => (
                    <div className="ohTimelineItem" key={item}>
                      <span className="ohTimelineDot" />
                      <p className="ohTimelineTitle">{item}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="ohCard">
                <p className="ohMetricLabel">
                  {text("Doctor Discussion Guide", "أسئلة للطبيب")}
                </p>
                <h2 className="ohCardTitle">
                  {text(
                    "Turn your plan into a clear medical conversation",
                    "حوّل الخطة إلى حوار طبي واضح"
                  )}
                </h2>

                <div className="ohTimeline">
                  {doctorDiscussionQuestions.map((item) => (
                    <div className="ohTimelineItem" key={item}>
                      <span className="ohTimelineDot" />
                      <p className="ohTimelineTitle">{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Printable Plan Summary", "نسخة قابلة للطباعة")}
                  </p>

                  <h2 className="ohCardTitle">
                    {text(
                      "Practical health plan summary",
                      "ملخص عملي للخطة الصحية"
                    )}
                  </h2>

                  <p className="ohCardText">
                    {text(
                      "Use this summary for personal review or to discuss with your doctor. You can print it or save it as a PDF from the browser.",
                      "استخدم هذه النسخة للمراجعة الشخصية أو لمناقشتها مع الطبيب. يمكن طباعتها أو حفظها كملف PDF من المتصفح."
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className="primaryBtn healthPlanNoPrint"
                  onClick={() => window.print()}
                >
                  {text("Print Plan", "طباعة الخطة")}
                </button>
              </div>

              <div className="ohMetricGrid">
                <article className="ohMetricCard">
                  <span className="ohMetricLabel">
                    {text("Health Priority", "الأولوية الصحية")}
                  </span>
                  <span className="ohMetricValue">{priorityOrganDisplay}</span>
                </article>

                <article className="ohMetricCard">
                  <span className="ohMetricLabel">
                    {text("Plan Readiness", "جاهزية الخطة")}
                  </span>
                  <span className="ohMetricValue">{planReadinessScore}%</span>
                </article>

                <article className="ohMetricCard">
                  <span className="ohMetricLabel">
                    {text("Follow-up Level", "مستوى المتابعة")}
                  </span>
                  <span className="ohMetricValue" style={{ fontSize: "1.2rem" }}>
                    {planIntensity}
                  </span>
                </article>

                <article className="ohMetricCard">
                  <span className="ohMetricLabel">
                    {text("Risk Level", "مستوى الخطورة")}
                  </span>
                  <span className="ohMetricValue" style={{ fontSize: "1.2rem" }}>
                    {riskLevelDisplay}
                  </span>
                </article>
              </div>
            </section>

            <section
              className="healthPlanPrintOnly"
              dir={isArabic ? "rtl" : "ltr"}
              lang={isArabic ? "ar" : "en"}
              aria-hidden="true"
            >
              <div>
                <div className="healthPlanPrintHeader">
                  <p>OrganHeal AI</p>
                  <h1>
                    {isArabic
                      ? `خطة ${priorityOrganDisplay} الشخصية`
                      : `${priorityOrgan} Personal Health Plan`}
                  </h1>
                  <p>
                    {text(
                      "Printable plan summary for review or PDF saving",
                      "نسخة منظمة للطباعة أو الحفظ كملف PDF"
                    )}
                  </p>
                </div>

                <div className="healthPlanPrintGrid">
                  <div className="healthPlanPrintBox">
                    <span>{text("Health priority", "الأولوية الصحية")}</span>
                    <strong>{priorityOrganDisplay}</strong>
                  </div>

                  <div className="healthPlanPrintBox">
                    <span>{text("Plan readiness", "جاهزية الخطة")}</span>
                    <strong>{planReadinessScore}%</strong>
                  </div>

                  <div className="healthPlanPrintBox">
                    <span>{text("Follow-up level", "مستوى المتابعة")}</span>
                    <strong>{planIntensity}</strong>
                  </div>

                  <div className="healthPlanPrintBox">
                    <span>{text("Follow-up rhythm", "إيقاع المتابعة")}</span>
                    <strong>{followUpRhythm}</strong>
                  </div>

                  <div className="healthPlanPrintBox">
                    <span>{text("Completed tasks", "المهام المكتملة")}</span>
                    <strong>
                      {completedTaskCount}/{totalTasks}
                    </strong>
                  </div>

                  <div className="healthPlanPrintBox">
                    <span>{text("Risk level", "مستوى الخطورة")}</span>
                    <strong>{riskLevelDisplay}</strong>
                  </div>
                </div>

                {[
                  {
                    title: text("Next best action", "الخطوة التالية"),
                    items: [nextBestAction.description],
                  },
                  {
                    title: text("Action tasks", "مهام المتابعة"),
                    items: planTasks.slice(0, 8),
                  },
                  {
                    title: text("7-Day plan", "خطة 7 أيام"),
                    items: sevenDayPlan,
                  },
                  {
                    title: text("30-Day roadmap", "خريطة 30 يوم"),
                    items: thirtyDayRoadmap,
                  },
                  {
                    title: text("90-Day strategy", "استراتيجية 90 يوم"),
                    items: ninetyDayStrategy,
                  },
                  {
                    title: text("Doctor discussion guide", "أسئلة للطبيب"),
                    items: doctorDiscussionQuestions,
                  },
                ].map((section) => (
                  <div className="healthPlanPrintSection" key={section.title}>
                    <h2>{section.title}</h2>
                    <ul>
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}

                <p className="healthPlanPrintNote">
                  {text(
                    "Note: This plan is educational and organizational. It does not replace medical evaluation or treatment. Consult a licensed healthcare professional for concerning symptoms or abnormal results.",
                    "تنبيه: هذه الخطة تعليمية وتنظيمية ولا تستبدل تقييم الطبيب أو العلاج الطبي. راجع مقدم رعاية صحية عند وجود أعراض مقلقة أو نتائج غير طبيعية."
                  )}
                </p>
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
                  "This plan is educational and organizational. It does not diagnose disease, prescribe treatment, or replace medical care. Seek urgent care for severe symptoms or emergency warning signs.",
                  "هذه الخطة تعليمية وتنظيمية. لا تشخص المرض ولا تصف العلاج ولا تستبدل الرعاية الطبية. اطلب رعاية عاجلة عند وجود أعراض شديدة أو علامات طارئة."
                )}
              </div>
            </section>

            <section className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Continue the Journey", "استمرار الرحلة")}
                  </p>

                  <h2 className="ohCardTitle">
                    {text("Review, update, and reassess", "راجع، حدّث، وكرر")}
                  </h2>

                  <p className="ohCardText">
                    {pendingExtractionCount > 0
                      ? text(
                          "Some reports are pending extraction. Run extraction or open Intelligence Center.",
                          "يوجد تقارير بانتظار الاستخراج. شغّل الاستخراج أو افتح مركز الذكاء."
                        )
                      : text(
                          "Keep updating check-ins and reviewing Health History.",
                          "استمر في تحديث Check-Ins ومراجعة Health History."
                        )}
                  </p>
                </div>
              </div>

              <div className="ohButtonRow">
                <Link href="/checkin" className="primaryBtn">
                  {text("Check-In", "التحديث الصحي")}
                </Link>

                <Link href="/history" className="secondaryBtn">
                  {text("History", "التاريخ")}
                </Link>

                <Link href="/doctor-portal" className="secondaryBtn">
                  {text("Doctor Portal", "بوابة الطبيب")}
                </Link>

                <Link href="/dashboard" className="secondaryBtn">
                  {text("Dashboard", "لوحة التحكم")}
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

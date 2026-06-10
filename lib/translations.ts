export type Language = "en" | "ar";

export const translations = {
  en: {
    common: {
      appName: "OrganHeal",
      dashboard: "Dashboard",
      assessment: "Assessment",
      checkIn: "Daily Check-In",
      report: "Report",
      healthPlan: "Health Plan",
      assistant: "AI Assistant",
      startAssessment: "Start Assessment",
      openDashboard: "Open Dashboard",
      medicalDisclaimer:
        "OrganHeal is designed for education, wellness tracking, and health awareness. It does not diagnose disease, replace a licensed healthcare professional, or provide emergency medical advice.",
    },

    home: {
      badge: "AI-Powered Health Intelligence Platform",
      title: "OrganHeal",
      tagline: "Turn health data into clear, actionable insight.",
      description:
        "OrganHeal helps you track organ wellness, understand lab results, monitor daily health patterns, generate professional reports, and follow personalized improvement plans.",
      whyTitle: "One platform for health awareness, trends, and action",
      ctaTitle: "Start building your health intelligence profile",
      ctaDescription:
        "Complete your first assessment, track your daily wellness, and unlock your personalized dashboard.",
    },

    dashboard: {
      badge: "ORGANHEAL DASHBOARD",
      title: "Dashboard Intelligence",
      description:
        "A focused overview of your health intelligence, daily wellness, and next recommended action.",
      notifications: "Health Notifications",
      onboarding: "Welcome to OrganHeal",
    },

    assistant: {
      badge: "ORGANHEAL AI ASSISTANT",
      title: "Health Intelligence Assistant",
      description:
        "Ask educational health questions, understand organ health signals, and prepare better conversations with healthcare professionals.",
    },

    report: {
      badge: "ORGAN HEALTH REPORT",
      title: "Your Organ Health Report",
      description:
        "This report summarizes your saved organ assessments, lab analyzer score, and daily wellness data from OrganHeal.",
      download: "Download Professional PDF Report v2",
    },
  },

  ar: {
    common: {
      appName: "أورغان هيل",
      dashboard: "لوحة التحكم",
      assessment: "التقييم",
      checkIn: "التسجيل الصحي اليومي",
      report: "التقرير",
      healthPlan: "الخطة الصحية",
      assistant: "المساعد الذكي",
      startAssessment: "ابدأ التقييم",
      openDashboard: "افتح لوحة التحكم",
      medicalDisclaimer:
        "تم تصميم OrganHeal للتعليم، وتتبع العافية، وزيادة الوعي الصحي. لا يشخص الأمراض، ولا يستبدل الطبيب المرخص، ولا يقدم نصائح طبية طارئة.",
    },

    home: {
      badge: "منصة ذكاء صحي مدعومة بالذكاء الاصطناعي",
      title: "OrganHeal",
      tagline: "حوّل بياناتك الصحية إلى فهم واضح وخطوات عملية.",
      description:
        "يساعدك OrganHeal على متابعة صحة الأعضاء، فهم نتائج المختبر، مراقبة نمط الصحة اليومي، إنشاء تقارير احترافية، واتباع خطط تحسين شخصية.",
      whyTitle: "منصة واحدة للوعي الصحي، تتبع الاتجاهات، واتخاذ القرار",
      ctaTitle: "ابدأ بناء ملفك الصحي الذكي",
      ctaDescription:
        "أكمل أول تقييم، تابع صحتك اليومية، وافتح لوحة التحكم الشخصية.",
    },

    dashboard: {
      badge: "لوحة تحكم OrganHeal",
      title: "ذكاء لوحة التحكم",
      description:
        "نظرة مركزة على ذكائك الصحي، العافية اليومية، والخطوة التالية الموصى بها.",
      notifications: "الإشعارات الصحية",
      onboarding: "مرحبًا بك في OrganHeal",
    },

    assistant: {
      badge: "مساعد OrganHeal الذكي",
      title: "مساعد الذكاء الصحي",
      description:
        "اسأل أسئلة صحية تعليمية، وافهم مؤشرات صحة الأعضاء، واستعد بشكل أفضل للنقاش مع المختصين الصحيين.",
    },

    report: {
      badge: "تقرير صحة الأعضاء",
      title: "تقرير صحة الأعضاء الخاص بك",
      description:
        "يلخص هذا التقرير تقييمات الأعضاء المحفوظة، ونتيجة تحليل المختبر، وبيانات العافية اليومية من OrganHeal.",
      download: "تحميل التقرير الصحي الاحترافي v2",
    },
  },
} as const;

export function getTranslations(language: Language) {
  return translations[language];
}
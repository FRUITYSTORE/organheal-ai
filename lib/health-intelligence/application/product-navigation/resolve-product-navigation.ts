import type {
  ProductNavigationAction,
  ProductNavigationConfidence,
  ProductNavigationDestination,
  ProductNavigationDetection,
} from "./product-navigation.types";

type NavigationRule = {
  destination: ProductNavigationDestination;
  priority: number;
  phrases: string[];
};

const NAVIGATION_RULES: NavigationRule[] = [
  {
    destination: "upload-report",
    priority: 100,
    phrases: [
      "upload report",
      "upload a report",
      "upload my report",
      "add report",
      "add a report",
      "attach report",
      "attach a report",
      "رفع تقرير",
      "ارفع تقرير",
      "أرفع تقرير",
      "اضافة تقرير",
      "إضافة تقرير",
      "ارفاق تقرير",
      "إرفاق تقرير",
    ],
  },
  {
    destination: "view-results",
    priority: 95,
    phrases: [
      "view my results",
      "see my results",
      "show my results",
      "where are my results",
      "where is my result",
      "my analysis",
      "analysis result",
      "analysis results",
      "نتيجتي",
      "نتائجي",
      "نتيجة التحليل",
      "نتائج التحليل",
      "وين النتيجة",
      "أين النتيجة",
      "اين النتيجة",
      "وين نتائجي",
      "أين نتائجي",
      "اين نتائجي",
    ],
  },
  {
    destination: "health-plan",
    priority: 90,
    phrases: [
      "health plan",
      "my health plan",
      "open my plan",
      "show my plan",
      "my plan",
      "خطة الصحة",
      "خطتي الصحية",
      "خطتي",
      "افتح خطتي",
      "أفتح خطتي",
    ],
  },
  {
    destination: "reports",
    priority: 85,
    phrases: [
      "my reports",
      "reports library",
      "view reports",
      "open reports",
      "تقاريري",
      "مكتبة التقارير",
      "عرض التقارير",
      "افتح التقارير",
    ],
  },
  {
    destination: "doctor-prep",
    priority: 80,
    phrases: [
      "doctor preparation",
      "prepare for doctor",
      "prepare for my doctor",
      "doctor brief",
      "prepare for appointment",
      "تحضير للطبيب",
      "التحضير للطبيب",
      "جهزني للطبيب",
      "حضّرني للطبيب",
      "ملخص للطبيب",
    ],
  },
  {
    destination: "learning",
    priority: 75,
    phrases: [
      "learn",
      "learn more",
      "health learning",
      "medical articles",
      "health articles",
      "educational videos",
      "medical videos",
      "تعلم",
      "أتعلم",
      "اريد ان اتعلم",
      "أريد أن أتعلم",
      "مقالات طبية",
      "فيديوهات طبية",
      "فيديو طبي",
    ],
  },
  {
    destination: "communication-settings",
    priority: 70,
    phrases: [
      "communication settings",
      "contact preferences",
      "notification settings",
      "message preferences",
      "whatsapp settings",
      "email settings",
      "اعدادات التواصل",
      "إعدادات التواصل",
      "تفضيلات التواصل",
      "اعدادات الاشعارات",
      "إعدادات الإشعارات",
      "اعدادات الواتساب",
      "إعدادات الواتساب",
    ],
  },
  {
    destination: "profile",
    priority: 60,
    phrases: [
      "my profile",
      "open profile",
      "profile settings",
      "ملفي الشخصي",
      "افتح ملفي",
      "أفتح ملفي",
      "الملف الشخصي",
    ],
  },
];

const NAVIGATION_ACTIONS: Record<
  ProductNavigationDestination,
  ProductNavigationAction
> = {
  "upload-report": {
    destination: "upload-report",
    href: "/lab-upload",
    label: {
      en: "Upload a Medical Report",
      ar: "رفع تقرير طبي",
    },
  },

  "view-results": {
    destination: "view-results",
    href: "/intelligence",
    label: {
      en: "View My Results",
      ar: "عرض نتائجي",
    },
  },

  "health-plan": {
    destination: "health-plan",
    href: "/health-plan",
    label: {
      en: "Open My Health Plan",
      ar: "فتح خطتي الصحية",
    },
  },

  reports: {
    destination: "reports",
    href: "/reports",
    label: {
      en: "Open My Reports",
      ar: "فتح تقاريري",
    },
  },

  learning: {
    destination: "learning",
    href: "/library",
    label: {
      en: "Open Health Learning",
      ar: "فتح التعلّم الصحي",
    },
  },

  "doctor-prep": {
    destination: "doctor-prep",
    href: "/library/doctor-prep",
    label: {
      en: "Prepare for My Doctor",
      ar: "التحضير للطبيب",
    },
  },

  profile: {
    destination: "profile",
    href: "/profile",
    label: {
      en: "Open My Profile",
      ar: "فتح ملفي الشخصي",
    },
  },

  "communication-settings": {
    destination: "communication-settings",
    href: "/settings/communications",
    label: {
      en: "Communication Settings",
      ar: "إعدادات التواصل",
    },
  },
};

function normalizeMessage(message: string) {
  return message
    .toLocaleLowerCase()
    .replace(/[؟?!.،,:;()[\]{}"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getConfidence(
  matchedPhrases: string[]
): ProductNavigationConfidence {
  if (matchedPhrases.length >= 2) {
    return "high";
  }

  if (matchedPhrases.length === 1) {
    return "medium";
  }

  return "low";
}

export function resolveProductNavigation(
  message: string
): ProductNavigationDetection {
  const normalizedMessage = normalizeMessage(message);

  if (!normalizedMessage) {
    return {
      matched: false,
      destination: null,
      confidence: "low",
      matchedKeywords: [],
    };
  }

  const matches = NAVIGATION_RULES.map((rule) => {
    const matchedPhrases = rule.phrases.filter((phrase) =>
      normalizedMessage.includes(normalizeMessage(phrase))
    );

    return {
      ...rule,
      matchedPhrases,
    };
  })
    .filter((rule) => rule.matchedPhrases.length > 0)
    .sort((first, second) => {
      if (
        second.matchedPhrases.length !==
        first.matchedPhrases.length
      ) {
        return (
          second.matchedPhrases.length -
          first.matchedPhrases.length
        );
      }

      return second.priority - first.priority;
    });

  const bestMatch = matches[0];

  if (!bestMatch) {
    return {
      matched: false,
      destination: null,
      confidence: "low",
      matchedKeywords: [],
    };
  }

  return {
    matched: true,
    destination: bestMatch.destination,
    confidence: getConfidence(bestMatch.matchedPhrases),
    matchedKeywords: bestMatch.matchedPhrases,
  };
}

export function getProductNavigationAction(
  destination: ProductNavigationDestination
): ProductNavigationAction {
  return NAVIGATION_ACTIONS[destination];
}
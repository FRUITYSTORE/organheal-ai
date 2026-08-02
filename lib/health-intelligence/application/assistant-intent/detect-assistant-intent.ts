import type {
  AssistantIntent,
  AssistantIntentConfidence,
  AssistantIntentDetection,
} from "./assistant-intent.types";

type IntentRule = {
  intent: AssistantIntent;
  priority: number;
  keywords: string[];
};

const INTENT_RULES: IntentRule[] = [
  {
    intent: "cause-reasoning",
    priority: 100,
    keywords: [
      "why",
      "cause",
      "caused",
      "reason",
      "because",
      "what caused",
      "why is",
      "لماذا",
      "السبب",
      "سبب",
      "ما سبب",
      "ما الذي سبب",
    ],
  },
  {
    intent: "doctor",
    priority: 90,
    keywords: [
      "doctor",
      "clinician",
      "visit",
      "appointment",
      "doctor brief",
      "what should i discuss",
      "what should i ask",
      "طبيب",
      "الدكتور",
      "دكتور",
      "موعد",
      "زيارة الطبيب",
      "ملخص الطبيب",
      "ماذا أناقش",
      "ماذا أسأل",
    ],
  },
  {
    intent: "report",
    priority: 80,
    keywords: [
      "report",
      "lab",
      "laboratory",
      "result",
      "results",
      "finding",
      "findings",
      "abnormal",
      "reference range",
      "تقرير",
      "تقارير",
      "فحص",
      "فحوصات",
      "تحليل مختبر",
      "نتيجة",
      "نتائج",
      "غير طبيعي",
      "القيم المرجعية",
    ],
  },
  {
    intent: "next-step",
    priority: 70,
    keywords: [
      "next step",
      "what should i do",
      "what do i do",
      "next action",
      "recommended action",
      "recommendation",
      "recommendations",
      "الخطوة التالية",
      "ماذا أفعل",
      "ما الذي أفعله",
      "الإجراء التالي",
      "التوصية",
      "توصيات",
    ],
  },
  {
    intent: "risk",
    priority: 60,
    keywords: [
      "risk",
      "risk pattern",
      "risk level",
      "danger",
      "likelihood",
      "probability",
      "مخاطر",
      "الخطر",
      "نمط المخاطر",
      "مستوى الخطورة",
      "احتمال",
    ],
  },
  {
    intent: "health-age",
    priority: 50,
    keywords: [
      "health age",
      "biological age",
      "body age",
      "العمر الصحي",
      "العمر البيولوجي",
      "عمر الجسم",
    ],
  },
  {
    intent: "improvement",
    priority: 40,
    keywords: [
      "improve",
      "improvement",
      "get better",
      "increase my score",
      "improve my health",
      "تحسين",
      "أتحسن",
      "أتطور",
      "رفع الدرجة",
      "تحسين صحتي",
    ],
  },
  {
    intent: "score",
    priority: 30,
    keywords: [
      "score",
      "health score",
      "overall score",
      "low score",
      "high score",
      "درجة",
      "الدرجة الصحية",
      "المؤشر الصحي",
      "درجة منخفضة",
      "درجة مرتفعة",
    ],
  },
];

function normalizeMessage(message: string) {
  return message
    .toLocaleLowerCase()
    .replace(/[؟?!.،,:;()[\]{}"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchedKeywords(
  normalizedMessage: string,
  keywords: string[]
) {
  return keywords.filter((keyword) =>
    normalizedMessage.includes(
      normalizeMessage(keyword)
    )
  );
}

function getConfidence(
  matchedKeywords: string[]
): AssistantIntentConfidence {
  if (matchedKeywords.length >= 2) {
    return "high";
  }

  if (matchedKeywords.length === 1) {
    return "medium";
  }

  return "low";
}

export function detectAssistantIntent(
  message: string
): AssistantIntentDetection {
  const normalizedMessage =
    normalizeMessage(message);

  if (!normalizedMessage) {
    return {
      intent: "general",
      confidence: "low",
      matchedKeywords: [],
    };
  }

  const matches = INTENT_RULES.map((rule) => {
    const matchedKeywords =
      findMatchedKeywords(
        normalizedMessage,
        rule.keywords
      );

    return {
      ...rule,
      matchedKeywords,
    };
  })
    .filter(
      (rule) =>
        rule.matchedKeywords.length > 0
    )
    .sort((first, second) => {
      if (
        second.matchedKeywords.length !==
        first.matchedKeywords.length
      ) {
        return (
          second.matchedKeywords.length -
          first.matchedKeywords.length
        );
      }

      return second.priority - first.priority;
    });

  const bestMatch = matches[0];

  if (!bestMatch) {
    return {
      intent: "general",
      confidence: "low",
      matchedKeywords: [],
    };
  }

  return {
    intent: bestMatch.intent,
    confidence: getConfidence(
      bestMatch.matchedKeywords
    ),
    matchedKeywords:
      bestMatch.matchedKeywords,
  };
}
export type ClinicalIntent =
  | "compare_latest_reports"
  | "what_changed_between_reports"
  | "clinical_changes"
  | "report_progress"
  | "unknown";

export type ClinicalIntentConfidence =
  | "high"
  | "medium"
  | "low";

export type ClinicalIntentDetection = {
  intent:
    ClinicalIntent;

  confidence:
    ClinicalIntentConfidence;

  matchedKeywords:
    string[];
};

type ClinicalIntentRule = {
  intent:
    Exclude<
      ClinicalIntent,
      "unknown"
    >;

  confidence:
    Exclude<
      ClinicalIntentConfidence,
      "low"
    >;

  keywords:
    string[];
};

const CLINICAL_INTENT_RULES:
  ClinicalIntentRule[] = [
    {
      intent:
        "compare_latest_reports",

      confidence:
        "high",

      keywords: [
        "compare my latest reports",
        "compare my last two reports",
        "compare the latest two reports",
        "compare my two latest reports",
        "compare my reports",
        "قارن آخر تقريرين",
        "قارن بين آخر تقريرين",
        "قارن أحدث تقريرين",
        "قارن تقاريري",
      ],
    },

    {
      intent:
        "what_changed_between_reports",

      confidence:
        "high",

      keywords: [
        "what changed between my reports",
        "what changed between the reports",
        "what is different between my reports",
        "differences between my latest reports",
        "what changed from the previous report",
        "ما الذي تغير بين تقاريري",
        "ماذا تغير بين التقريرين",
        "ما الفرق بين آخر تقريرين",
        "ما الذي اختلف بين التقريرين",
        "ماذا تغير عن التقرير السابق",
      ],
    },

    {
      intent:
        "report_progress",

      confidence:
        "medium",

      keywords: [
        "did my reports improve",
        "did anything improve",
        "did my condition improve",
        "am i improving",
        "report progress",
        "progress between reports",
        "هل تحسنت تقاريري",
        "هل يوجد تحسن",
        "هل تحسنت حالتي",
        "هل أنا أتحسن",
        "التقدم بين التقارير",
      ],
    },

    {
      intent:
        "clinical_changes",

      confidence:
        "medium",

      keywords: [
        "what changed clinically",
        "clinical changes",
        "latest clinical changes",
        "what changed medically",
        "medical changes",
        "ما الذي تغير سريريًا",
        "ما التغيرات السريرية",
        "ما الذي تغير طبيًا",
        "التغيرات الطبية",
      ],
    },
  ];

function normalizeMessage(
  message: string
): string {
  return message
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findMatchedKeywords(
  normalizedMessage: string,
  keywords: string[]
): string[] {
  return keywords.filter(
    (keyword) =>
      normalizedMessage.includes(
        keyword.toLowerCase()
      )
  );
}

export function detectClinicalIntent(
  message: string
): ClinicalIntentDetection {
  const normalizedMessage =
    normalizeMessage(message);

  for (
    const rule of
    CLINICAL_INTENT_RULES
  ) {
    const matchedKeywords =
      findMatchedKeywords(
        normalizedMessage,
        rule.keywords
      );

    if (
      matchedKeywords.length > 0
    ) {
      return {
        intent:
          rule.intent,

        confidence:
          rule.confidence,

        matchedKeywords,
      };
    }
  }

  return {
    intent:
      "unknown",

    confidence:
      "low",

    matchedKeywords:
      [],
  };
}
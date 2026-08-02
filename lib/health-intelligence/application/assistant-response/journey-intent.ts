export type JourneyIntent =
  | "after_latest_report"
  | "recent_change"
  | "journey_summary"
  | "last_update"
  | "unknown";

export type JourneyIntentConfidence =
  | "high"
  | "medium"
  | "low";

export type JourneyIntentDetection = {
  intent:
    JourneyIntent;

  confidence:
    JourneyIntentConfidence;

  matchedKeywords:
    string[];
};

type JourneyIntentRule = {
  intent:
    Exclude<
      JourneyIntent,
      "unknown"
    >;

  confidence:
    Exclude<
      JourneyIntentConfidence,
      "low"
    >;

  keywords:
    string[];
};

const JOURNEY_INTENT_RULES:
  JourneyIntentRule[] = [
    {
      intent:
        "after_latest_report",

      confidence:
        "high",

      keywords: [
        "what changed after my latest report",
        "what changed after the latest report",
        "what happened after my latest report",
        "what happened after the latest report",
        "since my latest report",
        "since the latest report",
        "after my report",
        "after the report",
        "ما الذي تغير بعد أحدث تقرير",
        "ماذا تغير بعد أحدث تقرير",
        "ما الذي حدث بعد أحدث تقرير",
        "ماذا حدث بعد أحدث تقرير",
        "منذ أحدث تقرير",
        "بعد تقريري",
        "بعد التقرير",
      ],
    },

    {
      intent:
        "last_update",

      confidence:
        "high",

      keywords: [
        "when was my last update",
        "when was the last update",
        "date of my last update",
        "latest update date",
        "when did my journey last update",
        "متى كان آخر تحديث",
        "ما تاريخ آخر تحديث",
        "تاريخ آخر تحديث",
        "متى تم آخر تحديث",
      ],
    },

    {
      intent:
        "recent_change",

      confidence:
        "high",

      keywords: [
        "what changed recently",
        "what's changed recently",
        "what changed",
        "recent changes",
        "latest change",
        "latest health change",
        "what happened recently",
        "آخر تغيير",
        "ما آخر تغيير",
        "ماذا تغير",
        "ما الذي تغير",
        "ما الجديد",
        "ماذا حدث مؤخرًا",
      ],
    },

    {
      intent:
        "journey_summary",

      confidence:
        "medium",

      keywords: [
        "show my health journey",
        "show my journey",
        "summarize my health journey",
        "summarize my journey",
        "health journey summary",
        "my health journey",
        "my journey",
        "اعرض رحلتي الصحية",
        "لخص رحلتي الصحية",
        "ملخص رحلتي الصحية",
        "رحلتي الصحية",
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

export function detectJourneyIntent(
  message: string
): JourneyIntentDetection {
  const normalizedMessage =
    normalizeMessage(message);

  for (
    const rule of
    JOURNEY_INTENT_RULES
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
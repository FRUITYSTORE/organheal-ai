export type ClinicalUrgencyLanguage =
  | "en"
  | "ar";

export type ClinicalUrgencyLevel =
  | "none"
  | "urgent"
  | "emergency";

export type ClinicalUrgencyAssessment = {
  level:
    ClinicalUrgencyLevel;

  matchedSignalIds:
    string[];

  response:
    string | null;

  reason:
    string | null;
};

type ClinicalUrgencyInput = {
  message:
    string;

  language?:
    ClinicalUrgencyLanguage;
};

type UrgencySignal = {
  id:
    string;

  level:
    Exclude<
      ClinicalUrgencyLevel,
      "none"
    >;

  patterns:
    RegExp[];
};

const URGENCY_SIGNALS:
  UrgencySignal[] = [
    {
      id:
        "chest-pain",

      level:
        "emergency",

      patterns: [
        /\b(?:chest pain|chest pressure|chest tightness|chest squeezing|chest discomfort)\b/i,
        /(?:ألم|الم|ضغط|ضيق|ثقل).{0,12}(?:الصدر|صدري)/,
      ],
    },

    {
      id:
        "severe-breathing-difficulty",

      level:
        "emergency",

      patterns: [
        /\b(?:severe shortness of breath|severe difficulty breathing|cannot breathe|can't breathe|unable to breathe)\b/i,
        /(?:ضيق شديد في التنفس|صعوبة شديدة في التنفس|لا أستطيع التنفس|لا استطيع التنفس)/,
      ],
    },

    {
      id:
        "stroke-warning-sign",

      level:
        "emergency",

      patterns: [
        /\b(?:face droop|facial droop|slurred speech|unable to speak)\b/i,
        /\bsudden(?:ly)?\b.{0,35}\b(?:weakness|numbness|confusion|trouble speaking|vision loss|severe headache|loss of balance)\b/i,
        /(?:تدلي الوجه|تدلي جانب من الوجه|ثقل الكلام|تلعثم مفاجئ|ضعف مفاجئ|خدر مفاجئ|ارتباك مفاجئ|فقدان مفاجئ للرؤية)/,
      ],
    },

    {
      id:
        "unresponsive-or-not-breathing",

      level:
        "emergency",

      patterns: [
        /\b(?:unresponsive|not breathing|no normal breathing|cannot be woken)\b/i,
        /(?:لا يستجيب|فاقد الوعي ولا يستجيب|لا يتنفس|لا يوجد تنفس طبيعي)/,
      ],
    },

    {
      id:
        "severe-abdominal-pain",

      level:
        "emergency",

      patterns: [
        /\b(?:sudden severe abdominal pain|sudden severe stomach pain|severe abdominal pain|severe stomach pain)\b/i,
        /(?:ألم شديد مفاجئ في البطن|الم شديد مفاجئ في البطن|ألم شديد في البطن|الم شديد في البطن)/,
      ],
    },

    {
      id:
        "worsening-abdominal-pain",

      level:
        "urgent",

      patterns: [
        /\b(?:abdominal|stomach|tummy) pain\b.{0,35}\b(?:worsening|getting worse|not going away|persistent)\b/i,
        /(?:ألم|الم).{0,12}(?:البطن|المعدة).{0,35}(?:يزداد|يسوء|لا يختفي|مستمر)/,
      ],
    },
  ];

 function isCauseQuestion(
  message:
    string
): boolean {
  const normalized =
    message
      .trim()
      .toLowerCase();

  return (
    normalized.includes(
      "why am i having"
    ) ||
    normalized.includes(
      "why do i have"
    ) ||
    normalized.includes(
      "why have i been having"
    ) ||
    normalized.includes(
      "what causes"
    ) ||
    normalized.includes(
      "what could cause"
    ) ||
    normalized.includes(
      "what is causing"
    ) ||
    normalized.includes(
      "ما سبب"
    ) ||
    normalized.includes(
      "لماذا أعاني"
    ) ||
    normalized.includes(
      "لماذا اعاني"
    ) ||
    normalized.includes(
      "ما الذي يسبب"
    ) ||
    normalized.includes(
      "ما أسباب"
    ) ||
    normalized.includes(
      "ما اسباب"
    )
  );
}

function findMatchedSignals(
  message:
    string
): UrgencySignal[] {
  const causeQuestion =
    isCauseQuestion(
      message
    );

  return URGENCY_SIGNALS.filter(
    (signal) => {
      if (
        causeQuestion &&
        signal.id ===
          "chest-pain"
      ) {
        return false;
      }

      return signal.patterns.some(
        (pattern) =>
          pattern.test(
            message
          )
      );
    }
  );
}

function getEmergencyResponse(
  language:
    ClinicalUrgencyLanguage
): string {
  return language ===
    "ar"
    ? "تتضمن رسالتك علامة تحذيرية محتملة قد تحتاج إلى تقييم طارئ. لا يستطيع OrganHeal تحديد السبب هنا. تواصل مع خدمة الطوارئ الطبية المحلية الآن أو اطلب تقييماً في قسم الطوارئ فوراً، ولا تؤخر طلب المساعدة لمتابعة المحادثة."
    : "Your message includes a possible emergency warning sign. OrganHeal cannot determine the cause here. Contact your local emergency medical service now or seek immediate evaluation in an emergency department. Do not delay getting help to continue this chat.";
}

function getUrgentResponse(
  language:
    ClinicalUrgencyLanguage
): string {
  return language ===
    "ar"
    ? "تتضمن رسالتك عرضاً يحتاج إلى تقييم طبي عاجل. يُنصح بالحصول على تقييم طبي سريع، وإذا أصبح العرض شديداً أو تدهور بسرعة أو ظهرت علامات طارئة فاطلب خدمة الطوارئ فوراً."
    : "Your message includes a symptom that needs prompt medical assessment. Please seek urgent medical evaluation. If it becomes severe, worsens rapidly, or emergency warning signs develop, contact emergency medical services immediately.";
}

export function assessClinicalUrgency({
  message,
  language = "en",
}: ClinicalUrgencyInput):
  ClinicalUrgencyAssessment {
  const normalizedMessage =
    message.trim();

  if (!normalizedMessage) {
    return {
      level:
        "none",

      matchedSignalIds:
        [],

      response:
        null,

      reason:
        null,
    };
  }

  const matchedSignals =
    findMatchedSignals(
      normalizedMessage
    );

  const emergencySignals =
    matchedSignals.filter(
      (signal) =>
        signal.level ===
        "emergency"
    );

  if (
    emergencySignals.length >
    0
  ) {
    return {
      level:
        "emergency",

      matchedSignalIds:
        emergencySignals.map(
          (signal) =>
            signal.id
        ),

      response:
        getEmergencyResponse(
          language
        ),

      reason:
        "A conservative emergency warning-signal rule matched the current user message.",
    };
  }

  const urgentSignals =
    matchedSignals.filter(
      (signal) =>
        signal.level ===
        "urgent"
    );

  if (
    urgentSignals.length >
    0
  ) {
    return {
      level:
        "urgent",

      matchedSignalIds:
        urgentSignals.map(
          (signal) =>
            signal.id
        ),

      response:
        getUrgentResponse(
          language
        ),

      reason:
        "A conservative urgent-review rule matched the current user message.",
    };
  }

  return {
    level:
      "none",

    matchedSignalIds:
      [],

    response:
      null,

    reason:
      null,
  };
}
export type ClinicalConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StructuredClinicalEvidence = {
  symptoms: string[];
  onset: string | null;
  severity: string | null;
  associatedSymptoms: string[];
  associatedSymptomsKnown: boolean;
};

function extractStructuredClinicalEvidence(
  evidence: string | null
): StructuredClinicalEvidence {
  if (!evidence) {
    return {
      symptoms: [],
      onset: null,
      severity: null,
      associatedSymptoms: [],
      associatedSymptomsKnown: false,
    };
  }

  const normalized =
    evidence.toLowerCase().trim();

  const symptoms: string[] = [];

  const symptomPatterns: Array<{
    label: string;
    patterns: string[];
  }> = [
    {
      label: "dizziness",
      patterns: [
        "dizziness",
        "dizzy",
        "lightheaded",
        "light-headed",
        "دوخة",
        "دوار",
      ],
    },
    {
      label: "headache",
      patterns: [
        "headache",
        "head pain",
        "صداع",
        "ألم الرأس",
      ],
    },
    {
      label: "fatigue",
      patterns: [
        "fatigue",
        "tired",
        "tiredness",
        "exhausted",
        "تعب",
        "إرهاق",
      ],
    },
    {
      label: "chest pain",
      patterns: [
        "chest pain",
        "chest discomfort",
        "ألم الصدر",
        "وجع الصدر",
      ],
    },
    {
      label: "shortness of breath",
      patterns: [
        "shortness of breath",
        "difficulty breathing",
        "breathless",
        "ضيق التنفس",
        "صعوبة التنفس",
      ],
    },
    {
      label: "nausea",
      patterns: [
        "nausea",
        "nauseous",
        "غثيان",
      ],
    },
    {
      label: "vomiting",
      patterns: [
        "vomiting",
        "vomit",
        "قيء",
        "استفراغ",
      ],
    },
    {
      label: "palpitations",
      patterns: [
        "palpitations",
        "heart racing",
        "racing heart",
        "خفقان",
      ],
    },
  ];

  for (const symptom of symptomPatterns) {
    if (
      symptom.patterns.some((pattern) =>
        normalized.includes(pattern)
      )
    ) {
      symptoms.push(symptom.label);
    }
  }

  let onset: string | null = null;

  const onsetPatterns = [
    /\bsince\s+(yesterday|today|last night|this morning|this afternoon|this evening)\b/i,
    /\bfor\s+(?:the\s+)?(?:past\s+|last\s+)?\d+\s+(?:hour|hours|day|days|week|weeks|month|months)\b/i,
    /\bstarted\s+(yesterday|today|last night|this morning|this afternoon|this evening)\b/i,
    /\bbegan\s+(yesterday|today|last night|this morning|this afternoon|this evening)\b/i,
    /منذ\s+(?:أمس|اليوم|البارحة)/i,
    /منذ\s+\d+\s+(?:ساعة|ساعات|يوم|أيام|أسبوع|أسابيع|شهر|أشهر)/i,
    /بدأ(?:ت)?\s+(?:أمس|اليوم|البارحة)/i,
  ];

  for (const pattern of onsetPatterns) {
    const match = evidence.match(pattern);

    if (match) {
      onset = match[0].trim();
      break;
    }
  }

  let severity: string | null = null;

  const severityPatterns: Array<{
    label: string;
    patterns: string[];
  }> = [
    {
      label: "severe",
      patterns: [
        "severe",
        "very bad",
        "extreme",
        "شديد",
        "شديدة",
        "قوي جدا",
        "قوية جدا",
      ],
    },
    {
      label: "moderate",
      patterns: [
        "moderate",
        "متوسط",
        "متوسطة",
      ],
    },
    {
      label: "mild",
      patterns: [
        "mild",
        "slight",
        "خفيف",
        "خفيفة",
        "بسيط",
        "بسيطة",
      ],
    },
  ];

  for (const level of severityPatterns) {
    if (
      level.patterns.some((pattern) =>
        normalized.includes(pattern)
      )
    ) {
      severity = level.label;
      break;
    }
  }

  const explicitlyNoAssociatedSymptoms =
    [
      "no other symptoms",
      "no additional symptoms",
      "nothing else",
      "no",
      "لا توجد أعراض أخرى",
      "لا يوجد أعراض أخرى",
      "ما في أعراض ثانية",
      "لا",
    ].some(
      (pattern) =>
        normalized === pattern ||
        normalized.includes(pattern)
    );

  return {
    symptoms,
    onset,
    severity,
    associatedSymptoms: [],
    associatedSymptomsKnown:
      explicitlyNoAssociatedSymptoms,
  };
}

function mergeStructuredClinicalEvidence(
  evidenceItems:
    StructuredClinicalEvidence[]
): StructuredClinicalEvidence {
  const symptoms = Array.from(
    new Set(
      evidenceItems.flatMap(
        (item) => item.symptoms
      )
    )
  );

  const associatedSymptoms = Array.from(
    new Set(
      evidenceItems.flatMap(
        (item) =>
          item.associatedSymptoms
      )
    )
  );

  const associatedSymptomsKnown =
    evidenceItems.some(
      (item) =>
        item.associatedSymptomsKnown
    ) ||
    associatedSymptoms.length > 0;

  const latestOnset =
    [...evidenceItems]
      .reverse()
      .find(
        (item) =>
          Boolean(item.onset)
      )
      ?.onset || null;

  const latestSeverity =
    [...evidenceItems]
      .reverse()
      .find(
        (item) =>
          Boolean(item.severity)
      )
      ?.severity || null;

  return {
    symptoms,
    onset: latestOnset,
    severity: latestSeverity,
    associatedSymptoms,
    associatedSymptomsKnown,
  };
}

export function buildAccumulatedClinicalEvidence(
  currentEvidence: string | null,
  conversation?:
    ClinicalConversationMessage[]
): StructuredClinicalEvidence {
  const evidenceItems:
    StructuredClinicalEvidence[] = [];

  if (
    conversation &&
    conversation.length > 0
  ) {
    for (const item of conversation) {
      if (item.role !== "user") {
        continue;
      }

      evidenceItems.push(
        extractStructuredClinicalEvidence(
          item.content
        )
      );
    }
  }

  if (currentEvidence) {
    evidenceItems.push(
      extractStructuredClinicalEvidence(
        currentEvidence
      )
    );
  }

  return mergeStructuredClinicalEvidence(
    evidenceItems
  );
}
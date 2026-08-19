import type {
  ClinicalDecisionTrace,
  ClinicalDecisionTraceEvidence,
} from "@/lib/health-intelligence/engines/clinical-decision-trace.engine";

export type ClinicalNarrativeAudience = "patient" | "doctor" | "assistant";

export type ClinicalNarrativeLanguage = "en" | "ar";

export type ClinicalNarrativeInput = {
  audience: ClinicalNarrativeAudience;

  language: ClinicalNarrativeLanguage;

  decisionTrace: ClinicalDecisionTrace;
};

export type ClinicalNarrativeResult = {
  available: boolean;

  audience: ClinicalNarrativeAudience;

  language: ClinicalNarrativeLanguage;

  hypothesisId: string | null;

  title: string | null;

  summary: string | null;

  narrative: string | null;

  confidenceStatement: string | null;

  conflictStatement: string | null;

  missingEvidenceStatement: string | null;

  nextEvidenceStatement: string | null;

  safetyBoundary: string | null;

  reason: string;

  generatedAt: string;
};

function localizeSystemGeneratedClinicalText(
  value: string,
  language: ClinicalNarrativeLanguage,
): string {
  if (language !== "ar") {
    return value;
  }

  const exactTranslations:
    Record<string, string> = {
    "This generated health insight explicitly references this uploaded report.":
      "تشير هذه المعلومة الصحية المُولدة بشكل مباشر إلى هذا التقرير الطبي المرفوع.",

    "This evidence provides relevant clinical context but does not independently establish the proposed relationship.":
      "يوفر هذا الدليل سياقًا سريريًا ذا صلة، لكنه لا يثبت بمفرده العلاقة المقترحة.",

    "This weighted evidence supports evaluating the explicit clinical relationship.":
      "يدعم هذا الدليل الموزون تقييم العلاقة السريرية المحددة.",

    "This weighted evidence may weaken, limit, or provide an alternative interpretation of the relationship.":
      "قد يضعف هذا الدليل الموزون العلاقة المقترحة أو يحد منها أو يدعم تفسيرًا بديلًا لها.",

    "Clarification of the unresolved evidence conflict.":
      "توضيح التعارض غير المحسوم بين الأدلة.",

    "Additional objective clinical evidence.":
      "أدلة سريرية موضوعية إضافية.",

    "Clinical review of the supporting and contradicting evidence.":
      "مراجعة سريرية للأدلة الداعمة والمتعارضة.",
  };

  const exactTranslation =
    exactTranslations[value];

  if (exactTranslation) {
    return exactTranslation;
  }

  if (
    value.includes(
      "evidence-grounded interpretive hypothesis"
    ) &&
    value.includes(
      "not a confirmed diagnosis"
    )
  ) {
    return "هذه فرضية تفسيرية مبنية على الأدلة وليست تشخيصًا مؤكدًا. يجب مراجعتها ضمن التاريخ السريري الكامل والفحص والتقييم المهني المناسب.";
  }

  if (
    value.includes(
      "This interpretation is not a confirmed diagnosis"
    )
  ) {
    return "هذا التفسير ليس تشخيصًا مؤكدًا.";
  }

  if (
    value.includes(
      "This is not a confirmed diagnosis"
    )
  ) {
    return "هذا ليس تشخيصًا مؤكدًا.";
  }

  if (
    value.includes(
      "This interpretation is not diagnostic confirmation"
    )
  ) {
    return "هذا التفسير لا يمثل تأكيدًا تشخيصيًا.";
  }

  return value;
}

function formatEvidence(
  evidence: ClinicalDecisionTraceEvidence[],
  language: ClinicalNarrativeLanguage,
): string {
  if (evidence.length === 0) {
    return language === "ar"
      ? "لا توجد أدلة مسجلة ضمن هذه الفئة."
      : "No evidence is currently recorded in this category.";
  }

  return evidence
  .map(
    (item, index) =>
      `${index + 1}. ${localizeSystemGeneratedClinicalText(
        item.explanation,
        language,
      )}`,
  )
  .join("\n");
}

function formatStringItems(
  items: string[],
  language: ClinicalNarrativeLanguage,
  emptyArabic: string,
  emptyEnglish: string,
): string {
  if (items.length === 0) {
    return language === "ar" ? emptyArabic : emptyEnglish;
  }

  return items
  .map(
    (item, index) =>
      `${index + 1}. ${localizeSystemGeneratedClinicalText(
        item,
        language,
      )}`,
  )
  .join("\n");
}

function buildEnglishConfidenceStatement(
  decisionTrace: ClinicalDecisionTrace,
): string {
  const confidence = decisionTrace.calibratedConfidence ?? "unknown";

  if (decisionTrace.requiresClinicalReview) {
    return `The calibrated confidence is ${confidence}, but the interpretation requires clinical review before a stronger conclusion can be made.`;
  }

  if (decisionTrace.requiresAdditionalEvidence) {
    return `The calibrated confidence is ${confidence}. Additional evidence is required before confidence can be increased.`;
  }

  if (decisionTrace.requiresClarification) {
    return `The calibrated confidence is ${confidence}. Clarification may materially change the interpretation.`;
  }

  return `The calibrated confidence is ${confidence} based on the currently available evidence.`;
}

function buildArabicConfidenceStatement(
  decisionTrace: ClinicalDecisionTrace,
): string {
  const confidence = decisionTrace.calibratedConfidence ?? "غير معروف";

  if (decisionTrace.requiresClinicalReview) {
    return `مستوى الثقة المعاير هو ${confidence}، لكن التفسير يحتاج إلى مراجعة سريرية قبل الوصول إلى استنتاج أقوى.`;
  }

  if (decisionTrace.requiresAdditionalEvidence) {
    return `مستوى الثقة المعاير هو ${confidence}. نحتاج إلى أدلة إضافية قبل رفع مستوى الثقة.`;
  }

  if (decisionTrace.requiresClarification) {
    return `مستوى الثقة المعاير هو ${confidence}. قد يؤدي التوضيح الإضافي إلى تغيير التفسير بشكل مهم.`;
  }

  return `مستوى الثقة المعاير هو ${confidence} بناءً على الأدلة المتوفرة حاليًا.`;
}

function buildEnglishConflictStatement(
  decisionTrace: ClinicalDecisionTrace,
): string {
  const conflictLevel = decisionTrace.conflictLevel ?? "none";

  if (conflictLevel === "none") {
    return "No explicit evidence conflict is currently recorded for this interpretation.";
  }

  return `The evidence-conflict level is ${conflictLevel}. This limits how strongly the interpretation should be presented.`;
}

function buildArabicConflictStatement(
  decisionTrace: ClinicalDecisionTrace,
): string {
  const conflictLevel = decisionTrace.conflictLevel ?? "none";

  if (conflictLevel === "none") {
    return "لا يوجد تعارض صريح مسجل حاليًا في الأدلة المتعلقة بهذا التفسير.";
  }

  return `مستوى تعارض الأدلة هو ${conflictLevel}. وهذا يحد من قوة عرض هذا التفسير.`;
}

function buildPatientEnglishNarrative(
  decisionTrace: ClinicalDecisionTrace,
): string {
  const supportingEvidence = formatEvidence(
    decisionTrace.supportingEvidence,
    "en",
  );

  const contradictingEvidence = formatEvidence(
    decisionTrace.contradictingEvidence,
    "en",
  );

  const missingEvidence = formatStringItems(
    decisionTrace.missingEvidence,
    "en",
    "",
    "No important missing evidence is currently recorded.",
  );

  const whatCouldChange = formatStringItems(
    decisionTrace.whatCouldChangeInterpretation,
    "en",
    "",
    "No specific additional information is currently identified.",
  );

  return [
    "What the available evidence suggests",
    decisionTrace.hypothesisDescription ??
      "No clinical interpretation is available.",
    "",
    "Why this interpretation is being considered",
    supportingEvidence,
    "",
    "What may limit this interpretation",
    contradictingEvidence,
    "",
    "Information still needed",
    missingEvidence,
    "",
    "What could change the interpretation",
    whatCouldChange,
    "",
    buildEnglishConfidenceStatement(decisionTrace),
    buildEnglishConflictStatement(decisionTrace),
    "",
    decisionTrace.interpretationBoundary ??
      "This is not a confirmed diagnosis.",
  ].join("\n");
}

function buildPatientArabicNarrative(
  decisionTrace: ClinicalDecisionTrace,
): string {
  const supportingEvidence = formatEvidence(
    decisionTrace.supportingEvidence,
    "ar",
  );

  const contradictingEvidence = formatEvidence(
    decisionTrace.contradictingEvidence,
    "ar",
  );

  const missingEvidence = formatStringItems(
    decisionTrace.missingEvidence,
    "ar",
    "لا توجد معلومات مهمة مفقودة مسجلة حاليًا.",
    "",
  );

  const whatCouldChange = formatStringItems(
    decisionTrace.whatCouldChangeInterpretation,
    "ar",
    "لا توجد معلومات إضافية محددة حاليًا قد تغيّر التفسير.",
    "",
  );

  return [
    "ما الذي تشير إليه الأدلة المتوفرة؟",
    decisionTrace.hypothesisDescription ?? "لا يتوفر تفسير سريري حاليًا.",
    "",
    "لماذا نأخذ هذا التفسير بعين الاعتبار؟",
    supportingEvidence,
    "",
    "ما الذي قد يحد من هذا التفسير؟",
    contradictingEvidence,
    "",
    "المعلومات التي ما زلنا نحتاج إليها",
    missingEvidence,
    "",
    "ما الذي قد يغيّر التفسير؟",
    whatCouldChange,
    "",
    buildArabicConfidenceStatement(decisionTrace),
    buildArabicConflictStatement(decisionTrace),
    "",
    decisionTrace.interpretationBoundary ?? "هذا ليس تشخيصًا مؤكدًا.",
  ].join("\n");
}

function buildDoctorEnglishNarrative(
  decisionTrace: ClinicalDecisionTrace,
): string {
  return [
    "Clinical interpretation",
    decisionTrace.hypothesisTitle ?? "Unavailable",
    "",
    decisionTrace.hypothesisDescription ?? "No interpretation is available.",
    "",
    `Ranking position: ${decisionTrace.rankingPosition ?? "N/A"}`,
    `Ranking score: ${decisionTrace.rankingScore ?? "N/A"}`,
    `Calibrated confidence: ${decisionTrace.calibratedConfidence ?? "N/A"}`,
    `Conflict level: ${decisionTrace.conflictLevel ?? "N/A"}`,
    "",
    "Ranking rationale",
    decisionTrace.rankingReason ?? "No ranking rationale is available.",
    "",
    "Conflict rationale",
    decisionTrace.conflictReason ?? "No conflict rationale is available.",
    "",
    "Confidence rationale",
    decisionTrace.confidenceReason ?? "No confidence rationale is available.",
    "",
    "Missing evidence",
    formatStringItems(
      decisionTrace.missingEvidence,
      "en",
      "",
      "No missing evidence is currently recorded.",
    ),
    "",
    "Interpretation boundary",
    decisionTrace.interpretationBoundary ??
      "This interpretation is not diagnostic confirmation.",
  ].join("\n");
}

function buildDoctorArabicNarrative(
  decisionTrace: ClinicalDecisionTrace,
): string {
  return [
    "التفسير السريري",
    decisionTrace.hypothesisTitle ?? "غير متوفر",
    "",
    decisionTrace.hypothesisDescription ?? "لا يتوفر تفسير حاليًا.",
    "",
    `ترتيب الفرضية: ${decisionTrace.rankingPosition ?? "غير متوفر"}`,
    `درجة الترتيب: ${decisionTrace.rankingScore ?? "غير متوفر"}`,
    `الثقة المعايرة: ${decisionTrace.calibratedConfidence ?? "غير متوفر"}`,
    `مستوى التعارض: ${decisionTrace.conflictLevel ?? "غير متوفر"}`,
    "",
    "سبب الترتيب",
    decisionTrace.rankingReason ?? "لا يتوفر سبب للترتيب.",
    "",
    "سبب التعارض",
    decisionTrace.conflictReason ?? "لا يتوفر سبب للتعارض.",
    "",
    "سبب مستوى الثقة",
    decisionTrace.confidenceReason ?? "لا يتوفر سبب لمستوى الثقة.",
    "",
    "الأدلة المفقودة",
    formatStringItems(
      decisionTrace.missingEvidence,
      "ar",
      "لا توجد أدلة مفقودة مسجلة حاليًا.",
      "",
    ),
    "",
    "حدود التفسير",
    decisionTrace.interpretationBoundary ??
      "هذا التفسير لا يمثل تأكيدًا تشخيصيًا.",
  ].join("\n");
}

function buildAssistantEnglishNarrative(
  decisionTrace: ClinicalDecisionTrace,
): string {
  return [
    decisionTrace.hypothesisDescription ??
      "No clinical interpretation is currently available.",
    "",
    buildEnglishConfidenceStatement(decisionTrace),
    buildEnglishConflictStatement(decisionTrace),
    "",
    decisionTrace.missingEvidence.length > 0
      ? `Important missing information: ${decisionTrace.missingEvidence.join("; ")}.`
      : "No important missing information is currently recorded.",
    "",
    decisionTrace.interpretationBoundary ??
      "This is not a confirmed diagnosis.",
  ].join("\n");
}

function buildAssistantArabicNarrative(
  decisionTrace: ClinicalDecisionTrace,
): string {
  const hypothesisDescription =
    decisionTrace.hypothesisDescription
      ? localizeSystemGeneratedClinicalText(
          decisionTrace.hypothesisDescription,
          "ar",
        )
      : "لا يتوفر تفسير سريري حاليًا.";

  const missingEvidence =
    decisionTrace.missingEvidence
      .map((item) =>
        localizeSystemGeneratedClinicalText(
          item,
          "ar",
        )
      );

  const interpretationBoundary =
    decisionTrace.interpretationBoundary
      ? localizeSystemGeneratedClinicalText(
          decisionTrace.interpretationBoundary,
          "ar",
        )
      : "هذا ليس تشخيصًا مؤكدًا.";

  return [
    hypothesisDescription,
    "",
    buildArabicConfidenceStatement(
      decisionTrace
    ),
    buildArabicConflictStatement(
      decisionTrace
    ),
    "",
    missingEvidence.length > 0
      ? `معلومات مهمة ما زلنا نحتاج إليها: ${missingEvidence.join("؛ ")}.`
      : "لا توجد معلومات مهمة مفقودة مسجلة حاليًا.",
    "",
    interpretationBoundary,
  ].join("\n");
}

function createUnavailableNarrative({
  audience,
  language,
  reason,
}: {
  audience: ClinicalNarrativeAudience;

  language: ClinicalNarrativeLanguage;

  reason: string;
}): ClinicalNarrativeResult {
  return {
    available: false,

    audience,

    language,

    hypothesisId: null,

    title: null,

    summary: null,

    narrative: null,

    confidenceStatement: null,

    conflictStatement: null,

    missingEvidenceStatement: null,

    nextEvidenceStatement: null,

    safetyBoundary: null,

    reason,

    generatedAt: new Date().toISOString(),
  };
}

export function buildClinicalNarrative({
  audience,
  language,
  decisionTrace,
}: ClinicalNarrativeInput): ClinicalNarrativeResult {
  if (!decisionTrace.available || !decisionTrace.hypothesisId) {
    return createUnavailableNarrative({
      audience,

      language,

      reason:
        "No available clinical decision trace exists for narrative generation.",
    });
  }

  const confidenceStatement =
    language === "ar"
      ? buildArabicConfidenceStatement(decisionTrace)
      : buildEnglishConfidenceStatement(decisionTrace);

  const conflictStatement =
    language === "ar"
      ? buildArabicConflictStatement(decisionTrace)
      : buildEnglishConflictStatement(decisionTrace);

  const missingEvidenceStatement = formatStringItems(
    decisionTrace.missingEvidence,
    language,
    "لا توجد معلومات مهمة مفقودة مسجلة حاليًا.",
    "No important missing evidence is currently recorded.",
  );

  const nextEvidenceStatement = formatStringItems(
    decisionTrace.whatCouldChangeInterpretation,
    language,
    "لا توجد معلومات إضافية محددة حاليًا قد تغيّر التفسير.",
    "No specific additional information is currently identified.",
  );

  const narrative =
    audience === "patient"
      ? language === "ar"
        ? buildPatientArabicNarrative(decisionTrace)
        : buildPatientEnglishNarrative(decisionTrace)
      : audience === "doctor"
        ? language === "ar"
          ? buildDoctorArabicNarrative(decisionTrace)
          : buildDoctorEnglishNarrative(decisionTrace)
        : language === "ar"
          ? buildAssistantArabicNarrative(decisionTrace)
          : buildAssistantEnglishNarrative(decisionTrace);

  return {
    available: true,

    audience,

    language,

    hypothesisId: decisionTrace.hypothesisId,

    title: decisionTrace.hypothesisTitle,

    summary: decisionTrace.hypothesisDescription,

    narrative,

    confidenceStatement,

    conflictStatement,

    missingEvidenceStatement,

    nextEvidenceStatement,

    safetyBoundary: decisionTrace.interpretationBoundary,

    reason:
      "A deterministic audience-specific narrative was generated from the existing clinical decision trace without recalculating evidence, ranking, conflict, or confidence.",

    generatedAt: new Date().toISOString(),
  };
}

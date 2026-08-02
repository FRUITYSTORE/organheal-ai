import type {
  EvidenceConfidence,
  LeadingInterpretation,
  ReasoningEvidence,
} from "@/lib/health-intelligence/reasoning/evidence-backed-reasoning";

export type ExplainableReasoningLanguage =
  | "en"
  | "ar";

export type ExplainableReasoningResult = {
  title: string;
  interpretation: string;

  confidence: EvidenceConfidence;
  confidenceExplanation: string;

  evidenceReviewed: ReasoningEvidence[];
  conflictingEvidence: ReasoningEvidence[];
  missingEvidence: string[];

  limitations: string[];
  nextReasoningStep: string | null;

  diagnosticClaim: false;
};

export type BuildExplainableReasoningInput = {
  leadingInterpretation:
    | LeadingInterpretation
    | null;

  language:
    ExplainableReasoningLanguage;
};

function buildConfidenceExplanation(
  interpretation: LeadingInterpretation,
  language: ExplainableReasoningLanguage
): string {
  const isArabic =
    language === "ar";

  const supportingCount =
    interpretation.reasoningTrace
      .supportingEvidenceCount;

  const conflictingCount =
    interpretation.reasoningTrace
      .conflictingEvidenceCount;

  const missingCount =
    interpretation.reasoningTrace
      .missingEvidenceCount;

  if (isArabic) {
    return `تم تحديد مستوى الثقة "${interpretation.confidence}" بناءً على ${supportingCount} من الأدلة الداعمة، و${conflictingCount} من الأدلة المتعارضة، و${missingCount} من عناصر الأدلة الناقصة.`;
  }

  return `Confidence was assessed as "${interpretation.confidence}" based on ${supportingCount} supporting evidence item(s), ${conflictingCount} conflicting evidence item(s), and ${missingCount} missing evidence item(s).`;
}

function buildLimitations(
  interpretation: LeadingInterpretation,
  language: ExplainableReasoningLanguage
): string[] {
  const isArabic =
    language === "ar";

  const limitations: string[] = [
    isArabic
      ? "هذا التفسير محدود بالأدلة المتوفرة حاليًا."
      : "This interpretation is limited to the evidence currently available.",

    isArabic
      ? "التفسير لا يمثل تشخيصًا طبيًا مؤكدًا."
      : "The interpretation is not a confirmed medical diagnosis.",
  ];

  if (
    interpretation.conflictingEvidence.length > 0
  ) {
    limitations.push(
      isArabic
        ? "توجد أدلة متعارضة قد تغيّر قوة التفسير."
        : "Conflicting evidence may reduce or change the strength of the interpretation."
    );
  }

  if (
    interpretation.missingEvidence.length > 0
  ) {
    limitations.push(
      isArabic
        ? "قد تتغير النتيجة عند إضافة الأدلة الناقصة."
        : "The result may change when the missing evidence becomes available."
    );
  }

  if (
    interpretation.reasoningTrace
      .confidenceConstrained
  ) {
    limitations.push(
      isArabic
        ? "تم خفض مستوى الثقة لأن بنية الأدلة لم تدعم المستوى المطلوب."
        : "Confidence was constrained because the evidence structure did not support the requested level."
    );
  }

  return limitations;
}

function buildNextReasoningStep(
  interpretation: LeadingInterpretation,
  language: ExplainableReasoningLanguage
): string | null {
  const missingEvidence =
    interpretation.missingEvidence[0];

  if (!missingEvidence) {
    return language === "ar"
      ? "راجع هذا التفسير مع التقرير الأصلي والسياق الصحي الكامل قبل اتخاذ قرار صحي."
      : "Review this interpretation alongside the original report and complete health context before making a health decision.";
  }

  return language === "ar"
    ? `الخطوة التالية لزيادة دقة التفسير هي إضافة معلومات حول: ${missingEvidence}.`
    : `The next step to improve the interpretation is to add information about: ${missingEvidence}.`;
}

export function buildExplainableReasoning({
  leadingInterpretation,
  language,
}: BuildExplainableReasoningInput): ExplainableReasoningResult | null {
  if (!leadingInterpretation) {
    return null;
  }

  return {
    title:
      leadingInterpretation.title,

    interpretation:
      leadingInterpretation.rationale,

    confidence:
      leadingInterpretation.confidence,

    confidenceExplanation:
      buildConfidenceExplanation(
        leadingInterpretation,
        language
      ),

    evidenceReviewed: [
      ...leadingInterpretation
        .supportingEvidence,
    ],

    conflictingEvidence: [
      ...leadingInterpretation
        .conflictingEvidence,
    ],

    missingEvidence: [
      ...leadingInterpretation
        .missingEvidence,
    ],

    limitations:
      buildLimitations(
        leadingInterpretation,
        language
      ),

    nextReasoningStep:
      buildNextReasoningStep(
        leadingInterpretation,
        language
      ),

    diagnosticClaim: false,
  };
}
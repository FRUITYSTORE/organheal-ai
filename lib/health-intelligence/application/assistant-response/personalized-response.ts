import {
  runAssistantEvidenceReasoning,
} from "@/lib/health-intelligence/application/assistant-reasoning.service";

import {
  buildAccumulatedClinicalEvidence,
} from "@/lib/health-intelligence/application/clinical-evidence.service";

import {
  extractClarificationEvidence,
} from "@/lib/health-intelligence/application/assistant-conversation.service";

import {
  buildGeneralEducationalResponse,
} from "@/lib/health-intelligence/application/assistant-response/educational-response";

import {
  buildReportResponse,
} from "@/lib/health-intelligence/application/assistant-response/report-response";

import type {
  AssistantResponseConversationMessage,
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import {
  detectAssistantIntent,
} from "@/lib/health-intelligence/application/assistant-intent/assistant-intent";

import {
  buildExplainableReasoning,
} from "@/lib/health-intelligence/application/assistant-explainable-reasoning.service";

import {
  buildJourneyResponse,
} from "@/lib/health-intelligence/application/assistant-response/journey-response";

import {
  detectClinicalIntent,
} from "@/lib/health-intelligence/application/assistant-response/clinical-intent";

import {
  getClinicalHandler,
} from "@/lib/health-intelligence/application/assistant-response/clinical-handlers/clinical-handler.registry";

export function hasHealthContext(
  context?: AssistantResponseHealthContext | null
) {
  if (!context) {
    return false;
  }

  return Boolean(
    typeof context.overallScore === "number" ||
      context.priorityOrgan ||
      context.riskPattern ||
      context.doctorBrief ||
      context.recommendation
  );
}

export function buildPersonalizedResponse(
  message: string,
  language: "en" | "ar",
  healthContext?: AssistantResponseHealthContext | null,
  conversation?: AssistantResponseConversationMessage[]
) {
  const isArabic = language === "ar";
  const lowerMessage = message.toLowerCase();
  const detectedIntent =
  detectAssistantIntent(message);

  if (!hasHealthContext(healthContext) || !healthContext) {
    return buildGeneralEducationalResponse(message, language);
  }

  const overallScore =
    typeof healthContext.overallScore === "number"
      ? healthContext.overallScore
      : null;

  const priorityArea =
  healthContext.priorityOrgan ||
  (isArabic
    ? "الصحة العامة"
    : "General Health");

const strongestArea =
  healthContext.strongestOrgan ||
  (isArabic
    ? "الصحة العامة"
    : "General Health");

const riskPattern =
  healthContext.riskPattern ||
  (isArabic
    ? "غير متوفر حاليًا"
    : "Not currently available");

const nextAction =
  healthContext.recommendation ||
  (isArabic
    ? "راجع أحدث بياناتك الصحية وحدد الخطوة التالية المناسبة."
    : "Review your latest health information and identify the next appropriate step.");

const doctorBrief =
  healthContext.doctorBrief ||
  (isArabic
    ? "لا يوجد ملخص طبي جاهز حاليًا."
    : "No doctor brief is currently available.");

const healthAgeStatus =
    healthContext.healthAgeStatus ||
    (isArabic ? "غير متوفر حاليًا" : "Not currently available");

    const clarificationEvidence =
  extractClarificationEvidence(message);

const structuredClinicalEvidence =
  buildAccumulatedClinicalEvidence(
    clarificationEvidence,
    conversation
  );

const isCausalClarification =
  lowerMessage.includes(
    "original clinical reasoning intent: cause_reasoning"
  ) &&
  Boolean(clarificationEvidence);

if (isCausalClarification) {
  const latestReport =
    healthContext.latestReportContext;

  const clinicalEvidenceGaps: string[] = [];

  if (
    structuredClinicalEvidence.symptoms.length === 0
  ) {
    clinicalEvidenceGaps.push(
      isArabic
        ? "الأعراض الحالية"
        : "current symptoms"
    );
  }

  if (!structuredClinicalEvidence.onset) {
    clinicalEvidenceGaps.push(
      isArabic
        ? "وقت بداية الأعراض"
        : "symptom onset"
    );
  }

  if (!structuredClinicalEvidence.severity) {
    clinicalEvidenceGaps.push(
      isArabic
        ? "شدة الأعراض"
        : "symptom severity"
    );
  }

  if (
  !structuredClinicalEvidence.associatedSymptomsKnown
) {
    clinicalEvidenceGaps.push(
      isArabic
        ? "وجود أعراض مصاحبة"
        : "associated symptoms"
    );
  }

  const clinicalEvidenceSummary =
    isArabic
      ? [
          structuredClinicalEvidence.symptoms.length > 0
            ? `الأعراض: ${structuredClinicalEvidence.symptoms.join(", ")}`
            : null,
          structuredClinicalEvidence.onset
            ? `البداية: ${structuredClinicalEvidence.onset}`
            : null,
          structuredClinicalEvidence.severity
            ? `الشدة: ${structuredClinicalEvidence.severity}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : [
          structuredClinicalEvidence.symptoms.length > 0
            ? `Symptoms: ${structuredClinicalEvidence.symptoms.join(", ")}`
            : null,
          structuredClinicalEvidence.onset
            ? `Onset: ${structuredClinicalEvidence.onset}`
            : null,
          structuredClinicalEvidence.severity
            ? `Severity: ${structuredClinicalEvidence.severity}`
            : null,
        ]
          .filter(Boolean)
          .join("\n");

  const clinicalEvidenceGapSummary =
    clinicalEvidenceGaps.length > 0
      ? clinicalEvidenceGaps.join(", ")
      : isArabic
        ? "لا توجد فجوات أساسية محددة في هذه المرحلة."
        : "No basic evidence gaps identified at this stage.";
const {
  evidenceCompletion,
  evidenceBackedReasoning,
  highestValueClinicalQuestion,
} = runAssistantEvidenceReasoning(
  structuredClinicalEvidence,
  {
    summary:
      latestReport?.summary || null,

    keyFindings:
      latestReport?.keyFindings || null,

    riskLevel:
      latestReport?.riskLevel || null,
  },
  language
);
const leadingInterpretation =
  evidenceBackedReasoning.leadingInterpretation;

  const explainableReasoning =
  buildExplainableReasoning({
    leadingInterpretation,
    language,
  });

const leadingInterpretationSummary =
  explainableReasoning
    ? isArabic
      ? `التفسير الرئيسي الحالي:
${explainableReasoning.title}

درجة الثقة:
${explainableReasoning.confidence}

كيف تم تقييم الثقة:
${explainableReasoning.confidenceExplanation}

سبب هذا التفسير:
${explainableReasoning.interpretation}

الأدلة التي تمت مراجعتها:
${
  explainableReasoning.evidenceReviewed.length > 0
    ? explainableReasoning.evidenceReviewed
        .map(
          (item) =>
            `• ${item.statement} [${item.source}]`
        )
        .join("\n")
    : "لم يتم تحديد أدلة داعمة منظمة."
}

الأدلة المتعارضة:
${
  explainableReasoning.conflictingEvidence.length > 0
    ? explainableReasoning.conflictingEvidence
        .map(
          (item) =>
            `• ${item.statement} [${item.source}]`
        )
        .join("\n")
    : "لم يتم تحديد أدلة متعارضة."
}

الأدلة التي ما تزال مطلوبة:
${
  explainableReasoning.missingEvidence.length > 0
    ? explainableReasoning.missingEvidence
        .map((item) => `• ${item}`)
        .join("\n")
    : "لم يتم تحديد فجوات إضافية في الأدلة."
}

حدود التفسير:
${explainableReasoning.limitations
  .map((item) => `• ${item}`)
  .join("\n")}

الخطوة التالية لتحسين التفسير:
${explainableReasoning.nextReasoningStep || "لا توجد خطوة تفسيرية إضافية محددة حاليًا."}`
      : `Current leading interpretation:
${explainableReasoning.title}

Confidence:
${explainableReasoning.confidence}

How confidence was assessed:
${explainableReasoning.confidenceExplanation}

Why this interpretation may fit:
${explainableReasoning.interpretation}

Evidence reviewed:
${
  explainableReasoning.evidenceReviewed.length > 0
    ? explainableReasoning.evidenceReviewed
        .map(
          (item) =>
            `• ${item.statement} [${item.source}]`
        )
        .join("\n")
    : "No structured supporting evidence was identified."
}

Conflicting evidence:
${
  explainableReasoning.conflictingEvidence.length > 0
    ? explainableReasoning.conflictingEvidence
        .map(
          (item) =>
            `• ${item.statement} [${item.source}]`
        )
        .join("\n")
    : "No conflicting evidence was identified."
}

Evidence still needed:
${
  explainableReasoning.missingEvidence.length > 0
    ? explainableReasoning.missingEvidence
        .map((item) => `• ${item}`)
        .join("\n")
    : "No additional evidence gaps were identified."
}

Interpretation limitations:
${explainableReasoning.limitations
  .map((item) => `• ${item}`)
  .join("\n")}

Next step to strengthen the interpretation:
${explainableReasoning.nextReasoningStep || "No additional reasoning step is currently identified."}`
    : "";
      const reasoningStateMessage =
  evidenceCompletion.complete
    ? isArabic
      ? "اكتملت الأدلة السريرية الأساسية المطلوبة لهذه المرحلة. يمكن الآن الانتقال من جمع المعلومات إلى تحليل الاحتمالات وربطها بالأدلة المتاحة."
      : "The basic clinical evidence required for this stage is complete. OrganHeal can now move from information gathering to evidence-based interpretation."
    : isArabic
      ? "ما زالت بعض الأدلة الأساسية ناقصة، لذلك يجب استكمال المعلومات الأعلى قيمة قبل الانتقال إلى تحليل أعمق."
      : "Some basic evidence is still missing, so the highest-value information should be collected before deeper interpretation.";
      const evidenceReasoningSummary =
  evidenceBackedReasoning.readyForHypothesisReasoning
    ? isArabic
      ? `حالة التحليل المدعوم بالأدلة:
جاهز لبدء تحليل الاحتمالات بشكل محدود ومدعوم بالأدلة.

الأدلة المؤكدة المستخدمة:
${
  evidenceBackedReasoning.confirmedEvidence.length > 0
    ? evidenceBackedReasoning.confirmedEvidence
        .map(
          (item) =>
            `• ${item.statement} [${item.source}]`
        )
        .join("\n")
    : "لا توجد أدلة مؤكدة منظمة متاحة حاليًا."
}

حدود الاستنتاج:
${evidenceBackedReasoning.uncertainty}${
  leadingInterpretationSummary
    ? `\n\n${leadingInterpretationSummary}`
    : ""
}`
      : `Evidence-backed reasoning state:
Ready for bounded hypothesis reasoning.

Confirmed evidence being used:
${
  evidenceBackedReasoning.confirmedEvidence.length > 0
    ? evidenceBackedReasoning.confirmedEvidence
        .map(
          (item) =>
            `• ${item.statement} [${item.source}]`
        )
        .join("\n")
    : "No structured confirmed evidence is currently available."
}

Reasoning boundary:
${evidenceBackedReasoning.uncertainty}${
  leadingInterpretationSummary
    ? `\n\n${leadingInterpretationSummary}`
    : ""
}`
    : "";
  return isArabic
    ? `أعدت تقييم سؤالك السابق باستخدام المعلومة الجديدة التي قدمتها.

المعلومة الجديدة:
${clarificationEvidence}

الأدلة السريرية التي استطعت تنظيمها:
${clinicalEvidenceSummary || "لم أستطع بعد استخراج أعراض أو وقت بداية بشكل منظم من الإجابة."}

المعلومات المهمة التي ما تزال ناقصة:
${clinicalEvidenceGapSummary}

حالة اكتمال الأدلة:
${reasoningStateMessage}

السؤال التالي الأكثر أهمية:
${highestValueClinicalQuestion || "لا أحتاج إلى سؤال أساسي إضافي في هذه المرحلة."}

${evidenceReasoningSummary}

الأدلة الموجودة من أحدث تقرير:
${latestReport?.keyFindings || latestReport?.summary || "لا توجد نتائج تقرير كافية محفوظة حاليًا."}

مستوى المخاطر المحفوظ:
${latestReport?.riskLevel || "غير محدد حاليًا."}

ما يمكن قوله حاليًا:
وجود هذه المعلومة الجديدة يجعل التحليل أكثر اكتمالًا، لكنه لا يثبت وحده أن الأعراض ناتجة مباشرة عن نتائج التقرير. يجب الفصل بين ما هو مثبت في التقرير وبين العلاقة المحتملة مع الأعراض التي وصفتها.
ما يزال ينقصنا:
${evidenceCompletion.complete
  ? "لا توجد فجوات في الأدلة السريرية الأساسية التي جمعناها لهذه المرحلة. قد تبقى عوامل صحية أو علاجية إضافية قادرة على تغيير التفسير."
  : clinicalEvidenceGapSummary}
الخطوة التالية:
${latestReport?.nextBestAction || nextAction}

لا أستطيع تأكيد سبب أو تشخيص نهائي من هذه المعلومات وحدها، لكن يمكن استخدام الأدلة الحالية لتضييق الاحتمالات تدريجيًا مع إضافة معلومات أكثر صلة.`
    : `I re-evaluated your previous question using the new information you provided.

New evidence:
${clarificationEvidence}

Structured clinical evidence identified:
${clinicalEvidenceSummary || "I could not yet extract a structured symptom or onset from the answer."}

Important evidence still missing:
${clinicalEvidenceGapSummary}

Evidence completion state:
${reasoningStateMessage}

Highest-value next question:
${highestValueClinicalQuestion || "No additional basic clarification is required at this stage."}

${evidenceReasoningSummary}

Evidence from your latest report:
${latestReport?.keyFindings || latestReport?.summary || "There is not enough saved report evidence available yet."}

Saved risk level:
${latestReport?.riskLevel || "Not currently specified."}

What can be concluded so far:
This new information makes the reasoning more complete, but it does not by itself prove that your symptom is caused by the report findings. The confirmed report evidence must be kept separate from a possible relationship with the symptom you described.
What is still missing:
${evidenceCompletion.complete
  ? "No gaps remain in the basic clinical evidence collected for this stage. Additional health or treatment factors could still materially change the interpretation."
  : clinicalEvidenceGapSummary}
Next step:
${latestReport?.nextBestAction || nextAction}

I cannot confirm a cause or diagnosis from the current information alone, but the available evidence can now be used to narrow the possibilities progressively as more relevant information is added.`;
}

const journeyResponse =
  buildJourneyResponse({
    lowerMessage,
    language,
    healthContext,
    nextAction,
  });

if (journeyResponse) {
  return journeyResponse;
}

const clinicalIntent =
  detectClinicalIntent(
    message
  );

if (
  clinicalIntent.intent !==
  "unknown"
) {
  const clinicalHandler =
    getClinicalHandler(
      clinicalIntent.intent
    );

  if (clinicalHandler) {
    const clinicalResponse =
      clinicalHandler({
        intent:
          clinicalIntent.intent,

        lowerMessage,

        language,

        healthContext,

        nextAction,
      });

    if (clinicalResponse) {
      return clinicalResponse;
    }
  }
}

  if (
    detectedIntent.intent === "cause-reasoning" ||
  detectedIntent.intent === "score" ||
    lowerMessage.includes("why") ||
    lowerMessage.includes("low") ||
    lowerMessage.includes("score") ||
    lowerMessage.includes("لماذا") ||
    lowerMessage.includes("منخفض") ||
    lowerMessage.includes("درجة")
  ) {
    return isArabic
      ? `بناءً على بياناتك الصحية الحالية:

${overallScore !== null ? `درجتك الصحية الحالية هي ${overallScore}/100.` : "الدرجة الصحية العامة غير متوفرة حاليًا."}

منطقة الأولوية:
${priorityArea}

نمط المخاطر:
${riskPattern}

الخطوة التالية المقترحة:
${nextAction}

هذا إرشاد صحي تثقيفي ولا يعتبر تشخيصًا طبيًا.`
      : `Based on your current health information:

${overallScore !== null ? `Your current health score is ${overallScore}/100.` : "Your overall health score is not currently available."}

Priority area:
${priorityArea}

Risk pattern:
${riskPattern}

Suggested next step:
${nextAction}

This is educational health guidance and not a medical diagnosis.`;
  }

 if (
  detectedIntent.intent === "next-step" ||
  lowerMessage.includes("next") ||
  lowerMessage.includes("action") ||
  lowerMessage.includes("next step") ||
  lowerMessage.includes("الخطوة التالية")
) {
    return isArabic
      ? `أهم خطوة صحية تالية بناءً على بياناتك الحالية هي:

${nextAction}

منطقة الأولوية الحالية:
${priorityArea}

نمط المخاطر الحالي:
${riskPattern}

استخدم هذه المعلومات للتحضير لاتخاذ قرار صحي أوضح.`
      : `Your most important next health action based on your current data is:

${nextAction}

Current priority area:
${priorityArea}

Current risk pattern:
${riskPattern}

Use this information to prepare for a clearer health decision.`;
  }

  if (
  detectedIntent.intent === "risk" ||
  lowerMessage.includes("risk") ||
    lowerMessage.includes("pattern") ||
    lowerMessage.includes("مخاطر") ||
    lowerMessage.includes("نمط")
  ) {
    return isArabic
      ? `نمط المخاطر الصحي الحالي لديك هو:

${riskPattern}

منطقة الأولوية المرتبطة ببياناتك الحالية:
${priorityArea}

الخطوة المقترحة:
${nextAction}

قد يتغير هذا التقدير عند إضافة تقارير أو فحوصات أو تحديثات صحية جديدة.`
      : `Your current health risk pattern is:

${riskPattern}

Priority area associated with your current data:
${priorityArea}

Suggested next step:
${nextAction}

This may change as new reports, tests, or health updates are added.`;
  }
 const reportResponse =
  buildReportResponse({
    lowerMessage,
    detectedIntent: detectedIntent.intent,
    isArabic,
    healthContext,
    nextAction,
    doctorBrief,
    priorityArea,
  });

  if (reportResponse) {
    return reportResponse;
  }
  if (
  detectedIntent.intent === "health-age" ||
  lowerMessage.includes("health age") ||
    lowerMessage.includes("age") ||
    lowerMessage.includes("العمر")
  ) {
    return isArabic
      ? `حالة العمر الصحي الحالية:

${healthAgeStatus}

منطقة الأولوية:
${priorityArea}

هذه المعلومة جزء من سياقك الصحي ولا تمثل تشخيصًا طبيًا.`
      : `Your current health age status is:

${healthAgeStatus}

Priority area:
${priorityArea}

This information is part of your health context and is not a medical diagnosis.`;
  }

  if (
  detectedIntent.intent === "improvement" ||
  lowerMessage.includes("improve") ||
    lowerMessage.includes("improvement") ||
    lowerMessage.includes("تحسين") ||
    lowerMessage.includes("أتطور")
  ) {
    return isArabic
      ? `لتحسين وضعك الصحي الحالي، ركّز أولًا على:

${priorityArea}

نمط المخاطر الحالي:
${riskPattern}

الخطوة العملية التالية:
${nextAction}

${overallScore !== null ? `درجتك الصحية الحالية: ${overallScore}/100.` : ""}`
      : `To improve your current health direction, start by focusing on:

${priorityArea}

Current risk pattern:
${riskPattern}

Next practical action:
${nextAction}

${overallScore !== null ? `Current health score: ${overallScore}/100.` : ""}`;
  }

  return isArabic
    ? `بناءً على سياقك الصحي الحالي:

${overallScore !== null ? `الدرجة العامة: ${overallScore}/100` : ""}
منطقة الأولوية: ${priorityArea}
أقوى منطقة: ${strongestArea}
نمط المخاطر: ${riskPattern}
الخطوة التالية: ${nextAction}

يمكنك أن تسألني عن سبب النتيجة، نمط المخاطر، الخطوة التالية، أو ما يجب مناقشته مع الطبيب.

هذا دعم صحي تثقيفي ولا يعتبر تشخيصًا طبيًا.`
    : `Based on your current health context:

${overallScore !== null ? `Overall score: ${overallScore}/100` : ""}
Priority area: ${priorityArea}
Strongest area: ${strongestArea}
Risk pattern: ${riskPattern}
Next action: ${nextAction}

You can ask me about your score, risk pattern, next step, or what to discuss with your doctor.

This is educational health support and not a medical diagnosis.`;
}

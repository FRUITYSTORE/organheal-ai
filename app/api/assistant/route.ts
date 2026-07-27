import { NextResponse } from "next/server";
import {
  buildEvidenceBackedReasoning,
} from "@/lib/health-intelligence/reasoning/evidence-backed-reasoning";

type HealthContext = {
  overallScore?: number | null;
  strongestOrgan?: string | null;
  priorityOrgan?: string | null;
  labScore?: number | null;
  dailyCheckInScore?: number | null;
  dailyMood?: string | null;

  riskPattern?: string | null;
  healthAge?: number | null;
  healthAgeStatus?: string | null;
  doctorBrief?: string | null;
  recommendation?: string | null;

   healthEngine?: unknown;

  latestReportContext?: {
    reportId: number;
    fileName: string;
    reportType: string;
    uploadedAt: string | null;
    summary: string | null;
    keyFindings: string | null;
    recommendations: string | null;
    doctorBrief: string | null;
    nextBestAction: string | null;
    riskLevel: string | null;
  } | null;

  [key: string]: unknown;
};
type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};
type ReasoningReadiness = {
  status: "sufficient" | "partial" | "limited";
  confidence: "high" | "moderate" | "low";
  availableEvidence: string[];
  missingInformation: string[];
  clarifyingQuestion: string | null;
};
type StructuredClinicalEvidence = {
  symptoms: string[];
  onset: string | null;
  severity: string | null;
  associatedSymptoms: string[];
  associatedSymptomsKnown: boolean;
};
type ClinicalEvidenceCompletion = {
  complete: boolean;
  status: "insufficient" | "partial" | "ready";
  completedFields: string[];
  missingFields: string[];
};

type ReasoningDecision = {
  mode: "answer" | "clarify";
  question: string | null;
  reason: string | null;
};
type ReasoningIntent =
  | "report_summary"
  | "doctor_preparation"
  | "priority"
  | "cause_reasoning"
  | "general";

type QuestionEvidenceReadiness = {
  intent: ReasoningIntent;
  status: "sufficient" | "partial" | "limited";
  confidence: "high" | "moderate" | "low";
  availableEvidence: string[];
  missingInformation: string[];
  shouldClarify: boolean;
  clarifyingQuestion: string | null;
};
function hasHealthContext(context?: HealthContext | null) {
  if (!context) return false;

  return Boolean(
    typeof context.overallScore === "number" ||
      context.priorityOrgan ||
      context.riskPattern ||
      context.doctorBrief ||
      context.recommendation
  );
}

function buildGeneralEducationalResponse(
  message: string,
  language: "en" | "ar"
) {
  const isArabic = language === "ar";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("cholesterol") ||
    lowerMessage.includes("ldl") ||
    lowerMessage.includes("hdl") ||
    lowerMessage.includes("triglyceride") ||
    lowerMessage.includes("كوليسترول") ||
    lowerMessage.includes("دهون")
  ) {
    return isArabic
      ? "الكوليسترول والدهون الثلاثية من المؤشرات المهمة لصحة القلب والتمثيل الغذائي. ارتفاع LDL أو الدهون الثلاثية قد يرتبط بزيادة مخاطر القلب، بينما HDL غالبًا يعتبر عاملًا وقائيًا. الأفضل مناقشة القيم الفعلية مع الطبيب، خصوصًا عند وجود ضغط أو سكري أو تدخين أو تاريخ عائلي."
      : "Cholesterol and triglycerides are important markers for heart and metabolic health. Higher LDL or triglycerides may be linked with higher cardiovascular risk, while HDL is often considered protective. Discuss actual values with a clinician, especially if you have high blood pressure, diabetes, smoking exposure, or family history.";
  }

  if (
    lowerMessage.includes("heart") ||
    lowerMessage.includes("blood pressure") ||
    lowerMessage.includes("قلب") ||
    lowerMessage.includes("ضغط")
  ) {
    return isArabic
      ? "صحة القلب تتأثر بضغط الدم، الكوليسترول، النشاط البدني، الوزن، النوم، التدخين، والتغذية. ابدأ بقياس الضغط بانتظام، مراجعة الدهون، وزيادة الحركة تدريجيًا. هذا إرشاد تعليمي وليس تشخيصًا."
      : "Heart health is influenced by blood pressure, cholesterol, physical activity, weight, sleep, smoking exposure, and nutrition. A good starting point is regular blood pressure tracking, lipid review, and gradual activity improvement. This is educational guidance, not diagnosis.";
  }

  if (
    lowerMessage.includes("liver") ||
    lowerMessage.includes("alt") ||
    lowerMessage.includes("ast") ||
    lowerMessage.includes("كبد")
  ) {
    return isArabic
      ? "صحة الكبد تراجع غالبًا من خلال ALT وAST والبيليروبين والسياق الصحي العام. ارتفاع الإنزيمات قد يحتاج متابعة طبية، خاصة مع زيادة الوزن أو بعض الأدوية أو وجود أعراض. لا توقف أي دواء دون استشارة الطبيب."
      : "Liver health is often reviewed through ALT, AST, bilirubin, and overall clinical context. Elevated enzymes may need medical follow-up, especially with weight concerns, certain medications, or symptoms. Do not stop medications without clinician advice.";
  }

  if (
    lowerMessage.includes("kidney") ||
    lowerMessage.includes("creatinine") ||
    lowerMessage.includes("egfr") ||
    lowerMessage.includes("كلية") ||
    lowerMessage.includes("كلى")
  ) {
    return isArabic
      ? "صحة الكلى تفهم عادة من خلال الكرياتينين، eGFR، ضغط الدم، الترطيب، وتحليل البول. إذا كانت النتائج غير طبيعية أو لديك ضغط أو سكري، ناقشها مع الطبيب."
      : "Kidney health is commonly understood through creatinine, eGFR, blood pressure, hydration, and urine testing. If results are abnormal or you have hypertension or diabetes, discuss them with a clinician.";
  }

  if (
    lowerMessage.includes("sleep") ||
    lowerMessage.includes("stress") ||
    lowerMessage.includes("mood") ||
    lowerMessage.includes("نوم") ||
    lowerMessage.includes("توتر")
  ) {
    return isArabic
      ? "النوم والتوتر يؤثران على الطاقة، التركيز، الشهية، المناعة، وحتى المؤشرات القلبية والأيضية. ابدأ بتحسين وقت النوم، تقليل المنبهات مساءً، ومتابعة التوتر والنشاط بشكل منتظم."
      : "Sleep and stress affect energy, focus, appetite, immunity, and even heart and metabolic indicators. Start by improving sleep timing, reducing evening stimulants, and tracking stress and activity regularly.";
  }

  return isArabic
    ? "يمكنني مساعدتك تثقيفيًا في فهم صحة الأعضاء، المختبر، التقييمات، ونمط الحياة. للحصول على إرشاد شخصي أدق، أكمل تقييمًا صحيًا أو أضف تقريرًا طبيًا أو تحديثًا صحيًا."
    : "I can help educationally with organ health, labs, assessments, and lifestyle patterns. For more personalized guidance, complete an assessment, add a medical report, or submit a health check-in.";
}
function assessReasoningReadiness(
  healthContext: HealthContext | null | undefined,
  language: "en" | "ar"
): ReasoningReadiness {
  const isArabic = language === "ar";

  if (!healthContext) {
    return {
      status: "limited",
      confidence: "low",
      availableEvidence: [],
      missingInformation: [
        isArabic ? "السياق الصحي الأساسي" : "Basic health context",
        isArabic ? "تقييم صحي أو تقرير طبي" : "Health assessment or medical report",
      ],
      clarifyingQuestion: isArabic
        ? "هل لديك تقرير طبي حديث أو تقييم صحي يمكنني استخدامه لفهم حالتك بشكل أفضل؟"
        : "Do you have a recent medical report or health assessment I can use to understand your situation better?",
    };
  }

  const availableEvidence: string[] = [];
  const missingInformation: string[] = [];

  if (typeof healthContext.overallScore === "number") {
    availableEvidence.push(
      isArabic ? "الدرجة الصحية العامة" : "Overall health score"
    );
  }

  if (healthContext.priorityOrgan) {
    availableEvidence.push(
      isArabic ? "منطقة الأولوية الصحية" : "Priority health area"
    );
  }

  if (healthContext.riskPattern) {
    availableEvidence.push(
      isArabic ? "نمط المخاطر" : "Risk pattern"
    );
  }

  if (healthContext.doctorBrief) {
    availableEvidence.push(
      isArabic ? "ملخص الطبيب" : "Doctor brief"
    );
  }

  const latestReport =
    healthContext.latestReportContext;

  if (latestReport) {
    availableEvidence.push(
      isArabic ? "أحدث تقرير طبي" : "Latest medical report"
    );

    if (latestReport.keyFindings) {
      availableEvidence.push(
        isArabic ? "النتائج الرئيسية للتقرير" : "Report key findings"
      );
    } else {
      missingInformation.push(
        isArabic ? "النتائج الرئيسية للتقرير" : "Report key findings"
      );
    }

    if (latestReport.recommendations) {
      availableEvidence.push(
        isArabic ? "توصيات التقرير" : "Report recommendations"
      );
    }
  } else {
    missingInformation.push(
      isArabic ? "تقرير طبي حديث" : "Recent medical report"
    );
  }

  if (!healthContext.riskPattern) {
    missingInformation.push(
      isArabic ? "نمط مخاطر واضح" : "Clear risk pattern"
    );
  }

  if (!healthContext.priorityOrgan) {
    missingInformation.push(
      isArabic ? "أولوية صحية محددة" : "Defined health priority"
    );
  }

  const evidenceCount = availableEvidence.length;

  if (evidenceCount >= 5 && missingInformation.length === 0) {
    return {
      status: "sufficient",
      confidence: "high",
      availableEvidence,
      missingInformation,
      clarifyingQuestion: null,
    };
  }

  if (evidenceCount >= 3) {
    return {
      status: "partial",
      confidence: "moderate",
      availableEvidence,
      missingInformation,
      clarifyingQuestion:
        missingInformation.length > 0
          ? isArabic
            ? `لتحسين دقة التحليل، هل يمكنك تزويدي بمعلومة إضافية حول: ${missingInformation[0]}؟`
            : `To improve the analysis, can you provide more information about: ${missingInformation[0]}?`
          : null,
    };
  }

  return {
    status: "limited",
    confidence: "low",
    availableEvidence,
    missingInformation,
    clarifyingQuestion: isArabic
      ? "المعلومات الحالية محدودة. هل لديك تقرير طبي حديث أو نتائج إضافية يمكن إضافتها قبل الوصول إلى استنتاج أقوى؟"
      : "The current information is limited. Do you have a recent medical report or additional results that could strengthen the analysis?",
  };
}
function assessQuestionEvidence(
  message: string,
  healthContext: HealthContext | null | undefined,
  language: "en" | "ar"
): QuestionEvidenceReadiness {
  const isArabic = language === "ar";
  const lowerMessage = message.toLowerCase().trim();
  const report = healthContext?.latestReportContext;

  const causeIntent =
  lowerMessage.includes(
    "original clinical reasoning intent: cause_reasoning"
  ) ||
  lowerMessage.includes("what could be causing") ||
  lowerMessage.includes("what is causing") ||
  lowerMessage.includes("what caused") ||
  lowerMessage.includes("cause of") ||
  lowerMessage.includes("why is this abnormal") ||
  lowerMessage.includes("why are these abnormal") ||
  lowerMessage.includes("diagnosis") ||
  lowerMessage.includes("diagnose") ||
  lowerMessage.includes("ما سبب") ||
  lowerMessage.includes("ما الذي يسبب") ||
  lowerMessage.includes("ليش") ||
  lowerMessage.includes("شو السبب") ||
  lowerMessage.includes("شو ممكن يكون");

const hasClarificationEvidence =
  lowerMessage.includes("new user evidence:");

  const doctorIntent =
    lowerMessage.includes("doctor") ||
    lowerMessage.includes("clinician") ||
    lowerMessage.includes("visit") ||
    lowerMessage.includes("طبيب") ||
    lowerMessage.includes("دكتور");

  const priorityIntent =
    lowerMessage.includes("priority") ||
    lowerMessage.includes("most important") ||
    lowerMessage.includes("what should i focus on") ||
    lowerMessage.includes("الأولوية") ||
    lowerMessage.includes("الأهم") ||
    lowerMessage.includes("على شو أركز");

  const reportIntent =
    lowerMessage.includes("report") ||
    lowerMessage.includes("finding") ||
    lowerMessage.includes("result") ||
    lowerMessage.includes("تقرير") ||
    lowerMessage.includes("نتيجة") ||
    lowerMessage.includes("نتائج");

  /*
   * Cause / diagnostic reasoning intentionally has the highest
   * precedence because the same question may also mention findings
   * or a report.
   */
  if (causeIntent) {
    const availableEvidence: string[] = [];
    const missingInformation: string[] = [];

    if (report) {
      availableEvidence.push(
        isArabic ? "تقرير طبي حديث" : "Recent medical report"
      );
    } else {
      missingInformation.push(
        isArabic ? "تقرير أو نتائج مرتبطة بالمشكلة" : "Relevant report or test results"
      );
    }

    if (report?.keyFindings) {
      availableEvidence.push(
        isArabic ? "النتائج الرئيسية" : "Key findings"
      );
    } else {
      missingInformation.push(
        isArabic ? "النتائج الرئيسية" : "Key findings"
      );
    }

    if (report?.riskLevel) {
      availableEvidence.push(
        isArabic ? "مستوى المخاطر" : "Risk level"
      );
    }

    /*
     * These are not currently structured in HealthContext.
     * Their absence matters specifically for causal reasoning.
     */
   if (hasClarificationEvidence) {
  availableEvidence.push(
    isArabic
      ? "الأعراض أو المعلومات الإضافية التي قدمها المستخدم"
      : "User-provided symptom or clarification evidence"
  );

  missingInformation.push(
    isArabic
      ? "السياق السريري الإضافي المرتبط بالمشكلة"
      : "Additional relevant clinical context"
  );
} else {
  missingInformation.push(
    isArabic ? "الأعراض الحالية" : "Current symptoms",
    isArabic ? "وقت بداية الأعراض" : "Symptom onset",
    isArabic
      ? "السياق السريري المرتبط بالمشكلة"
      : "Relevant clinical context"
  );
}

   return {
  intent: "cause_reasoning",

  status: hasClarificationEvidence
    ? "partial"
    : report?.keyFindings
      ? "partial"
      : "limited",

  confidence: hasClarificationEvidence
    ? "moderate"
    : report?.keyFindings
      ? "moderate"
      : "low",

  availableEvidence,
  missingInformation,

  shouldClarify:
    !hasClarificationEvidence,

  clarifyingQuestion:
    hasClarificationEvidence
      ? null
      : report?.keyFindings
        ? isArabic
          ? "لفهم الأسباب المحتملة بشكل أدق: هل لديك أعراض مرتبطة بهذه النتائج؟ وإذا نعم، ما هي ومتى بدأت؟"
          : "To assess the possible causes more accurately, are you having symptoms related to these findings? If so, what are they and when did they begin?"
        : isArabic
          ? "ما النتيجة غير الطبيعية التي تريد فهم سببها، وهل لديك أعراض مرتبطة بها؟"
          : "Which abnormal result are you concerned about, and are you having any symptoms related to it?",
};
  }

  if (priorityIntent) {
    const hasPriority =
      Boolean(healthContext?.priorityOrgan);

    return {
      intent: "priority",
      status: hasPriority ? "sufficient" : "partial",
      confidence: hasPriority ? "high" : "moderate",
      availableEvidence: hasPriority
        ? [
            isArabic
              ? "أولوية صحية محددة"
              : "Defined health priority",
          ]
        : [],
      missingInformation: hasPriority
        ? []
        : [
            isArabic
              ? "أولوية صحية محددة"
              : "Defined health priority",
          ],
      shouldClarify: false,
      clarifyingQuestion: null,
    };
  }

  if (doctorIntent) {
    const hasDoctorEvidence =
      Boolean(
        report?.doctorBrief ||
        healthContext?.doctorBrief
      );

    return {
      intent: "doctor_preparation",
      status: hasDoctorEvidence
        ? "sufficient"
        : "partial",
      confidence: hasDoctorEvidence
        ? "high"
        : "moderate",
      availableEvidence: hasDoctorEvidence
        ? [
            isArabic
              ? "ملخص موجه للطبيب"
              : "Doctor-focused summary",
          ]
        : [],
      missingInformation: [],
      shouldClarify: false,
      clarifyingQuestion: null,
    };
  }

  if (reportIntent) {
    const hasReportEvidence =
      Boolean(report?.summary || report?.keyFindings);

    return {
      intent: "report_summary",
      status: hasReportEvidence
        ? "sufficient"
        : "limited",
      confidence: hasReportEvidence
        ? "high"
        : "low",
      availableEvidence: hasReportEvidence
        ? [
            isArabic
              ? "محتوى التقرير"
              : "Report evidence",
          ]
        : [],
      missingInformation: hasReportEvidence
        ? []
        : [
            isArabic
              ? "محتوى تقرير قابل للتحليل"
              : "Analyzable report content",
          ],
      shouldClarify: false,
      clarifyingQuestion: null,
    };
  }

  return {
    intent: "general",
    status: healthContext
      ? "partial"
      : "limited",
    confidence: healthContext
      ? "moderate"
      : "low",
    availableEvidence: [],
    missingInformation: [],
    shouldClarify: false,
    clarifyingQuestion: null,
  };
}
function decideReasoningPath(
  questionEvidence: QuestionEvidenceReadiness,
  language: "en" | "ar"
): ReasoningDecision {
  const isArabic = language === "ar";

  /*
   * Cause / diagnostic reasoning has the highest evidence requirement.
   *
   * A strong general health profile does not automatically mean that
   * there is enough evidence to explain why a specific abnormal result
   * occurred.
   */
  if (
    questionEvidence.intent === "cause_reasoning" &&
    questionEvidence.shouldClarify &&
    questionEvidence.clarifyingQuestion
  ) {
    return {
      mode: "clarify",
      question:
        questionEvidence.clarifyingQuestion,
      reason: isArabic
        ? "المعلومات العامة المتوفرة لا تكفي وحدها لتفسير السبب المحتمل لهذه النتائج. نحتاج معلومة إضافية يمكن أن تغير تفسير الاحتمالات."
        : "The available general health information is not sufficient by itself to explain the likely cause of these findings. Additional information could materially change the interpretation.",
    };
  }

  /*
   * Priority reasoning may also require clarification when the
   * evidence specifically needed to rank priorities is limited.
   */
  if (
    questionEvidence.intent === "priority" &&
    questionEvidence.status === "limited" &&
    questionEvidence.clarifyingQuestion
  ) {
    return {
      mode: "clarify",
      question:
        questionEvidence.clarifyingQuestion,
      reason: isArabic
        ? "الأدلة الخاصة بتحديد الأولوية غير كافية لترتيبها بثقة مناسبة."
        : "The evidence specifically needed to rank this priority is not sufficient for an appropriately confident conclusion.",
    };
  }

  /*
   * Report summaries and doctor-preparation questions can normally
   * use the stored evidence directly.
   */
  if (
    questionEvidence.intent === "report_summary" ||
    questionEvidence.intent === "doctor_preparation"
  ) {
    return {
      mode: "answer",
      question: null,
      reason: null,
    };
  }

  /*
   * For other questions, answer from the available context unless
   * a more specific reasoning rule requires clarification.
   */
  return {
    mode: "answer",
    question: null,
    reason: null,
  };
}
function buildConversationAwareMessage(
  message: string,
  conversation?: ConversationMessage[]
) {
  const trimmedMessage = message.trim();

  if (!conversation || conversation.length === 0) {
    return trimmedMessage;
  }

  const normalizedMessage =
    trimmedMessage.toLowerCase();

  const isExplicitFollowUp =
    normalizedMessage === "why?" ||
    normalizedMessage === "why" ||
    normalizedMessage === "explain that" ||
    normalizedMessage === "explain more" ||
    normalizedMessage === "tell me more" ||
    normalizedMessage === "what about this?" ||
    normalizedMessage === "what about that?" ||
    normalizedMessage === "لماذا؟" ||
    normalizedMessage === "لماذا" ||
    normalizedMessage === "اشرح أكثر" ||
    normalizedMessage === "اشرح ذلك" ||
    normalizedMessage === "ماذا عن هذا؟";

  const recentConversation =
    conversation.slice(-6);

 const lastAssistantMessage =
  [...recentConversation]
    .reverse()
    .find((item) => item.role === "assistant");

/*
 * Detect whether the latest OrganHeal response asked for additional
 * clinical evidence. This covers multiple clarification stages,
 * not only the first symptom question.
 */
const previousAssistantAskedForClinicalEvidence =
  Boolean(
    lastAssistantMessage &&
      (() => {
        const assistantMessage =
          lastAssistantMessage.content.toLowerCase();

        return (
          assistantMessage.includes(
            "are you having symptoms"
          ) ||
          assistantMessage.includes(
            "what are they and when did they begin"
          ) ||
          assistantMessage.includes(
            "approximately when did these symptoms begin"
          ) ||
          assistantMessage.includes(
            "how would you describe the severity"
          ) ||
          assistantMessage.includes(
            "are you experiencing any other symptoms"
          ) ||
          assistantMessage.includes(
            "highest-value next question"
          ) ||
          assistantMessage.includes(
            "هل لديك أعراض"
          ) ||
          assistantMessage.includes(
            "ما هي ومتى بدأت"
          ) ||
          assistantMessage.includes(
            "متى بدأت هذه الأعراض"
          ) ||
          assistantMessage.includes(
            "كيف تصف شدة الأعراض"
          ) ||
          assistantMessage.includes(
            "هل توجد أعراض أخرى مصاحبة"
          ) ||
          assistantMessage.includes(
            "السؤال التالي الأكثر أهمية"
          )
        );
      })()
  );

/*
 * Preserve the original causal reasoning intent across multiple
 * turns. Do not rely only on the latest user message because later
 * messages may simply contain symptom, onset, severity, or another
 * clarification answer.
 */
const conversationHasCauseReasoning =
  recentConversation.some((item) => {
    if (item.role !== "user") {
      return false;
    }

    const userMessage =
      item.content.toLowerCase();

    return (
      userMessage.includes(
        "what could be causing"
      ) ||
      userMessage.includes(
        "what is causing"
      ) ||
      userMessage.includes(
        "what caused"
      ) ||
      userMessage.includes(
        "cause of"
      ) ||
      userMessage.includes(
        "why is this abnormal"
      ) ||
      userMessage.includes(
        "why are these abnormal"
      ) ||
      userMessage.includes(
        "diagnosis"
      ) ||
      userMessage.includes(
        "diagnose"
      ) ||
      userMessage.includes(
        "ما سبب"
      ) ||
      userMessage.includes(
        "ما الذي يسبب"
      ) ||
      userMessage.includes(
        "ليش"
      ) ||
      userMessage.includes(
        "شو السبب"
      ) ||
      userMessage.includes(
        "شو ممكن يكون"
      )
    );
  });

const isClarificationAnswer =
  previousAssistantAskedForClinicalEvidence &&
  conversationHasCauseReasoning;

  if (
    !isExplicitFollowUp &&
    !isClarificationAnswer
  ) {
    return trimmedMessage;
  }

  const recentContext =
    recentConversation
      .map(
        (item) =>
          `${item.role}: ${item.content}`
      )
      .join("\n");

  if (isClarificationAnswer) {
    return `Original clinical reasoning intent: cause_reasoning

The user is answering a clarification question related to the previous causal reasoning request.

New user evidence:
${trimmedMessage}

Recent conversation context:
${recentContext}

Continue evaluating the original question using this new evidence.`;
  }

  return `${trimmedMessage}

Recent conversation context:
${recentContext}`;
}
function extractClarificationEvidence(
  message: string
): string | null {
  const evidenceMarker = "New user evidence:";
  const contextMarker = "Recent conversation context:";

  const evidenceStart =
    message.indexOf(evidenceMarker);

  if (evidenceStart === -1) {
    return null;
  }

  const contentStart =
    evidenceStart + evidenceMarker.length;

  const contextStart =
    message.indexOf(
      contextMarker,
      contentStart
    );

  const evidence =
    message
      .slice(
        contentStart,
        contextStart === -1
          ? undefined
          : contextStart
      )
      .trim();

  return evidence || null;
}
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
}function mergeStructuredClinicalEvidence(
  evidenceItems: StructuredClinicalEvidence[]
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
        (item) => item.associatedSymptoms
      )
    )
  );
const associatedSymptomsKnown =
  evidenceItems.some(
    (item) => item.associatedSymptomsKnown
  ) ||
  associatedSymptoms.length > 0;
  const latestOnset =
    [...evidenceItems]
      .reverse()
      .find((item) => Boolean(item.onset))
      ?.onset || null;

  const latestSeverity =
    [...evidenceItems]
      .reverse()
      .find((item) => Boolean(item.severity))
      ?.severity || null;

return {
  symptoms,
  onset: latestOnset,
  severity: latestSeverity,
  associatedSymptoms,
  associatedSymptomsKnown,
};
}

function assessClinicalEvidenceCompletion(
  evidence: StructuredClinicalEvidence
): ClinicalEvidenceCompletion {
  const completedFields: string[] = [];
  const missingFields: string[] = [];

  if (evidence.symptoms.length > 0) {
    completedFields.push("symptoms");
  } else {
    missingFields.push("symptoms");
  }

  if (evidence.onset) {
    completedFields.push("onset");
  } else {
    missingFields.push("onset");
  }

  if (evidence.severity) {
    completedFields.push("severity");
  } else {
    missingFields.push("severity");
  }

  if (evidence.associatedSymptomsKnown) {
    completedFields.push("associatedSymptoms");
  } else {
    missingFields.push("associatedSymptoms");
  }

  const complete =
    missingFields.length === 0;

  if (complete) {
    return {
      complete: true,
      status: "ready",
      completedFields,
      missingFields,
    };
  }

  if (completedFields.length >= 2) {
    return {
      complete: false,
      status: "partial",
      completedFields,
      missingFields,
    };
  }

   return {
    complete: false,
    status: "insufficient",
    completedFields,
    missingFields,
  };
}

function buildAccumulatedClinicalEvidence(
  currentEvidence: string | null,
  conversation?: ConversationMessage[]
): StructuredClinicalEvidence {
  const evidenceItems: StructuredClinicalEvidence[] = [];

  if (conversation && conversation.length > 0) {
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
function getHighestValueClinicalQuestion(
  evidence: StructuredClinicalEvidence,
  language: "en" | "ar"
): string | null {
  const isArabic = language === "ar";

  /*
   * Ask for the most decision-relevant missing information first.
   * The order here is intentionally deterministic for now.
   */

  if (evidence.symptoms.length === 0) {
    return isArabic
      ? "ما الأعراض التي تشعر بها حاليًا والمرتبطة بهذه المشكلة؟"
      : "What symptoms are you currently experiencing that may be related to this concern?";
  }

  if (!evidence.onset) {
    return isArabic
      ? "متى بدأت هذه الأعراض تقريبًا؟"
      : "Approximately when did these symptoms begin?";
  }

  if (!evidence.severity) {
    return isArabic
      ? "كيف تصف شدة الأعراض: خفيفة، متوسطة، أم شديدة؟"
      : "How would you describe the severity of the symptoms: mild, moderate, or severe?";
  }

  if (!evidence.associatedSymptomsKnown) {
    return isArabic
      ? "هل توجد أعراض أخرى مصاحبة لهذه الأعراض؟"
      : "Are you experiencing any other symptoms along with these symptoms?";
  }

    return null;
}

function buildPersonalizedResponse(
  message: string,
  language: "en" | "ar",
  healthContext?: HealthContext | null,
  conversation?: ConversationMessage[]
) {
  const isArabic = language === "ar";
  const lowerMessage = message.toLowerCase();

  if (!hasHealthContext(healthContext) || !healthContext) {
    return buildGeneralEducationalResponse(message, language);
  }

  const overallScore =
    typeof healthContext.overallScore === "number"
      ? healthContext.overallScore
      : null;

  const priorityArea =
    healthContext.priorityOrgan ||
    (isArabic ? "الصحة العامة" : "General Health");

  const strongestArea =
    healthContext.strongestOrgan ||
    (isArabic ? "الصحة العامة" : "General Health");

  const riskPattern =
    healthContext.riskPattern ||
    (isArabic ? "غير متوفر حاليًا" : "Not currently available");

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
const evidenceCompletion =
  assessClinicalEvidenceCompletion(
    structuredClinicalEvidence
  );

const evidenceBackedReasoning =
  buildEvidenceBackedReasoning({
    symptoms:
      structuredClinicalEvidence.symptoms,
    onset:
      structuredClinicalEvidence.onset,
    severity:
      structuredClinicalEvidence.severity,
    associatedSymptoms:
      structuredClinicalEvidence.associatedSymptoms,
    associatedSymptomsKnown:
      structuredClinicalEvidence.associatedSymptomsKnown,
    reportSummary:
      latestReport?.summary || null,
    reportKeyFindings:
      latestReport?.keyFindings || null,
    reportRiskLevel:
      latestReport?.riskLevel || null,
  });

const highestValueClinicalQuestion =
  evidenceCompletion.complete
    ? null
    : getHighestValueClinicalQuestion(
        structuredClinicalEvidence,
        language
      );
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
${evidenceBackedReasoning.confirmedEvidence.join("\n")}

حدود الاستنتاج:
${evidenceBackedReasoning.uncertainty}`
      : `Evidence-backed reasoning state:
Ready for bounded hypothesis reasoning.

Confirmed evidence being used:
${evidenceBackedReasoning.confirmedEvidence.join("\n")}

Reasoning boundary:
${evidenceBackedReasoning.uncertainty}`
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

  if (
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
const latestReport =
  healthContext.latestReportContext;

const hasReportIntent =
  lowerMessage.includes("report") ||
  lowerMessage.includes("lab") ||
  lowerMessage.includes("result") ||
  lowerMessage.includes("finding") ||
  lowerMessage.includes("تقرير") ||
  lowerMessage.includes("فحص") ||
  lowerMessage.includes("نتيجة") ||
  lowerMessage.includes("نتائج");

const hasDoctorIntent =
  lowerMessage.includes("doctor") ||
  lowerMessage.includes("visit") ||
  lowerMessage.includes("brief") ||
  lowerMessage.includes("طبيب") ||
  lowerMessage.includes("دكتور");

const hasFindingsIntent =
  lowerMessage.includes("finding") ||
  lowerMessage.includes("findings") ||
  lowerMessage.includes("abnormal") ||
  lowerMessage.includes("summary") ||
  lowerMessage.includes("show") ||
  lowerMessage.includes("نتائج") ||
  lowerMessage.includes("نتيجة") ||
  lowerMessage.includes("غير طبيعي") ||
  lowerMessage.includes("ملخص");

const hasReportActionIntent =
  lowerMessage.includes("next") ||
  lowerMessage.includes("action") ||
  lowerMessage.includes("recommend") ||
  lowerMessage.includes("what should i do") ||
  lowerMessage.includes("الخطوة") ||
  lowerMessage.includes("ماذا أفعل") ||
  lowerMessage.includes("توصية") ||
  lowerMessage.includes("توصيات");

if (hasReportIntent && !latestReport) {
  return isArabic
    ? `لا يوجد تقرير طبي حديث متاح في سياقك الصحي حاليًا.

يمكنك رفع تقرير طبي جديد ثم تحليله في OrganHeal للحصول على إرشاد أكثر تخصيصًا.`
    : `There is no recent medical report available in your current health context.

You can upload and analyze a medical report in OrganHeal to receive more personalized guidance.`;
}

/*
 * 1. Doctor + Report
 * Highest-priority report intent because the user is asking
 * specifically how the report should inform a doctor discussion.
 */
if (
  hasReportIntent &&
  hasDoctorIntent &&
  latestReport
) {
  return isArabic
    ? `للتحضير لمناقشة أحدث تقرير مع طبيبك، ركّز على:

التقرير:
${latestReport.fileName}

الملخص المخصص للطبيب:
${latestReport.doctorBrief || latestReport.summary || "لا يوجد ملخص مخصص للطبيب محفوظ حاليًا."}

أهم النتائج التي تستحق المناقشة:
${latestReport.keyFindings || "لا توجد نتائج رئيسية محفوظة حاليًا."}

التوصيات:
${latestReport.recommendations || "لا توجد توصيات محفوظة حاليًا."}

الخطوة التالية المقترحة:
${latestReport.nextBestAction || nextAction}

يمكنك استخدام هذه النقاط للتحضير للمناقشة، لكنها لا تستبدل تقييم الطبيب أو تشخيصه.`
    : `To prepare for a discussion with your doctor about your latest report, focus on:

Report:
${latestReport.fileName}

Doctor-focused summary:
${latestReport.doctorBrief || latestReport.summary || "No doctor-focused summary is currently saved."}

Key findings worth discussing:
${latestReport.keyFindings || "No key findings are currently saved."}

Recommendations:
${latestReport.recommendations || "No saved recommendations are currently available."}

Suggested next step:
${latestReport.nextBestAction || nextAction}

You can use these points to prepare for the discussion, but they do not replace your clinician's assessment or diagnosis.`;
}

/*
 * 2. Report Findings
 */
if (
  hasReportIntent &&
  hasFindingsIntent &&
  latestReport
) {
  return isArabic
    ? `أهم المعلومات في أحدث تقرير لديك هي:

التقرير:
${latestReport.fileName}

نوع التقرير:
${latestReport.reportType}

الملخص:
${latestReport.summary || "لا يتوفر ملخص للتقرير حاليًا."}

أهم النتائج:
${latestReport.keyFindings || "لا توجد نتائج رئيسية محفوظة حاليًا."}

مستوى المخاطر:
${latestReport.riskLevel || "غير محدد حاليًا."}

هذه المعلومات مأخوذة من التحليل المحفوظ للتقرير وهي للتثقيف الصحي وليست تشخيصًا طبيًا.`
    : `The main information from your latest report is:

Report:
${latestReport.fileName}

Report type:
${latestReport.reportType}

Summary:
${latestReport.summary || "No report summary is currently available."}

Key findings:
${latestReport.keyFindings || "No key findings are currently saved."}

Risk level:
${latestReport.riskLevel || "Not currently specified."}

This information comes from the saved report analysis and is for health education, not medical diagnosis.`;
}

/*
 * 3. Report Next Action
 */
if (
  hasReportIntent &&
  hasReportActionIntent &&
  latestReport
) {
  return isArabic
    ? `بناءً على أحدث تقرير لديك، ركّز على الخطوة العملية التالية:

التقرير:
${latestReport.fileName}

التوصيات:
${latestReport.recommendations || "لا توجد توصيات محفوظة حاليًا."}

الخطوة التالية:
${latestReport.nextBestAction || nextAction}

مستوى المخاطر:
${latestReport.riskLevel || "غير محدد حاليًا."}

إذا كانت لديك أعراض جديدة أو متفاقمة، يجب أن يعتمد قرار المتابعة على تقييم طبي مناسب.`
    : `Based on your latest report, the practical next step is:

Report:
${latestReport.fileName}

Recommendations:
${latestReport.recommendations || "No saved recommendations are currently available."}

Next step:
${latestReport.nextBestAction || nextAction}

Risk level:
${latestReport.riskLevel || "Not currently specified."}

If you have new or worsening symptoms, follow-up decisions should be based on appropriate clinical evaluation.`;
}

/*
 * 4. General Report
 */
if (hasReportIntent && latestReport) {
  return isArabic
    ? `بناءً على أحدث تقرير طبي لديك:

التقرير:
${latestReport.fileName}

نوع التقرير:
${latestReport.reportType}

الملخص:
${latestReport.summary || "لا يتوفر ملخص للتقرير حاليًا."}

أهم النتائج:
${latestReport.keyFindings || "لا توجد نتائج رئيسية محفوظة حاليًا."}

الخطوة التالية:
${latestReport.nextBestAction || nextAction}

يمكنني أيضًا مساعدتك في فهم النتائج، الخطوة التالية، أو ما الذي يمكنك مناقشته مع الطبيب.`
    : `Based on your latest medical report:

Report:
${latestReport.fileName}

Report type:
${latestReport.reportType}

Summary:
${latestReport.summary || "No report summary is currently available."}

Key findings:
${latestReport.keyFindings || "No key findings are currently saved."}

Next step:
${latestReport.nextBestAction || nextAction}

I can also help you understand the findings, the next step, or what you may want to discuss with your doctor.`;
}

/*
 * 5. General Doctor
 */
if (hasDoctorIntent) {
  return isArabic
    ? `هذه المعلومات يمكن استخدامها للتحضير لمناقشتك مع الطبيب:

${doctorBrief}

منطقة الأولوية الحالية:
${priorityArea}

الخطوة التالية المقترحة:
${nextAction}

هذا ملخص تثقيفي ولا يستبدل التقييم أو التشخيص الطبي.`
    : `You can use the following information to prepare for your discussion with your doctor:

${doctorBrief}

Current priority area:
${priorityArea}

Suggested next step:
${nextAction}

This is educational support and does not replace medical assessment or diagnosis.`;
}
  if (
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

export async function POST(req: Request) {
  try {
    const {
      message,
      language = "en",
      healthContext,
      conversation,
    } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        {
          error: "Message is required",
        },
        { status: 400 }
      );
    }

    const normalizedLanguage: "en" | "ar" =
      language === "ar" ? "ar" : "en";

    const conversationAwareMessage =
  buildConversationAwareMessage(
    message.trim(),
    Array.isArray(conversation)
      ? (conversation as ConversationMessage[])
      : []
  );

const normalizedHealthContext =
  healthContext as HealthContext | null;

const reasoningReadiness =
  assessReasoningReadiness(
    normalizedHealthContext,
    normalizedLanguage
  );
  const questionEvidence =
  assessQuestionEvidence(
    conversationAwareMessage,
    normalizedHealthContext,
    normalizedLanguage
  );

const reasoningDecision =
  decideReasoningPath(
    questionEvidence,
    normalizedLanguage
  );

if (
  reasoningDecision.mode === "clarify" &&
  reasoningDecision.question
) {
  return NextResponse.json({
    success: true,
    response: reasoningDecision.question,
    reasoning: {
  mode: "clarify",

  status: reasoningReadiness.status,
  confidence: reasoningReadiness.confidence,

  availableEvidence:
    reasoningReadiness.availableEvidence,

  missingInformation:
    reasoningReadiness.missingInformation,

  questionIntent:
    questionEvidence.intent,

  questionEvidenceStatus:
    questionEvidence.status,

  questionEvidenceConfidence:
    questionEvidence.confidence,

  questionAvailableEvidence:
    questionEvidence.availableEvidence,

  questionMissingInformation:
    questionEvidence.missingInformation,

  clarifyingQuestion:
    reasoningDecision.question,

  reason:
    reasoningDecision.reason,
},
  });
}

const response = buildPersonalizedResponse(
  conversationAwareMessage,
  normalizedLanguage,
  normalizedHealthContext,
  Array.isArray(conversation)
    ? (conversation as ConversationMessage[])
    : []
);

return NextResponse.json({
  success: true,
  response,
 reasoning: {
  mode: "answer",

  status: reasoningReadiness.status,
  confidence: reasoningReadiness.confidence,

  availableEvidence:
    reasoningReadiness.availableEvidence,

  missingInformation:
    reasoningReadiness.missingInformation,

  questionIntent:
    questionEvidence.intent,

  questionEvidenceStatus:
    questionEvidence.status,

  questionEvidenceConfidence:
    questionEvidence.confidence,

  questionAvailableEvidence:
    questionEvidence.availableEvidence,

  questionMissingInformation:
    questionEvidence.missingInformation,

  clarifyingQuestion:
    questionEvidence.clarifyingQuestion,

  reason: null,
},
});
  } catch (error) {
    console.error("Assistant API error:", error);

    return NextResponse.json(
      {
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
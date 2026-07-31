export type AssistantDecisionHealthContext = {
  overallScore?: number | null;
  priorityOrgan?: string | null;
  riskPattern?: string | null;
  doctorBrief?: string | null;
  recommendation?: string | null;

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
};

export type ReasoningReadiness = {
  status: "sufficient" | "partial" | "limited";
  confidence: "high" | "moderate" | "low";
  availableEvidence: string[];
  missingInformation: string[];
  clarifyingQuestion: string | null;
};

export type ReasoningDecision = {
  mode: "answer" | "clarify";
  question: string | null;
  reason: string | null;
};

export type ReasoningIntent =
  | "report_summary"
  | "doctor_preparation"
  | "priority"
  | "cause_reasoning"
  | "general";

export type QuestionEvidenceReadiness = {
  intent: ReasoningIntent;
  status: "sufficient" | "partial" | "limited";
  confidence: "high" | "moderate" | "low";
  availableEvidence: string[];
  missingInformation: string[];
  shouldClarify: boolean;
  clarifyingQuestion: string | null;
};

export function assessReasoningReadiness(
  healthContext:
    | AssistantDecisionHealthContext
    | null
    | undefined,
  language: "en" | "ar"
): ReasoningReadiness {
  const isArabic = language === "ar";

  if (!healthContext) {
    return {
      status: "limited",
      confidence: "low",
      availableEvidence: [],
      missingInformation: [
        isArabic
          ? "السياق الصحي الأساسي"
          : "Basic health context",
        isArabic
          ? "تقييم صحي أو تقرير طبي"
          : "Health assessment or medical report",
      ],
      clarifyingQuestion: isArabic
        ? "هل لديك تقرير طبي حديث أو تقييم صحي يمكنني استخدامه لفهم حالتك بشكل أفضل؟"
        : "Do you have a recent medical report or health assessment I can use to understand your situation better?",
    };
  }

  const availableEvidence: string[] = [];
  const missingInformation: string[] = [];

  if (
    typeof healthContext.overallScore ===
    "number"
  ) {
    availableEvidence.push(
      isArabic
        ? "الدرجة الصحية العامة"
        : "Overall health score"
    );
  }

  if (healthContext.priorityOrgan) {
    availableEvidence.push(
      isArabic
        ? "منطقة الأولوية الصحية"
        : "Priority health area"
    );
  }

  if (healthContext.riskPattern) {
    availableEvidence.push(
      isArabic
        ? "نمط المخاطر"
        : "Risk pattern"
    );
  }

  if (healthContext.doctorBrief) {
    availableEvidence.push(
      isArabic
        ? "ملخص الطبيب"
        : "Doctor brief"
    );
  }

  const latestReport =
    healthContext.latestReportContext;

  if (latestReport) {
    availableEvidence.push(
      isArabic
        ? "أحدث تقرير طبي"
        : "Latest medical report"
    );

    if (latestReport.keyFindings) {
      availableEvidence.push(
        isArabic
          ? "النتائج الرئيسية للتقرير"
          : "Report key findings"
      );
    } else {
      missingInformation.push(
        isArabic
          ? "النتائج الرئيسية للتقرير"
          : "Report key findings"
      );
    }

    if (latestReport.recommendations) {
      availableEvidence.push(
        isArabic
          ? "توصيات التقرير"
          : "Report recommendations"
      );
    }
  } else {
    missingInformation.push(
      isArabic
        ? "تقرير طبي حديث"
        : "Recent medical report"
    );
  }

  if (!healthContext.riskPattern) {
    missingInformation.push(
      isArabic
        ? "نمط مخاطر واضح"
        : "Clear risk pattern"
    );
  }

  if (!healthContext.priorityOrgan) {
    missingInformation.push(
      isArabic
        ? "أولوية صحية محددة"
        : "Defined health priority"
    );
  }

  const evidenceCount =
    availableEvidence.length;

  if (
    evidenceCount >= 5 &&
    missingInformation.length === 0
  ) {
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

export function assessQuestionEvidence(
  message: string,
  healthContext:
    | AssistantDecisionHealthContext
    | null
    | undefined,
  language: "en" | "ar"
): QuestionEvidenceReadiness {
  const isArabic = language === "ar";
  const lowerMessage =
    message.toLowerCase().trim();

  const report =
    healthContext?.latestReportContext;

  const causeIntent =
    lowerMessage.includes(
      "original clinical reasoning intent: cause_reasoning"
    ) ||
    lowerMessage.includes(
      "what could be causing"
    ) ||
    lowerMessage.includes(
      "what is causing"
    ) ||
    lowerMessage.includes("what caused") ||
    lowerMessage.includes("cause of") ||
    lowerMessage.includes(
      "why is this abnormal"
    ) ||
    lowerMessage.includes(
      "why are these abnormal"
    ) ||
    lowerMessage.includes("diagnosis") ||
    lowerMessage.includes("diagnose") ||
    lowerMessage.includes("ما سبب") ||
    lowerMessage.includes(
      "ما الذي يسبب"
    ) ||
    lowerMessage.includes("ليش") ||
    lowerMessage.includes("شو السبب") ||
    lowerMessage.includes(
      "شو ممكن يكون"
    );

  const hasClarificationEvidence =
    lowerMessage.includes(
      "new user evidence:"
    );

  const doctorIntent =
    lowerMessage.includes("doctor") ||
    lowerMessage.includes("clinician") ||
    lowerMessage.includes("visit") ||
    lowerMessage.includes("طبيب") ||
    lowerMessage.includes("دكتور");

  const priorityIntent =
    lowerMessage.includes("priority") ||
    lowerMessage.includes(
      "most important"
    ) ||
    lowerMessage.includes(
      "what should i focus on"
    ) ||
    lowerMessage.includes("الأولوية") ||
    lowerMessage.includes("الأهم") ||
    lowerMessage.includes(
      "على شو أركز"
    );

  const reportIntent =
    lowerMessage.includes("report") ||
    lowerMessage.includes("finding") ||
    lowerMessage.includes("result") ||
    lowerMessage.includes("تقرير") ||
    lowerMessage.includes("نتيجة") ||
    lowerMessage.includes("نتائج");

  if (causeIntent) {
    const availableEvidence: string[] =
      [];

    const missingInformation: string[] =
      [];

    if (report) {
      availableEvidence.push(
        isArabic
          ? "تقرير طبي حديث"
          : "Recent medical report"
      );
    } else {
      missingInformation.push(
        isArabic
          ? "تقرير أو نتائج مرتبطة بالمشكلة"
          : "Relevant report or test results"
      );
    }

    if (report?.keyFindings) {
      availableEvidence.push(
        isArabic
          ? "النتائج الرئيسية"
          : "Key findings"
      );
    } else {
      missingInformation.push(
        isArabic
          ? "النتائج الرئيسية"
          : "Key findings"
      );
    }

    if (report?.riskLevel) {
      availableEvidence.push(
        isArabic
          ? "مستوى المخاطر"
          : "Risk level"
      );
    }

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
        isArabic
          ? "الأعراض الحالية"
          : "Current symptoms",
        isArabic
          ? "وقت بداية الأعراض"
          : "Symptom onset",
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
      Boolean(
        healthContext?.priorityOrgan
      );

    return {
      intent: "priority",
      status: hasPriority
        ? "sufficient"
        : "partial",
      confidence: hasPriority
        ? "high"
        : "moderate",
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
      availableEvidence:
        hasDoctorEvidence
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
      Boolean(
        report?.summary ||
          report?.keyFindings
      );

    return {
      intent: "report_summary",
      status: hasReportEvidence
        ? "sufficient"
        : "limited",
      confidence: hasReportEvidence
        ? "high"
        : "low",
      availableEvidence:
        hasReportEvidence
          ? [
              isArabic
                ? "محتوى التقرير"
                : "Report evidence",
            ]
          : [],
      missingInformation:
        hasReportEvidence
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

export function decideReasoningPath(
  questionEvidence:
    QuestionEvidenceReadiness,
  language: "en" | "ar"
): ReasoningDecision {
  const isArabic = language === "ar";

  if (
    questionEvidence.intent ===
      "cause_reasoning" &&
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

  if (
    questionEvidence.intent ===
      "priority" &&
    questionEvidence.status ===
      "limited" &&
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

  if (
    questionEvidence.intent ===
      "report_summary" ||
    questionEvidence.intent ===
      "doctor_preparation"
  ) {
    return {
      mode: "answer",
      question: null,
      reason: null,
    };
  }

  return {
    mode: "answer",
    question: null,
    reason: null,
  };
}
import type {
  AssistantResponseConversationMessage,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import type {
  ClinicalEvidenceGapType,
} from "@/lib/health-intelligence/models/clinical-evidence-sufficiency";

export type ClinicalConversationInterpretationConfidence =
  | "low"
  | "moderate"
  | "high";

export type ClinicalConversationInterpretation = {
  isClarificationAnswer:
    boolean;

  shouldUpdateState:
    boolean;

  answeredQuestionId:
    string | null;

  answeredGapType:
    ClinicalEvidenceGapType | null;

  userEvidence:
    string | null;

  confidence:
    ClinicalConversationInterpretationConfidence;

  reason:
    string;
};

export type InterpretClinicalConversationInput = {
  message:
    string;

  conversation:
    AssistantResponseConversationMessage[];
};

type ClarificationQuestionDefinition = {
  id:
    string;

  gapType:
    ClinicalEvidenceGapType;

  exactQuestions:
    string[];

  identifyingPhrases:
    string[];
};

const CLARIFICATION_QUESTION_DEFINITIONS:
  ClarificationQuestionDefinition[] = [
    {
      id:
        "clarification:no-evidence",

      gapType:
        "no-evidence",

      exactQuestions: [
        "What health concern, symptom, test result, or medical report would you like OrganHeal to evaluate first?",
        "ما المشكلة الصحية أو العرض أو نتيجة الفحص أو التقرير الطبي الذي تريد من OrganHeal تقييمه أولًا؟",
      ],

      identifyingPhrases: [
        "what health concern",
        "what symptom",
        "what test result",
        "what medical report",
        "ما المشكلة الصحية",
        "نتيجة الفحص",
        "التقرير الطبي",
      ],
    },

    {
      id:
        "clarification:missing-current-context",

      gapType:
        "missing-current-context",

      exactQuestions: [
        "Are you having any symptoms now? Please describe what you feel, when it started, and whether it is improving, stable, or worsening.",
        "هل لديك أي أعراض حاليًا؟ صف ما تشعر به، ومتى بدأت الأعراض، وهل تتحسن أم مستقرة أم تزداد سوءًا.",
      ],

      identifyingPhrases: [
        "are you having any symptoms now",
        "when it started",
        "improving, stable, or worsening",
        "هل لديك أي أعراض حاليًا",
        "متى بدأت الأعراض",
        "تتحسن أم مستقرة أم تزداد سوءًا",
      ],
    },

    {
      id:
        "clarification:missing-health-history",

      gapType:
        "missing-health-history",

      exactQuestions: [
        "Do you have relevant medical conditions, previous similar results, regular medications, allergies, or a family history related to this concern?",
        "هل لديك أمراض سابقة مرتبطة، أو نتائج مشابهة قديمة، أو أدوية منتظمة، أو حساسية، أو تاريخ عائلي يتعلق بهذه المشكلة؟",
      ],

      identifyingPhrases: [
        "relevant medical conditions",
        "previous similar results",
        "regular medications",
        "family history",
        "أمراض سابقة مرتبطة",
        "نتائج مشابهة قديمة",
        "أدوية منتظمة",
        "تاريخ عائلي",
      ],
    },

    {
      id:
        "clarification:missing-user-reported-context",

      gapType:
        "missing-user-reported-context",

      exactQuestions: [
        "What was the reason this test or report was requested, and what specific concern would you like clarified?",
        "ما سبب طلب هذا الفحص أو التقرير، وما النقطة المحددة التي تريد توضيحها؟",
      ],

      identifyingPhrases: [
        "reason this test or report was requested",
        "specific concern",
        "ما سبب طلب هذا الفحص",
        "ما النقطة المحددة",
      ],
    },

    {
      id:
        "clarification:limited-source-diversity",

      gapType:
        "limited-source-diversity",

      exactQuestions: [
        "Do you have another relevant source of information, such as previous results, a medication list, symptom details, vital signs, or a clinician note?",
        "هل لديك مصدر آخر مرتبط، مثل نتائج سابقة أو قائمة أدوية أو تفاصيل الأعراض أو العلامات الحيوية أو ملاحظة من الطبيب؟",
      ],

      identifyingPhrases: [
        "another relevant source of information",
        "previous results",
        "medication list",
        "vital signs",
        "مصدر آخر مرتبط",
        "قائمة أدوية",
        "العلامات الحيوية",
      ],
    },

    {
      id:
        "clarification:no-explicit-relationships",

      gapType:
        "no-explicit-relationships",

      exactQuestions: [
        "Were these findings recorded during the same health event, and did your clinician explain whether they might be related?",
        "هل سُجلت هذه النتائج خلال الحالة الصحية نفسها، وهل أوضح الطبيب إن كان من المحتمل أن تكون مرتبطة ببعضها؟",
      ],

      identifyingPhrases: [
        "recorded during the same health event",
        "whether they might be related",
        "خلال الحالة الصحية نفسها",
        "مرتبطة ببعضها",
      ],
    },

    {
      id:
        "clarification:unresolved-domain",

      gapType:
        "unresolved-domain",

      exactQuestions: [
        "Which unresolved symptom, finding, or body area is most important to you right now, and has it been assessed by a clinician?",
        "ما العرض أو النتيجة أو منطقة الجسم غير المحسومة والأكثر أهمية لك الآن، وهل تم تقييمها من طبيب؟",
      ],

      identifyingPhrases: [
        "which unresolved symptom",
        "body area is most important",
        "assessed by a clinician",
        "منطقة الجسم غير المحسومة",
        "الأكثر أهمية لك الآن",
        "تم تقييمها من طبيب",
      ],
    },
  ];

const NON_ANSWERS = new Set([
  "",
  "yes",
  "no",
  "ok",
  "okay",
  "sure",
  "maybe",
  "i don't know",
  "i do not know",
  "not sure",
  "نعم",
  "لا",
  "حسنا",
  "حسنًا",
  "تمام",
  "ربما",
  "لا أعرف",
  "لست متأكدًا",
  "لست متاكدا",
]);

function normalizeText(
  value:
    string
): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(
      /[?!.,،؛:()[\]{}"'`]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function getLastAssistantMessage(
  conversation:
    AssistantResponseConversationMessage[]
): string | null {
  return (
    [...conversation]
      .reverse()
      .find(
        (item) =>
          item.role ===
          "assistant"
      )
      ?.content ??
    null
  );
}

function findClarificationDefinition(
  assistantMessage:
    string
): ClarificationQuestionDefinition | null {
  const normalizedMessage =
    normalizeText(
      assistantMessage
    );

  for (
    const definition of
    CLARIFICATION_QUESTION_DEFINITIONS
  ) {
    const hasExactQuestion =
      definition
        .exactQuestions
        .some(
          (question) =>
            normalizedMessage ===
            normalizeText(
              question
            )
        );

    if (
      hasExactQuestion
    ) {
      return definition;
    }

    const phraseMatchCount =
      definition
        .identifyingPhrases
        .filter(
          (phrase) =>
            normalizedMessage.includes(
              normalizeText(
                phrase
              )
            )
        )
        .length;

    if (
      phraseMatchCount >=
      2
    ) {
      return definition;
    }
  }

  return null;
}

function hasMeaningfulEvidence(
  message:
    string
): boolean {
  const normalizedMessage =
    normalizeText(
      message
    );

  if (
    NON_ANSWERS.has(
      normalizedMessage
    )
  ) {
    return false;
  }

  const words =
    normalizedMessage
      .split(
        " "
      )
      .filter(
        Boolean
      );

  return (
    normalizedMessage.length >=
      8 &&
    words.length >=
      2
  );
}

function resolveConfidence(
  definition:
    ClarificationQuestionDefinition | null,
  hasEvidence:
    boolean
): ClinicalConversationInterpretationConfidence {
  if (
    definition &&
    hasEvidence
  ) {
    return "high";
  }

  if (
    definition ||
    hasEvidence
  ) {
    return "moderate";
  }

  return "low";
}

export function interpretClinicalConversation({
  message,
  conversation,
}: InterpretClinicalConversationInput):
  ClinicalConversationInterpretation {
  const normalizedEvidence =
    message.trim();

  const lastAssistantMessage =
    getLastAssistantMessage(
      conversation
    );

  if (
    !lastAssistantMessage
  ) {
    return {
      isClarificationAnswer:
        false,

      shouldUpdateState:
        false,

      answeredQuestionId:
        null,

      answeredGapType:
        null,

      userEvidence:
        null,

      confidence:
        "low",

      reason:
        "No previous assistant message is available to establish that the current message answers a clinical clarification question.",
    };
  }

  const definition =
    findClarificationDefinition(
      lastAssistantMessage
    );

  if (
    !definition
  ) {
    return {
      isClarificationAnswer:
        false,

      shouldUpdateState:
        false,

      answeredQuestionId:
        null,

      answeredGapType:
        null,

      userEvidence:
        null,

      confidence:
        "low",

      reason:
        "The previous assistant message was not recognized as a supported clinical clarification question.",
    };
  }

  const meaningfulEvidence =
    hasMeaningfulEvidence(
      normalizedEvidence
    );

  if (
    !meaningfulEvidence
  ) {
    return {
      isClarificationAnswer:
        true,

      shouldUpdateState:
        false,

      answeredQuestionId:
        definition.id,

      answeredGapType:
        definition.gapType,

      userEvidence:
        null,

      confidence:
        resolveConfidence(
          definition,
          false
        ),

      reason:
        "The message follows a recognized clinical clarification question, but it does not contain enough meaningful information to update the reasoning state.",
    };
  }

  return {
    isClarificationAnswer:
      true,

    shouldUpdateState:
      true,

    answeredQuestionId:
      definition.id,

    answeredGapType:
      definition.gapType,

    userEvidence:
      normalizedEvidence,

    confidence:
      resolveConfidence(
        definition,
        true
      ),

    reason:
      "The message contains meaningful user-reported evidence and directly follows a recognized clinical clarification question.",
  };
}
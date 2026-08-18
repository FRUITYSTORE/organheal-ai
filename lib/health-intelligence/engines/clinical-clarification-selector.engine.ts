import type {
  ClinicalEvidenceGap,
  ClinicalEvidenceGapType,
} from "@/lib/health-intelligence/models/clinical-evidence-sufficiency";

import type {
  ClinicalClarificationQuestion,
  ClinicalPriority,
  WholeBodyClinicalKnowledgeModel,
  WholeBodyHealthDomain,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

export type ClinicalClarificationLanguage =
  | "en"
  | "ar";

export type ClinicalClarificationSelectionInput = {
  question?:
    string;

  knowledge:
    WholeBodyClinicalKnowledgeModel;

  language?:
    ClinicalClarificationLanguage;

  resolvedGapTypes?:
    ClinicalEvidenceGapType[];

  previouslyAskedQuestionIds?:
    string[];
};

export type ClinicalClarificationSelectionResult = {
  question:
    ClinicalClarificationQuestion | null;

  selectedGap:
    ClinicalEvidenceGap | null;

  consideredGapCount:
    number;

  excludedResolvedGapCount:
    number;

  excludedPreviouslyAskedCount:
    number;

  reason:
    string | null;

  generatedAt:
    string;
};

type ClarificationQuestionTemplate = {
  questionEn:
    string;

  questionAr:
    string;

  expectedInformationEn:
    string;

  expectedInformationAr:
    string;

  answerMayChange:
    ClinicalClarificationQuestion["answerMayChange"];
};

const GAP_PRIORITY_ORDER:
  ClinicalEvidenceGapType[] = [
    "no-evidence",
    "missing-current-context",
    "unresolved-domain",
    "missing-health-history",
    "missing-user-reported-context",
    "limited-source-diversity",
    "no-explicit-relationships",
  ];

const GAP_QUESTION_TEMPLATES:
  Record<
    ClinicalEvidenceGapType,
    ClarificationQuestionTemplate
  > = {
    "no-evidence": {
      questionEn:
        "What health concern, symptom, test result, or medical report would you like OrganHeal to evaluate first?",

      questionAr:
        "ما المشكلة الصحية أو العرض أو نتيجة الفحص أو التقرير الطبي الذي تريد من OrganHeal تقييمه أولًا؟",

      expectedInformationEn:
        "The main health concern or source of evidence that should begin the assessment.",

      expectedInformationAr:
        "المشكلة الصحية الأساسية أو مصدر الدليل الذي يجب أن يبدأ منه التقييم.",

      answerMayChange: [
        "interpretation",
        "risk",
        "priority",
        "next-action",
      ],
    },

    "missing-current-context": {
      questionEn:
        "Are you having any symptoms now? Please describe what you feel, when it started, and whether it is improving, stable, or worsening.",

      questionAr:
        "هل لديك أي أعراض حاليًا؟ صف ما تشعر به، ومتى بدأت الأعراض، وهل تتحسن أم مستقرة أم تزداد سوءًا.",

      expectedInformationEn:
        "Current symptoms, onset, progression, and present clinical condition.",

      expectedInformationAr:
        "الأعراض الحالية ووقت بدايتها وتطورها والحالة السريرية الآن.",

      answerMayChange: [
        "interpretation",
        "confidence",
        "risk",
        "priority",
        "next-action",
      ],
    },

    "missing-health-history": {
      questionEn:
        "Do you have relevant medical conditions, previous similar results, regular medications, allergies, or a family history related to this concern?",

      questionAr:
        "هل لديك أمراض سابقة مرتبطة، أو نتائج مشابهة قديمة، أو أدوية منتظمة، أو حساسية، أو تاريخ عائلي يتعلق بهذه المشكلة؟",

      expectedInformationEn:
        "Relevant medical history, previous results, medications, allergies, and family history.",

      expectedInformationAr:
        "التاريخ المرضي والنتائج السابقة والأدوية والحساسية والتاريخ العائلي ذي الصلة.",

      answerMayChange: [
        "interpretation",
        "confidence",
        "risk",
        "priority",
        "next-action",
      ],
    },

    "missing-user-reported-context": {
      questionEn:
        "What was the reason this test or report was requested, and what specific concern would you like clarified?",

      questionAr:
        "ما سبب طلب هذا الفحص أو التقرير، وما النقطة المحددة التي تريد توضيحها؟",

      expectedInformationEn:
        "The clinical reason for testing and the user's main question or concern.",

      expectedInformationAr:
        "السبب السريري لإجراء الفحص والسؤال أو القلق الرئيسي لدى المستخدم.",

      answerMayChange: [
        "interpretation",
        "confidence",
        "priority",
        "next-action",
      ],
    },

    "limited-source-diversity": {
      questionEn:
        "Do you have another relevant source of information, such as previous results, a medication list, symptom details, vital signs, or a clinician note?",

      questionAr:
        "هل لديك مصدر آخر مرتبط، مثل نتائج سابقة أو قائمة أدوية أو تفاصيل الأعراض أو العلامات الحيوية أو ملاحظة من الطبيب؟",

      expectedInformationEn:
        "An additional independent evidence source that can confirm, challenge, or contextualize the current information.",

      expectedInformationAr:
        "مصدر دليل إضافي مستقل يمكنه تأكيد المعلومات الحالية أو معارضتها أو وضعها في سياقها.",

      answerMayChange: [
        "interpretation",
        "confidence",
        "risk",
        "priority",
      ],
    },

    "no-explicit-relationships": {
      questionEn:
        "Were these findings recorded during the same health event, and did your clinician explain whether they might be related?",

      questionAr:
        "هل سُجلت هذه النتائج خلال الحالة الصحية نفسها، وهل أوضح الطبيب إن كان من المحتمل أن تكون مرتبطة ببعضها؟",

      expectedInformationEn:
        "Temporal or clinician-confirmed context that may connect otherwise separate findings.",

      expectedInformationAr:
        "سياق زمني أو توضيح طبي يمكن أن يربط بين النتائج المنفصلة.",

      answerMayChange: [
        "interpretation",
        "confidence",
        "priority",
      ],
    },

    "unresolved-domain": {
      questionEn:
        "Which unresolved symptom, finding, or body area is most important to you right now, and has it been assessed by a clinician?",

      questionAr:
        "ما العرض أو النتيجة أو منطقة الجسم غير المحسومة والأكثر أهمية لك الآن، وهل تم تقييمها من طبيب؟",

      expectedInformationEn:
        "The unresolved clinical focus and whether professional assessment already exists.",

      expectedInformationAr:
        "المجال السريري غير المحسوم وما إذا كان قد خضع لتقييم مهني سابق.",

      answerMayChange: [
        "interpretation",
        "confidence",
        "risk",
        "priority",
        "next-action",
      ],
    },
  };

  const SYMPTOM_SIGNAL_PATTERNS = [
  /\b(?:pain|ache|dizzy|dizziness|fatigue|tired|weak|weakness|fever|cough|vomit|vomiting|nausea|breathless|breathlessness|shortness of breath|palpitation|palpitations|headache|faint|fainted|swelling|diarrhea|bleeding)\b/i,
  /(?:ألم|الم|وجع|دوخة|دوار|تعب|إرهاق|ارهاق|ضعف|حرارة|حمى|سعال|كحة|قيء|استفراغ|غثيان|ضيق تنفس|خفقان|صداع|إغماء|اغماء|تورم|إسهال|اسهال|نزيف)/,
];

function looksLikeSymptomReport(
  question:
    string
): boolean {
  const normalizedQuestion =
    question.trim();

  if (!normalizedQuestion) {
    return false;
  }

  return SYMPTOM_SIGNAL_PATTERNS.some(
    (pattern) =>
      pattern.test(
        normalizedQuestion
      )
  );
}

function createSymptomIntakeQuestion(
  gap:
    ClinicalEvidenceGap,
  knowledge:
    WholeBodyClinicalKnowledgeModel,
  language:
    ClinicalClarificationLanguage
): ClinicalClarificationQuestion {
  const baseQuestion =
    createClarificationQuestion(
      gap,
      knowledge,
      language
    );

  return {
    ...baseQuestion,

    question:
      language === "ar"
        ? "أريد أن أفهم الأعراض بشكل أدق: متى بدأت، ما شدتها الآن، هل تتحسن أم تزداد سوءًا، وهل لديك أي أعراض مقلقة مصاحبة مثل ضيق شديد في التنفس، إغماء، ألم شديد أو مفاجئ، نزيف، ارتباك، أو ضعف مفاجئ؟"
        : "I want to understand the symptoms more clearly: when did they start, how severe are they now, are they improving or worsening, and do you have any concerning symptoms such as severe shortness of breath, fainting, sudden or severe pain, bleeding, confusion, or sudden weakness?",

    expectedInformation:
      language === "ar"
        ? "وقت بداية الأعراض، شدتها، تطورها، والأعراض المصاحبة التي قد تغير درجة الاستعجال أو الحاجة إلى تقييم طبي سريع."
        : "Symptom onset, severity, progression, and associated features that could change urgency or the need for prompt medical assessment.",

    priority:
      "important",

    answerMayChange: [
      "interpretation",
      "confidence",
      "risk",
      "priority",
      "next-action",
    ],
  };
}

function getImpactWeight(
  impact:
    ClinicalEvidenceGap["impact"]
): number {
  if (
    impact ===
    "high"
  ) {
    return 3;
  }

  if (
    impact ===
    "moderate"
  ) {
    return 2;
  }

  return 1;
}

function getTypeOrder(
  type:
    ClinicalEvidenceGapType
): number {
  const index =
    GAP_PRIORITY_ORDER.indexOf(
      type
    );

  return index ===
    -1
    ? GAP_PRIORITY_ORDER.length
    : index;
}

function rankGaps(
  gaps:
    ClinicalEvidenceGap[]
): ClinicalEvidenceGap[] {
  return [
    ...gaps,
  ].sort(
    (
      first,
      second
    ) => {
      const impactDifference =
        getImpactWeight(
          second.impact
        ) -
        getImpactWeight(
          first.impact
        );

      if (
        impactDifference !==
        0
      ) {
        return impactDifference;
      }

      const typeDifference =
        getTypeOrder(
          first.type
        ) -
        getTypeOrder(
          second.type
        );

      if (
        typeDifference !==
        0
      ) {
        return typeDifference;
      }

      return first.id.localeCompare(
        second.id
      );
    }
  );
}

function resolveQuestionDomain(
  gap:
    ClinicalEvidenceGap,
  knowledge:
    WholeBodyClinicalKnowledgeModel
): WholeBodyHealthDomain {
  return (
    gap.affectedDomains[0] ??
    knowledge.unresolvedDomains[0] ??
    knowledge.coveredDomains[0] ??
    "general-systemic"
  );
}

function resolveQuestionPriority(
  gap:
    ClinicalEvidenceGap
): ClinicalPriority {
  if (
    gap.impact ===
    "high"
  ) {
    return "important";
  }

  if (
    gap.impact ===
    "moderate"
  ) {
    return "monitor";
  }

  return "routine";
}

function createQuestionId(
  gap:
    ClinicalEvidenceGap
): string {
  return `clarification:${gap.type}`;
}

function createClarificationQuestion(
  gap:
    ClinicalEvidenceGap,
  knowledge:
    WholeBodyClinicalKnowledgeModel,
  language:
    ClinicalClarificationLanguage
): ClinicalClarificationQuestion {
  const template =
    GAP_QUESTION_TEMPLATES[
      gap.type
    ];

  return {
    id:
      createQuestionId(
        gap
      ),

    question:
      language ===
        "ar"
        ? template.questionAr
        : template.questionEn,

    domain:
      resolveQuestionDomain(
        gap,
        knowledge
      ),

    reason:
      gap.reason,

    expectedInformation:
      language ===
        "ar"
        ? template
            .expectedInformationAr
        : template
            .expectedInformationEn,

    affectedNodeIds:
      knowledge.nodes
        .filter(
          (node) =>
            gap.affectedDomains
              .length ===
              0 ||
            node.domains.some(
              (domain) =>
                gap
                  .affectedDomains
                  .includes(
                    domain
                  )
            )
        )
        .map(
          (node) =>
            node.id
        ),

    affectedRelationshipIds:
      knowledge.relationships
        .filter(
          (
            relationship
          ) => {
            const sourceNode =
              knowledge.nodes.find(
                (node) =>
                  node.id ===
                  relationship.sourceNodeId
              );

            const targetNode =
              knowledge.nodes.find(
                (node) =>
                  node.id ===
                  relationship.targetNodeId
              );

            if (
              gap.affectedDomains
                .length ===
              0
            ) {
              return true;
            }

            return [
              sourceNode,
              targetNode,
            ].some(
              (node) =>
                node?.domains.some(
                  (domain) =>
                    gap
                      .affectedDomains
                      .includes(
                        domain
                      )
                )
            );
          }
        )
        .map(
          (
            relationship
          ) =>
            relationship.id
        ),

    priority:
      resolveQuestionPriority(
        gap
      ),

    answerMayChange:
      template.answerMayChange,
  };
}

export function selectClinicalClarificationQuestion({
  question = "",
  knowledge,
  language = "en",
  resolvedGapTypes = [],
  previouslyAskedQuestionIds = [],
}: ClinicalClarificationSelectionInput):

  ClinicalClarificationSelectionResult {
  const sufficiency =
    knowledge
      .evidenceSufficiency;

  if (
    !sufficiency ||
    !sufficiency
      .requiresClarification
  ) {
    return {
      question:
        null,

      selectedGap:
        null,

      consideredGapCount:
        sufficiency?.gaps
          .length ??
        0,

      excludedResolvedGapCount:
        0,

      excludedPreviouslyAskedCount:
        0,

      reason:
        null,

      generatedAt:
        new Date()
          .toISOString(),
    };
  }

  const resolvedGapSet =
    new Set(
      resolvedGapTypes
    );

  const previouslyAskedSet =
    new Set(
      previouslyAskedQuestionIds
    );

  const unresolvedGaps =
    sufficiency.gaps.filter(
      (gap) =>
        !resolvedGapSet.has(
          gap.type
        )
    );

  const excludedResolvedGapCount =
    sufficiency.gaps.length -
    unresolvedGaps.length;

  const notPreviouslyAsked =
    unresolvedGaps.filter(
      (gap) =>
        !previouslyAskedSet.has(
          createQuestionId(
            gap
          )
        )
    );

  const excludedPreviouslyAskedCount =
    unresolvedGaps.length -
    notPreviouslyAsked.length;

  const rankedGaps =
    rankGaps(
      notPreviouslyAsked
    );

  const selectedGap =
    rankedGaps[0] ??
    null;

  if (
    !selectedGap
  ) {
    return {
      question:
        null,

      selectedGap:
        null,

      consideredGapCount:
        sufficiency.gaps
          .length,

      excludedResolvedGapCount,

      excludedPreviouslyAskedCount,

      reason:
        "No unresolved clarification gap remains eligible for selection.",

      generatedAt:
        new Date()
          .toISOString(),
    };
  }

 const clarificationQuestion =
  selectedGap.type ===
    "missing-current-context" &&
  looksLikeSymptomReport(
    question
  )
    ? createSymptomIntakeQuestion(
        selectedGap,
        knowledge,
        language
      )
    : createClarificationQuestion(
        selectedGap,
        knowledge,
        language
      );

  return {
    question:
  clarificationQuestion,

    selectedGap,

    consideredGapCount:
      sufficiency.gaps
        .length,

    excludedResolvedGapCount,

    excludedPreviouslyAskedCount,

    reason:
      `Selected ${selectedGap.type} because it is the highest-ranked unresolved evidence gap that has not already been asked.`,

    generatedAt:
      new Date()
        .toISOString(),
  };
}
import type {
  HealthIntelligenceContext,
} from "../context/health-intelligence-context";

import type {
  HealthFacts,
} from "../facts/health-facts";

import type {
  HealthReasoning,
} from "../reasoning/health-reasoning";

import type {
  HealthEngineContext,
} from "./shared/health-engine-context";

export type HealthStoryTone =
  | "positive"
  | "stable"
  | "attention"
  | "insufficient-data";

export type HealthStoryConfidence =
  | "low"
  | "moderate"
  | "high";

export type HealthStoryData = {
  headline: string;
  narrative: string;

  tone: HealthStoryTone;
  confidence: HealthStoryConfidence;
  confidenceScore: number;

  priorityMessage: string | null;
  strongestMessage: string | null;
  progressMessage: string | null;
  evidenceMessage: string;

  nextDecision: {
    title: string;
    description: string;
    href: string;
    actionLabel: string;
  };

  supportingSignals: string[];

  generatedAt: string;
};

function text(
  language: "en" | "ar",
  english: string,
  arabic: string
): string {
  return language === "ar"
    ? arabic
    : english;
}

function getTone(
  reasoning: HealthReasoning
): HealthStoryTone {
  switch (
    reasoning.overallDirection
  ) {
    case "strong":
      return "positive";

    case "stable":
      return "stable";

    case "needs-attention":
      return "attention";

    case "insufficient-data":
      return "insufficient-data";
  }
}

function getConfidenceScore(
  facts: HealthFacts
): number {
  const sourceCoverage =
    facts.evidence
      .availableSourceCount * 15;

  const dataCoverage = Math.min(
    40,
    facts.evidence
      .totalDataPoints * 4
  );

  return Math.min(
    100,
    sourceCoverage + dataCoverage
  );
}
type HealthStoryNarrativeFacts = {
  overallMessage: string;
  priorityMessage: string | null;
  strongestMessage: string | null;
  progressMessage: string | null;
};

function uniqueNarrativeMessages(
  messages: Array<string | null>
): string[] {
  const seen = new Set<string>();

  return messages.filter(
    (message): message is string => {
      if (!message) {
        return false;
      }

      const normalizedMessage =
        message.trim().toLocaleLowerCase();

      if (seen.has(normalizedMessage)) {
        return false;
      }

      seen.add(normalizedMessage);

      return true;
    }
  );
}

function buildNarrative(
  context: HealthIntelligenceContext,
  tone: HealthStoryTone,
  facts: HealthStoryNarrativeFacts
): string {
  const language = context.language;

  if (tone === "insufficient-data") {
    return text(
      language,
      "OrganHeal needs an assessment, Check-In, or medical report before it can build a meaningful connected health story.",
      "يحتاج OrganHeal إلى تقييم أو Check-In أو تقرير طبي قبل بناء قصة صحية مترابطة ذات معنى."
    );
  }

  const narrativeMessages =
    uniqueNarrativeMessages([
      facts.overallMessage,
      facts.priorityMessage,
      facts.strongestMessage,
      facts.progressMessage,
    ]);

  return narrativeMessages.join(" ");
}

function getConfidence(
  score: number
): HealthStoryConfidence {
  if (score >= 75) return "high";
  if (score >= 45) return "moderate";

  return "low";
}

function buildNextDecision(
  context: HealthIntelligenceContext
): HealthStoryData["nextDecision"] {
  const language = context.language;

  if (!context.readiness.hasAssessment) {
    return {
      title: text(
        language,
        "Build your health baseline",
        "أنشئ خط الأساس الصحي"
      ),
      description: text(
        language,
        "Complete your first health assessment so OrganHeal can identify priorities and opportunities.",
        "أكمل أول تقييم صحي حتى يتمكن OrganHeal من تحديد الأولويات والفرص الصحية."
      ),
      href: "/assessment",
      actionLabel: text(
        language,
        "Start Assessment",
        "ابدأ التقييم"
      ),
    };
  }

  if (!context.readiness.hasCheckIn) {
    return {
      title: text(
        language,
        "Add how you feel today",
        "أضف حالتك الصحية اليوم"
      ),
      description: text(
        language,
        "Complete a Check-In to connect your daily wellness with your assessment results.",
        "أكمل Check-In لربط عافيتك اليومية بنتائج التقييم."
      ),
      href: "/checkin",
      actionLabel: text(
        language,
        "Open Check-In",
        "افتح Check-In"
      ),
    };
  }

  if (!context.readiness.hasReport) {
    return {
      title: text(
        language,
        "Add medical evidence",
        "أضف دليلًا طبيًا"
      ),
      description: text(
        language,
        "Upload a medical report to strengthen the evidence behind your health story.",
        "ارفع تقريرًا طبيًا لتعزيز الأدلة التي تعتمد عليها قصتك الصحية."
      ),
      href: "/lab-upload",
      actionLabel: text(
        language,
        "Upload Report",
        "رفع تقرير"
      ),
    };
  }

  if (!context.readiness.hasAnalysis) {
    return {
      title: text(
        language,
        "Generate connected intelligence",
        "أنشئ ذكاءً صحيًا مترابطًا"
      ),
      description: text(
        language,
        "Review your report analysis to connect assessments, Check-Ins, and medical evidence.",
        "راجع تحليل التقرير لربط التقييمات وCheck-Ins والأدلة الطبية."
      ),
      href: "/reports",
      actionLabel: text(
        language,
        "Review Analysis",
        "مراجعة التحليل"
      ),
    };
  }

  return {
    title: text(
      language,
      "Continue your health plan",
      "تابع خطتك الصحية"
    ),
    description: text(
      language,
      "Your core health data is connected. Continue with the actions in your personalized health plan.",
      "بياناتك الصحية الأساسية مترابطة الآن. تابع الإجراءات الموجودة في خطتك الصحية المخصصة."
    ),
    href: "/health-plan",
    actionLabel: text(
      language,
      "Open Health Plan",
      "افتح الخطة الصحية"
    ),
  };
}

export function buildHealthStory(
  engineContext: HealthEngineContext
): HealthStoryData {
  const {
    context,
    facts,
    reasoning,
  } = engineContext;

  const language =
    context.language;

  const tone =
    getTone(reasoning);

  const confidenceScore =
    getConfidenceScore(facts);

  const confidence =
    getConfidence(confidenceScore);

  const priorityArea =
    facts.priorityArea?.name ?? null;

  const priorityScore =
    facts.priorityArea?.score ?? null;

  const strongestArea =
    facts.strongestArea?.name ?? null;

  const strongestScore =
    facts.strongestArea?.score ?? null;

  const priorityMessage =
    priorityArea !== null &&
    priorityScore !== null
      ? text(
          language,
          `${priorityArea} is currently the main health priority with a score of ${priorityScore}/100.`,
          `تمثل ${priorityArea} الأولوية الصحية الحالية بمؤشر ${priorityScore}/100.`
        )
      : null;

  const strongestMessage =
    strongestArea !== null &&
    strongestScore !== null
      ? text(
          language,
          `${strongestArea} is currently your strongest assessed area with a score of ${strongestScore}/100.`,
          `تمثل ${strongestArea} أقوى منطقة صحية مقيمة حاليًا بمؤشر ${strongestScore}/100.`
        )
      : null;

  const progressMessage =
    facts.scores.assessmentAverage !== null &&
    facts.scores.checkInAverage !== null
      ? text(
          language,
          `Your assessments average ${facts.scores.assessmentAverage}/100, while recent wellness Check-Ins average ${facts.scores.checkInAverage}/100.`,
          `يبلغ متوسط تقييماتك ${facts.scores.assessmentAverage}/100، بينما يبلغ متوسط Check-Ins الأخيرة ${facts.scores.checkInAverage}/100.`
        )
      : null;

  const overallMessage = text(
    language,
    `Your current overall health score is ${facts.scores.overall}/100.`,
    `يبلغ مؤشر صحتك العام الحالي ${facts.scores.overall}/100.`
  );

  const evidenceMessage = text(
    language,
    `This story is based on ${facts.evidence.totalDataPoints} health data points across ${facts.evidence.availableSourceCount} connected source categories.`,
    `تعتمد هذه القصة على ${facts.evidence.totalDataPoints} نقطة بيانات صحية عبر ${facts.evidence.availableSourceCount} فئات مصادر مترابطة.`
  );

  const headline =
    tone === "insufficient-data"
      ? text(
          language,
          "Your health story is waiting to begin",
          "قصتك الصحية بانتظار أن تبدأ"
        )
      : tone === "positive"
        ? text(
            language,
            "Your connected health picture is strong",
            "صورتك الصحية المترابطة قوية"
          )
        : tone === "stable"
          ? text(
              language,
              "Your health picture is currently stable",
              "صورتك الصحية مستقرة حاليًا"
            )
          : text(
              language,
              "Your health picture shows a clear priority",
              "تظهر صورتك الصحية أولوية واضحة"
            );

  const narrative =
    buildNarrative(
      context,
      tone,
      {
        overallMessage,
        priorityMessage,
        strongestMessage,
        progressMessage,
      }
    );

  const supportingSignals = [
    priorityMessage,
    strongestMessage,
    progressMessage,
    evidenceMessage,
  ].filter(
    (message): message is string =>
      message !== null
  );

  return {
    headline,
    narrative,

    tone,
    confidence,
    confidenceScore,

    priorityMessage,
    strongestMessage,
    progressMessage,
    evidenceMessage,

    nextDecision:
      buildNextDecision(context),

    supportingSignals,

    generatedAt:
      new Date().toISOString(),
  };
}
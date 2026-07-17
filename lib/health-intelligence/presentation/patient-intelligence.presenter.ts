import type {
  HealthIntelligenceSummaryData,
} from "../engines/health-intelligence-summary.engine";

import {
  presentNextDecision,
} from "./next-decision.presenter";

import {
  presentationText,
  type HealthIntelligencePresentationLanguage,
} from "./presentation.types";

export type PatientIntelligencePresentation = {
  whatThisMeans: string;
  mainThingsNoticed: string;
  whatNeedsAttention: string;
  helpfulNextSteps: string;
  healthStory: string;

  decision: {
    title: string;
    description: string;
    actionLabel: string;
    urgencyLabel: string;
  };

  generatedAt: string;
};

function presentMomentumStatus(
  status: HealthIntelligenceSummaryData["momentum"]["status"],
  language: HealthIntelligencePresentationLanguage
): string {
  const labels: Record<
    HealthIntelligenceSummaryData["momentum"]["status"],
    { en: string; ar: string }
  > = {
    improving: {
      en: "improving",
      ar: "يتحسن",
    },
    stable: {
      en: "stable",
      ar: "مستقر",
    },
    declining: {
      en: "needs closer attention",
      ar: "يحتاج إلى متابعة أقرب",
    },
    mixed: {
      en: "showing mixed changes",
      ar: "يُظهر تغيرات متباينة",
    },
    "insufficient-data": {
      en: "not yet clear because more health information is needed",
      ar: "غير واضح بعد بسبب الحاجة إلى معلومات صحية إضافية",
    },
  };

  return language === "ar"
    ? labels[status].ar
    : labels[status].en;
}

function presentEvidenceStrength(
  score: number,
  language: HealthIntelligencePresentationLanguage
): string {
  if (score >= 75) {
    return presentationText(
      language,
      "The available information provides a relatively strong health picture.",
      "تقدم المعلومات المتوفرة صورة صحية قوية نسبيًا."
    );
  }

  if (score >= 50) {
    return presentationText(
      language,
      "The available information provides a useful but incomplete health picture.",
      "تقدم المعلومات المتوفرة صورة صحية مفيدة، لكنها غير مكتملة."
    );
  }

  return presentationText(
    language,
    "The current health picture is limited and would benefit from more recent information.",
    "الصورة الصحية الحالية محدودة، وستصبح أوضح عند إضافة معلومات حديثة."
  );
}

export function presentPatientIntelligence(
  summary: HealthIntelligenceSummaryData,
  language: HealthIntelligencePresentationLanguage
): PatientIntelligencePresentation {
  const decision = presentNextDecision(
    summary.decision.type,
    summary.decision.urgency,
    language
  );

  const momentumStatus = presentMomentumStatus(
    summary.momentum.status,
    language
  );

  const whatThisMeans = summary.healthPicture.narrative;

  const mainThingsNoticed = presentationText(
    language,
    `Your current health direction is ${momentumStatus}. ${presentEvidenceStrength(
      summary.evidence.strengthScore,
      language
    )}`,
    `اتجاهك الصحي الحالي ${momentumStatus}. ${presentEvidenceStrength(
      summary.evidence.strengthScore,
      language
    )}`
  );

  const whatNeedsAttention =
    summary.status === "limited"
      ? presentationText(
          language,
          "The current summary is limited because more or newer health information may be needed before drawing stronger conclusions.",
          "الملخص الحالي محدود، وقد تكون هناك حاجة إلى معلومات صحية أكثر أو أحدث قبل الوصول إلى استنتاجات أقوى."
        )
      : presentationText(
          language,
          `No diagnosis is made by this summary. The most important area to review is the recommended next step: ${decision.title}.`,
          `هذا الملخص لا يقدم تشخيصًا. أهم نقطة للمراجعة هي الخطوة التالية الموصى بها: ${decision.title}.`
        );

  const helpfulNextSteps = presentationText(
    language,
    `${decision.title}. ${decision.description}`,
    `${decision.title}. ${decision.description}`
  );

  const healthStory = presentationText(
    language,
    `${summary.healthPicture.headline} Your health direction is ${momentumStatus}, based on the information currently available.`,
    `${summary.healthPicture.headline} اتجاهك الصحي الحالي ${momentumStatus} بناءً على المعلومات المتوفرة حاليًا.`
  );

  return {
    whatThisMeans,
    mainThingsNoticed,
    whatNeedsAttention,
    helpfulNextSteps,
    healthStory,
    decision,
    generatedAt: summary.generatedAt,
  };
}
import type {
  RecommendationDecisionReason,
} from "@/lib/health-intelligence/engines/recommendation-decision.engine";

import type {
  RecommendationPriority,
} from "@/lib/health-intelligence/engines/recommendation.engine";

import type {
  UnifiedIntelligenceExperienceModel,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.model";

export type UnifiedIntelligenceExperienceLanguage =
  | "en"
  | "ar";

export type UnifiedIntelligenceExperiencePresentation = {
  experience:
    UnifiedIntelligenceExperienceModel;

  explanation: {
    title:
      string;

    summary:
      string;

    evidence:
      string[];

    urgency:
      RecommendationPriority;
  };
};

export type PresentUnifiedIntelligenceExperienceInput = {
  experience:
    UnifiedIntelligenceExperienceModel;

  language:
    UnifiedIntelligenceExperienceLanguage;
};

function getExplanationTitle(
  reason:
    RecommendationDecisionReason,
  language:
    UnifiedIntelligenceExperienceLanguage
): string {
  const isArabic =
    language === "ar";

  const titles:
    Record<
      RecommendationDecisionReason,
      string
    > = {
      critical_finding_present:
        isArabic
          ? "توجد إشارة صحية تحتاج إلى مراجعة عاجلة"
          : "A health signal needs urgent review",

      longitudinal_reports_available:
        isArabic
          ? "المقارنة بين تقاريرك أصبحت الخطوة الأهم"
          : "Comparing your reports is now the most important step",

      missing_assessment:
        isArabic
          ? "ابدأ ببناء صورتك الصحية الأساسية"
          : "Start building your baseline health picture",

      missing_report:
        isArabic
          ? "أضف تقريرًا طبيًا لتحسين دقة الذكاء الصحي"
          : "Add a medical report to improve health intelligence",

      report_analysis_needed:
        isArabic
          ? "تقريرك جاهز للتحليل"
          : "Your report is ready for analysis",

      follow_up_needed:
        isArabic
          ? "تحتاج رحلتك الصحية إلى تحديث جديد"
          : "Your health journey needs a new update",

      core_data_available:
        isArabic
          ? "بياناتك الأساسية تدعم خطوة عملية جديدة"
          : "Your core health data supports a practical next step",
    };

  return titles[reason];
}

function getExplanationSummary(
  reason:
    RecommendationDecisionReason,
  primaryActionDescription:
    string,
  language:
    UnifiedIntelligenceExperienceLanguage
): string {
  const isArabic =
    language === "ar";

  switch (reason) {
    case "critical_finding_present":
      return isArabic
        ? "تم تقديم هذه الخطوة لأن البيانات الحالية تتضمن إشارة مصنفة على أنها حرجة، ولذلك تتقدم المراجعة المهنية على بقية الإجراءات."
        : "This step was prioritized because the current data includes a critical signal, so professional review takes precedence over other actions.";

    case "longitudinal_reports_available":
      return isArabic
        ? "توجد بيانات تحليل مرتبطة بتقريرين مختلفين على الأقل، ولذلك أصبح فهم ما تغير بينهما هو الخطوة الأكثر فائدة الآن."
        : "Analysis data is linked to at least two different reports, so understanding what changed between them is now the most useful step.";

    case "missing_assessment":
      return isArabic
        ? "لا يوجد تقييم صحي أساسي كافٍ لتحديد منطقة الأولوية بثقة، ولذلك يبدأ المسار بإكمال التقييم."
        : "There is not enough baseline assessment data to identify the priority area confidently, so the journey begins with an assessment.";

    case "missing_report":
      return isArabic
        ? "توجد بيانات تقييم، لكن لا يوجد تقرير طبي يدعم تفسيرًا أكثر تحديدًا لحالتك الصحية."
        : "Assessment data is available, but no medical report is present to support a more specific health interpretation.";

    case "report_analysis_needed":
      return isArabic
        ? "تم رفع تقرير طبي، لكنه لم يتحول بعد إلى تحليل صحي محفوظ يمكن استخدامه في القرارات اللاحقة."
        : "A medical report has been uploaded, but it has not yet been converted into saved health intelligence for later decisions.";

    case "follow_up_needed":
      return isArabic
        ? "آخر تحديث صحي لم يعد حديثًا بما يكفي لتمثيل حالتك الحالية، ولذلك أصبحت المتابعة الجديدة هي الأولوية."
        : "Your latest health update is no longer recent enough to represent your current state, so a new follow-up is now the priority.";

    case "core_data_available":
      return primaryActionDescription;
  }
}

export function presentUnifiedIntelligenceExperience({
  experience,
  language,
}: PresentUnifiedIntelligenceExperienceInput): UnifiedIntelligenceExperiencePresentation {
  return {
    experience,

    explanation: {
      title:
        getExplanationTitle(
          experience.decision.reason,
          language
        ),

      summary:
        getExplanationSummary(
          experience.decision.reason,
          experience.primaryAction.description,
          language
        ),

      evidence:
        [...experience.primaryAction.reasons],

      urgency:
        experience.primaryAction.priority,
    },
  };
}
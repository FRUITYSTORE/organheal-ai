import type {
  NextDecisionType,
  NextDecisionUrgency,
} from "../engines/next-decision.engine";

export type HealthIntelligencePresentationLanguage =
  | "en"
  | "ar";

export type NextDecisionPresentation = {
  title: string;
  description: string;
  actionLabel: string;

  urgencyLabel: string;
};

function text(
  language:
    HealthIntelligencePresentationLanguage,
  english: string,
  arabic: string
): string {
  return language === "ar"
    ? arabic
    : english;
}

function getUrgencyLabel(
  urgency: NextDecisionUrgency,
  language:
    HealthIntelligencePresentationLanguage
): string {
  return urgency === "soon"
    ? text(
        language,
        "Recommended soon",
        "موصى بها قريبًا"
      )
    : text(
        language,
        "Routine next step",
        "خطوة متابعة اعتيادية"
      );
}

export function presentNextDecision(
  type: NextDecisionType,
  urgency: NextDecisionUrgency,
  language:
    HealthIntelligencePresentationLanguage
): NextDecisionPresentation {
  const urgencyLabel =
    getUrgencyLabel(
      urgency,
      language
    );

  switch (type) {
    case "build-baseline":
      return {
        title: text(
          language,
          "Build your health baseline",
          "أنشئ خط الأساس الصحي"
        ),

        description: text(
          language,
          "Complete a health assessment so OrganHeal can establish your first connected health picture.",
          "أكمل تقييمًا صحيًا حتى يتمكن OrganHeal من إنشاء أول صورة صحية مترابطة لك."
        ),

        actionLabel: text(
          language,
          "Start Assessment",
          "ابدأ التقييم"
        ),

        urgencyLabel,
      };

    case "add-daily-context":
      return {
        title: text(
          language,
          "Add today’s health context",
          "أضف سياق حالتك الصحية اليوم"
        ),

        description: text(
          language,
          "Complete a Check-In to connect your daily wellness with your assessments and follow-up plan.",
          "أكمل التحديث الصحي لربط عافيتك اليومية بالتقييمات وخطة المتابعة."
        ),

        actionLabel: text(
          language,
          "Open Check-In",
          "افتح التحديث الصحي"
        ),

        urgencyLabel,
      };

    case "add-medical-evidence":
      return {
        title: text(
          language,
          "Add medical evidence",
          "أضف دليلًا طبيًا"
        ),

        description: text(
          language,
          "Upload a medical report to strengthen the evidence behind your health intelligence.",
          "ارفع تقريرًا طبيًا لتعزيز الأدلة التي يعتمد عليها ذكاؤك الصحي."
        ),

        actionLabel: text(
          language,
          "Upload Report",
          "ارفع تقريرًا"
        ),

        urgencyLabel,
      };

    case "complete-report-processing":
      return {
        title: text(
          language,
          "Complete report processing",
          "أكمل معالجة التقرير"
        ),

        description: text(
          language,
          "Finish processing the uploaded report so its information can support analysis and follow-up.",
          "أكمل معالجة التقرير المرفوع حتى تدعم معلوماته التحليل والمتابعة."
        ),

        actionLabel: text(
          language,
          "Review Reports",
          "راجع التقارير"
        ),

        urgencyLabel,
      };

    case "generate-analysis":
      return {
        title: text(
          language,
          "Generate report analysis",
          "أنشئ تحليل التقرير"
        ),

        description: text(
          language,
          "Generate the report analysis to connect medical evidence with your assessments and health history.",
          "أنشئ تحليل التقرير لربط الأدلة الطبية بتقييماتك وتاريخك الصحي."
        ),

        actionLabel: text(
          language,
          "Review Analysis",
          "راجع التحليل"
        ),

        urgencyLabel,
      };

    case "add-followup-history":
      return {
        title: text(
          language,
          "Add follow-up history",
          "أضف بيانات متابعة جديدة"
        ),

        description: text(
          language,
          "Add another Check-In so OrganHeal can compare changes over time and identify momentum more clearly.",
          "أضف تحديثًا صحيًا جديدًا حتى يتمكن OrganHeal من مقارنة التغيرات مع الوقت وتحديد الاتجاه بوضوح أكبر."
        ),

        actionLabel: text(
          language,
          "Add Check-In",
          "أضف تحديثًا صحيًا"
        ),

        urgencyLabel,
      };

    case "review-declining-momentum":
      return {
        title: text(
          language,
          "Review the latest health direction",
          "راجع أحدث اتجاه صحي"
        ),

        description: text(
          language,
          "Your recent data shows declining or mixed movement. Review your health plan and connected signals.",
          "تظهر بياناتك الحديثة اتجاهًا متراجعًا أو مختلطًا. راجع خطتك الصحية والإشارات المترابطة."
        ),

        actionLabel: text(
          language,
          "Review Health Plan",
          "راجع الخطة الصحية"
        ),

        urgencyLabel,
      };

    case "continue-health-plan":
      return {
        title: text(
          language,
          "Continue your health plan",
          "تابع خطتك الصحية"
        ),

        description: text(
          language,
          "Your core information is connected. Continue the actions and follow-up steps in your health plan.",
          "معلوماتك الصحية الأساسية مترابطة. تابع الإجراءات وخطوات المتابعة في خطتك الصحية."
        ),

        actionLabel: text(
          language,
          "Open Health Plan",
          "افتح الخطة الصحية"
        ),

        urgencyLabel,
      };
  }
}
import type {
  NextDecisionType,
  NextDecisionUrgency,
} from "../engines/next-decision.engine";

import {
  presentationText,
  type HealthIntelligencePresentationLanguage,
} from "./presentation.types";


export type NextDecisionPresentation = {
  title: string;
  description: string;
  actionLabel: string;

  urgencyLabel: string;
};


function getUrgencyLabel(
  urgency: NextDecisionUrgency,
  language:
    HealthIntelligencePresentationLanguage
): string {
  return urgency === "soon"
    ? presentationText(
        language,
        "Recommended soon",
        "موصى بها قريبًا"
      )
    : presentationText(
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
        title: presentationText(
          language,
          "Build your health baseline",
          "أنشئ خط الأساس الصحي"
        ),

        description: presentationText(
          language,
          "Complete a health assessment so OrganHeal can establish your first connected health picture.",
          "أكمل تقييمًا صحيًا حتى يتمكن OrganHeal من إنشاء أول صورة صحية مترابطة لك."
        ),

        actionLabel: presentationText(
          language,
          "Start Assessment",
          "ابدأ التقييم"
        ),

        urgencyLabel,
      };

    case "add-daily-context":
      return {
        title: presentationText(
          language,
          "Add today’s health context",
          "أضف سياق حالتك الصحية اليوم"
        ),

        description: presentationText(
          language,
          "Complete a Check-In to connect your daily wellness with your assessments and follow-up plan.",
          "أكمل التحديث الصحي لربط عافيتك اليومية بالتقييمات وخطة المتابعة."
        ),

        actionLabel: presentationText(
          language,
          "Open Check-In",
          "افتح التحديث الصحي"
        ),

        urgencyLabel,
      };

    case "add-medical-evidence":
      return {
        title: presentationText(
          language,
          "Add medical evidence",
          "أضف دليلًا طبيًا"
        ),

        description: presentationText(
          language,
          "Upload a medical report to strengthen the evidence behind your health intelligence.",
          "ارفع تقريرًا طبيًا لتعزيز الأدلة التي يعتمد عليها ذكاؤك الصحي."
        ),

        actionLabel: presentationText(
          language,
          "Upload Report",
          "ارفع تقريرًا"
        ),

        urgencyLabel,
      };

    case "complete-report-processing":
      return {
        title: presentationText(
          language,
          "Complete report processing",
          "أكمل معالجة التقرير"
        ),

        description: presentationText(
          language,
          "Finish processing the uploaded report so its information can support analysis and follow-up.",
          "أكمل معالجة التقرير المرفوع حتى تدعم معلوماته التحليل والمتابعة."
        ),

        actionLabel: presentationText(
          language,
          "Review Reports",
          "راجع التقارير"
        ),

        urgencyLabel,
      };

    case "generate-analysis":
      return {
        title: presentationText(
          language,
          "Generate report analysis",
          "أنشئ تحليل التقرير"
        ),

        description: presentationText(
          language,
          "Generate the report analysis to connect medical evidence with your assessments and health history.",
          "أنشئ تحليل التقرير لربط الأدلة الطبية بتقييماتك وتاريخك الصحي."
        ),

        actionLabel: presentationText(
          language,
          "Review Analysis",
          "راجع التحليل"
        ),

        urgencyLabel,
      };

    case "add-followup-history":
      return {
        title: presentationText(
          language,
          "Add follow-up history",
          "أضف بيانات متابعة جديدة"
        ),

        description: presentationText(
          language,
          "Add another Check-In so OrganHeal can compare changes over time and identify momentum more clearly.",
          "أضف تحديثًا صحيًا جديدًا حتى يتمكن OrganHeal من مقارنة التغيرات مع الوقت وتحديد الاتجاه بوضوح أكبر."
        ),

        actionLabel: presentationText(
          language,
          "Add Check-In",
          "أضف تحديثًا صحيًا"
        ),

        urgencyLabel,
      };

    case "review-declining-momentum":
      return {
        title: presentationText(
          language,
          "Review the latest health direction",
          "راجع أحدث اتجاه صحي"
        ),

        description: presentationText(
          language,
          "Your recent data shows declining or mixed movement. Review your health plan and connected signals.",
          "تظهر بياناتك الحديثة اتجاهًا متراجعًا أو مختلطًا. راجع خطتك الصحية والإشارات المترابطة."
        ),

        actionLabel: presentationText(
          language,
          "Review Health Plan",
          "راجع الخطة الصحية"
        ),

        urgencyLabel,
      };

   case "start-health-plan":
  return {
    title: presentationText(
      language,
      "Start your health plan",
      "ابدأ خطتك الصحية"
    ),

    description: presentationText(
      language,
      "Your core health information is connected. Start your health plan to turn this intelligence into personalized actions and follow-up.",
      "معلوماتك الصحية الأساسية مترابطة. ابدأ خطتك الصحية لتحويل هذه المعلومات إلى إجراءات شخصية وخطوات متابعة."
    ),

    actionLabel: presentationText(
      language,
      "Start Health Plan",
      "ابدأ الخطة الصحية"
    ),

    urgencyLabel,
  };

    case "continue-health-plan":
      return {
        title: presentationText(
          language,
          "Continue your health plan",
          "تابع خطتك الصحية"
        ),

        description: presentationText(
          language,
          "Your core information is connected. Continue the actions and follow-up steps in your health plan.",
          "معلوماتك الصحية الأساسية مترابطة. تابع الإجراءات وخطوات المتابعة في خطتك الصحية."
        ),

        actionLabel: presentationText(
          language,
          "Open Health Plan",
          "افتح الخطة الصحية"
        ),

        urgencyLabel,
      };
  }
}
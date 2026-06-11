import { NextResponse } from "next/server";

type HealthContext = {
  overallScore?: number;
  strongestOrgan?: string | null;
  priorityOrgan?: string | null;
  labScore?: number | null;
  dailyCheckInScore?: number | null;
  dailyMood?: string | null;
  healthEngine?: {
    healthProfile?: string;
    riskPattern?: string;
    opportunityTitle?: string;
    bestNextAction?: string;
    potentialGain?: number;
    potentialScore?: number;
    potentialLevel?: string;
    healthAgeStatus?: string;
    healthAgeMessage?: string;
    trendDirection?: string;
    trendMessage?: string;
    riskEscalationLevel?: string;
    riskEscalationMessage?: string;
    riskEscalationReason?: string;
    doctorBrief?: string;
  };
};

function hasHealthContext(context?: HealthContext | null) {
  return !!context && !!context.healthEngine;
}

function buildPersonalizedResponse(
  message: string,
  language: "en" | "ar",
  healthContext?: HealthContext | null
) {
  const isArabic = language === "ar";
  const lowerMessage = message.toLowerCase();
  const engine = healthContext?.healthEngine;

  if (!hasHealthContext(healthContext) || !engine) {
    return isArabic
      ? "لا توجد بيانات صحية شخصية كافية بعد. أكمل تقييمًا صحيًا أو أضف نتيجة مختبر أو تسجيلًا يوميًا حتى أستطيع إعطاء إرشاد أكثر تخصيصًا."
      : "I do not have enough personal health context yet. Complete an assessment, lab entry, or daily check-in so I can give more personalized guidance.";
  }

  if (
    lowerMessage.includes("next") ||
    lowerMessage.includes("action") ||
    lowerMessage.includes("what should") ||
    lowerMessage.includes("ماذا") ||
    lowerMessage.includes("الخطوة")
  ) {
    return isArabic
      ? `أفضل خطوة تالية لك الآن هي: ${engine.bestNextAction}

منطقة الأولوية الحالية: ${
          healthContext.priorityOrgan || "الصحة العامة"
        }.

السبب: نمطك الصحي الحالي هو ${engine.riskPattern}، والفرصة الأساسية هي ${engine.opportunityTitle}.`
      : `Your next best action is: ${engine.bestNextAction}

Current priority area: ${healthContext.priorityOrgan || "General Health"}.

Why: your current risk pattern is ${engine.riskPattern}, and your main opportunity is ${engine.opportunityTitle}.`;
  }

  if (
    lowerMessage.includes("risk") ||
    lowerMessage.includes("pattern") ||
    lowerMessage.includes("مخاطر") ||
    lowerMessage.includes("نمط")
  ) {
    return isArabic
      ? `نمط المخاطر الحالي لديك هو: ${engine.riskPattern}.

${engine.trendMessage}

تصعيد المخاطر: ${engine.riskEscalationLevel}.
${engine.riskEscalationReason}`
      : `Your current risk pattern is: ${engine.riskPattern}.

${engine.trendMessage}

Risk escalation level: ${engine.riskEscalationLevel}.
${engine.riskEscalationReason}`;
  }

  if (
    lowerMessage.includes("doctor") ||
    lowerMessage.includes("visit") ||
    lowerMessage.includes("brief") ||
    lowerMessage.includes("طبيب") ||
    lowerMessage.includes("دكتور")
  ) {
    return isArabic
      ? `هذه أهم نقاط يمكن مناقشتها مع الطبيب:

${engine.doctorBrief}

ملاحظة: هذا ملخص تثقيفي ولا يستبدل التشخيص الطبي.`
      : `Here are the main points to discuss with your doctor:

${engine.doctorBrief}

Note: this is educational support and does not replace medical diagnosis.`;
  }

  if (
    lowerMessage.includes("health age") ||
    lowerMessage.includes("age") ||
    lowerMessage.includes("العمر")
  ) {
    return isArabic
      ? `العمر الصحي لديك: ${engine.healthAgeStatus}.

${engine.healthAgeMessage}`
      : `Your health age status is: ${engine.healthAgeStatus}.

${engine.healthAgeMessage}`;
  }

  if (
    lowerMessage.includes("potential") ||
    lowerMessage.includes("improve") ||
    lowerMessage.includes("تحسين") ||
    lowerMessage.includes("الإمكانات")
  ) {
    return isArabic
      ? `درجتك الصحية الحالية: ${healthContext.overallScore}/100.

درجتك الممكنة: ${engine.potentialScore}/100.

فرصة التحسن المتوقعة: +${engine.potentialGain} نقطة.

التركيز المقترح: ${engine.opportunityTitle}.`
      : `Your current health score is ${healthContext.overallScore}/100.

Your potential score is ${engine.potentialScore}/100.

Estimated improvement opportunity: +${engine.potentialGain} points.

Suggested focus: ${engine.opportunityTitle}.`;
  }

  return isArabic
    ? `بناءً على بياناتك الحالية:

الملف الصحي: ${engine.healthProfile}
الدرجة العامة: ${healthContext.overallScore}/100
منطقة الأولوية: ${healthContext.priorityOrgan || "الصحة العامة"}
أقوى منطقة: ${healthContext.strongestOrgan || "الصحة العامة"}
نمط المخاطر: ${engine.riskPattern}
أفضل خطوة تالية: ${engine.bestNextAction}

هذا إرشاد تثقيفي ولا يعتبر تشخيصًا طبيًا.`
    : `Based on your current health context:

Health profile: ${engine.healthProfile}
Overall score: ${healthContext.overallScore}/100
Priority area: ${healthContext.priorityOrgan || "General Health"}
Strongest area: ${healthContext.strongestOrgan || "General Health"}
Risk pattern: ${engine.riskPattern}
Next best action: ${engine.bestNextAction}

This is educational guidance and not a medical diagnosis.`;
}

export async function POST(req: Request) {
  try {
    const { message, language = "en", healthContext } = await req.json();

    if (!message) {
      return NextResponse.json(
        {
          error: "Message is required",
        },
        { status: 400 }
      );
    }

    const response = buildPersonalizedResponse(
      message,
      language,
      healthContext
    );

    return NextResponse.json({
      success: true,
      response,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
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

function buildGeneralEducationalResponse(message: string, language: "en" | "ar") {
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
      ? "الكوليسترول والدهون الثلاثية مؤشرات مهمة لصحة القلب والتمثيل الغذائي. ارتفاع LDL أو الدهون الثلاثية قد يرتبط بزيادة مخاطر القلب، بينما HDL غالبًا يعتبر عاملًا وقائيًا. الأفضل مناقشة الأرقام الفعلية مع الطبيب، خصوصًا إذا لديك ضغط، سكري، تدخين، أو تاريخ عائلي."
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
      ? "صحة الكبد تُراجع غالبًا من خلال ALT وAST والبيليروبين والسياق الصحي العام. ارتفاع الإنزيمات قد يحتاج متابعة طبية، خاصة مع زيادة الوزن، أدوية معينة، أو أعراض. لا توقف أي دواء دون استشارة الطبيب."
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
      ? "صحة الكلى تُفهم عادة من خلال الكرياتينين، eGFR، ضغط الدم، الترطيب، وتحليل البول. إذا كانت النتائج غير طبيعية أو لديك ضغط/سكري، ناقشها مع الطبيب."
      : "Kidney health is commonly understood through creatinine, eGFR, blood pressure, hydration, and urine testing. If results are abnormal or you have hypertension/diabetes, discuss them with a clinician.";
  }

  if (
    lowerMessage.includes("sleep") ||
    lowerMessage.includes("stress") ||
    lowerMessage.includes("mood") ||
    lowerMessage.includes("نوم") ||
    lowerMessage.includes("توتر")
  ) {
    return isArabic
      ? "النوم والتوتر يؤثران على الطاقة، التركيز، الشهية، المناعة، وحتى المؤشرات القلبية والأيضية. ابدأ بتحسين وقت النوم، تقليل المنبهات مساءً، وتسجيل التوتر والنشاط يوميًا."
      : "Sleep and stress affect energy, focus, appetite, immunity, and even heart/metabolic indicators. Start by improving sleep timing, reducing evening stimulants, and tracking stress and activity daily.";
  }

  return isArabic
    ? "يمكنني مساعدتك تعليميًا في فهم صحة الأعضاء، المختبر، التقييمات، ونمط الحياة. للحصول على إرشاد شخصي أدق، أكمل تقييمًا صحيًا أو أضف نتائج مختبر أو تسجيلًا يوميًا."
    : "I can help educationally with organ health, labs, assessments, and lifestyle patterns. For more personalized guidance, complete an assessment, add lab results, or submit a daily check-in.";
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
    return buildGeneralEducationalResponse(message, language);
  }

  if (
    lowerMessage.includes("why") ||
    lowerMessage.includes("low") ||
    lowerMessage.includes("score") ||
    lowerMessage.includes("لماذا") ||
    lowerMessage.includes("منخفض") ||
    lowerMessage.includes("درج")
  ) {
    return isArabic
      ? `درجتك الصحية الحالية هي ${healthContext.overallScore}/100.

أكثر ما يؤثر على النتيجة حاليًا:
1. منطقة الأولوية: ${healthContext.priorityOrgan || "الصحة العامة"}.
2. نمط المخاطر: ${engine.riskPattern}.
3. اتجاه الصحة: ${engine.trendDirection}.

الخطوة المقترحة:
${engine.bestNextAction}

هذا إرشاد تعليمي وليس تشخيصًا طبيًا.`
      : `Your current health score is ${healthContext.overallScore}/100.

The main factors affecting your score are:
1. Priority area: ${healthContext.priorityOrgan || "General Health"}.
2. Risk pattern: ${engine.riskPattern}.
3. Health direction: ${engine.trendDirection}.

Suggested next step:
${engine.bestNextAction}

This is educational guidance and not a medical diagnosis.`;
  }

  if (
    lowerMessage.includes("next") ||
    lowerMessage.includes("action") ||
    lowerMessage.includes("what should") ||
    lowerMessage.includes("ماذا") ||
    lowerMessage.includes("الخطوة")
  ) {
    return isArabic
      ? `أفضل خطوة تالية لك الآن هي:

${engine.bestNextAction}

منطقة الأولوية الحالية:
${healthContext.priorityOrgan || "الصحة العامة"}

السبب:
نمطك الصحي الحالي هو ${engine.riskPattern}، والفرصة الأساسية هي ${engine.opportunityTitle}.`
      : `Your next best action is:

${engine.bestNextAction}

Current priority area:
${healthContext.priorityOrgan || "General Health"}

Why:
Your current risk pattern is ${engine.riskPattern}, and your main opportunity is ${engine.opportunityTitle}.`;
  }

  if (
    lowerMessage.includes("risk") ||
    lowerMessage.includes("pattern") ||
    lowerMessage.includes("مخاطر") ||
    lowerMessage.includes("نمط")
  ) {
    return isArabic
      ? `نمط المخاطر الحالي لديك هو:

${engine.riskPattern}

${engine.trendMessage}

تصعيد المخاطر:
${engine.riskEscalationLevel}

${engine.riskEscalationReason}`
      : `Your current risk pattern is:

${engine.riskPattern}

${engine.trendMessage}

Risk escalation:
${engine.riskEscalationLevel}

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
      ? `العمر الصحي لديك:
${engine.healthAgeStatus}

${engine.healthAgeMessage}`
      : `Your health age status is:
${engine.healthAgeStatus}

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

التركيز المقترح:
${engine.opportunityTitle}

الخطوة:
${engine.bestNextAction}`
      : `Your current health score is ${healthContext.overallScore}/100.

Your potential score is ${engine.potentialScore}/100.

Estimated improvement opportunity: +${engine.potentialGain} points.

Suggested focus:
${engine.opportunityTitle}

Action:
${engine.bestNextAction}`;
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
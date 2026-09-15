export type ActionPlanResult = {
  thisWeek: string[];
  thisMonth: string[];
  next90Days: string[];
};

type ActionPlanLanguage =
  | "en"
  | "ar";

function text(
  language: ActionPlanLanguage,
  english: string,
  arabic: string
): string {
  return language === "ar"
    ? arabic
    : english;
}

export function buildActionPlan({
  digitalTwin,
  forecast,
  longitudinalRisk,
  crossSource,
  language = "en",
}: any): ActionPlanResult {
  const primarySystem =
    digitalTwin?.primarySystem ||
    crossSource?.primarySystem ||
    "General Health";

  const thisWeek = [
    text(
      language,
      "Review your latest health intelligence summary.",
      "راجع أحدث ملخص لذكائك الصحي."
    ),
    text(
      language,
      "Track symptoms, energy level, sleep, hydration, and daily wellness.",
      "تابع الأعراض ومستوى الطاقة والنوم والترطيب وحالتك الصحية اليومية."
    ),
  ];

  const thisMonth = [
    text(
      language,
      "Continue regular assessments and daily check-ins.",
      "استمر في التقييمات الدورية والمتابعة الصحية اليومية."
    ),
    text(
      language,
      "Review abnormal findings with a licensed healthcare professional if needed.",
      "راجع النتائج غير الطبيعية مع مقدم رعاية صحية مرخص عند الحاجة."
    ),
  ];

  const next90Days = [
    text(
      language,
      "Repeat relevant labs or assessments according to the recommended follow-up window.",
      "أعد الفحوصات أو التقييمات المناسبة ضمن فترة المتابعة الموصى بها."
    ),
    text(
      language,
      "Compare new results with previous data to monitor improvement or worsening.",
      "قارن النتائج الجديدة بالبيانات السابقة لمتابعة التحسن أو التراجع."
    ),
  ];

  if (
    primarySystem
      .toLowerCase()
      .includes("liver")
  ) {
    thisWeek.push(
      text(
        language,
        "Avoid alcohol and unnecessary liver-stressing supplements or medications unless approved by a clinician.",
        "تجنب الكحول والمكملات أو الأدوية غير الضرورية التي قد تزيد العبء على الكبد ما لم يوافق عليها الطبيب."
      )
    );

    thisMonth.push(
      text(
        language,
        "Plan follow-up liver-related review if ALT, AST, bilirubin, or albumin remain abnormal.",
        "خطط لمراجعة مرتبطة بالكبد إذا بقيت قيم ALT أو AST أو البيليروبين أو الألبومين غير طبيعية."
      )
    );

    next90Days.push(
      text(
        language,
        "Aim to improve liver-related markers and reduce metabolic stressors.",
        "اعمل على تحسين مؤشرات الكبد وتقليل عوامل الإجهاد الأيضي."
      )
    );
  }

  if (
    primarySystem
      .toLowerCase()
      .includes("cardio") ||
    primarySystem
      .toLowerCase()
      .includes("metabolic")
  ) {
    thisWeek.push(
      text(
        language,
        "Start or maintain light-to-moderate physical activity if safe for you.",
        "ابدأ أو استمر بنشاط بدني خفيف إلى متوسط إذا كان ذلك آمنًا لك."
      )
    );

    thisMonth.push(
      text(
        language,
        "Focus on nutrition quality, saturated fat reduction, weight control, and lipid follow-up.",
        "ركز على جودة التغذية وتقليل الدهون المشبعة وضبط الوزن ومتابعة دهون الدم."
      )
    );

    next90Days.push(
      text(
        language,
        "Target improvement in cholesterol, triglycerides, blood sugar, and cardiovascular risk pattern.",
        "استهدف تحسين الكوليسترول والدهون الثلاثية وسكر الدم ونمط خطورة القلب والأوعية."
      )
    );
  }

  if (
    primarySystem
      .toLowerCase()
      .includes("kidney")
  ) {
    thisWeek.push(
      text(
        language,
        "Monitor hydration, blood pressure, and medication exposure.",
        "راقب الترطيب وضغط الدم والأدوية المستخدمة."
      )
    );

    thisMonth.push(
      text(
        language,
        "Discuss kidney-related markers with a clinician if creatinine, urea, or eGFR are abnormal.",
        "ناقش مؤشرات الكلى مع الطبيب إذا كانت قيم الكرياتينين أو اليوريا أو eGFR غير طبيعية."
      )
    );

    next90Days.push(
      text(
        language,
        "Repeat kidney function and urine-related checks if advised.",
        "أعد فحوصات وظائف الكلى والبول إذا أوصى الطبيب بذلك."
      )
    );
  }

  if (
    longitudinalRisk
      ?.escalationLevel ===
    "High"
  ) {
    thisWeek.push(
      text(
        language,
        "Prioritize clinical follow-up because longitudinal risk appears elevated.",
        "أعطِ أولوية للمتابعة الطبية لأن اتجاه الخطورة عبر الزمن يبدو مرتفعًا."
      )
    );
  }

  if (
    forecast
      ?.improvementPotential ===
    "High"
  ) {
    next90Days.push(
      text(
        language,
        "Maintain consistent actions because the forecast suggests meaningful improvement potential.",
        "حافظ على الاستمرارية لأن التوقعات تشير إلى إمكانية ملحوظة للتحسن."
      )
    );
  }

  return {
    thisWeek,
    thisMonth,
    next90Days,
  };
}
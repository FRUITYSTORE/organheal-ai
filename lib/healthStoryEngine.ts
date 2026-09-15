type HealthStoryLanguage =
  | "en"
  | "ar";

function text(
  language: HealthStoryLanguage,
  english: string,
  arabic: string
): string {
  return language === "ar"
    ? arabic
    : english;
}

function presentRiskDirection(
  value: unknown,
  language: HealthStoryLanguage
): string {
  const clean =
    String(
      value ??
        "Unknown"
    )
      .trim()
      .toLowerCase();

  if (language !== "ar") {
    return clean;
  }

  if (
    clean.includes("increase") ||
    clean.includes("worsen") ||
    clean === "high"
  ) {
    return "يتجه نحو الارتفاع";
  }

  if (
    clean.includes("decrease") ||
    clean.includes("improv") ||
    clean === "low"
  ) {
    return "يتجه نحو التحسن";
  }

  if (
    clean.includes("stable")
  ) {
    return "مستقر";
  }

  if (
    clean.includes("moderate")
  ) {
    return "متوسط";
  }

  return "غير واضح بعد";
}

function presentPrioritySystem(
  value: unknown,
  language: HealthStoryLanguage
): string {
  const clean =
    String(
      value ??
        "General Health"
    ).trim();

  if (language !== "ar") {
    return clean;
  }

  const lower =
    clean.toLowerCase();

  if (
    lower.includes("liver")
  ) {
    return "صحة الكبد";
  }

  if (
    lower.includes("cardio")
  ) {
    return "صحة القلب والأوعية";
  }

  if (
    lower.includes("metabolic")
  ) {
    return "الصحة الأيضية";
  }

  if (
    lower.includes("kidney")
  ) {
    return "صحة الكلى";
  }

  if (
    lower.includes("thyroid")
  ) {
    return "صحة الغدة الدرقية";
  }

  if (
    lower.includes("glucose") ||
    lower.includes("sugar")
  ) {
    return "تنظيم سكر الدم";
  }

  return "الصحة العامة";
}

export function buildHealthStory({
  timeline,
  longitudinalRisk,
  forecast,
  crossSource,
  digitalTwin,
  language = "en",
}: any) {
  const selectedLanguage:
    HealthStoryLanguage =
    language === "ar"
      ? "ar"
      : "en";
  const trend =
    timeline?.trendDirection ||
    "Insufficient Data";

  const momentum =
    timeline?.healthMomentum ||
    "Unknown";

    const riskDirection =
      presentRiskDirection(
        longitudinalRisk
          ?.riskDirection,
        selectedLanguage
      );

    const prioritySystem =
      presentPrioritySystem(
        digitalTwin
          ?.primarySystem ||
        crossSource
          ?.primarySystem ||
        "General Health",
      selectedLanguage
    );

    const forecastScore =
      forecast
        ?.forecastScore !==
      undefined
        ? `${forecast.forecastScore}/100`
        : text(
            selectedLanguage,
            "Not available",
            "غير متاح"
          );

  if (
    selectedLanguage === "ar"
  ) {
    return `
مجال التركيز الصحي الرئيسي حاليًا هو ${prioritySystem}.
اتجاه الخطورة عبر الزمن ${riskDirection}.

درجة الثقة في التوقع الصحي خلال 90 يومًا هي ${forecastScore}.

الخطوة التالية الموصى بها هي الاستمرار في متابعة بياناتك الصحية، واتباع خطة العمل الشخصية، ومراجعة النتائج المقلقة مع مقدم رعاية صحية مرخص.
    `.trim();
  }

return `
Your health data currently suggests a ${trend.toLowerCase()} health trend with ${momentum.toLowerCase()} momentum.

The primary health focus area is ${prioritySystem}.
Longitudinal risk direction is currently ${riskDirection}.

The 90-day forecast confidence score is ${forecastScore}.

The recommended next step is to continue tracking your health data, follow the personalized action plan, and review concerning findings with a licensed healthcare professional.
  `.trim();
}
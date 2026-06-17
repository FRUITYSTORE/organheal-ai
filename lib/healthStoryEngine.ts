export function buildHealthStory({
  timeline,
  longitudinalRisk,
  forecast,
  crossSource,
  digitalTwin,
}: any) {
  const trend = timeline?.trendDirection || "Insufficient Data";
  const momentum = timeline?.healthMomentum || "Unknown";
  const riskDirection = longitudinalRisk?.riskDirection || "Unknown";
  const prioritySystem =
    digitalTwin?.primarySystem || crossSource?.primarySystem || "General Health";

  const forecastScore =
    forecast?.forecastScore !== undefined
      ? `${forecast.forecastScore}/100`
      : "Not available";

  return `
Your health data currently suggests a ${trend.toLowerCase()} health trend with ${momentum.toLowerCase()} momentum.

The primary health focus area is ${prioritySystem}.

Longitudinal risk direction is currently ${riskDirection.toLowerCase()}.

The 90-day forecast confidence score is ${forecastScore}.

The recommended next step is to continue tracking your health data, follow the personalized action plan, and review concerning findings with a licensed healthcare professional.
  `.trim();
}
export type TimelinePoint = {
  source: "assessment" | "lab" | "checkin" | "report";
  label: string;
  score: number;
  date: string;
};

export type HealthTimelineResult = {
  totalPoints: number;
  earliestScore: number | null;
  latestScore: number | null;
  trendDirection: "Improving" | "Stable" | "Worsening" | "Insufficient Data";
  healthMomentum: "Positive" | "Neutral" | "Negative" | "Unknown";
  changeAmount: number;
  consistencyScore: number;
  summary: string;
};

export function buildHealthTimeline(points: TimelinePoint[]): HealthTimelineResult {
  const validPoints = points
    .filter((point) => typeof point.score === "number" && point.date)
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

  if (validPoints.length < 2) {
    return {
      totalPoints: validPoints.length,
      earliestScore: validPoints[0]?.score ?? null,
      latestScore: validPoints[0]?.score ?? null,
      trendDirection: "Insufficient Data",
      healthMomentum: "Unknown",
      changeAmount: 0,
      consistencyScore: 0,
      summary:
        "More historical data is needed to calculate a reliable health trend.",
    };
  }

  const earliestScore = validPoints[0].score;
  const latestScore = validPoints[validPoints.length - 1].score;
  const changeAmount = latestScore - earliestScore;

  let trendDirection: HealthTimelineResult["trendDirection"] = "Stable";

  if (changeAmount >= 5) {
    trendDirection = "Improving";
  } else if (changeAmount <= -5) {
    trendDirection = "Worsening";
  }

  const positiveMoves = validPoints.filter((point, index) => {
    if (index === 0) return false;
    return point.score >= validPoints[index - 1].score;
  }).length;

  const consistencyScore = Math.round(
    (positiveMoves / (validPoints.length - 1)) * 100
  );

  let healthMomentum: HealthTimelineResult["healthMomentum"] = "Neutral";

  if (trendDirection === "Improving" && consistencyScore >= 60) {
    healthMomentum = "Positive";
  } else if (trendDirection === "Worsening") {
    healthMomentum = "Negative";
  }

  const summary =
    trendDirection === "Improving"
      ? `Health timeline shows improvement of +${changeAmount} points across ${validPoints.length} data points.`
      : trendDirection === "Worsening"
      ? `Health timeline shows decline of ${changeAmount} points across ${validPoints.length} data points.`
      : `Health timeline appears stable across ${validPoints.length} data points.`;

  return {
    totalPoints: validPoints.length,
    earliestScore,
    latestScore,
    trendDirection,
    healthMomentum,
    changeAmount,
    consistencyScore,
    summary,
  };
}
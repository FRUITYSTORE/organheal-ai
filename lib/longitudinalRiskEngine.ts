import type { HealthTimelineResult } from "./healthTimelineEngine";

export type LongitudinalRiskResult = {
  riskDirection: "Improving" | "Stable" | "Worsening" | "Unknown";
  escalationLevel: "Low" | "Moderate" | "High";
  predictionConfidence: number;
  riskSummary: string;
  recommendedMonitoring: string;
};

export function buildLongitudinalRisk(
  timeline: HealthTimelineResult
): LongitudinalRiskResult {
  if (timeline.totalPoints < 2) {
    return {
      riskDirection: "Unknown",
      escalationLevel: "Low",
      predictionConfidence: 20,
      riskSummary:
        "Not enough historical data is available to detect a longitudinal risk pattern.",
      recommendedMonitoring:
        "Continue collecting assessments, check-ins, and medical report data over time.",
    };
  }

  let riskDirection: LongitudinalRiskResult["riskDirection"] = "Stable";
  let escalationLevel: LongitudinalRiskResult["escalationLevel"] = "Low";
  let predictionConfidence = Math.min(40 + timeline.totalPoints * 10, 90);

  if (timeline.trendDirection === "Improving") {
    riskDirection = "Improving";
    escalationLevel = "Low";
  }

  if (timeline.trendDirection === "Stable") {
    riskDirection = "Stable";
    escalationLevel = "Moderate";
  }

  if (timeline.trendDirection === "Worsening") {
    riskDirection = "Worsening";
    escalationLevel =
      Math.abs(timeline.changeAmount) >= 15 ? "High" : "Moderate";
  }

  const riskSummary =
    riskDirection === "Improving"
      ? "Historical health data suggests an improving trajectory, which may reduce near-term risk if the trend continues."
      : riskDirection === "Worsening"
      ? "Historical health data suggests a worsening trajectory that may require earlier follow-up and closer monitoring."
      : "Historical health data appears relatively stable, but continued monitoring is recommended.";

  const recommendedMonitoring =
    escalationLevel === "High"
      ? "Repeat key assessments and relevant labs soon, and discuss changes with a licensed healthcare professional."
      : escalationLevel === "Moderate"
      ? "Continue monthly tracking and repeat relevant health checks within the recommended follow-up window."
      : "Continue routine monitoring and maintain healthy habits.";

  return {
    riskDirection,
    escalationLevel,
    predictionConfidence,
    riskSummary,
    recommendedMonitoring,
  };
}
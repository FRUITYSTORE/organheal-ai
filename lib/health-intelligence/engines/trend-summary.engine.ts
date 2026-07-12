import { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import {
  HealthTrendData,
  OrganTrend,
  TrendDirection,
  TrendQuality,
  TrendStability,
} from "@/lib/health-intelligence/engines/trend.engine";

export type TrendSignal = {
  organ: string;
  direction: Exclude<TrendDirection, "insufficient-data">;
  quality: Exclude<TrendQuality, "insufficient-data">;
  stability: Exclude<TrendStability, "insufficient-data">;

  change: number;
  changeLabel: string;
  totalChange: number;

  velocityPerDay: number;
  velocityLabel: string;

  periodDays: number;
  latestScore: number;
  dataPoints: number;

  plateau: boolean;
  consistencyRate: number;
};

export type TrendSummaryData = {
  direction: TrendDirection;
  quality: TrendQuality;
  stability: TrendStability;

  headline: string;
  summary: string;

  change: number;
  changeLabel: string;

  totalChange: number;
  totalChangeLabel: string;

  velocityPerDay: number;
  velocityLabel: string;

  periodDays: number | null;
  periodLabel: string;

  plateau: boolean;

  primarySignal: TrendSignal | null;
  organSignals: TrendSignal[];

  improvingCount: number;
  worseningCount: number;
  stableCount: number;
};

function getChangeLabel(change: number) {
  if (change > 0) return `+${change}`;
  return String(change);
}

function getVelocityLabel(
  velocityPerDay: number,
  direction: TrendDirection
) {
  if (direction === "insufficient-data") {
    return "Not available";
  }

  if (velocityPerDay === 0) {
    return "No measurable daily change";
  }

  const prefix = velocityPerDay > 0 ? "+" : "";

  return `${prefix}${velocityPerDay} points/day`;
}

function getPeriodLabel(periodDays: number | null) {
  if (periodDays === null) {
    return "Not enough historical data";
  }

  if (periodDays === 0) {
    return "Recent comparison";
  }

  if (periodDays === 1) {
    return "During the last day";
  }

  return `During the last ${periodDays} days`;
}

function getHeadline(
  direction: TrendDirection,
  quality: TrendQuality,
  plateau: boolean
) {
  if (
    direction === "insufficient-data" ||
    quality === "insufficient-data"
  ) {
    return "More history is needed to calculate your health direction";
  }

  if (plateau || quality === "plateau") {
    return "Your tracked health direction has reached a plateau";
  }

  switch (quality) {
    case "strong-improvement":
      return "Your tracked health direction is improving strongly";

    case "moderate-improvement":
      return "Your tracked health direction is improving";

    case "weak-improvement":
      return "Your tracked health direction shows early improvement";

    case "strong-decline":
      return "Your tracked health direction needs urgent attention";

    case "moderate-decline":
      return "Your tracked health direction needs closer follow-up";

    case "weak-decline":
      return "Your tracked health direction shows a mild decline";

    case "stable":
      return "Your tracked health direction is stable";

    default:
      return direction === "improving"
        ? "Your tracked health direction is improving"
        : direction === "worsening"
          ? "Your tracked health direction needs closer follow-up"
          : "Your tracked health direction is stable";
  }
}

function buildSignal(trend: OrganTrend): TrendSignal {
  return {
    organ: trend.organ,
    direction: trend.direction,
    quality: trend.quality,
    stability: trend.stability,

    change: trend.change,
    changeLabel: getChangeLabel(trend.change),
    totalChange: trend.totalChange,

    velocityPerDay: trend.velocityPerDay,
    velocityLabel: getVelocityLabel(
      trend.velocityPerDay,
      trend.direction
    ),

    periodDays: trend.periodDays,
    latestScore: trend.latestScore,
    dataPoints: trend.dataPoints,

    plateau: trend.plateau,
    consistencyRate: trend.consistencyRate,
  };
}

function getSignalPriority(trend: OrganTrend) {
  if (trend.direction === "worsening") {
    return 500 + Math.abs(trend.totalChange);
  }

  if (trend.plateau) {
    return 400;
  }

  if (trend.direction === "improving") {
    return 300 + Math.abs(trend.totalChange);
  }

  return 200;
}

function rankOrganTrends(organTrends: OrganTrend[]) {
  return [...organTrends].sort(
    (a, b) => getSignalPriority(b) - getSignalPriority(a)
  );
}

export function buildTrendSummary(
  trend: EngineResult<HealthTrendData>
): EngineResult<TrendSummaryData> {
  const { data } = trend;

  const improvingCount = data.organTrends.filter(
    (item) => item.direction === "improving"
  ).length;

  const worseningCount = data.organTrends.filter(
    (item) => item.direction === "worsening"
  ).length;

  const stableCount = data.organTrends.filter(
    (item) => item.direction === "stable"
  ).length;

  if (
    trend.status === "insufficient-data" ||
    data.direction === "insufficient-data"
  ) {
    return {
      status: "insufficient-data",
      confidence: trend.confidence,
      generatedAt: new Date().toISOString(),
      data: {
        direction: "insufficient-data",
        quality: "insufficient-data",
        stability: "insufficient-data",

        headline: getHeadline(
          "insufficient-data",
          "insufficient-data",
          false
        ),

        summary: data.summary,

        change: 0,
        changeLabel: "—",

        totalChange: 0,
        totalChangeLabel: "—",

        velocityPerDay: 0,
        velocityLabel: "Not available",

        periodDays: null,
        periodLabel: getPeriodLabel(null),

        plateau: false,

        primarySignal: null,
        organSignals: [],

        improvingCount: 0,
        worseningCount: 0,
        stableCount: 0,
      },
    };
  }

  const rankedTrends = rankOrganTrends(data.organTrends);

  const organSignals = rankedTrends
    .slice(0, 5)
    .map(buildSignal);

  return {
    status: "ready",
    confidence: trend.confidence,
    generatedAt: new Date().toISOString(),
    data: {
      direction: data.direction,
      quality: data.quality,
      stability: data.stability,

      headline: getHeadline(
        data.direction,
        data.quality,
        data.plateau
      ),

      summary: data.summary,

      change: data.change,
      changeLabel: getChangeLabel(data.change),

      totalChange: data.totalChange,
      totalChangeLabel: getChangeLabel(data.totalChange),

      velocityPerDay: data.velocityPerDay,
      velocityLabel: getVelocityLabel(
        data.velocityPerDay,
        data.direction
      ),

      periodDays: data.periodDays,
      periodLabel: getPeriodLabel(data.periodDays),

      plateau: data.plateau,

      primarySignal: organSignals[0] ?? null,
      organSignals,

      improvingCount,
      worseningCount,
      stableCount,
    },
  };
}
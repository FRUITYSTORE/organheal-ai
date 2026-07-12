import { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import { PatientSummary } from "@/lib/models/patient";

export type TrendDirection =
  | "improving"
  | "worsening"
  | "stable"
  | "insufficient-data";

export type TrendStability =
  | "consistent"
  | "variable"
  | "unstable"
  | "insufficient-data";

export type TrendQuality =
  | "strong-improvement"
  | "moderate-improvement"
  | "weak-improvement"
  | "strong-decline"
  | "moderate-decline"
  | "weak-decline"
  | "plateau"
  | "stable"
  | "insufficient-data";

export type OrganTrend = {
  organ: string;
  direction: Exclude<TrendDirection, "insufficient-data">;
  quality: Exclude<TrendQuality, "insufficient-data">;
  stability: Exclude<TrendStability, "insufficient-data">;

  previousScore: number;
  latestScore: number;
  firstScore: number;

  change: number;
  totalChange: number;
  averageChange: number;
  velocityPerDay: number;

  periodDays: number;
  dataPoints: number;
  latestDate: string;

  plateau: boolean;
  consistencyRate: number;
};

export type HealthTrendData = {
  direction: TrendDirection;
  quality: TrendQuality;
  stability: TrendStability;

  change: number;
  totalChange: number;
  velocityPerDay: number;

  previousScore: number | null;
  latestScore: number | null;
  firstScore: number | null;

  periodDays: number | null;
  plateau: boolean;

  organTrends: OrganTrend[];
  improvingOrgans: string[];
  worseningOrgans: string[];
  stableOrgans: string[];

  summary: string;
};

type TrendPoint = {
  organ: string;
  score: number;
  createdAt: string;
};

function roundValue(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clampPercentage(value: number) {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function getDaysBetween(
  olderDate: string,
  newerDate: string
) {
  const olderTime = new Date(olderDate).getTime();
  const newerTime = new Date(newerDate).getTime();

  if (
    Number.isNaN(olderTime) ||
    Number.isNaN(newerTime)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      (newerTime - olderTime) /
        (1000 * 60 * 60 * 24)
    )
  );
}

function getDirection(
  change: number
): Exclude<TrendDirection, "insufficient-data"> {
  if (change >= 3) return "improving";
  if (change <= -3) return "worsening";

  return "stable";
}

function calculateAverageChange(points: TrendPoint[]) {
  if (points.length < 2) return 0;

  let totalChange = 0;

  for (let index = 1; index < points.length; index += 1) {
    totalChange +=
      points[index].score - points[index - 1].score;
  }

  return roundValue(
    totalChange / (points.length - 1)
  );
}

function calculateConsistencyRate(
  points: TrendPoint[],
  direction: Exclude<
    TrendDirection,
    "insufficient-data"
  >
) {
  if (points.length < 2) return 0;

  const changes: number[] = [];

  for (let index = 1; index < points.length; index += 1) {
    changes.push(
      points[index].score - points[index - 1].score
    );
  }

  if (direction === "stable") {
    const stableChanges = changes.filter(
      (change) => Math.abs(change) < 3
    ).length;

    return clampPercentage(
      (stableChanges / changes.length) * 100
    );
  }

  const matchingChanges = changes.filter((change) =>
    direction === "improving"
      ? change > 0
      : change < 0
  ).length;

  return clampPercentage(
    (matchingChanges / changes.length) * 100
  );
}

function calculateVariation(points: TrendPoint[]) {
  if (points.length < 2) return 0;

  const changes: number[] = [];

  for (let index = 1; index < points.length; index += 1) {
    changes.push(
      points[index].score - points[index - 1].score
    );
  }

  const average =
    changes.reduce(
      (total, change) => total + change,
      0
    ) / changes.length;

  const variance =
    changes.reduce(
      (total, change) =>
        total + (change - average) ** 2,
      0
    ) / changes.length;

  return Math.sqrt(variance);
}

function detectPlateau(points: TrendPoint[]) {
  if (points.length < 3) return false;

  const recentPoints = points.slice(-4);

  const scores = recentPoints.map(
    (point) => point.score
  );

  const minimum = Math.min(...scores);
  const maximum = Math.max(...scores);

  return maximum - minimum <= 2;
}

function getStability(
  consistencyRate: number,
  variation: number
): Exclude<TrendStability, "insufficient-data"> {
  if (consistencyRate >= 75 && variation <= 5) {
    return "consistent";
  }

  if (consistencyRate >= 50 && variation <= 10) {
    return "variable";
  }

  return "unstable";
}

function getTrendQuality({
  direction,
  totalChange,
  velocityPerDay,
  plateau,
  stability,
}: {
  direction: Exclude<
    TrendDirection,
    "insufficient-data"
  >;
  totalChange: number;
  velocityPerDay: number;
  plateau: boolean;
  stability: Exclude<
    TrendStability,
    "insufficient-data"
  >;
}): Exclude<TrendQuality, "insufficient-data"> {
  if (plateau) return "plateau";

  const absoluteChange = Math.abs(totalChange);
  const absoluteVelocity = Math.abs(velocityPerDay);

  if (direction === "stable") {
    return "stable";
  }

  const isStrong =
    absoluteChange >= 15 ||
    absoluteVelocity >= 0.5;

  const isModerate =
    absoluteChange >= 7 ||
    absoluteVelocity >= 0.2;

  if (direction === "improving") {
    if (isStrong && stability !== "unstable") {
      return "strong-improvement";
    }

    if (isModerate) {
      return "moderate-improvement";
    }

    return "weak-improvement";
  }

  if (isStrong && stability !== "unstable") {
    return "strong-decline";
  }

  if (isModerate) {
    return "moderate-decline";
  }

  return "weak-decline";
}

function buildOrganTrends(
  patient: PatientSummary
): OrganTrend[] {
  const points: TrendPoint[] = patient.historyItems
    .filter(
      (item) =>
        typeof item.score === "number" &&
        Boolean(item.module_name) &&
        Boolean(item.created_at)
    )
    .map((item) => ({
      organ: item.module_name,
      score: item.score,
      createdAt: item.created_at,
    }));

  const grouped = new Map<string, TrendPoint[]>();

  for (const point of points) {
    const current = grouped.get(point.organ) ?? [];
    current.push(point);
    grouped.set(point.organ, current);
  }

  const trends: OrganTrend[] = [];

  for (const [organ, organPoints] of grouped.entries()) {
    const sorted = [...organPoints].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
    );

    if (sorted.length < 2) continue;

    const first = sorted[0];
    const previous = sorted[sorted.length - 2];
    const latest = sorted[sorted.length - 1];

    const change =
      latest.score - previous.score;

    const totalChange =
      latest.score - first.score;

    const periodDays = getDaysBetween(
      first.createdAt,
      latest.createdAt
    );

    const direction = getDirection(totalChange);

    const averageChange =
      calculateAverageChange(sorted);

    const velocityPerDay =
      periodDays > 0
        ? roundValue(totalChange / periodDays)
        : 0;

    const plateau = detectPlateau(sorted);

    const consistencyRate =
      calculateConsistencyRate(sorted, direction);

    const variation = calculateVariation(sorted);

    const stability = getStability(
      consistencyRate,
      variation
    );

    const quality = getTrendQuality({
      direction,
      totalChange,
      velocityPerDay,
      plateau,
      stability,
    });

    trends.push({
      organ,
      direction,
      quality,
      stability,

      previousScore: previous.score,
      latestScore: latest.score,
      firstScore: first.score,

      change,
      totalChange,
      averageChange,
      velocityPerDay,

      periodDays,
      dataPoints: sorted.length,
      latestDate: latest.createdAt,

      plateau,
      consistencyRate,
    });
  }

  return trends.sort(
    (a, b) =>
      new Date(b.latestDate).getTime() -
      new Date(a.latestDate).getTime()
  );
}

function getSummary(
  direction: TrendDirection,
  quality: TrendQuality,
  change: number,
  organTrends: OrganTrend[]
) {
  if (direction === "insufficient-data") {
    return "At least two saved assessments for the same health area are needed to calculate a trend.";
  }

  const improvingCount = organTrends.filter(
    (trend) => trend.direction === "improving"
  ).length;

  const worseningCount = organTrends.filter(
    (trend) => trend.direction === "worsening"
  ).length;

  if (quality === "plateau") {
    return "The available health scores show a recent plateau without meaningful improvement or decline.";
  }

  if (direction === "improving") {
    return `The tracked health direction improved by ${Math.abs(
      change
    )} points across ${improvingCount} improving area${
      improvingCount === 1 ? "" : "s"
    }.`;
  }

  if (direction === "worsening") {
    return `The tracked health direction declined by ${Math.abs(
      change
    )} points, with ${worseningCount} area${
      worseningCount === 1 ? "" : "s"
    } needing closer follow-up.`;
  }

  return "The available health scores are generally stable without a meaningful long-term change.";
}

function getOverallStability(
  organTrends: OrganTrend[]
): TrendStability {
  if (!organTrends.length) {
    return "insufficient-data";
  }

  const consistentCount = organTrends.filter(
    (trend) => trend.stability === "consistent"
  ).length;

  const unstableCount = organTrends.filter(
    (trend) => trend.stability === "unstable"
  ).length;

  if (unstableCount > consistentCount) {
    return "unstable";
  }

  if (consistentCount >= organTrends.length / 2) {
    return "consistent";
  }

  return "variable";
}

function getOverallQuality({
  direction,
  totalChange,
  velocityPerDay,
  plateau,
  stability,
}: {
  direction: TrendDirection;
  totalChange: number;
  velocityPerDay: number;
  plateau: boolean;
  stability: TrendStability;
}): TrendQuality {
  if (
    direction === "insufficient-data" ||
    stability === "insufficient-data"
  ) {
    return "insufficient-data";
  }

  return getTrendQuality({
    direction,
    totalChange,
    velocityPerDay,
    plateau,
    stability,
  });
}

export function calculateHealthTrend(
  patient: PatientSummary
): EngineResult<HealthTrendData> {
  const organTrends = buildOrganTrends(patient);

  if (organTrends.length === 0) {
    return {
      status: "insufficient-data",
      confidence: 0,
      generatedAt: new Date().toISOString(),
      data: {
        direction: "insufficient-data",
        quality: "insufficient-data",
        stability: "insufficient-data",

        change: 0,
        totalChange: 0,
        velocityPerDay: 0,

        previousScore: null,
        latestScore: null,
        firstScore: null,

        periodDays: null,
        plateau: false,

        organTrends: [],
        improvingOrgans: [],
        worseningOrgans: [],
        stableOrgans: [],

        summary: getSummary(
          "insufficient-data",
          "insufficient-data",
          0,
          []
        ),
      },
    };
  }

  const averageFirst =
    organTrends.reduce(
      (total, trend) => total + trend.firstScore,
      0
    ) / organTrends.length;

  const averagePrevious =
    organTrends.reduce(
      (total, trend) =>
        total + trend.previousScore,
      0
    ) / organTrends.length;

  const averageLatest =
    organTrends.reduce(
      (total, trend) => total + trend.latestScore,
      0
    ) / organTrends.length;

  const firstScore = Math.round(averageFirst);
  const previousScore = Math.round(averagePrevious);
  const latestScore = Math.round(averageLatest);

  const change = latestScore - previousScore;
  const totalChange = latestScore - firstScore;

  const direction = getDirection(totalChange);

  const periodDays = Math.max(
    ...organTrends.map(
      (trend) => trend.periodDays
    )
  );

  const velocityPerDay =
    periodDays > 0
      ? roundValue(totalChange / periodDays)
      : 0;

  const plateau =
    organTrends.filter((trend) => trend.plateau)
      .length >=
    Math.ceil(organTrends.length / 2);

  const stability =
    getOverallStability(organTrends);

  const quality = getOverallQuality({
    direction,
    totalChange,
    velocityPerDay,
    plateau,
    stability,
  });

  const totalDataPoints = organTrends.reduce(
    (total, trend) =>
      total + trend.dataPoints,
    0
  );

  const averageConsistency =
    organTrends.reduce(
      (total, trend) =>
        total + trend.consistencyRate,
      0
    ) / organTrends.length;

  const timeCoverageScore = Math.min(
    25,
    periodDays >= 90
      ? 25
      : periodDays >= 30
        ? 18
        : periodDays >= 14
          ? 12
          : 6
  );

  const confidence = clampPercentage(
    organTrends.length * 12 +
      Math.min(totalDataPoints, 15) * 3 +
      timeCoverageScore +
      averageConsistency * 0.15
  );

  return {
    status: "ready",
    confidence,
    generatedAt: new Date().toISOString(),
    data: {
      direction,
      quality,
      stability,

      change,
      totalChange,
      velocityPerDay,

      previousScore,
      latestScore,
      firstScore,

      periodDays,
      plateau,

      organTrends,

      improvingOrgans: organTrends
        .filter(
          (trend) =>
            trend.direction === "improving"
        )
        .map((trend) => trend.organ),

      worseningOrgans: organTrends
        .filter(
          (trend) =>
            trend.direction === "worsening"
        )
        .map((trend) => trend.organ),

      stableOrgans: organTrends
        .filter(
          (trend) =>
            trend.direction === "stable"
        )
        .map((trend) => trend.organ),

      summary: getSummary(
        direction,
        quality,
        totalChange,
        organTrends
      ),
    },
  };
}
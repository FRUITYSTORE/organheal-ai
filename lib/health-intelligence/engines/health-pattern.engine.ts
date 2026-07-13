import { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import { PatientSummary } from "@/lib/models/patient";
import {
  HealthTrendData,
  OrganTrend,
} from "@/lib/health-intelligence/engines/trend.engine";
import {
  HealthTimelineData,
  HealthTimelineSeverity,
} from "@/lib/health-intelligence/engines/health-timeline.engine";
import { ClinicalFinding } from "@/lib/health-intelligence/models/clinical-findings";

export type HealthPatternType =
  | "consistent-improvement"
  | "consistent-decline"
  | "unstable-direction"
  | "plateau"
  | "repeated-priority"
  | "follow-up-gap"
  | "critical-signal-cluster"
  | "insufficient-history";

export type HealthPatternPriority =
  | "critical"
  | "high"
  | "moderate"
  | "informational";

export type HealthPattern = {
  id: string;
  type: HealthPatternType;
  priority: HealthPatternPriority;
  title: string;
  description: string;
  organ: string | null;
  confidence: number;
  evidence: string[];
  recommendedAction: string;
};

export type HealthPatternData = {
  patterns: HealthPattern[];
  primaryPattern: HealthPattern | null;
  criticalPatterns: number;
  highPriorityPatterns: number;
  summary: string;
};

type BuildHealthPatternsInput = {
  patient: PatientSummary;
  findings: ClinicalFinding[];
  trend: EngineResult<HealthTrendData>;
  timeline: EngineResult<HealthTimelineData>;
};

function clampPercentage(value: number) {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function createTrendPattern(
  organTrend: OrganTrend
): HealthPattern | null {
  if (
    organTrend.direction === "improving" &&
    organTrend.stability === "consistent"
  ) {
    return {
      id: `consistent-improvement-${organTrend.organ}`,
      type: "consistent-improvement",
      priority: "informational",
      title: `${organTrend.organ} shows consistent improvement`,
      description: `${organTrend.organ} improved by ${Math.abs(
        organTrend.totalChange
      )} points across ${organTrend.dataPoints} saved measurements.`,
      organ: organTrend.organ,
      confidence: clampPercentage(
        organTrend.consistencyRate +
          Math.min(organTrend.dataPoints * 3, 15)
      ),
      evidence: [
        `First score: ${organTrend.firstScore}/100.`,
        `Latest score: ${organTrend.latestScore}/100.`,
        `Consistency rate: ${organTrend.consistencyRate}%.`,
      ],
      recommendedAction:
        "Continue the current follow-up plan and maintain the habits associated with this improvement.",
    };
  }

  if (
    organTrend.direction === "worsening" &&
    organTrend.stability === "consistent"
  ) {
    return {
      id: `consistent-decline-${organTrend.organ}`,
      type: "consistent-decline",
      priority:
        organTrend.quality === "strong-decline"
          ? "critical"
          : "high",
      title: `${organTrend.organ} shows a consistent decline`,
      description: `${organTrend.organ} declined by ${Math.abs(
        organTrend.totalChange
      )} points across ${organTrend.dataPoints} saved measurements.`,
      organ: organTrend.organ,
      confidence: clampPercentage(
        organTrend.consistencyRate +
          Math.min(organTrend.dataPoints * 3, 15)
      ),
      evidence: [
        `First score: ${organTrend.firstScore}/100.`,
        `Latest score: ${organTrend.latestScore}/100.`,
        `Consistency rate: ${organTrend.consistencyRate}%.`,
      ],
      recommendedAction:
        "Review the decline, repeat the relevant assessment, and consider professional follow-up if the pattern continues.",
    };
  }

  if (organTrend.stability === "unstable") {
    return {
      id: `unstable-direction-${organTrend.organ}`,
      type: "unstable-direction",
      priority: "moderate",
      title: `${organTrend.organ} results are fluctuating`,
      description:
        "The saved scores change direction frequently, so the current trend should be interpreted cautiously.",
      organ: organTrend.organ,
      confidence: clampPercentage(
        100 - organTrend.consistencyRate +
          Math.min(organTrend.dataPoints * 3, 15)
      ),
      evidence: [
        `${organTrend.dataPoints} saved measurements are available.`,
        `Consistency rate: ${organTrend.consistencyRate}%.`,
        `Current score: ${organTrend.latestScore}/100.`,
      ],
      recommendedAction:
        "Repeat the assessment under similar conditions and review possible causes of the variation.",
    };
  }

  if (organTrend.plateau) {
    return {
      id: `plateau-${organTrend.organ}`,
      type: "plateau",
      priority: "moderate",
      title: `${organTrend.organ} has reached a plateau`,
      description:
        "Recent saved scores remain within a narrow range without meaningful improvement or decline.",
      organ: organTrend.organ,
      confidence: clampPercentage(
        55 + Math.min(organTrend.dataPoints * 5, 30)
      ),
      evidence: [
        `Latest score: ${organTrend.latestScore}/100.`,
        `Total change: ${organTrend.totalChange} points.`,
        `${organTrend.dataPoints} measurements were reviewed.`,
      ],
      recommendedAction:
        "Review the current plan and consider one realistic adjustment to restart progress.",
    };
  }

  return null;
}

function buildTrendPatterns(
  trend: EngineResult<HealthTrendData>
): HealthPattern[] {
  if (trend.status !== "ready") {
    return [];
  }

  return trend.data.organTrends
    .map(createTrendPattern)
    .filter((pattern): pattern is HealthPattern => pattern !== null);
}

function buildFollowUpGapPattern(
  patient: PatientSummary
): HealthPattern | null {
  const latestDates = [
    ...patient.historyItems.map((item) => item.created_at),
    patient.latestCheckIn?.created_at ?? null,
    ...patient.uploadedReports.map((report) => report.created_at),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  if (!latestDates.length) {
    return {
      id: "insufficient-history",
      type: "insufficient-history",
      priority: "informational",
      title: "More health history is needed",
      description:
        "There is not enough saved health activity to identify reliable patterns yet.",
      organ: null,
      confidence: 100,
      evidence: [
        "No reliable dated health activity was found.",
      ],
      recommendedAction:
        "Complete another assessment, Check-In, or upload a medical report.",
    };
  }

  const latestActivity = Math.max(...latestDates);
  const daysSinceLatest = Math.floor(
    (Date.now() - latestActivity) /
      (1000 * 60 * 60 * 24)
  );

  if (daysSinceLatest < 30) {
    return null;
  }

  return {
    id: "follow-up-gap",
    type: "follow-up-gap",
    priority: daysSinceLatest >= 90 ? "high" : "moderate",
    title: "A follow-up gap was detected",
    description: `No new health activity has been recorded for approximately ${daysSinceLatest} days.`,
    organ: null,
    confidence: 90,
    evidence: [
      `Latest recorded health activity was ${daysSinceLatest} days ago.`,
    ],
    recommendedAction:
      "Complete a Check-In or repeat the most relevant assessment to refresh the health plan.",
  };
}

function buildCriticalClusterPattern(
  findings: ClinicalFinding[],
  timeline: EngineResult<HealthTimelineData>
): HealthPattern | null {
  const criticalFindings = findings.filter(
    (finding) => finding.severity === "critical"
  );

  const recentCriticalEvents =
    timeline.data.events.filter(
      (event) =>
        event.severity ===
        ("critical" as HealthTimelineSeverity)
    );

  const totalSignals =
    criticalFindings.length + recentCriticalEvents.length;

  if (totalSignals < 2) {
    return null;
  }

  return {
    id: "critical-signal-cluster",
    type: "critical-signal-cluster",
    priority: "critical",
    title: "Multiple high-priority health signals are present",
    description:
      "More than one critical finding or timeline event is currently present and should be reviewed together.",
    organ: null,
    confidence: clampPercentage(70 + totalSignals * 5),
    evidence: [
      `${criticalFindings.length} critical clinical finding(s).`,
      `${recentCriticalEvents.length} critical timeline event(s).`,
    ],
    recommendedAction:
      "Review the combined signals with a qualified healthcare professional.",
  };
}

function getPatternWeight(pattern: HealthPattern) {
  switch (pattern.priority) {
    case "critical":
      return 400 + pattern.confidence;
    case "high":
      return 300 + pattern.confidence;
    case "moderate":
      return 200 + pattern.confidence;
    default:
      return 100 + pattern.confidence;
  }
}

export function detectHealthPatterns({
  patient,
  findings,
  trend,
  timeline,
}: BuildHealthPatternsInput): EngineResult<HealthPatternData> {
  const patterns = [
    ...buildTrendPatterns(trend),
    buildCriticalClusterPattern(findings, timeline),
    buildFollowUpGapPattern(patient),
  ]
    .filter((pattern): pattern is HealthPattern => pattern !== null)
    .sort(
      (a, b) => getPatternWeight(b) - getPatternWeight(a)
    );

  if (!patterns.length) {
    return {
      status: "insufficient-data",
      confidence: 0,
      generatedAt: new Date().toISOString(),
      data: {
        patterns: [],
        primaryPattern: null,
        criticalPatterns: 0,
        highPriorityPatterns: 0,
        summary:
          "No reliable health pattern can be identified from the current data.",
      },
    };
  }

  const criticalPatterns = patterns.filter(
    (pattern) => pattern.priority === "critical"
  ).length;

  const highPriorityPatterns = patterns.filter(
    (pattern) => pattern.priority === "high"
  ).length;

  const confidence = clampPercentage(
    patterns.reduce(
      (total, pattern) => total + pattern.confidence,
      0
    ) / patterns.length
  );

  return {
    status: "ready",
    confidence,
    generatedAt: new Date().toISOString(),
    data: {
      patterns: patterns.slice(0, 10),
      primaryPattern: patterns[0] ?? null,
      criticalPatterns,
      highPriorityPatterns,
      summary: `${patterns.length} health pattern${
        patterns.length === 1 ? " was" : "s were"
      } identified from the available history, trends, and clinical signals.`,
    },
  };
}
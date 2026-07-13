import { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import { PatientSummary } from "@/lib/models/patient";
import { HealthTrendData } from "@/lib/health-intelligence/engines/trend.engine";

export type HealthTimelineEventType =
  | "assessment"
  | "checkin"
  | "report"
  | "analysis"
  | "trend";

export type HealthTimelineSeverity =
  | "information"
  | "success"
  | "warning"
  | "critical";

export type HealthTimelineEvent = {
  id: string;
  type: HealthTimelineEventType;
  severity: HealthTimelineSeverity;
  title: string;
  description: string;
  date: string;
  organ: string | null;
  score: number | null;
  href: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type HealthTimelineData = {
  events: HealthTimelineEvent[];
  totalEvents: number;
  latestEvent: HealthTimelineEvent | null;
  criticalEvents: number;
  warningEvents: number;
  summary: string;
};

type BuildHealthTimelineInput = {
  patient: PatientSummary;
  trend: EngineResult<HealthTrendData>;
};

function getAssessmentSeverity(score: number): HealthTimelineSeverity {
  if (score < 40) return "critical";
  if (score < 70) return "warning";
  return "success";
}

function getCheckInSeverity(score: number): HealthTimelineSeverity {
  if (score < 40) return "critical";
  if (score < 70) return "warning";
  return "information";
}

function getTrendSeverity(
  direction: HealthTrendData["direction"],
  quality: HealthTrendData["quality"]
): HealthTimelineSeverity {
  if (
    quality === "strong-decline" ||
    quality === "moderate-decline"
  ) {
    return "critical";
  }

  if (
    direction === "worsening" ||
    quality === "weak-decline"
  ) {
    return "warning";
  }

  if (direction === "improving") {
    return "success";
  }

  return "information";
}

function isValidDate(value?: string | null) {
  if (!value) return false;

  return !Number.isNaN(new Date(value).getTime());
}

function buildAssessmentEvents(
  patient: PatientSummary
): HealthTimelineEvent[] {
  return patient.historyItems
    .filter(
      (item) =>
        typeof item.score === "number" &&
        Boolean(item.module_name) &&
        isValidDate(item.created_at)
    )
    .map((item) => ({
      id: `assessment-${item.id}`,
      type: "assessment" as const,
      severity: getAssessmentSeverity(item.score),
      title: `${item.module_name} assessment`,
      description: `A ${item.module_name} health score of ${item.score}/100 was saved.`,
      date: item.created_at,
      organ: item.module_name,
      score: item.score,
      href: `/${item.module_name.toLowerCase()}`,
      metadata: {
        status: item.status,
      },
    }));
}

function buildCheckInEvents(
  patient: PatientSummary
): HealthTimelineEvent[] {
  const checkIn = patient.latestCheckIn;

  if (
    !checkIn ||
    !isValidDate(checkIn.created_at)
  ) {
    return [];
  }

  return [
    {
      id: `checkin-${checkIn.created_at}`,
      type: "checkin",
      severity: getCheckInSeverity(checkIn.wellness_score),
      title: "Daily Check-In completed",
      description: `The latest wellness score is ${checkIn.wellness_score}/100.`,
      date: checkIn.created_at,
      organ: null,
      score: checkIn.wellness_score,
      href: "/checkin",
      metadata: {
        mood: checkIn.mood,
      },
    },
  ];
}

function buildReportEvents(
  patient: PatientSummary
): HealthTimelineEvent[] {
  return patient.uploadedReports
    .filter((report) => isValidDate(report.created_at))
    .map((report, index) => ({
      id: `report-${report.id ?? index}`,
      type: "report" as const,
      severity: "information" as const,
      title: "Medical report uploaded",
      description:
        report.file_name
          ? `${report.file_name} was added to your health record.`
          : "A medical report was added to your health record.",
      date: report.created_at,
      organ: null,
      score: null,
      href: "/reports",
      metadata: {
        fileName: report.file_name ?? null,
      },
    }));
}

function buildAnalysisEvents(
  patient: PatientSummary
): HealthTimelineEvent[] {
  return patient.generatedResults
    .filter(
      (
        result
      ): result is typeof result & {
        updated_at: string;
      } => isValidDate(result.updated_at)
    )
    .map((result, index) => ({
      id: `analysis-${result.insight_id ?? index}`,
      type: "analysis" as const,
      severity: "success" as const,
      title: "Health intelligence analysis saved",
      description:
        "A structured health intelligence result was generated and saved.",
      date: result.updated_at,
      organ: null,
      score: null,
      href: "/intelligence",
      metadata: {
        insightId: result.insight_id ?? null,
        reportId: result.report_id ?? null,
      },
    }));
}

function buildTrendEvent(
  trend: EngineResult<HealthTrendData>
): HealthTimelineEvent[] {
  if (
    trend.status !== "ready" ||
    trend.data.direction === "insufficient-data"
  ) {
    return [];
  }

  return [
    {
      id: `trend-${trend.generatedAt}`,
      type: "trend",
      severity: getTrendSeverity(
        trend.data.direction,
        trend.data.quality
      ),
      title: "Health direction updated",
      description: trend.data.summary,
      date: trend.generatedAt,
      organ: null,
      score: trend.data.latestScore,
      href: "/dashboard",
      metadata: {
        direction: trend.data.direction,
        quality: trend.data.quality,
        totalChange: trend.data.totalChange,
        periodDays: trend.data.periodDays,
        confidence: trend.confidence,
      },
    },
  ];
}

export function buildHealthTimeline({
  patient,
  trend,
}: BuildHealthTimelineInput): EngineResult<HealthTimelineData> {
  const events = [
    ...buildAssessmentEvents(patient),
    ...buildCheckInEvents(patient),
    ...buildReportEvents(patient),
    ...buildAnalysisEvents(patient),
    ...buildTrendEvent(trend),
  ].sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
  );

  const limitedEvents = events.slice(0, 40);

  const criticalEvents = limitedEvents.filter(
    (event) => event.severity === "critical"
  ).length;

  const warningEvents = limitedEvents.filter(
    (event) => event.severity === "warning"
  ).length;

  if (limitedEvents.length === 0) {
    return {
      status: "insufficient-data",
      confidence: 0,
      generatedAt: new Date().toISOString(),
      data: {
        events: [],
        totalEvents: 0,
        latestEvent: null,
        criticalEvents: 0,
        warningEvents: 0,
        summary:
          "No health events are available yet. Complete an assessment, Check-In, or upload a report to begin your timeline.",
      },
    };
  }

  const sourceTypes = new Set(
    limitedEvents.map((event) => event.type)
  );

  const confidence = Math.min(
    100,
    limitedEvents.length * 3 +
      sourceTypes.size * 12
  );

  return {
    status: "ready",
    confidence,
    generatedAt: new Date().toISOString(),
    data: {
      events: limitedEvents,
      totalEvents: limitedEvents.length,
      latestEvent: limitedEvents[0] ?? null,
      criticalEvents,
      warningEvents,
      summary: `Your health timeline contains ${limitedEvents.length} event${
        limitedEvents.length === 1 ? "" : "s"
      } across ${sourceTypes.size} health data source${
        sourceTypes.size === 1 ? "" : "s"
      }.`,
    },
  };
}
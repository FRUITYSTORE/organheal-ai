import { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import { PatientSummary } from "@/lib/models/patient";
import { ClinicalFinding } from "@/lib/health-intelligence/models/clinical-findings";
import { PatientPriorityResult } from "@/lib/health-intelligence/engines/priority.engine";
import { HealthScoreData } from "@/lib/health-intelligence/engines/health-score.engine";
import { HealthTrendData } from "@/lib/health-intelligence/engines/trend.engine";
import { HealthPatternData } from "@/lib/health-intelligence/engines/health-pattern.engine";
import { HealthTimelineData } from "@/lib/health-intelligence/engines/health-timeline.engine";

export type HealthEvidenceSource =
  | "assessment"
  | "checkin"
  | "report"
  | "analysis"
  | "history"
  | "finding"
  | "trend"
  | "pattern"
  | "timeline";

export type HealthEvidenceItem = {
  id: string;
  source: HealthEvidenceSource;
  title: string;
  detail: string;
  value: string | number | null;
  date: string | null;
  organ: string | null;
  importance: "primary" | "supporting";
};

export type HealthEvidenceData = {
  headline: string;
  explanation: string;
  primaryEvidence: HealthEvidenceItem[];
  supportingEvidence: HealthEvidenceItem[];
  sourceCount: number;
  evidenceCount: number;
  dataPointsReviewed: number;
};

type BuildHealthEvidenceInput = {
  patient: PatientSummary;
  findings: ClinicalFinding[];
  priority: PatientPriorityResult;
  healthScore: EngineResult<HealthScoreData>;
  trend: EngineResult<HealthTrendData>;
  patterns: EngineResult<HealthPatternData>;
  timeline: EngineResult<HealthTimelineData>;
};

function buildPatternEvidence(
  patterns: EngineResult<HealthPatternData>
): HealthEvidenceItem[] {
  const pattern = patterns.data.primaryPattern;

  if (!pattern) return [];

  return [
    {
      id: `pattern-${pattern.id}`,
      source: "pattern",
      title: pattern.title,
      detail: pattern.description,
      value: `${pattern.confidence}% confidence`,
      date: patterns.generatedAt,
      organ: pattern.organ,
      importance: "primary",
    },
    ...pattern.evidence.slice(0, 4).map((detail, index) => ({
      id: `pattern-detail-${pattern.id}-${index}`,
      source: "pattern" as const,
      title: "Pattern evidence",
      detail,
      value: null,
      date: patterns.generatedAt,
      organ: pattern.organ,
      importance: "supporting" as const,
    })),
  ];
}

function buildTrendEvidence(
  trend: EngineResult<HealthTrendData>
): HealthEvidenceItem[] {
  if (
    trend.status !== "ready" ||
    trend.data.direction === "insufficient-data"
  ) {
    return [];
  }

  const items: HealthEvidenceItem[] = [
    {
      id: "overall-trend",
      source: "trend",
      title: "Overall health direction",
      detail: trend.data.summary,
      value: trend.data.totalChange,
      date: trend.generatedAt,
      organ: null,
      importance: "primary",
    },
  ];

  for (const organTrend of trend.data.organTrends.slice(0, 5)) {
    items.push({
      id: `trend-${organTrend.organ}`,
      source: "trend",
      title: `${organTrend.organ} trend`,
      detail: `${organTrend.firstScore}/100 → ${organTrend.latestScore}/100 across ${organTrend.dataPoints} saved measurements.`,
      value: organTrend.totalChange,
      date: organTrend.latestDate,
      organ: organTrend.organ,
      importance: "supporting",
    });
  }

  return items;
}

function buildPriorityEvidence(
  priority: PatientPriorityResult
): HealthEvidenceItem[] {
  if (!priority.data.priorityOrgan) return [];

  return [
    {
      id: "priority-area",
      source: "assessment",
      title: "Current priority area",
      detail: priority.data.reason,
      value: priority.data.priorityScore,
      date: priority.generatedAt,
      organ: priority.data.priorityOrgan,
      importance: "primary",
    },
  ];
}

function buildFindingEvidence(
  findings: ClinicalFinding[]
): HealthEvidenceItem[] {
  return findings.slice(0, 5).map((finding, index) => ({
    id: `finding-${index}`,
    source: "finding",
    title: finding.title,
    detail: finding.description,
    value: finding.severity,
    date: null,
    organ: null,
    importance:
      finding.severity === "critical"
        ? ("primary" as const)
        : ("supporting" as const),
  }));
}

function buildTimelineEvidence(
  timeline: EngineResult<HealthTimelineData>
): HealthEvidenceItem[] {
  return timeline.data.events.slice(0, 5).map((event) => ({
    id: `timeline-${event.id}`,
    source: "timeline",
    title: event.title,
    detail: event.description,
    value: event.score,
    date: event.date,
    organ: event.organ,
    importance:
      event.severity === "critical"
        ? ("primary" as const)
        : ("supporting" as const),
  }));
}

function getDataPointsReviewed(patient: PatientSummary) {
  return (
    patient.historyItems.length +
    patient.assessments.length +
    patient.uploadedReports.length +
    patient.generatedResults.length +
    (patient.latestCheckIn ? 1 : 0)
  );
}

export function buildHealthEvidence({
  patient,
  findings,
  priority,
  healthScore,
  trend,
  patterns,
  timeline,
}: BuildHealthEvidenceInput): EngineResult<HealthEvidenceData> {
  const evidence = [
    ...buildPatternEvidence(patterns),
    ...buildTrendEvidence(trend),
    ...buildPriorityEvidence(priority),
    ...buildFindingEvidence(findings),
    ...buildTimelineEvidence(timeline),
  ];

  const uniqueEvidence = Array.from(
    new Map(evidence.map((item) => [item.id, item])).values()
  );

  const primaryEvidence = uniqueEvidence
    .filter((item) => item.importance === "primary")
    .slice(0, 6);

  const supportingEvidence = uniqueEvidence
    .filter((item) => item.importance === "supporting")
    .slice(0, 10);

  const sourceCount = new Set(
    uniqueEvidence.map((item) => item.source)
  ).size;

  const dataPointsReviewed = getDataPointsReviewed(patient);

  if (!uniqueEvidence.length) {
    return {
      status: "insufficient-data",
      confidence: 0,
      generatedAt: new Date().toISOString(),
      data: {
        headline: "More evidence is needed",
        explanation:
          "Complete assessments, Check-Ins, or upload medical reports to explain future health intelligence results.",
        primaryEvidence: [],
        supportingEvidence: [],
        sourceCount: 0,
        evidenceCount: 0,
        dataPointsReviewed,
      },
    };
  }

  const confidence = Math.min(
    100,
    Math.round(
      healthScore.confidence * 0.4 +
        trend.confidence * 0.25 +
        patterns.confidence * 0.25 +
        Math.min(sourceCount * 3, 10)
    )
  );

  return {
    status: "ready",
    confidence,
    generatedAt: new Date().toISOString(),
    data: {
      headline: "Why OrganHeal reached this conclusion",
      explanation: `The current health intelligence was supported by ${uniqueEvidence.length} evidence item${
        uniqueEvidence.length === 1 ? "" : "s"
      } across ${sourceCount} health data source${
        sourceCount === 1 ? "" : "s"
      }.`,
      primaryEvidence,
      supportingEvidence,
      sourceCount,
      evidenceCount: uniqueEvidence.length,
      dataPointsReviewed,
    },
  };
}
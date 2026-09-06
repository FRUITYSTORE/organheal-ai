import { buildActionPlan } from "@/lib/actionPlanEngine";
import { buildHealthStory } from "@/lib/healthStoryEngine";
import { buildHistoricalLabTrends } from "@/lib/historicalLabTrendEngine";
import { buildLongitudinalRisk } from "@/lib/longitudinalRiskEngine";
import { buildHealthTimeline } from "@/lib/healthTimelineEngine";
import { buildPatientDigitalTwin } from "@/lib/patientDigitalTwin";
import { buildCrossSourceIntelligence } from "@/lib/crossSourceIntelligence";
import {
  buildRadiologySummary,
  detectRadiologyFindings,
} from "@/lib/radiologyEngine";
import {
  buildLabMarkerSummary,
} from "@/lib/labMarkerDetector";
import { buildHealthStrategy } from "@/lib/healthStrategyEngine";
import { buildUnifiedHealthIntelligence } from "@/lib/unifiedHealthEngine";
import { detectClinicalPatterns } from "@/lib/clinicalPatternEngine";
import { buildForecast } from "@/lib/forecastEngine";

type AssessmentInput = {
  organ_name: string;
  score: number;
  created_at: string;
};

type DailyCheckInInput = {
  mood: string | null;
  wellness_score: number | null;
  created_at: string;
};

type HistoricalMarkerRow = {
  marker_name: string;
  marker_value: unknown;
  marker_unit: string | null;
  created_at: string;
};

export type GeneratedIntelligenceResult = {
  strategy: any;
  unifiedHealth: any;
  digitalTwin: any;
  crossSource: any;
  timeline: any;
  longitudinalRisk: any;
  forecast: any;
  healthStory: string;
  actionPlan: any;
  executiveSummary: any;
  labTrends: any[];
};

type BuildReportIntelligenceResultInput = {
  extractedText: string;
  reportType: string | null;
  detectedMarkers: any[];
  assessments: AssessmentInput[];
  dailyCheckIn: DailyCheckInInput | null;
  historicalMarkerRows: HistoricalMarkerRow[];
    language:
    | "en"
    | "ar";
};

export function buildReportIntelligenceResult({
  extractedText,
  reportType,
  detectedMarkers,
  assessments,
  dailyCheckIn,
  historicalMarkerRows,
  language,
}: BuildReportIntelligenceResultInput) {
  const markerSummary =
    buildLabMarkerSummary(
    detectedMarkers,
    language
  );

  const labTrends = buildHistoricalLabTrends(
  historicalMarkerRows
    .filter(
      (row) =>
        row.marker_value !==
          null &&
        Number.isFinite(
          Number(
            row.marker_value
          )
        )
    )
    .map(
      (row) => ({
        marker:
          row.marker_name,

        value:
          Number(
            row.marker_value
          ),

        unit:
          row.marker_unit,

        date:
          row.created_at,
      })
    )
);

  const radiologyFindings = detectRadiologyFindings(extractedText);
  const radiologySummary = buildRadiologySummary(radiologyFindings);
  const isRadiologyReport = reportType === "radiology";

  const clinicalPatterns =
  detectClinicalPatterns(
    detectedMarkers
  );

  const healthStrategy = buildHealthStrategy(detectedMarkers);

  const unifiedHealth = buildUnifiedHealthIntelligence({
    detectedMarkers,
    healthStrategy,
  });

  const digitalTwin = buildPatientDigitalTwin({
    markers: detectedMarkers,
    radiologyFindings,
  });

  const crossSource = buildCrossSourceIntelligence({
    detectedMarkers,
    assessments,
    dailyCheckIn,
  });

  const timeline = buildHealthTimeline([
    ...assessments.map((item) => ({
      source: "assessment" as const,
      label: item.organ_name,
      score: item.score,
      date: item.created_at,
    })),
    ...(dailyCheckIn
      ? [
          {
            source: "checkin" as const,
            label: "Daily Check-In",
            score: dailyCheckIn.wellness_score || 0,
            date: dailyCheckIn.created_at,
          },
        ]
      : []),
  ]);

  const longitudinalRisk = buildLongitudinalRisk(timeline);
  const forecast = buildForecast(
    detectedMarkers,
    crossSource.confidenceScore
  );

  const healthStory =
  buildHealthStory({
    timeline,
    longitudinalRisk,
    forecast,
    crossSource,
    digitalTwin,
    language,
  });

  const actionPlan = buildActionPlan({
    digitalTwin,
    forecast,
    longitudinalRisk,
    crossSource,
  });

  const executiveSummary = {
    currentScore: forecast.currentScore,
    trend: timeline.trendDirection,
    forecastScore: forecast.forecastScore,
    confidenceLevel: crossSource.confidenceLevel,
    confidenceScore: crossSource.confidenceScore,
    prioritySystem: digitalTwin.primarySystem,
    nextBestAction: unifiedHealth.nextBestAction,
  };

  const generatedResultPayload: GeneratedIntelligenceResult = {
    strategy: healthStrategy,
    unifiedHealth,
    digitalTwin,
    crossSource,
    timeline,
    longitudinalRisk,
    forecast,
    healthStory,
    actionPlan,
    executiveSummary,
    labTrends,
  };

  return {
    generatedResultPayload,
    markerSummary,
    radiologySummary,
    isRadiologyReport,
    clinicalPatterns,
  };
}
import type { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import type {
  HealthScoreData,
  HealthScoreLevel,
} from "@/lib/health-intelligence/engines/health-score.engine";
import type {
  IntelligenceOverviewData,
} from "@/lib/health-intelligence/engines/intelligence-overview.engine";
import type {
  PatientPriorityResult,
} from "@/lib/health-intelligence/engines/priority.engine";
import type { PatientSummary } from "@/lib/models/patient";

export type HealthPassportReadiness =
  | "ready"
  | "building"
  | "insufficient-data";

export type HealthPassportDataSource = {
  id:
    | "assessments"
    | "checkin"
    | "reports"
    | "analysis"
    | "history";

  label: string;
  count: number;
  available: boolean;
};

export type HealthPassportData = {
  profile: string;

  overallScore: number;
  healthLevel: HealthScoreLevel;
  healthAgeStatus: string;

  priorityArea: string | null;
  priorityScore: number | null;

  strongestArea: string | null;
  strongestScore: number | null;

  potentialScore: number;
  potentialGain: number;

  dataCompleteness: number;
  readiness: HealthPassportReadiness;

  sources: HealthPassportDataSource[];
  availableSourceCount: number;
  totalDataPoints: number;

  summary: string;
  lastUpdated: string;
};

type BuildHealthPassportInput = {
  patient: PatientSummary;

  healthScore: EngineResult<HealthScoreData>;

  priority: PatientPriorityResult;

  intelligenceOverview: EngineResult<IntelligenceOverviewData>;
};

function getReadiness(
  dataCompleteness: number,
  availableSourceCount: number
): HealthPassportReadiness {
  if (
    dataCompleteness >= 70 &&
    availableSourceCount >= 3
  ) {
    return "ready";
  }

  if (
    dataCompleteness > 0 ||
    availableSourceCount > 0
  ) {
    return "building";
  }

  return "insufficient-data";
}

function getPassportSummary({
  profile,
  readiness,
  priorityArea,
  overallScore,
}: {
  profile: string;
  readiness: HealthPassportReadiness;
  priorityArea: string | null;
  overallScore: number;
}) {
  if (readiness === "insufficient-data") {
    return "More health data is needed to build a meaningful Health Passport.";
  }

  if (readiness === "building") {
    return `Your Health Passport is being built from the available data. The current composite score is ${overallScore}/100${
      priorityArea
        ? `, with ${priorityArea} identified as the current priority area`
        : ""
    }.`;
  }

  return `${profile}. The current composite score is ${overallScore}/100${
    priorityArea
      ? `, with ${priorityArea} identified as the current priority area`
      : ""
  }.`;
}

export function buildHealthPassport({
  patient,
  healthScore,
  priority,
  intelligenceOverview,
}: BuildHealthPassportInput): EngineResult<HealthPassportData> {
  const overview =
    intelligenceOverview.data;

  const sources: HealthPassportDataSource[] = [
    {
      id: "assessments",
      label: "Organ assessments",
      count: patient.assessments.length,
      available:
        patient.assessments.length > 0,
    },
    {
      id: "checkin",
      label: "Latest wellness Check-In",
      count: patient.latestCheckIn ? 1 : 0,
      available:
        patient.latestCheckIn !== null,
    },
    {
      id: "reports",
      label: "Medical reports",
      count: patient.uploadedReports.length,
      available:
        patient.uploadedReports.length > 0,
    },
    {
      id: "analysis",
      label: "Generated intelligence results",
      count: patient.generatedResults.length,
      available:
        patient.generatedResults.length > 0,
    },
    {
      id: "history",
      label: "Health history records",
      count: patient.historyItems.length,
      available:
        patient.historyItems.length > 0,
    },
  ];

  const availableSourceCount =
    sources.filter(
      (source) => source.available
    ).length;

  const totalDataPoints =
    sources.reduce(
      (total, source) =>
        total + source.count,
      0
    );

  const readiness = getReadiness(
    healthScore.data.dataCompleteness,
    availableSourceCount
  );

  const generatedAt =
    new Date().toISOString();

  return {
    status:
      readiness === "insufficient-data"
        ? "insufficient-data"
        : "ready",

    confidence:
      healthScore.data.dataCompleteness,

    generatedAt,

    data: {
      profile: overview.healthProfile,

      overallScore:
        healthScore.data.score,

      healthLevel:
        healthScore.data.level,

      healthAgeStatus:
        overview.healthAgeStatus,

      priorityArea:
        priority.data.priorityOrgan,

      priorityScore:
        priority.data.priorityScore,

      strongestArea:
        overview.strongestOrgan,

      strongestScore:
        overview.strongestScore,

      potentialScore:
        overview.potentialScore,

      potentialGain:
        overview.potentialGain,

      dataCompleteness:
        healthScore.data.dataCompleteness,

      readiness,

      sources,

      availableSourceCount,

      totalDataPoints,

      summary: getPassportSummary({
        profile:
          overview.healthProfile,

        readiness,

        priorityArea:
          priority.data.priorityOrgan,

        overallScore:
          healthScore.data.score,
      }),

      lastUpdated: generatedAt,
    },
  };
}
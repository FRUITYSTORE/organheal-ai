export type HealthIntelligenceContextLanguage =
  | "en"
  | "ar";

export type HealthIntelligenceContextAudience =
  | "general"
  | "patient"
  | "clinician";

export type HealthContextAssessment = {
  id: string;
  moduleName: string;
  score: number;
  status: string | null;
  notes: string | null;
  createdAt: string;
};

export type HealthContextCheckIn = {
  id: string;
  mood: string;

  energyLevel: number | null;
  stressLevel: number | null;
  sleepQuality: number | null;
  hydration: number | null;
  physicalActivity: number | null;

  wellnessScore: number;
  createdAt: string;
};

export type HealthContextReport = {
  id: string;
  fileName: string | null;
  extractionStatus: string | null;
  createdAt: string;
};

export type HealthContextAnalysis = {
  id: string;
  reportId: string | null;
  title: string | null;
  status: string | null;
  createdAt: string | null;
};

export type HealthContextSourceSummary = {
  assessments: number;
  checkIns: number;
  reports: number;
  analyses: number;
  totalDataPoints: number;
  availableSourceCount: number;
};

export type HealthContextScoreSummary = {
  overallScore: number;
  assessmentAverage: number | null;
  checkInAverage: number | null;

  priorityArea: string | null;
  priorityScore: number | null;

  strongestArea: string | null;
  strongestScore: number | null;
};

export type HealthContextReportSummary = {
  totalReports: number;
  processedReports: number;
  pendingReports: number;
};

export type HealthContextAnalysisSummary = {
  totalAnalyses: number;
  generatedAnalyses: number;
};

export type HealthContextReadiness = {
  hasAssessment: boolean;
  hasCheckIn: boolean;
  hasReport: boolean;
  hasAnalysis: boolean;

  hasHealthPlan: boolean;
  hasDoctorBrief: boolean;

  dataCompleteness: number;
  journeyStarted: boolean;
};

export type HealthIntelligenceContext = {
  userId: string;

  language: HealthIntelligenceContextLanguage;
  audience: HealthIntelligenceContextAudience;

  assessments: HealthContextAssessment[];
  checkIns: HealthContextCheckIn[];
  reports: HealthContextReport[];
  analyses: HealthContextAnalysis[];

  latestAssessment: HealthContextAssessment | null;
  latestCheckIn: HealthContextCheckIn | null;
  latestReport: HealthContextReport | null;
  latestAnalysis: HealthContextAnalysis | null;

  scoreSummary: HealthContextScoreSummary;
  sourceSummary: HealthContextSourceSummary;
  reportSummary: HealthContextReportSummary;
  analysisSummary: HealthContextAnalysisSummary;
  readiness: HealthContextReadiness;

  generatedAt: string;
};
function average(
  values: number[]
): number | null {
  if (values.length === 0) {
    return null;
  }

  return Math.round(
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
}

function sortByNewest<T extends {
  createdAt: string | null;
}>(
  items: T[]
): T[] {
  return [...items].sort(
    (first, second) => {
      const firstTime = first.createdAt
        ? new Date(first.createdAt).getTime()
        : 0;

      const secondTime = second.createdAt
        ? new Date(second.createdAt).getTime()
        : 0;

      return secondTime - firstTime;
    }
  );
}

function calculateDataCompleteness(
  sourceSummary: HealthContextSourceSummary,
  readiness: Pick<
    HealthContextReadiness,
    | "hasAssessment"
    | "hasCheckIn"
    | "hasReport"
    | "hasAnalysis"
  >
): number {
  const sourceFlags = [
    readiness.hasAssessment,
    readiness.hasCheckIn,
    readiness.hasReport,
    readiness.hasAnalysis,
  ];

  const availableSources =
    sourceFlags.filter(Boolean).length;

  const sourceCoverage =
    Math.round(
      (availableSources /
        sourceFlags.length) *
        70
    );

  const dataPointCoverage =
    Math.min(
      30,
      sourceSummary.totalDataPoints * 3
    );

  return Math.min(
    100,
    sourceCoverage +
      dataPointCoverage
  );
}

export function buildHealthIntelligenceContext(
  input: BuildHealthIntelligenceContextInput
): HealthIntelligenceContext {
  const assessments = sortByNewest(
    input.assessments ?? []
  );

  const checkIns = sortByNewest(
    input.checkIns ?? []
  );

  const reports = sortByNewest(
    input.reports ?? []
  );

  const analyses = sortByNewest(
    input.analyses ?? []
  );

  const latestAssessment =
    assessments[0] ?? null;

  const latestCheckIn =
    checkIns[0] ?? null;

  const latestReport =
    reports[0] ?? null;

  const latestAnalysis =
    analyses[0] ?? null;

  const assessmentAverage = average(
    assessments.map(
      (assessment) =>
        assessment.score
    )
  );

  const checkInAverage = average(
    checkIns.map(
      (checkIn) =>
        checkIn.wellnessScore
    )
  );

  const combinedScores = [
    ...assessments.map(
      (assessment) =>
        assessment.score
    ),
    ...checkIns.map(
      (checkIn) =>
        checkIn.wellnessScore
    ),
  ];

  const overallScore =
    average(combinedScores) ?? 0;

  const sortedAssessmentsByScore =
    [...assessments].sort(
      (first, second) =>
        first.score - second.score
    );

  const priorityAssessment =
    sortedAssessmentsByScore[0] ??
    null;

  const strongestAssessment =
    sortedAssessmentsByScore.at(-1) ??
    null;

  const processedReports =
    reports.filter(
      (report) =>
        report.extractionStatus ===
        "Completed"
    ).length;

  const pendingReports =
    reports.length -
    processedReports;

  const generatedAnalyses =
    analyses.filter(
      (analysis) =>
        analysis.status ===
        "Generated"
    ).length;

  const sourceSummary: HealthContextSourceSummary = {
    assessments:
      assessments.length,
    checkIns:
      checkIns.length,
    reports:
      reports.length,
    analyses:
      analyses.length,
    totalDataPoints:
      assessments.length +
      checkIns.length +
      reports.length +
      analyses.length,
    availableSourceCount: [
      assessments.length > 0,
      checkIns.length > 0,
      reports.length > 0,
      analyses.length > 0,
    ].filter(Boolean).length,
  };

  const readinessBase = {
    hasAssessment:
      assessments.length > 0,
    hasCheckIn:
      checkIns.length > 0,
    hasReport:
      reports.length > 0,
    hasAnalysis:
      analyses.length > 0,
  };

  const readiness: HealthContextReadiness = {
    ...readinessBase,
    hasHealthPlan:
      input.hasHealthPlan ?? false,
    hasDoctorBrief:
      input.hasDoctorBrief ?? false,
    dataCompleteness:
      calculateDataCompleteness(
        sourceSummary,
        readinessBase
      ),
    journeyStarted:
      sourceSummary.totalDataPoints > 0,
  };

  return {
    userId:
      input.userId,

    language:
      input.language ?? "en",

    audience:
      input.audience ?? "general",

    assessments,
    checkIns,
    reports,
    analyses,

    latestAssessment,
    latestCheckIn,
    latestReport,
    latestAnalysis,

    scoreSummary: {
      overallScore,
      assessmentAverage,
      checkInAverage,

      priorityArea:
        priorityAssessment?.moduleName ??
        null,

      priorityScore:
        priorityAssessment?.score ??
        null,

      strongestArea:
        strongestAssessment?.moduleName ??
        null,

      strongestScore:
        strongestAssessment?.score ??
        null,
    },

    sourceSummary,

    reportSummary: {
      totalReports:
        reports.length,
      processedReports,
      pendingReports,
    },

    analysisSummary: {
      totalAnalyses:
        analyses.length,
      generatedAnalyses,
    },

    readiness,

    generatedAt:
      new Date().toISOString(),
  };
}
export type BuildHealthIntelligenceContextInput = {
  userId: string;

  language?: HealthIntelligenceContextLanguage;
  audience?: HealthIntelligenceContextAudience;

  assessments?: HealthContextAssessment[];
  checkIns?: HealthContextCheckIn[];
  reports?: HealthContextReport[];
  analyses?: HealthContextAnalysis[];

  hasHealthPlan?: boolean;
  hasDoctorBrief?: boolean;
};
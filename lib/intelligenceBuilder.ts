import { generateHealthEngineResult } from "./healthEngine";

export type IntelligenceAssessment = {
  organ_name: string;
  score: number;
  created_at: string;
};

export type IntelligenceLabReport = {
  score: number;
  interpretation?: string | null;
  created_at?: string;
};

export type IntelligenceDailyCheckIn = {
  mood?: string | null;
  wellness_score: number;
  created_at?: string;
};

export function buildHealthIntelligence({
  assessments,
  labReport,
  dailyCheckIn,
  isArabic = false,
}: {
  assessments: IntelligenceAssessment[];
  labReport?: IntelligenceLabReport | null;
  dailyCheckIn?: IntelligenceDailyCheckIn | null;
  isArabic?: boolean;
}) {
  const allScores = [
    ...assessments.map((item) => item.score),
    ...(labReport ? [labReport.score] : []),
    ...(dailyCheckIn ? [dailyCheckIn.wellness_score] : []),
  ];

  const overallScore =
    allScores.length > 0
      ? Math.round(
          allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        )
      : 0;

  const strongestAssessment =
    assessments.length > 0
      ? [...assessments].sort((a, b) => b.score - a.score)[0]
      : null;

  const weakestAssessment =
    assessments.length > 0
      ? [...assessments].sort((a, b) => a.score - b.score)[0]
      : null;

  const priorityHistory = weakestAssessment
    ? assessments
        .filter((item) => item.organ_name === weakestAssessment.organ_name)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
    : [];

  const latestPriorityScore =
    priorityHistory.length > 0 ? priorityHistory[0].score : null;

  const previousPriorityScore =
    priorityHistory.length > 1 ? priorityHistory[1].score : null;

  const healthEngine = generateHealthEngineResult({
    overallScore,
    labScore: labReport?.score ?? null,
    dailyCheckInScore: dailyCheckIn?.wellness_score ?? null,
    priorityOrgan: weakestAssessment?.organ_name ?? null,
    strongestOrgan: strongestAssessment?.organ_name ?? null,
    previousPriorityScore,
    latestPriorityScore,
    isArabic,
  });

  return {
    overallScore,
    strongestOrgan: strongestAssessment?.organ_name ?? null,
    strongestScore: strongestAssessment?.score ?? null,
    priorityOrgan: weakestAssessment?.organ_name ?? null,
    priorityScore: weakestAssessment?.score ?? null,
    labScore: labReport?.score ?? null,
    dailyCheckInScore: dailyCheckIn?.wellness_score ?? null,
    dailyMood: dailyCheckIn?.mood ?? null,
    previousPriorityScore,
    latestPriorityScore,
    ...healthEngine,
  };
}
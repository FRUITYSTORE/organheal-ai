export type CheckinPoint = {
  created_at: string;
  wellness_score: number | null;
};

export type HealthPulse = {
  // Consecutive days with a check-in, counting back from today (or from
  // yesterday if today's check-in is still pending).
  streak: number;
  checkinsThisWeek: number;
  averageScore: number | null;
  previousAverageScore: number | null;
  trend: "up" | "down" | "steady" | null;
  checkedInToday: boolean;
  daysSinceReport: number | null;
  recheckDue: boolean;
};

export const RECHECK_AFTER_DAYS = 90;

const DAY_MS = 86_400_000;

function dayKey(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
  );
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

// Built only from what the member logged themselves (daily check-ins) and
// when they last uploaded a report: an engagement view, never a diagnosis.
export function computeHealthPulse(
  checkins: CheckinPoint[],
  latestReportAt: string | null,
  now: Date = new Date()
): HealthPulse {
  const today = dayKey(now);
  const days = new Set<number>();
  const thisWeek: number[] = [];
  const lastWeek: number[] = [];
  let thisWeekCount = 0;

  for (const checkin of checkins) {
    const key = dayKey(new Date(checkin.created_at));

    days.add(key);

    const age = today - key;

    if (age >= 0 && age < 7) {
      thisWeekCount += 1;

      if (typeof checkin.wellness_score === "number") thisWeek.push(checkin.wellness_score);
    } else if (age >= 7 && age < 14 && typeof checkin.wellness_score === "number") {
      lastWeek.push(checkin.wellness_score);
    }
  }

  const checkedInToday = days.has(today);
  let streak = 0;
  let cursor = checkedInToday ? today : today - 1;

  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }

  const averageScore = average(thisWeek);
  const previousAverageScore = average(lastWeek);
  let trend: HealthPulse["trend"] = null;

  if (averageScore !== null && previousAverageScore !== null) {
    const difference = averageScore - previousAverageScore;

    trend = difference >= 3 ? "up" : difference <= -3 ? "down" : "steady";
  }

  const daysSinceReport = latestReportAt
    ? Math.max(0, today - dayKey(new Date(latestReportAt)))
    : null;

  return {
    streak,
    checkinsThisWeek: thisWeekCount,
    averageScore,
    previousAverageScore,
    trend,
    checkedInToday,
    daysSinceReport,
    recheckDue: daysSinceReport !== null && daysSinceReport >= RECHECK_AFTER_DAYS,
  };
}

import { describe, expect, it } from "vitest";

import { computeHealthPulse } from "@/lib/health-pulse";

const now = new Date(2026, 8, 26, 12);

function daysAgo(days: number, score: number | null = 70) {
  return {
    created_at: new Date(2026, 8, 26 - days, 9).toISOString(),
    wellness_score: score,
  };
}

describe("computeHealthPulse", () => {
  it("is empty for a member with no activity", () => {
    expect(computeHealthPulse([], null, now)).toMatchObject({
      streak: 0,
      checkinsThisWeek: 0,
      averageScore: null,
      trend: null,
      checkedInToday: false,
      daysSinceReport: null,
      recheckDue: false,
    });
  });

  it("counts a streak ending today", () => {
    const pulse = computeHealthPulse([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(4)], null, now);

    expect(pulse.streak).toBe(3);
    expect(pulse.checkedInToday).toBe(true);
  });

  it("keeps the streak alive while today's check-in is still pending", () => {
    const pulse = computeHealthPulse([daysAgo(1), daysAgo(2)], null, now);

    expect(pulse.streak).toBe(2);
    expect(pulse.checkedInToday).toBe(false);
  });

  it("reports the weekly average and the trend against last week", () => {
    const up = computeHealthPulse(
      [daysAgo(0, 80), daysAgo(1, 80), daysAgo(8, 60), daysAgo(9, 60)],
      null,
      now
    );

    expect(up.averageScore).toBe(80);
    expect(up.previousAverageScore).toBe(60);
    expect(up.trend).toBe("up");

    const steady = computeHealthPulse([daysAgo(0, 70), daysAgo(8, 71)], null, now);

    expect(steady.trend).toBe("steady");

    const down = computeHealthPulse([daysAgo(0, 50), daysAgo(8, 70)], null, now);

    expect(down.trend).toBe("down");
  });

  it("flags a re-check after 90 days without a new report", () => {
    const old = new Date(2026, 5, 1).toISOString();
    const recent = new Date(2026, 8, 1).toISOString();

    expect(computeHealthPulse([], old, now).recheckDue).toBe(true);
    expect(computeHealthPulse([], recent, now).recheckDue).toBe(false);
    expect(computeHealthPulse([], recent, now).daysSinceReport).toBe(25);
  });
});

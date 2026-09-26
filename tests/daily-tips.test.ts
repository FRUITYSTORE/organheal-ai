import { describe, expect, it } from "vitest";

import { DAILY_TIPS, getDailyTips } from "@/lib/health-updates/daily-tips";

describe("daily tips", () => {
  it("has bilingual, non-empty, uniquely identified tips", () => {
    const ids = new Set(DAILY_TIPS.map((tip) => tip.id));

    expect(ids.size).toBe(DAILY_TIPS.length);

    for (const tip of DAILY_TIPS) {
      expect(tip.en.title.trim()).not.toBe("");
      expect(tip.en.body.trim()).not.toBe("");
      expect(/[؀-ۿ]/.test(tip.ar.title)).toBe(true);
      expect(/[؀-ۿ]/.test(tip.ar.body)).toBe(true);
    }
  });

  it("returns three distinct tips, stable within a day", () => {
    const morning = getDailyTips(new Date(2026, 8, 26, 6));
    const night = getDailyTips(new Date(2026, 8, 26, 23));

    expect(morning).toHaveLength(3);
    expect(new Set(morning.map((tip) => tip.id)).size).toBe(3);
    expect(morning).toEqual(night);
  });

  it("changes tomorrow and cycles through the whole library", () => {
    const today = getDailyTips(new Date(2026, 8, 26));
    const tomorrow = getDailyTips(new Date(2026, 8, 27));

    expect(tomorrow.map((tip) => tip.id)).not.toEqual(today.map((tip) => tip.id));

    const seen = new Set<string>();

    for (let day = 0; day < DAILY_TIPS.length; day += 1) {
      getDailyTips(new Date(2026, 0, 1 + day)).forEach((tip) => seen.add(tip.id));
    }

    expect(seen.size).toBe(DAILY_TIPS.length);
  });
});

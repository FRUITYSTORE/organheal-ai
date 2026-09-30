import { describe, expect, it } from "vitest";

import { evaluateSafetyGate } from "../lib/symptom-explanation/safety-gate";

describe("evaluateSafetyGate", () => {
  it("blocks the video for exertional chest pressure and returns the emergency guidance", () => {
    const result = evaluateSafetyGate("I feel chest pressure when I walk quickly.");

    expect(result.allowVideo).toBe(false);

    if (result.allowVideo) return;

    expect(result.level).toBe("emergency");
    expect(result.matchedSignalIds).toContain("chest-pain");
    expect(result.response).toMatch(/emergency/i);
  });

  it("blocks the same symptom written in Arabic, with Arabic guidance", () => {
    const result = evaluateSafetyGate("أشعر بضغط في الصدر عندما أمشي بسرعة", "ar");

    expect(result.allowVideo).toBe(false);

    if (result.allowVideo) return;

    expect(result.level).toBe("emergency");
    expect(result.response).toMatch(/الطوارئ/);
  });

  it("blocks urgent (not only emergency) symptoms too", () => {
    const result = evaluateSafetyGate("My stomach pain is getting worse and not going away.");

    expect(result.allowVideo).toBe(false);

    if (result.allowVideo) return;

    expect(result.level).toBe("urgent");
    expect(result.matchedSignalIds).toContain("worsening-abdominal-pain");
  });

  it("allows a video when no urgency signal matches", () => {
    expect(evaluateSafetyGate("I get headaches when I don't sleep well.")).toEqual({
      allowVideo: true,
      level: "none",
    });
  });

  it("follows the existing urgency engine's cause-question rule unchanged", () => {
    // The shared engine deliberately does not treat "why do I have chest
    // pain" as an emergency report. The gate reuses that rule as-is so the
    // chat and the video path agree; changing it is a clinical-policy call.
    expect(evaluateSafetyGate("Why do I have chest pain when I walk?").allowVideo).toBe(true);
  });
});

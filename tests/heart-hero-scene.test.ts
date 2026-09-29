import { describe, expect, it } from "vitest";

import { buildHeartHeroScene } from "../lib/video-studio/heart-hero-scene";

const baseInput = {
  chronologicalAge: 55,
  heartAge: 93,
  ageGapYears: 38,
  tenYearRiskPercent: 36.3,
  riskLevel: "High Risk" as const,
};

describe("buildHeartHeroScene", () => {
  it("embeds the real heart age number in the generated HTML", () => {
    const scene = buildHeartHeroScene(baseInput, "en");

    expect(scene.html).toContain(">93<");
  });

  it("uses the red risk color for High Risk and the English gap sentence", () => {
    const scene = buildHeartHeroScene(baseInput, "en");

    expect(scene.html).toContain("#ef4444");
    expect(scene.html).toContain("38 years older than you");
    expect(scene.html).toContain("HIGHER RISK");
  });

  it("uses the teal risk color for Low Risk", () => {
    const scene = buildHeartHeroScene({ ...baseInput, riskLevel: "Low Risk", ageGapYears: -2 }, "en");

    expect(scene.html).toContain("#14b8a6");
    expect(scene.html).toContain("at or below your actual age");
  });

  it("uses the amber risk color for Moderate Risk", () => {
    const scene = buildHeartHeroScene({ ...baseInput, riskLevel: "Moderate Risk" }, "en");

    expect(scene.html).toContain("#f59e0b");
  });

  it("renders Arabic labels and RTL direction when language is ar", () => {
    const scene = buildHeartHeroScene(baseInput, "ar");

    expect(scene.html).toContain('dir="rtl"');
    expect(scene.html).toContain("عمر القلب");
    expect(scene.html).toContain("خطورة أعلى");
    expect(scene.html).toContain("أكبر بـ 38 سنة من عمرك");
  });

  it("always includes the CSS heartbeat keyframes and a full-frame scene size", () => {
    const scene = buildHeartHeroScene(baseInput, "en");

    expect(scene.css).toContain("@keyframes heartbeat");
    expect(scene.css).toContain("width: 1280px");
    expect(scene.css).toContain("height: 720px");
  });
});

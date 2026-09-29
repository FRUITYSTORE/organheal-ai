import { describe, expect, it } from "vitest";

import { buildHeartHeroScene, type HeartHeroSceneInput } from "../lib/video-studio/heart-hero-scene";

const baseInput: HeartHeroSceneInput = {
  chronologicalAge: 55,
  heartAge: 93,
  ageGapYears: 38,
  tenYearRiskPercent: 36.3,
  riskLevel: "High Risk",
  focus: { coronaryArteries: false, leftVentricleAndAorta: false },
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

  it("always includes a real, labeled four-chamber diagram (not a generic icon)", () => {
    const scene = buildHeartHeroScene(baseInput, "en");

    expect(scene.html).toContain('class="diagram"');
    expect(scene.html).toContain(">RA<");
    expect(scene.html).toContain(">RV<");
    expect(scene.html).toContain(">LA<");
    expect(scene.html).toContain(">LV<");
    expect(scene.html).toContain("coronary");
  });

  it("shows the overview callout and a 5s length when neither focus flag is set", () => {
    const scene = buildHeartHeroScene(baseInput, "en");

    expect(scene.html).toContain("Your Whole Heart");
    expect(scene.html).not.toContain("Coronary Arteries");
    expect(scene.html).not.toContain("Left Ventricle");
    expect(scene.lengthSeconds).toBe(5);
  });

  it("shows the coronary-arteries callout with a real, non-fabricated explanation when that focus is active", () => {
    const scene = buildHeartHeroScene(
      { ...baseInput, focus: { coronaryArteries: true, leftVentricleAndAorta: false } },
      "en"
    );

    expect(scene.html).toContain("Coronary Arteries");
    expect(scene.html).toContain("leading cause of heart attacks");
    expect(scene.html).not.toContain("Your Whole Heart");
    expect(scene.lengthSeconds).toBe(5);
  });

  it("shows the left-ventricle callout when that focus is active", () => {
    const scene = buildHeartHeroScene(
      { ...baseInput, focus: { coronaryArteries: false, leftVentricleAndAorta: true } },
      "en"
    );

    expect(scene.html).toContain("Left Ventricle");
    expect(scene.html).toContain("blood pressure");
  });

  it("shows both callouts and extends the scene length when both focuses are active", () => {
    const scene = buildHeartHeroScene(
      { ...baseInput, focus: { coronaryArteries: true, leftVentricleAndAorta: true } },
      "en"
    );

    expect(scene.html).toContain("Coronary Arteries");
    expect(scene.html).toContain("Left Ventricle");
    expect(scene.lengthSeconds).toBeGreaterThan(5);
  });

  it("translates the Arabic callout copy for an active focus", () => {
    const scene = buildHeartHeroScene(
      { ...baseInput, focus: { coronaryArteries: true, leftVentricleAndAorta: false } },
      "ar"
    );

    expect(scene.html).toContain("الشرايين التاجية");
  });

  it("always includes the CSS keyframes and a full-frame scene size", () => {
    const scene = buildHeartHeroScene(baseInput, "en");

    expect(scene.css).toContain("@keyframes plaquePulse");
    expect(scene.css).toContain("width: 1280px");
    expect(scene.css).toContain("height: 720px");
  });
});

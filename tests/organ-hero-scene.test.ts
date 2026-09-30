import { describe, expect, it } from "vitest";

import {
  MAX_MARKERS_SHOWN,
  buildOrganBackdropScene,
  buildOrganHeroScene,
} from "../lib/video-studio/organ-hero-scene";
import type { ReportOrgan, ReportOrganFocus } from "../lib/video-studio/report-organ-focus";
import { CAIRO_BOLD_URL } from "../lib/video-studio/video-fonts";

function focus(overrides: Partial<ReportOrganFocus> = {}): ReportOrganFocus {
  return {
    organ: "liver",
    markers: [{ name: "ALT", value: 88, unit: "U/L", status: "High" }],
    highlighted: ["liverCells"],
    ...overrides,
  };
}

const ORGANS: ReportOrgan[] = ["heart", "liver", "kidney", "thyroid", "blood", "pancreas"];

describe("buildOrganHeroScene", () => {
  it("draws a diagram for every organ the report can point to", () => {
    for (const organ of ORGANS) {
      const scene = buildOrganHeroScene(focus({ organ, highlighted: [] }), "en");

      expect(scene.html).toContain("<svg");
      expect(scene.lengthSeconds).toBeGreaterThan(0);
    }
  });

  it("shows the report's own values, exactly as detected", () => {
    const scene = buildOrganHeroScene(focus(), "en");

    expect(scene.html).toContain("ALT");
    expect(scene.html).toContain("88 U/L");
    expect(scene.html).toContain("HIGH");
  });

  it("caps the marker list", () => {
    const markers = Array.from({ length: 7 }, (_, i) => ({
      name: `M${i}`,
      value: i,
      unit: "U/L",
      status: "Normal" as const,
    }));
    const html = buildOrganHeroScene(focus({ markers, highlighted: [] }), "en").html;

    expect(html.match(/class="marker"/g)).toHaveLength(MAX_MARKERS_SHOWN);
  });

  it("lights up the implicated structure and nothing when all values are in range", () => {
    expect(buildOrganHeroScene(focus(), "en").html).toContain('class="lit"');
    expect(buildOrganHeroScene(focus({ highlighted: [] }), "en").html).not.toContain('class="lit"');
  });

  it("writes Arabic right-to-left with the Arabic font loaded", () => {
    const scene = buildOrganHeroScene(focus(), "ar");

    expect(scene.html).toContain('dir="rtl"');
    expect(scene.html).toContain("الكبد");
    expect(scene.html).toContain("مرتفع");
    expect(scene.css).toContain(CAIRO_BOLD_URL);
  });

  it("escapes report text before putting it in the page", () => {
    const html = buildOrganHeroScene(
      focus({ markers: [{ name: "ALT", value: 1, unit: "<script>", status: "High" }] }),
      "en"
    ).html;

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("buildOrganBackdropScene", () => {
  it("is the diagram alone, for the requested length", () => {
    const scene = buildOrganBackdropScene(focus(), "en", 31);

    expect(scene.lengthSeconds).toBe(31);
    expect(scene.html).toContain("<svg");
    expect(scene.html).not.toContain('class="marker"');
  });
});

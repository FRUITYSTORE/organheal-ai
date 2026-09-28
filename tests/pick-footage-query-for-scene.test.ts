import { describe, expect, it } from "vitest";

import { pickFootageQueryForScene } from "../lib/video-studio/build-studio-video-edit";

describe("pickFootageQueryForScene", () => {
  it("falls back to a generic query when the report has no structured markers", () => {
    expect(pickFootageQueryForScene([], 0)).toBe("medical lab report");
    expect(pickFootageQueryForScene([], 3)).toBe("medical lab report");
  });

  it("cycles through the member's own distinct markers in order", () => {
    const markers = ["LDL", "Creatinine", "HbA1c"];

    expect(pickFootageQueryForScene(markers, 0)).toBe("LDL");
    expect(pickFootageQueryForScene(markers, 1)).toBe("Creatinine");
    expect(pickFootageQueryForScene(markers, 2)).toBe("HbA1c");
  });

  it("wraps back to the first marker once every scene has had a turn", () => {
    const markers = ["LDL", "Creatinine"];

    expect(pickFootageQueryForScene(markers, 2)).toBe("LDL");
    expect(pickFootageQueryForScene(markers, 3)).toBe("Creatinine");
  });

  it("uses the single marker for every scene when the report only has one", () => {
    expect(pickFootageQueryForScene(["Vitamin D"], 0)).toBe("Vitamin D");
    expect(pickFootageQueryForScene(["Vitamin D"], 5)).toBe("Vitamin D");
  });
});

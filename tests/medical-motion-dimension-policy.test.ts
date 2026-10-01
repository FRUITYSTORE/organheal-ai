import { describe, expect, it } from "vitest";
import { resolveOutputDimensions } from "../lib/medical-motion/render/dimension-policy";

describe("output dimensions", () => {
  it.each([
    ["16:9", "720p", 1280, 720], ["9:16", "720p", 720, 1280], ["1:1", "720p", 720, 720],
    ["16:9", "1080p", 1920, 1080], ["9:16", "1080p", 1080, 1920], ["1:1", "1080p", 1080, 1080],
  ])("resolves %s at %s to %s × %s", (aspectRatio, resolution, width, height) => {
    expect(resolveOutputDimensions(aspectRatio, resolution)).toEqual({ ok: true, dimensions: { width, height } });
  });
  it.each(["4:3", "", null, undefined, 16, {}, "toString", "__proto__"])("rejects ratio %s without fallback", (ratio) => {
    expect(resolveOutputDimensions(ratio, "1080p")).toEqual({ ok: false, message: "Unsupported output.aspectRatio." });
  });
  it.each(["4k", "", null, undefined, 1080, {}, "toString", "__proto__"])("rejects resolution %s without fallback", (resolution) => {
    expect(resolveOutputDimensions("16:9", resolution)).toEqual({ ok: false, message: "Unsupported output.resolution." });
  });
  it("does not expose mutable policy entries", () => {
    const result = resolveOutputDimensions("16:9", "720p");
    if (result.ok) result.dimensions.width = 0;
    expect(resolveOutputDimensions("16:9", "720p")).toEqual({ ok: true, dimensions: { width: 1280, height: 720 } });
  });
});

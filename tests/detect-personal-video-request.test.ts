import { describe, expect, it } from "vitest";

import { isPersonalVideoRequest } from "../lib/video-studio/detect-personal-video-request";

describe("isPersonalVideoRequest", () => {
  it("matches an explicit English request for a personal video", () => {
    expect(isPersonalVideoRequest("Can you generate a video about my health status?")).toBe(true);
    expect(isPersonalVideoRequest("make me a video about my results")).toBe(true);
    expect(isPersonalVideoRequest("I want a video about my report")).toBe(true);
  });

  it("matches an explicit Arabic request for a personal video", () => {
    expect(isPersonalVideoRequest("قم بتوليد فيديو بناءا على وضعي الصحي")).toBe(true);
    expect(isPersonalVideoRequest("أريد فيديو عن نتائجي")).toBe(true);
    expect(isPersonalVideoRequest("اصنع لي فيديو عن تقريري")).toBe(true);
  });

  it("does not match a general topic video request (the existing free feature already covers that)", () => {
    expect(isPersonalVideoRequest("Make a video about LDL cholesterol")).toBe(false);
    expect(isPersonalVideoRequest("اصنع فيديو عن الكوليسترول")).toBe(false);
  });

  it("does not match a message that mentions health but no video at all", () => {
    expect(isPersonalVideoRequest("What does my LDL result mean?")).toBe(false);
    expect(isPersonalVideoRequest("ماذا تعني نتيجتي؟")).toBe(false);
  });

  it("does not match a message that mentions video but nothing personal", () => {
    expect(isPersonalVideoRequest("What video platforms do you support?")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  parseYouTubeId,
  toPublicVideo,
  validateVideoInput,
  type VideoRow,
} from "../lib/health-videos/custom";

describe("custom health videos", () => {
  it("extracts the id from common YouTube links", () => {
    expect(parseYouTubeId("wmOW091P2ew")).toBe("wmOW091P2ew");
    expect(parseYouTubeId("https://www.youtube.com/watch?v=wmOW091P2ew&t=5s")).toBe("wmOW091P2ew");
    expect(parseYouTubeId("https://youtu.be/wmOW091P2ew?si=abc")).toBe("wmOW091P2ew");
    expect(parseYouTubeId("https://www.youtube.com/embed/wmOW091P2ew")).toBe("wmOW091P2ew");
    expect(parseYouTubeId("https://m.youtube.com/shorts/wmOW091P2ew")).toBe("wmOW091P2ew");
  });

  it("rejects links that are not YouTube videos", () => {
    expect(parseYouTubeId("https://example.com/watch?v=wmOW091P2ew")).toBeNull();
    expect(parseYouTubeId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(parseYouTubeId("not a link")).toBeNull();
    expect(parseYouTubeId("")).toBeNull();
  });

  it("validates the admin form", () => {
    const ok = validateVideoInput({
      youtube: "https://youtu.be/wmOW091P2ew",
      topic: "diabetes",
      title: "  What is diabetes? ",
      titleAr: "",
      source: "CDC",
    });

    expect(ok).toEqual({
      ok: true,
      value: {
        youtubeId: "wmOW091P2ew",
        topic: "diabetes",
        title: "What is diabetes?",
        titleAr: null,
        source: "CDC",
        isActive: true,
      },
    });
    expect(validateVideoInput({ youtube: "x", topic: "diabetes", title: "a", source: "b" }).ok).toBe(false);
    expect(validateVideoInput({ youtube: "wmOW091P2ew", topic: "nope", title: "a", source: "b" }).ok).toBe(false);
    expect(validateVideoInput({ youtube: "wmOW091P2ew", topic: "kidney", title: "a", source: " " }).ok).toBe(false);
    expect(validateVideoInput(null).ok).toBe(false);
  });

  it("falls back to the English title when there is no Arabic one", () => {
    const row: VideoRow = {
      id: "1",
      youtube_id: "wmOW091P2ew",
      topic: "kidney",
      title: "Kidneys",
      title_ar: null,
      source: "NHS",
      is_active: true,
      created_at: "",
      updated_at: "",
    };

    expect(toPublicVideo(row).title).toEqual({ en: "Kidneys", ar: "Kidneys" });
  });
});

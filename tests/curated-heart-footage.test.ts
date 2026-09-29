import { describe, expect, it } from "vitest";

import {
  CURATED_HEART_FOOTAGE,
  pickCuratedHeartFootageId,
} from "../lib/video-studio/curated-heart-footage";

describe("pickCuratedHeartFootageId", () => {
  it("returns a valid curated video id for every scene index in range", () => {
    for (let i = 0; i < CURATED_HEART_FOOTAGE.length; i++) {
      expect(pickCuratedHeartFootageId(i)).toBe(CURATED_HEART_FOOTAGE[i].pexelsVideoId);
    }
  });

  it("cycles back to the start once the scene index exceeds the list length", () => {
    const listLength = CURATED_HEART_FOOTAGE.length;

    expect(pickCuratedHeartFootageId(listLength)).toBe(CURATED_HEART_FOOTAGE[0].pexelsVideoId);
    expect(pickCuratedHeartFootageId(listLength + 1)).toBe(CURATED_HEART_FOOTAGE[1].pexelsVideoId);
  });

  it("every curated entry has a real numeric Pexels id and a non-empty description", () => {
    for (const entry of CURATED_HEART_FOOTAGE) {
      expect(Number.isInteger(entry.pexelsVideoId)).toBe(true);
      expect(entry.pexelsVideoId).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(10);
    }
  });
});

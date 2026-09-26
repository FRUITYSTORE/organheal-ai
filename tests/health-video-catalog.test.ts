import { describe, expect, it } from "vitest";

import {
  HEALTH_VIDEOS,
  VIDEO_TOPICS,
  buildEmbedUrl,
  getVideosForText,
  getVideosForTopic,
  matchVideoTopics,
} from "../lib/health-videos/catalog";

describe("health video catalog", () => {
  it("has unique YouTube ids and a known topic for every video", () => {
    const ids = HEALTH_VIDEOS.map((video) => video.youtubeId);
    const topics = new Set(VIDEO_TOPICS.map((topic) => topic.key));

    expect(new Set(ids).size).toBe(ids.length);
    expect(HEALTH_VIDEOS.every((video) => topics.has(video.topic))).toBe(true);
    expect(HEALTH_VIDEOS.every((video) => /^[A-Za-z0-9_-]{11}$/.test(video.youtubeId))).toBe(true);
  });

  it("gives every topic at least one video and an Arabic title", () => {
    for (const topic of VIDEO_TOPICS) {
      expect(getVideosForTopic(topic.key).length).toBeGreaterThan(0);
    }

    expect(HEALTH_VIDEOS.every((video) => video.title.ar.trim() && video.source.trim())).toBe(true);
  });

  it("matches English and Arabic questions and lab markers to topics", () => {
    expect(matchVideoTopics("What does HbA1c 5.9 mean?")).toEqual(["diabetes"]);
    expect(matchVideoTopics("my LDL is high")).toEqual(["cholesterol"]);
    expect(matchVideoTopics("ما هو الكرياتينين؟")).toEqual(["kidney"]);
    expect(matchVideoTopics("فيتامين د منخفض")).toEqual(["vitamin-d"]);
    expect(matchVideoTopics("hello there")).toEqual([]);
  });

  it("returns a limited list of videos for a question", () => {
    expect(getVideosForText("diabetes and kidney disease", 2)).toHaveLength(2);
    expect(getVideosForText("nothing relevant")).toEqual([]);
  });

  it("builds a privacy-enhanced embed url with captions", () => {
    const url = buildEmbedUrl("wmOW091P2ew", true);

    expect(url.startsWith("https://www.youtube-nocookie.com/embed/wmOW091P2ew?")).toBe(true);
    expect(url).toContain("hl=ar");
    expect(url).toContain("cc_load_policy=1");
  });
});

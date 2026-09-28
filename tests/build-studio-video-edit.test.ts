import { describe, expect, it } from "vitest";

import {
  buildStudioVideoEdit,
  estimateSceneSeconds,
  OUTPUT_SIZE,
  type StudioScene,
} from "../lib/video-studio/build-studio-video-edit";
import type { ExplainerScript } from "../lib/health-videos/explainer";

const SCRIPT: ExplainerScript = {
  title: "Understanding LDL Cholesterol",
  slides: [
    { heading: "What it is", bullets: [], narration: "LDL is a type of cholesterol." },
    { heading: "Why it matters", bullets: [], narration: "High levels are linked to heart disease risk over time." },
  ],
};

function scene(overrides: Partial<StudioScene> = {}): StudioScene {
  return {
    heading: "What it is",
    narration: "LDL is a type of cholesterol.",
    footageUrl: "https://videos.example.com/clip.mp4",
    audioUrl: "https://audio.example.com/scene.mp3",
    ...overrides,
  };
}

describe("estimateSceneSeconds", () => {
  it("never returns less than the minimum floor", () => {
    expect(estimateSceneSeconds("Short.")).toBeGreaterThanOrEqual(4);
  });

  it("grows with narration length but is capped", () => {
    const short = estimateSceneSeconds("A short sentence about health.");
    const long = estimateSceneSeconds("A ".repeat(400));

    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThanOrEqual(14);
  });
});

describe("buildStudioVideoEdit", () => {
  it("includes the brand name and video title in an intro caption starting at 0", () => {
    const edit = buildStudioVideoEdit(SCRIPT, [scene()]);
    const captionTrack = edit.timeline.tracks.find((track) =>
      track.clips.some((clip) => clip.asset.type === "text")
    );
    const intro = captionTrack?.clips[0];

    expect(intro?.start).toBe(0);
    expect(intro?.asset.type === "text" && intro.asset.text).toContain("OrganHeal AI");
    expect(intro?.asset.type === "text" && intro.asset.text).toContain(SCRIPT.title);
  });

  it("places each scene's video clip after the intro, in sequence with no gaps", () => {
    const scenes = [scene({ heading: "A" }), scene({ heading: "B" })];
    const edit = buildStudioVideoEdit(SCRIPT, scenes);
    const videoTrack = edit.timeline.tracks.find((track) =>
      track.clips.every((clip) => clip.asset.type === "video")
    );

    expect(videoTrack?.clips).toHaveLength(2);

    const [first, second] = videoTrack!.clips;

    expect(first.start).toBe(3); // after the 3s intro
    expect(second.start).toBe(first.start + first.length);
  });

  it("skips the video clip but keeps the caption when a scene has no footage", () => {
    const edit = buildStudioVideoEdit(SCRIPT, [scene({ footageUrl: null })]);
    const hasVideoClip = edit.timeline.tracks.some((track) =>
      track.clips.some((clip) => clip.asset.type === "video")
    );
    const captionTexts = edit.timeline.tracks
      .flatMap((track) => track.clips)
      .filter((clip) => clip.asset.type === "text")
      .map((clip) => (clip.asset.type === "text" ? clip.asset.text : ""));

    expect(hasVideoClip).toBe(false);
    expect(captionTexts).toContain("What it is");
  });

  it("skips the audio clip when a scene has no narration audio", () => {
    const edit = buildStudioVideoEdit(SCRIPT, [scene({ audioUrl: null })]);
    const hasAudioClip = edit.timeline.tracks.some((track) =>
      track.clips.some((clip) => clip.asset.type === "audio")
    );

    expect(hasAudioClip).toBe(false);
  });

  it("sets the expected mp4 output format and size", () => {
    const edit = buildStudioVideoEdit(SCRIPT, [scene()]);

    expect(edit.output.format).toBe("mp4");
    expect(edit.output.size).toEqual(OUTPUT_SIZE);
  });
});

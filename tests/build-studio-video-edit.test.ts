import { describe, expect, it } from "vitest";

import {
  addBackdropTrack,
  buildStudioVideoEdit,
  editDurationSeconds,
  estimateSceneSeconds,
  prependHeroScene,
  OUTPUT_SIZE,
  type StudioScene,
} from "../lib/video-studio/build-studio-video-edit";
import type { ExplainerScript } from "../lib/health-videos/explainer";
import type { ShotstackClip } from "../lib/video-studio/shotstack.client";
import { ARABIC_FONT_FAMILY, CAIRO_BOLD_URL } from "../lib/video-studio/video-fonts";

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

  it("ships the Arabic font file with Arabic videos and names it in every caption", () => {
    const arabic = buildStudioVideoEdit(SCRIPT, [scene()], "ar");
    const english = buildStudioVideoEdit(SCRIPT, [scene()], "en");

    expect(arabic.timeline.fonts).toEqual([{ src: CAIRO_BOLD_URL }]);
    expect(CAIRO_BOLD_URL).toMatch(/^https:\/\/.+\/fonts\/Cairo-Bold\.ttf$/);
    for (const clip of arabic.timeline.tracks[0].clips) {
      expect(clip.asset.type === "text" && clip.asset.font?.family).toBe(ARABIC_FONT_FAMILY);
    }
    expect(english.timeline.fonts).toBeUndefined();
  });
});

describe("addBackdropTrack", () => {
  const backdrop: ShotstackClip["asset"] = { type: "html5", html: "<svg></svg>", width: 1280, height: 720 };

  it("puts the backdrop on the bottom track, spanning the whole edit", () => {
    const edit = buildStudioVideoEdit(SCRIPT, [scene(), scene()]);
    const withBackdrop = addBackdropTrack(edit, backdrop);
    const bottom = withBackdrop.timeline.tracks.at(-1);

    expect(withBackdrop.timeline.tracks).toHaveLength(edit.timeline.tracks.length + 1);
    expect(bottom?.clips).toEqual([{ asset: backdrop, start: 0, length: editDurationSeconds(edit) }]);
    expect(editDurationSeconds(withBackdrop)).toBe(editDurationSeconds(edit));
  });

  it("is shifted along with everything else when a hero is prepended", () => {
    const edit = addBackdropTrack(buildStudioVideoEdit(SCRIPT, [scene()]), backdrop);
    const hero: ShotstackClip = { asset: backdrop, start: 0, length: 6 };

    expect(prependHeroScene(edit, hero, 6).timeline.tracks.at(-1)?.clips[0].start).toBe(6);
  });
});

describe("prependHeroScene", () => {
  const heroClip: ShotstackClip = {
    asset: { type: "html5", html: "<div>93</div>", width: 1280, height: 720 },
    start: 0,
    length: 5,
  };

  it("places the hero clip in its own new track at the very start", () => {
    const edit = buildStudioVideoEdit(SCRIPT, [scene()]);
    const withHero = prependHeroScene(edit, heroClip, 5);

    expect(withHero.timeline.tracks[0].clips).toEqual([heroClip]);
  });

  it("shifts every existing clip later by exactly the hero's length", () => {
    const edit = buildStudioVideoEdit(SCRIPT, [scene()]);
    const originalStarts = edit.timeline.tracks.map((track) => track.clips.map((clip) => clip.start));

    const withHero = prependHeroScene(edit, heroClip, 5);
    const shiftedStarts = withHero.timeline.tracks.slice(1).map((track) => track.clips.map((clip) => clip.start));

    expect(shiftedStarts).toEqual(originalStarts.map((starts) => starts.map((start) => start + 5)));
  });

  it("does not mutate the original edit", () => {
    const edit = buildStudioVideoEdit(SCRIPT, [scene()]);
    const originalFirstStart = edit.timeline.tracks[0].clips[0].start;

    prependHeroScene(edit, heroClip, 5);

    expect(edit.timeline.tracks[0].clips[0].start).toBe(originalFirstStart);
  });

  it("preserves every other field on the edit (output format/size)", () => {
    const edit = buildStudioVideoEdit(SCRIPT, [scene()]);
    const withHero = prependHeroScene(edit, heroClip, 5);

    expect(withHero.output).toEqual(edit.output);
    expect(withHero.timeline.background).toBe(edit.timeline.background);
  });
});

import type { ExplainerScript } from "@/lib/health-videos/explainer";
import type { ShotstackClip, ShotstackEdit } from "@/lib/video-studio/shotstack.client";

// Pure composition logic: turns an already-generated explainer script, plus
// whatever footage/audio was resolved for each of its scenes, into a
// Shotstack Edit payload. No network calls here — that keeps it directly
// unit-testable (see tests/build-studio-video-edit.test.ts).

export const OUTPUT_SIZE = { width: 1280, height: 720 };
export const BRAND_BACKGROUND = "#0f172a";
export const BRAND_ACCENT = "#14b8a6";
const INTRO_SECONDS = 3;
const MIN_SCENE_SECONDS = 4;
const MAX_SCENE_SECONDS = 14;

// Same reading-time heuristic already used by the free slideshow player
// (app/components/home/ExplainerPlayer.tsx) — chosen for consistency rather
// than inventing a second estimate, and because we do not decode real audio
// duration in this pilot (see the module doc comment in
// studio-video.service.ts for that trade-off).
export function estimateSceneSeconds(narration: string): number {
  const estimate = (narration.length * 0.065);

  return Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, Math.round(estimate)));
}

export type StudioScene = {
  heading: string;
  narration: string;
  // null when no matching stock footage was found — the scene still gets a
  // caption and (if resolved) narration audio over the brand background.
  footageUrl: string | null;
  // null when this scene's narration audio failed to synthesize/upload —
  // the scene still plays silently rather than dropping the whole video.
  audioUrl: string | null;
};

function captionClip(text: string, start: number, length: number): ShotstackClip {
  return {
    asset: {
      type: "text",
      text,
      font: { family: "Montserrat", size: 40, color: "#ffffff", lineHeight: 1.2 },
      background: { color: "#0f172a", opacity: 0.55, padding: 24 },
    },
    start,
    length,
    position: "bottom",
  };
}

export function buildStudioVideoEdit(
  script: ExplainerScript,
  scenes: StudioScene[]
): ShotstackEdit {
  const videoClips: ShotstackClip[] = [];
  const captionClips: ShotstackClip[] = [];
  const audioClips: ShotstackClip[] = [];

  // Intro: brand name plus the video's own title, on the background colour —
  // no footage needed for these first few seconds.
  captionClips.push(captionClip(`OrganHeal AI — ${script.title}`, 0, INTRO_SECONDS));

  let cursor = INTRO_SECONDS;

  for (const scene of scenes) {
    const length = estimateSceneSeconds(scene.narration);

    if (scene.footageUrl) {
      videoClips.push({
        asset: { type: "video", src: scene.footageUrl },
        start: cursor,
        length,
        fit: "cover",
      });
    }

    captionClips.push(captionClip(scene.heading, cursor, length));

    if (scene.audioUrl) {
      audioClips.push({
        asset: { type: "audio", src: scene.audioUrl },
        start: cursor,
        length,
      });
    }

    cursor += length;
  }

  const tracks = [
    // Shotstack stacks tracks with the FIRST entry on top, so captions must
    // come before the video track or the footage draws over them and they
    // never appear — confirmed by inspecting the pilot's first real render,
    // where captions were completely invisible.
    { clips: captionClips },
    ...(videoClips.length > 0 ? [{ clips: videoClips }] : []),
    ...(audioClips.length > 0 ? [{ clips: audioClips }] : []),
  ];

  return {
    timeline: {
      background: BRAND_BACKGROUND,
      tracks,
    },
    output: {
      format: "mp4",
      size: OUTPUT_SIZE,
      fps: 25,
    },
  };
}

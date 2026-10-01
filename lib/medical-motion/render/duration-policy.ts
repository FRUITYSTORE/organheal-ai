/** Blender 5.2 frame_end RNA hard limit, checked against the installed runtime.
 * This is an encoding boundary, not a product duration or process timeout. */
export const MAX_VIDEO_FRAME_COUNT = 1_048_574;

export type VideoTiming = {
  fps: number;
  fpsBase: number;
  frameStep: number;
  frameStart: number;
  frameEnd: number;
  frameCount: number;
};

/** Preserve Python's nearest-integer, ties-to-even sampling. Positive durations
 * shorter than one frame receive one frame. Requested duration stays unrounded
 * in the scene/signature; nominal media duration is frameCount / (fps/fpsBase).
 * Inclusive [1, frameCount], step 1, contains exactly frameCount frames. */
export function validateRenderDuration(durationSeconds: unknown, media: "still" | "video"):
  { ok: true; videoTiming: VideoTiming | null } | { ok: false; message: string } {
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { ok: false, message: "durationSeconds must be a finite number greater than zero." };
  }
  if (media === "still") return { ok: true, videoTiming: null };
  const fps = 24;
  const frames = durationSeconds * fps;
  const floor = Math.floor(frames);
  const fraction = frames - floor;
  const rounded = fraction === 0.5 ? floor + (floor % 2) : Math.round(frames);
  const frameCount = Math.max(1, rounded);
  if (!Number.isSafeInteger(frameCount) || frameCount > MAX_VIDEO_FRAME_COUNT) {
    return { ok: false, message: `Requested duration exceeds Blender's ${MAX_VIDEO_FRAME_COUNT}-frame limit.` };
  }
  return { ok: true, videoTiming: { fps, fpsBase: 1, frameStep: 1, frameStart: 1, frameEnd: frameCount, frameCount } };
}

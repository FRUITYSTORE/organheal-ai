import "server-only";

export class CinematicRuntimeError extends Error {
  constructor(readonly code: "OUTPUT_PROFILE_INVALID" | "MASTER_UNAVAILABLE" | "MASTER_SOURCE_INVALID" |
    "MASTER_NOT_READY" | "MASTER_AUTHORITY_INVALID" | "CINEMATIC_TIMELINE_INVALID") { super(code); }
}
export const RUNTIME_OUTPUT_PROFILES = Object.freeze({
  LEGACY_720P_25: Object.freeze({ id: "LEGACY_720P_25", version: "1", width: 1280, height: 720, fps: 25,
    aspect: "16:9", resolution: "720p", timelineVersion: "2", internalReviewOnly: false }),
  CINEMATIC_PORTRAIT_1080X1920_24_V1: Object.freeze({ id: "CINEMATIC_PORTRAIT_1080X1920_24_V1", version: "1",
    width: 1080, height: 1920, fps: 24, aspect: "9:16", resolution: "portrait-1080p-v1",
    timelineVersion: "cinematic-1", internalReviewOnly: true }),
});
export type RuntimeOutputProfileId = keyof typeof RUNTIME_OUTPUT_PROFILES;
export const CINEMATIC_RESOURCE_LIMITS = Object.freeze({ maximumWidth: 1080, maximumHeight: 1920,
  maximumPixels: 2073600, maximumDuration: 60, maximumFrames: 1440, fps: 24,
  encoder: "libx264", pixelFormat: "yuv420p", encoderThreads: 1, filterThreads: 1,
  preset: "ultrafast", crf: 23, audio: "silence", concurrency: "existing-worker-capacity-fence-unchanged" });

/** Exact version selection; dimensions and frame rate never come from a request. */
export function resolveRuntimeOutputProfile(id: unknown) {
  if (typeof id !== "string" || !Object.hasOwn(RUNTIME_OUTPUT_PROFILES, id)) throw new CinematicRuntimeError("OUTPUT_PROFILE_INVALID");
  return RUNTIME_OUTPUT_PROFILES[id as RuntimeOutputProfileId];
}
export function validateRuntimeOutput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CinematicRuntimeError("OUTPUT_PROFILE_INVALID");
  const v = input as Record<string, unknown>;
  const keys = ["id", "version", "width", "height", "fps", "aspect", "resolution", "timelineVersion", "internalReviewOnly"];
  const p = resolveRuntimeOutputProfile(v.id);
  if (Object.keys(v).length !== keys.length || keys.some(k => v[k] !== p[k as keyof typeof p])) throw new CinematicRuntimeError("OUTPUT_PROFILE_INVALID");
  return p;
}
export function runtimeFrameCount(profileId: unknown, duration: number) {
  const p = resolveRuntimeOutputProfile(profileId), count = duration * p.fps;
  if (!Number.isFinite(duration) || duration <= 0 || duration > 60 || Math.abs(count - Math.round(count)) > .000001)
    throw new CinematicRuntimeError("OUTPUT_PROFILE_INVALID");
  return Math.round(count);
}

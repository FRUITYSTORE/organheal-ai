export type ApiRateLimitPolicy = {
  limit: number;
  windowMs: number;
};

/**
 * Daily allowances for the features that spend OpenAI tokens.
 *
 * `null` means the feature is not available to that tier. Change the numbers
 * here to change what visitors, free members and Plus members can use; every
 * OpenAI-backed route reads from this table.
 */
export type UsageFeature =
  | "assistant"
  | "voice_dictation"
  | "voice_speech"
  | "voice_realtime"
  | "video_explainer"
  | "studio_video";

export type UsageTier = "visitor" | "free" | "plus";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MONTH_MS = 30 * DAY_MS;

export const USAGE_POLICIES: Record<
  UsageFeature,
  Record<UsageTier, ApiRateLimitPolicy | null>
> = {
  assistant: {
    visitor: { limit: 5, windowMs: DAY_MS },
    free: { limit: 25, windowMs: DAY_MS },
    plus: { limit: 150, windowMs: DAY_MS },
  },
  voice_dictation: {
    visitor: null,
    free: { limit: 15, windowMs: DAY_MS },
    plus: { limit: 150, windowMs: DAY_MS },
  },
  voice_speech: {
    visitor: null,
    free: { limit: 10, windowMs: DAY_MS },
    plus: { limit: 100, windowMs: DAY_MS },
  },
  voice_realtime: {
    visitor: null,
    free: { limit: 3, windowMs: DAY_MS },
    plus: { limit: 30, windowMs: DAY_MS },
  },
  video_explainer: {
    visitor: { limit: 2, windowMs: DAY_MS },
    free: { limit: 6, windowMs: DAY_MS },
    plus: { limit: 40, windowMs: DAY_MS },
  },
  // Real rendered video (footage + real narration audio + burned captions via
  // Shotstack) — unlike video_explainer's free slideshow, every one of these
  // has a real per-render cost, so the allowance is monthly and small.
  // Deliberately conservative for launch; raise once the real per-render cost
  // from the first pilot renders is known.
  studio_video: {
    visitor: null,
    free: { limit: 1, windowMs: MONTH_MS },
    plus: { limit: 5, windowMs: MONTH_MS },
  },
};

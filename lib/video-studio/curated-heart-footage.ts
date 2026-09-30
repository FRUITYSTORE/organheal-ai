// Hand-reviewed Pexels video ids for the Heart Age calculator's "Layer 3"
// personal video (startHeartStoryVideo in studio-video.service.ts).
//
// Why curated instead of a live keyword search: a live search returns
// whatever happens to rank for the query with no human review — confirmed in
// production, a search for an "LDL cholesterol" scene returned a skincare
// cream close-up (a woman applying face cream), because "LDL" and
// "cholesterol" alone aren't enough to keep a stock library on-topic. For a
// health-focused brand, an unrelated or tonally-wrong clip is worse than no
// clip at all. Every id below was actually opened and watched (via the
// Pexels website, filtered to landscape orientation) before being added —
// each one is on-topic, professional in tone, and genuinely landscape (not a
// vertical/social-format shoot with only a portrait master, which the
// generic search has hit before).
//
// Each entry also carries the same info a live search result would (id +
// a short note on what it shows) so a future reviewer can tell at a glance
// why it's here and swap it out without having to re-watch it blind.
export type CuratedFootageEntry = {
  pexelsVideoId: number;
  description: string;
};

export const CURATED_HEART_FOOTAGE: CuratedFootageEntry[] = [
  {
    pexelsVideoId: 8115432,
    description: "Human anatomy mannequin showing the heart and chest organs in a calm, educational setting.",
  },
  {
    pexelsVideoId: 8460066,
    description: "A cardiologist performing and reviewing an electrocardiogram (ECG) with a patient.",
  },
  {
    pexelsVideoId: 855944,
    description: "A heartbeat trace animating on a monitor, similar to an ECG readout.",
  },
  {
    pexelsVideoId: 15462800,
    description: "Macro/microscopic view of blood cells flowing through a vessel — used for artery/blood-flow scenes.",
  },
  {
    pexelsVideoId: 8637044,
    description: "An elderly couple jogging together outdoors — used for healthy-lifestyle/prevention scenes.",
  },
];

/**
 * Cycles through the curated list by scene position — pure and
 * side-effect-free so it stays directly unit-testable.
 */
export function pickCuratedHeartFootageId(sceneIndex: number): number {
  const entry = CURATED_HEART_FOOTAGE[sceneIndex % CURATED_HEART_FOOTAGE.length];
  return entry.pexelsVideoId;
}

// Lightweight, client-side, keyword-based detector — same style already
// used for chat video suggestions (lib/health-videos/catalog.ts's
// getVideosForText): no model call, matching happens entirely in the
// browser from text already on screen. Deliberately requires BOTH a "video"
// word AND a "my own health/results" phrase, so a message that just
// mentions "video" about a general topic (already served by the existing
// "make me a video about a topic" feature) does not also trigger this.
const VIDEO_WORDS = ["video", "فيديو"];

const PERSONAL_CONTEXT_PHRASES = [
  "my health",
  "my results",
  "my result",
  "my report",
  "my reports",
  "my condition",
  "my status",
  "about me",
  "وضعي الصحي",
  "نتائجي",
  "تقريري",
  "حالتي الصحية",
  "حالتي",
  "صحتي",
];

export function isPersonalVideoRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  const hasVideoWord = VIDEO_WORDS.some((word) => normalized.includes(word));
  const hasPersonalContext = PERSONAL_CONTEXT_PHRASES.some((phrase) =>
    normalized.includes(phrase.toLowerCase())
  );

  return hasVideoWord && hasPersonalContext;
}

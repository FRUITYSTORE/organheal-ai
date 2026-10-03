import type { AspectRatio } from "./scene";

/** Private presentation data. Never part of a medical base/cache identity. */
export type CompositionLanguage = "ar" | "en";
export type CompositionProfile = { aspectRatio: AspectRatio; policy: "fit"; resolution: "720p" };
export type TimedOverlay = { slot: "text-value" | "caption" | "subtitle" | "risk-band" | "educational-label";
  start: number; end: number; text: string };
export type NumericOverlay = { slot: "text-value"; start: number; end: number; value: number; unit: string };
export type ChartOverlay = { slot: "chart"; start: number; end: number;
  kind: "trend" | "range-marker" | "band" | "comparison"; values: readonly number[]; minimum: number; maximum: number;
  label: string; interpretation: "descriptive-only" };
export type NarrationSegment = { segmentId: string; version: string; language: CompositionLanguage;
  textFingerprint: string; medicalReviewStatus: "approved" | "unreviewed" | "rejected";
  audioArtifactId: string; audioSha256: string; duration: number; reuseScope: "reusable-no-phi" | "private-context" };
export type AudioPlacement = { slot: "voice-segment"; start: number; segment: NarrationSegment };
export type PersonalizationSpecification = {
  compositionVersion: "1"; baseArtifactId: string; outputProfile: CompositionProfile; language: CompositionLanguage;
  textOverlays: readonly TimedOverlay[]; numericOverlays: readonly NumericOverlay[];
  chartOverlays: readonly ChartOverlay[]; audioSegments: readonly AudioPlacement[];
  dynamicNarrationSlots: readonly AudioPlacement[]; baseAudio: "preserve" | "silence";
};
/** A provider is trusted server code. It cannot grant medical approval. */
export interface NarrationProvider {
  synthesize(input: { text: string; language: CompositionLanguage; signal: AbortSignal }): Promise<{
    bytes: Buffer; contentType: "audio/wav"; duration: number;
  }>;
}

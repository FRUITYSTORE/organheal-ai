import type { NarrationLanguage, NarrationProviderType } from "./audio-composition";
import type { ApprovedNarrationScript } from "../composition/narration-foundation";

export type SpeechRatePreset = "CLINICAL_SLOW" | "CLINICAL_STANDARD" | "CREATOR_STANDARD_FUTURE";
export type PronunciationHint = Readonly<{ canonicalTerm: string; language: NarrationLanguage;
  spokenForm: string; source: string; version: "1" }>;
export type VoiceRequest = Readonly<{ script: ApprovedNarrationScript; language: NarrationLanguage; locale: string;
  voiceProfileId: string; voiceStylePreset: "ORGANHEAL_VOICE_SIGNATURE_V1"; speechRatePreset: SpeechRatePreset;
  pronunciationHints: readonly PronunciationHint[];
  segments: readonly (ApprovedNarrationScript["segments"][number] & {readonly spokenText?: string})[]; requestIdentity: string }>;
/** Adapters return canonical 48kHz mono PCM segments. Timing is measured from
 * samples, not characters. Core contains neither credentials nor vendor SSML. */
export type VoiceSegment = Readonly<{ segmentId: string; textHash: string; pcm: Buffer;
  spokenTextVerification: Readonly<{ transcript: string; method: "independent-transcription" | "human-reviewed-transcript" | "fixture" }>;
  words?: readonly { word: string; startMs: number; endMs: number }[] }>;
export type VoiceProviderResult = Readonly<{ requestIdentity: string; segments: readonly VoiceSegment[];
  providerReference: string; modelRevision: string; voiceRevision: string; latencyMs: number;
  cost: null | { amount: number; currency: string; basis: string }; retryCount: number }>;
export interface MedicalNarrationProvider {
  readonly type: Exclude<NarrationProviderType, "PREGENERATED">;
  readonly supportedRates: readonly SpeechRatePreset[];
  render(request: VoiceRequest, signal: AbortSignal): Promise<VoiceProviderResult>;
}
export type SemanticVisualCue = "INTRODUCE_ORGAN" | "ORIENT_VIEWER" | "BEGIN_APPROACH" | "ARRIVE_AT_TARGET" |
  "BEGIN_SOURCE_TRANSITION" | "REVEAL_INTERNAL_VIEW" | "EXPLAIN_FUNCTION" | "SHOW_NATIVE_MOTION" |
  "FOCUS_STRUCTURE" | "REORIENT_VIEWER" | "NEXT_ACTION" | "OUTRO";
export type VoiceQualityDimension = "intelligibility" | "medicalPronunciation" | "naturalness" | "pacing" |
  "warmth" | "clinicalCredibility" | "restraint" | "languageQuality" | "segmentTiming" | "latency" |
  "reproducibility" | "costMetadata" | "portability";
export type VoiceQualityReview = Readonly<{ reviewer: string; evidenceReference: string;
  scores: Readonly<Record<VoiceQualityDimension, number>>;
  repeatedMispronunciation: boolean; roboticCadence: boolean; rushed: boolean; clippedEndings: boolean;
  materialLanguageError: boolean; dramatic: boolean }>;

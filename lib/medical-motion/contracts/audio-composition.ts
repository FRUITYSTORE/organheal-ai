/** Provider-independent data contracts. Data/JSON alone never authorizes execution. */
export type NarrationProviderType = "EXTERNAL_TTS" | "OWNED_TTS" | "PRERECORDED_HUMAN" | "PREGENERATED" | "TEST_FIXTURE";
export type NarrationLanguage = "ar" | "en";
export type NarrationAssetMetadata = Readonly<{
  narrationAssetId: string; language: NarrationLanguage; locale: string; voiceProfileId: string;
  providerType: NarrationProviderType; providerAssetReference: string | null; fixtureReference: string | null;
  durationMs: number; sampleRate: number; channels: 1 | 2; codec: "pcm_s16le"; container: "wav";
  sha256: string; scriptId: string; scriptVersion: "1"; scriptHash: string; medicalContentVersion: "educational-neutral-1";
}>;
export type SubtitleCue = Readonly<{ cueId: string; text: string; language: NarrationLanguage;
  startMs: number; endMs: number; sceneIndices: readonly number[]; narrationSegmentId: string;
  placement: "lower-safe"; style: "MEDICAL_SUBTITLE_V1"; scriptHash: string }>;
export type AnatomicalLabel = Readonly<{ canonicalStructureId: string; displayName: string; language: NarrationLanguage;
  anchorRef: string; startMs: number; endMs: number; sourceScene: number; style: "MEDICAL_LABEL_V1";
  semantics: "educational-name-only" }>;
export type SupportedLabelBinding = Readonly<{ canonicalStructureId: string; displayName: string;
  language: NarrationLanguage; anchorRef: string; sourceScene: number; evidenceRef: string;
  placement: "outside-focal-region" }>;
export type MusicPolicyId = "MUSIC_OFF" | "PATIENT_EDUCATION_OPTIONAL" | "CREATOR_ALLOWED_FUTURE";
export type AudioPresentationMode = "CLINICAL_REVIEW" | "PATIENT_EDUCATION";
/** Future adapters receive an approved script capability, not planner prose or an API key.
 * Script medical approval and rendered-voice verification are separate boundaries. */
export interface NarrationProviderPort<ApprovedScript> {
  render(script: ApprovedScript, voice: { locale: string; voiceProfileId: string; speechStyle: "NEUTRAL_EDUCATIONAL_V1" },
    signal: AbortSignal): Promise<{ metadata: NarrationAssetMetadata; bytes: Buffer;
      segmentTimings?: readonly { segmentId: string; startMs: number; endMs: number }[] }>;
}

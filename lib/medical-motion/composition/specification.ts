import "server-only";
import { createHash } from "node:crypto";
import { isUuid } from "@/lib/validation/uuid";
import { canonicalSceneJson, validateCompiledMedicalScene } from "../scene-compiler";
import type { CompiledMedicalScene } from "../contracts/medical-scene";
import type { PersonalizationSpecification } from "../contracts/personalization";
import { jsonSnapshot } from "../validation/json-snapshot";

export class CompositionError extends Error {
  constructor(readonly code: "COMPOSITION_INVALID" | "COMPOSITION_UNAVAILABLE" | "COMPOSITION_TIMEOUT" |
    "COMPOSITION_CANCELLED" | "COMPOSITION_PROCESS_FAILED" | "COMPOSITION_OUTPUT_INVALID" | "COMPOSITION_CLEANUP_UNKNOWN") { super(code); }
}
const invalid = (): never => { throw new CompositionError("COMPOSITION_INVALID"); };
const object = (v: unknown, keys: readonly string[]): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.getPrototypeOf(v) !== Object.prototype ||
    Object.keys(v).length !== keys.length || Object.keys(v).some(k => !keys.includes(k))) invalid();
  return v as Record<string, unknown>;
};
const text = (v: unknown, max = 240): void => {
  if (typeof v !== "string" || v.length < 1 || [...v].length > max || v !== v.normalize("NFC") ||
    v.split("\n").length > 3 || v.split("\n").some(line => [...line].length > 80) ||
    /[\p{Cc}\p{Cf}\p{Cs}]/u.test(v.replace(/\n/g, "")) || /[{}\\]/u.test(v)) invalid();
};
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const freeze = (v: unknown): void => { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } };
const sha = (v: unknown) => createHash("sha256").update(canonicalSceneJson(v)).digest("hex");
const capabilities = new WeakSet<object>();
export type ValidatedComposition = Readonly<{ specification: PersonalizationSpecification; fingerprint: string;
  overlaySpecFingerprint: string; baseMedia: "still" | "video"; scope: "private-context"; userId: string; contextId: string; baseSha256: string; duration: number }>;

/** Compiler-issued scene and trusted owner/context are mandatory; JSON cannot mint execution authority. */
export function validatePersonalization(input: unknown, scene: CompiledMedicalScene,
  authority: { userId: string; contextId: string; baseSha256: string; duration: number }): ValidatedComposition {
  try { input = jsonSnapshot(input, { depth: 8, nodes: 2000, width: 40, stringLength: 512, keyLength: 64, totalStringLength: 16384 }); }
  catch { return invalid(); }
  if (!validateCompiledMedicalScene(scene) || !isUuid(authority.userId) || !isUuid(authority.contextId) ||
    !/^[a-f0-9]{64}$/.test(authority.baseSha256) || !finite(authority.duration) || authority.duration <= 0 || authority.duration > 60) invalid();
  const r = object(input, ["compositionVersion", "baseArtifactId", "outputProfile", "language", "textOverlays",
    "numericOverlays", "chartOverlays", "audioSegments", "dynamicNarrationSlots", "baseAudio"]);
  if (r.compositionVersion !== "1" || !isUuid(r.baseArtifactId) || !["ar", "en"].includes(r.language as string) ||
    !["preserve", "silence"].includes(r.baseAudio as string)) invalid();
  const profile = object(r.outputProfile, ["aspectRatio", "policy", "resolution"]);
  if (!["16:9", "9:16", "1:1"].includes(profile.aspectRatio as string) || profile.policy !== "fit" || profile.resolution !== "720p") invalid();
  const columns = profile.aspectRatio === "16:9" ? 36 : 19;
  const layoutText = (value: unknown, max = 240) => {
    text(value, max);
    if ((value as string).split("\n").some(line => [...line].length > columns)) invalid();
  };
  const slots = scene.scene.overlaySlots;
  const timed = (row: Record<string, unknown>) => {
    if (!slots.some(s => s.id === row.slot && s.kind === row.slot) || !finite(row.start) || !finite(row.end) ||
      row.start < 0 || row.end <= row.start || row.end > authority.duration) invalid();
  };
  const arrays = ["textOverlays", "numericOverlays", "chartOverlays", "audioSegments", "dynamicNarrationSlots"] as const;
  for (const key of arrays) {
    const entries = r[key];
    if (!Array.isArray(entries) || entries.length > 20) invalid();
    for (const value of entries as unknown[]) {
      if (key === "textOverlays") {
        const item = object(value, ["slot", "start", "end", "text"]); timed(item); layoutText(item.text);
        if (!["text-value", "caption", "subtitle", "risk-band", "educational-label"].includes(item.slot as string)) invalid();
      } else if (key === "numericOverlays") {
        const item = object(value, ["slot", "start", "end", "value", "unit"]); timed(item); text(item.unit, 24);
        if (item.slot !== "text-value" || !finite(item.value) || Math.abs(item.value) > 1e9) invalid();
        layoutText(`${item.value} ${item.unit}`);
      } else if (key === "chartOverlays") {
        const item = object(value, ["slot", "start", "end", "kind", "values", "minimum", "maximum", "label", "interpretation"]);
        timed(item); layoutText(item.label, 80);
        if (item.slot !== "chart" || item.interpretation !== "descriptive-only" ||
          !["trend", "range-marker", "band", "comparison"].includes(item.kind as string) ||
          !finite(item.minimum) || !finite(item.maximum) || item.maximum <= item.minimum ||
          Math.abs(item.minimum) > 1e9 || Math.abs(item.maximum) > 1e9 || item.maximum - item.minimum < 1e-9 ||
          !Array.isArray(item.values) || item.values.length < 1 || item.values.length > 20 ||
          item.values.some(v => !finite(v) || v < (item.minimum as number) || v > (item.maximum as number))) invalid();
      } else {
        const item = object(value, ["slot", "start", "segment"]);
        const segment = object(item.segment, ["segmentId", "version", "language", "textFingerprint", "medicalReviewStatus", "audioArtifactId", "audioSha256", "duration", "reuseScope"]);
        if (item.slot !== "voice-segment" || !slots.some(s => s.kind === "voice-segment") ||
          !finite(item.start) || !finite(segment.duration) || item.start < 0 || segment.duration <= 0 ||
          item.start + segment.duration > authority.duration || !isUuid(segment.audioArtifactId) ||
          typeof segment.segmentId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(segment.segmentId) ||
          typeof segment.version !== "string" || !/^[A-Za-z0-9_.-]{1,32}$/.test(segment.version) ||
          typeof segment.textFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(segment.textFingerprint) ||
          typeof segment.audioSha256 !== "string" || !/^[a-f0-9]{64}$/.test(segment.audioSha256) ||
          segment.language !== r.language || segment.medicalReviewStatus !== "approved" ||
          segment.reuseScope !== (key === "audioSegments" ? "reusable-no-phi" : "private-context")) invalid();
      }
    }
  }
  // No overlapping entries in a single visual slot or narration timeline: bounded fixed layouts.
  const visuals = [...r.textOverlays as Record<string, unknown>[], ...r.numericOverlays as Record<string, unknown>[],
    ...r.chartOverlays as Record<string, unknown>[]];
  const audio = [...r.audioSegments as Record<string, unknown>[], ...r.dynamicNarrationSlots as Record<string, unknown>[]]
    .map(v => ({ slot: "voice-segment", start: v.start, end: (v.start as number) + (v.segment as { duration: number }).duration }));
  if (visuals.length > 24 || audio.length > 12) invalid();
  for (const entries of [visuals, audio]) for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
    if (entries[i].slot === entries[j].slot && (entries[i].start as number) < (entries[j].end as number) &&
      (entries[j].start as number) < (entries[i].end as number)) invalid();
  }
  const specification = JSON.parse(JSON.stringify(input)) as PersonalizationSpecification;
  const result: ValidatedComposition = { specification, scope: "private-context", userId: authority.userId,
    contextId: authority.contextId, baseSha256: authority.baseSha256, duration: authority.duration,
    baseMedia: scene.scene.renderIntent === "still" ? "still" : "video",
    overlaySpecFingerprint: sha({ version: "1", userId: authority.userId, contextId: authority.contextId,
      language: specification.language, outputProfile: specification.outputProfile,
      textOverlays: specification.textOverlays, numericOverlays: specification.numericOverlays, chartOverlays: specification.chartOverlays }),
    fingerprint: sha({ version: "1", userId: authority.userId, contextId: authority.contextId,
      baseSha256: authority.baseSha256, duration: authority.duration, specification }) };
  freeze(result); capabilities.add(result); return result;
}
export function isValidatedComposition(v: unknown): v is ValidatedComposition {
  return !!v && typeof v === "object" && capabilities.has(v);
}

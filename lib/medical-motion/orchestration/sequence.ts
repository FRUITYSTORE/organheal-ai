import "server-only";
import { createHash } from "node:crypto";
import { canonicalSceneJson } from "../scene-compiler";
import { jsonSnapshot } from "../validation/json-snapshot";
import { isUuid } from "@/lib/validation/uuid";
import type { TimelineTransition } from "../composition/timeline-specification";

export class OrchestrationError extends Error {
  constructor(readonly code: "SEQUENCE_INVALID" | "SEQUENCE_UNAVAILABLE" | "ORCHESTRATION_UNAVAILABLE" | "ORCHESTRATION_NOT_FOUND") { super(code); }
}
export type SceneSequenceDefinition = Readonly<{ sequenceId: string; sequenceVersion: string;
  sceneIndices: readonly number[]; transitions: readonly TimelineTransition[]; usage: "internal-review";
  aspectRatios: readonly ("16:9" | "9:16" | "1:1")[] }>;
export type TrustedSceneSequence = Readonly<{ definition: SceneSequenceDefinition; fingerprint: string; owner: string; contextId: string }>;
const capabilities = new WeakSet<object>();
const invalid = (): never => { throw new OrchestrationError("SEQUENCE_INVALID"); };
export function validateSequence(value: unknown): SceneSequenceDefinition {
  try {
    const d = jsonSnapshot(value) as unknown as SceneSequenceDefinition;
    if (!d || Object.keys(d).sort().join() !== ["sequenceId","sequenceVersion","sceneIndices","transitions","usage","aspectRatios"].sort().join() ||
      ![d.sequenceId,d.sequenceVersion].every(v => typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(v)) ||
      d.usage !== "internal-review" || !Array.isArray(d.sceneIndices) || d.sceneIndices.length < 2 || d.sceneIndices.length > 8 ||
      new Set(d.sceneIndices).size !== d.sceneIndices.length || d.sceneIndices.some(i => !Number.isSafeInteger(i) || i < 0 || i > 1023) ||
      !Array.isArray(d.aspectRatios) || !d.aspectRatios.length || d.aspectRatios.length > 3 || new Set(d.aspectRatios).size !== d.aspectRatios.length ||
      d.aspectRatios.some(a => !["16:9","9:16","1:1"].includes(a)) || !Array.isArray(d.transitions) || d.transitions.length !== d.sceneIndices.length - 1) invalid();
    d.transitions.forEach((t,i) => { if (!t || Object.keys(t).sort().join() !== ["boundaryIndex","kind","duration"].sort().join() || t.boundaryIndex !== i ||
      !(t.kind === "cut" && t.duration === 0 || t.kind === "fade-through-neutral" && Number.isFinite(t.duration) && t.duration >= .15 && t.duration <= .75)) invalid(); });
    Object.freeze(d.sceneIndices); Object.freeze(d.aspectRatios); d.transitions.forEach(Object.freeze); Object.freeze(d.transitions); return Object.freeze(d);
  } catch { return invalid(); }
}
export const sequenceFingerprint = (d: SceneSequenceDefinition) => createHash("sha256").update(canonicalSceneJson(d)).digest("hex");
/** Server configuration only; never populated from a client/AI request. Empty default registry activates nothing. */
export class SceneSequenceRegistry {
  private readonly definitions = new Map<string, SceneSequenceDefinition>();
  constructor(definitions: readonly SceneSequenceDefinition[]) {
    for (const input of definitions) { const d = validateSequence(input), key = `${d.sequenceId}:${d.sequenceVersion}`;
      if (this.definitions.has(key)) invalid(); this.definitions.set(key,d); }
  }
  resolve(sequenceId: string, sequenceVersion: string, owner: string, contextId: string): TrustedSceneSequence {
    if (![owner,contextId].every(isUuid)) invalid();
    const definition = this.definitions.get(`${sequenceId}:${sequenceVersion}`);
    if (!definition) throw new OrchestrationError("SEQUENCE_UNAVAILABLE");
    const selection = Object.freeze({ definition, fingerprint: sequenceFingerprint(definition), owner, contextId }); capabilities.add(selection); return selection;
  }
}
export function assertTrustedSequence(value: TrustedSceneSequence, owner: string, contextId: string) {
  if (!capabilities.has(value) || value.owner !== owner || value.contextId !== contextId) invalid();
}
export const INTERNAL_SCENE_SEQUENCES = new SceneSequenceRegistry([]);

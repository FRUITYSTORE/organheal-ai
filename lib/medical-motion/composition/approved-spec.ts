import "server-only";
import { createHash } from "node:crypto";
import { canonicalSceneJson } from "../scene-compiler";
import { isUuid } from "@/lib/validation/uuid";
import { jsonSnapshot } from "../validation/json-snapshot";
import type { PersonalizationSpecification } from "../contracts/personalization";
import { CompositionError } from "./specification";

export type ApprovedSpecContent = Readonly<{
  schemaVersion: "1"; producerVersion: "1"; compositionVersion: "1";
  userId: string; contextId: string; sceneIndex: number; baseJobId: string;
  baseArtifactId: string; baseFingerprint: string; baseOutputFingerprint: string;
  renderSignature: string; baseSha256: string; duration: number;
  fingerprint: string; logicalIdentity: string; approvalDisposition: "structured-source";
  source: { kind: "health-check-in"; id: string; field: "wellnessScore"; fingerprint: string };
  specification: PersonalizationSpecification;
}>;
export type DurableApprovedSpec = ApprovedSpecContent & { id: string; jobId: string; createdAt: string };
const issued = new WeakSet<object>();
export const privateHash = (v: unknown) => createHash("sha256").update(canonicalSceneJson(v)).digest("hex");
const deepFreeze = (v: unknown): void => { if (v && typeof v === "object") { Object.values(v).forEach(deepFreeze); Object.freeze(v); } };
/** Only the trusted producer calls this internal issuance function. Never export through a route. */
export function issueApprovedSpec(content: ApprovedSpecContent): ApprovedSpecContent {
  const snapshot = validateApprovedContent(content); deepFreeze(snapshot); issued.add(snapshot); return snapshot;
}
export const isIssuedApprovedSpec = (v: object) => issued.has(v);
export function validateApprovedContent(value: unknown): ApprovedSpecContent {
  try {
    const v = jsonSnapshot(value, { depth: 10, nodes: 2200, width: 40, stringLength: 512, keyLength: 64, totalStringLength: 18000 }) as unknown as ApprovedSpecContent;
    const keys = ["schemaVersion", "producerVersion", "compositionVersion", "userId", "contextId", "sceneIndex", "baseJobId", "baseArtifactId", "baseFingerprint", "baseOutputFingerprint", "renderSignature", "baseSha256", "duration", "fingerprint", "logicalIdentity", "approvalDisposition", "source", "specification"];
    if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== keys.length || Object.keys(v).some(k => !keys.includes(k)) ||
      v.schemaVersion !== "1" || v.producerVersion !== "1" || v.compositionVersion !== "1" || v.approvalDisposition !== "structured-source" ||
      ![v.userId, v.contextId, v.baseJobId, v.baseArtifactId].every(isUuid) || !Number.isSafeInteger(v.sceneIndex) || v.sceneIndex < 0 || v.sceneIndex > 1023 ||
      ![v.baseFingerprint, v.baseOutputFingerprint, v.renderSignature, v.baseSha256, v.fingerprint, v.logicalIdentity].every(s => typeof s === "string" && /^[a-f0-9]{64}$/.test(s)) ||
      !Number.isFinite(v.duration) || v.duration <= 0 || v.duration > 60 || !v.source || Object.keys(v.source).length !== 4 ||
      v.source.kind !== "health-check-in" || v.source.field !== "wellnessScore" || !isUuid(v.source.id) || !/^[a-f0-9]{64}$/.test(v.source.fingerprint) ||
      v.specification.baseArtifactId !== v.baseArtifactId || v.specification.compositionVersion !== "1") throw Error();
    const { logicalIdentity, ...identity } = v;
    if (privateHash(identity) !== logicalIdentity) throw Error();
    deepFreeze(v); return v;
  } catch { throw new CompositionError("COMPOSITION_INVALID"); }
}

export function validateCompositionJobPayload(value: unknown) {
  try {
    const v = jsonSnapshot(value) as Record<string, unknown>;
    if (!v || Object.keys(v).length !== 2 || !isUuid(v.approvedPersonalizationSpecId) || v.compositionVersion !== "1") throw Error();
    return { approvedPersonalizationSpecId: v.approvedPersonalizationSpecId, compositionVersion: "1" as const };
  } catch { throw new CompositionError("COMPOSITION_INVALID"); }
}

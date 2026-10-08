import "server-only";
import { createHash } from "node:crypto";
import type { AnatomySourceProfile, AnatomySourceProfileIdentity, SourceProfileSelection, SourceProfileSnapshot, SourceProfileBindings } from "./contracts/source-profile";
import { STRUCTURE_REPRESENTATIONS } from "./contracts/organ-module";
import { jsonSnapshot } from "./validation/json-snapshot";
import type { OrganModule } from "./contracts/organ-module";
import type { AnatomyStructureId } from "./contracts/anatomy";
import type { WholeBodyAnatomyCatalog } from "./contracts/anatomy-foundation";

const issued = new WeakMap<object, Readonly<AnatomySourceProfile>>();
const text = (s: unknown): s is string => typeof s === "string" && !!s.trim() && s.length <= 1024;
const identifier = (s: unknown): s is string => typeof s === "string" && /^[A-Za-z0-9][A-Za-z0-9_.@-]{0,127}$/.test(s);
const exact = (v: object, keys: string[]) => Object.keys(v).sort().join(",") === [...keys].sort().join(",");
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical((v as Record<string,unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
const freeze = (v: unknown): void => { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } };
const fail = (): never => { throw Error("SOURCE_PROFILE_INVALID"); };

/** Trusted server configuration, like the mechanism registry; never request data. */
export function createSourceProfileRegistry(definitions: readonly AnatomySourceProfile[]) {
  const profiles = new Map<string, SourceProfileSelection>();
  for (const input of definitions) {
    const p = jsonSnapshot(input) as unknown as AnatomySourceProfile;
    if (!exact(p, ["profileId","profileVersion","organId","sourceId","sourceVersion","anatomyVersion","assetVersion","structures","cameraTargets","labels","usage","limitations","evidenceRefs"]) ||
        ![p.structures,p.cameraTargets,p.labels,p.usage,p.limitations,p.evidenceRefs].every(v => Array.isArray(v) && v.length <= 128) ||
        ![p.profileId, p.profileVersion, p.organId, p.sourceId, p.sourceVersion, p.anatomyVersion, p.assetVersion].every(identifier) ||
        !p.structures.length || !p.usage.length || p.usage.length > 2 || new Set(p.usage).size !== p.usage.length || p.usage.some(u => !["internal-review", "patient-facing"].includes(u)) ||
        !p.evidenceRefs.length || ![...p.evidenceRefs,...p.limitations].every(text) || p.structures.some(s => !exact(s,["structureId","representation"]) || !identifier(s.structureId) || !s.structureId.startsWith(`${p.organId}.`) || !STRUCTURE_REPRESENTATIONS.includes(s.representation) || s.representation === "unknown") ||
        new Set(p.structures.map(s => s.structureId)).size !== p.structures.length ||
        new Set(p.cameraTargets.map(c => c.id)).size !== p.cameraTargets.length ||
        p.cameraTargets.some(c => !exact(c,["id","landmarks","evidenceRefs"]) || !identifier(c.id) || !Array.isArray(c.landmarks) || !c.landmarks.length || c.landmarks.length > 128 || !c.landmarks.every(identifier) || !Array.isArray(c.evidenceRefs) || !c.evidenceRefs.length || c.evidenceRefs.length > 128 || !c.evidenceRefs.every(text)) ||
        new Set(p.labels).size !== p.labels.length || p.labels.some(id => !p.structures.some(s => s.structureId === id))) fail();
    const key = JSON.stringify([p.profileId, p.profileVersion]);
    if (profiles.has(key)) fail();
    freeze(p);
    const selection = Object.freeze(Object.create(null)) as SourceProfileSelection;
    issued.set(selection, p); profiles.set(key, selection);
  }
  return Object.freeze({ resolve(identity: AnatomySourceProfileIdentity): SourceProfileSelection {
    const snapshot = jsonSnapshot(identity) as unknown as AnatomySourceProfileIdentity;
    if (!snapshot || !exact(snapshot,["profileId","profileVersion"]) || !identifier(snapshot.profileId) || !identifier(snapshot.profileVersion)) fail();
    return profiles.get(JSON.stringify([snapshot.profileId, snapshot.profileVersion])) ?? fail();
  } });
}
export type SourceProfileRegistry = ReturnType<typeof createSourceProfileRegistry>;
// No research candidate or patient-facing profile is registered by this milestone.
export const SOURCE_PROFILES = createSourceProfileRegistry([]);

export function sourceProfileSnapshot(selection: SourceProfileSelection): SourceProfileSnapshot {
  const p = readSourceProfile(selection);
  // Sets have canonical order. Include camera, labels, usage, limitations and evidence,
  // not just structure names; a changed trusted binding cannot keep the same identity.
  const sorted = { ...p, structures: [...p.structures].sort((a,b)=>a.structureId.localeCompare(b.structureId)),
    cameraTargets: p.cameraTargets.map(c=>({...c,landmarks:[...c.landmarks].sort(),evidenceRefs:[...c.evidenceRefs].sort()})).sort((a,b)=>a.id.localeCompare(b.id)),
    labels:[...p.labels].sort(),usage:[...p.usage].sort(),limitations:[...p.limitations].sort(),evidenceRefs:[...p.evidenceRefs].sort() };
  return { profileId:p.profileId,profileVersion:p.profileVersion,organId:p.organId,sourceId:p.sourceId,sourceVersion:p.sourceVersion,
    anatomyVersion:p.anatomyVersion,assetVersion:p.assetVersion,usage:sorted.usage,
    fingerprint:createHash("sha256").update(canonical({profileFingerprintVersion:"1",definition:sorted})).digest("hex") };
}

export function validateSourceProfileBindings(value: unknown, assetVersion: string, organId: string, sceneCount: number): SourceProfileBindings {
  const b = jsonSnapshot(value) as unknown as SourceProfileBindings;
  if (!b || !exact(b,["bindingVersion","scenes"]) || b.bindingVersion !== "1" || !Array.isArray(b.scenes) || !b.scenes.length || b.scenes.length > 128 ||
    new Set(b.scenes.map(s=>s.sceneIndex)).size !== b.scenes.length) fail();
  for (const s of b.scenes) {
    if (!s || !exact(s,["sceneIndex","profile"]) || !Number.isSafeInteger(s.sceneIndex) || s.sceneIndex < 0 || s.sceneIndex >= sceneCount) fail();
    const p = s.profile;
    if (!p || !exact(p,["profileId","profileVersion","organId","sourceId","sourceVersion","anatomyVersion","assetVersion","usage","fingerprint"]) ||
      ![p.profileId,p.profileVersion,p.organId,p.sourceId,p.sourceVersion,p.anatomyVersion,p.assetVersion].every(identifier) ||
      !/^[0-9a-f]{64}$/.test(p.fingerprint) || p.assetVersion !== assetVersion || p.organId !== organId ||
      !Array.isArray(p.usage) || !p.usage.length || p.usage.length > 2 || new Set(p.usage).size !== p.usage.length || p.usage.some(u=>!["internal-review","patient-facing"].includes(u))) fail();
  }
  return b;
}

export function resolveStoredSourceProfile(snapshot: SourceProfileSnapshot, registry: SourceProfileRegistry): SourceProfileSelection {
  const selected = registry.resolve({profileId:snapshot.profileId,profileVersion:snapshot.profileVersion});
  if (canonical(sourceProfileSnapshot(selected)) !== canonical(snapshot)) fail();
  return selected;
}

export function trustedSourceProfileBindings(profiles: readonly import("./contracts/source-profile").TrustedSceneProfile[],
  assetVersion: string, organId: string, sceneCount: number, registry: SourceProfileRegistry): SourceProfileBindings {
  if (!Array.isArray(profiles) || profiles.length > 128) fail();
  const bindings = validateSourceProfileBindings({bindingVersion:"1",scenes:profiles.map(s=>({sceneIndex:s.sceneIndex,profile:sourceProfileSnapshot(s.selection)})).sort((a,b)=>a.sceneIndex-b.sceneIndex)},assetVersion,organId,sceneCount);
  bindings.scenes.forEach(s=>resolveStoredSourceProfile(s.profile,registry));
  return bindings;
}
export function readSourceProfile(selection: unknown): Readonly<AnatomySourceProfile> {
  return selection && typeof selection === "object" ? issued.get(selection) ?? fail() : fail();
}

export function anatomyRenderIdentityForProfile(module: OrganModule, selection: SourceProfileSelection, catalog: WholeBodyAnatomyCatalog) {
  const p = readSourceProfile(selection);
  if (module.id !== p.organId || module.assetVersion !== p.assetVersion || module.anatomyVersion !== p.anatomyVersion ||
      !catalog.sources.some(s => s.id === p.sourceId && s.sourceVersion === p.sourceVersion)) fail();
  for (const constraint of p.structures) {
    const entry = module.anatomyRegistry.find(e => e.id === constraint.structureId);
    if (!entry || entry.availability === "missing" || entry.representation !== constraint.representation ||
        !entry.provenance || entry.provenance.licenseReview.status === "rejected" || entry.provenance.sourceId !== p.sourceId || entry.provenance.sourceVersion !== p.sourceVersion ||
        !entry.provenance.evidenceRefs.some(text) || !catalog.structures.some(s => s.id === entry.id && s.organId === p.organId) ||
        !catalog.sources.some(s => s.id === p.sourceId && s.sourceVersion === p.sourceVersion && s.licenseId === entry.provenance!.licenseId)) fail();
  }
  return { anatomyVersion: p.anatomyVersion, sources: [{ sourceId: p.sourceId, sourceVersion: p.sourceVersion }],
    sourceProfile: { profileId: p.profileId, profileVersion: p.profileVersion, fingerprint: sourceProfileSnapshot(selection).fingerprint },
    structureSources: [...p.structures].sort((a,b) => a.structureId.localeCompare(b.structureId)).map(s => ({ ...s, sourceId: p.sourceId, sourceVersion: p.sourceVersion })) };
}

export function checkSourceProfileCohesion(module: OrganModule, selection: SourceProfileSelection, catalog: WholeBodyAnatomyCatalog,
  references: { structures: readonly AnatomyStructureId[]; labels: readonly AnatomyStructureId[]; cameraTargets: readonly string[]; usage: "internal-review" | "patient-facing" }) {
  const p = readSourceProfile(selection);
  const identity = anatomyRenderIdentityForProfile(module, selection, catalog);
  if (!p.usage.includes(references.usage) || references.structures.some(id => !p.structures.some(s => s.structureId === id)) ||
      references.labels.some(id => !p.labels.includes(id))) fail();
  for (const id of references.cameraTargets) {
    const permitted = p.cameraTargets.find(c => c.id === id), target = module.cameraTargets.find(c => c.id === id);
    if (!permitted || !target || target.frames.some(id => !p.structures.some(s => s.structureId === id)) ||
        [...target.lookAt, ...module.scaleReference].some(id => !permitted.landmarks.includes(id) || !module.landmarks.some(l => l.id === id && text(l.blenderObject)))) fail();
  }
  return identity;
}

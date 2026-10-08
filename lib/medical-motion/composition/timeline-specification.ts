import "server-only";
import type { PersonalizationSpecification } from "../contracts/personalization";
import type { SourceProfileSnapshot } from "../contracts/source-profile";
import type { CompiledMedicalScene } from "../contracts/medical-scene";
import { validateSourceProfileBindings } from "../source-profiles";
import { jsonSnapshot } from "../validation/json-snapshot";
import { isUuid } from "@/lib/validation/uuid";
import { privateHash } from "./approved-spec";
import { validateCompiledMedicalScene } from "../scene-compiler";
import { CompositionError, validatePersonalization, type ValidatedComposition } from "./specification";

export type TimelineSegment = Readonly<{ segmentIndex: number; sceneIndex: number; baseJobId: string;
  baseArtifactId: string; baseSha256: string; baseFingerprint: string; baseOutputFingerprint: string;
  renderSignature: string; duration: number; sourceProfile: SourceProfileSnapshot }>;
/** Fade duration is the complete boundary: half on the outgoing clip, half on the incoming clip.
 * No overlap, added frames, or anatomy-to-anatomy blending. */
export type TimelineTransition = Readonly<{ boundaryIndex: number; kind: "cut"; duration: 0 } |
  { boundaryIndex: number; kind: "fade-through-neutral"; duration: number }>;
export type TimelinePersonalization = Omit<PersonalizationSpecification, "compositionVersion" | "baseArtifactId" | "baseAudio"> &
  { compositionVersion: "2"; baseAudio: "silence" };
export type TimelineContent = Readonly<{ schemaVersion: "2"; producerVersion: "1"; compositionVersion: "2";
  userId: string; contextId: string; segments: readonly TimelineSegment[]; transitions: readonly TimelineTransition[];
  duration: number; timelineFingerprint: string; fingerprint: string; logicalIdentity: string;
  approvalDisposition: "internal-composition"; specification: TimelinePersonalization }>;
export type DurableTimeline = TimelineContent & { id: string; jobId: string; createdAt: string };
export type ValidatedTimeline = Readonly<{ content: TimelineContent; presentation: ValidatedComposition }>;
const issued = new WeakSet<object>(), mediaIssued = new WeakSet<object>();
const presentationScenes = new WeakMap<object, CompiledMedicalScene>();
const fail = (): never => { throw new CompositionError("COMPOSITION_INVALID"); };
const exact = (v: object, keys: string[]) => !!v && Object.keys(v).sort().join(",") === keys.sort().join(",");
const hex = (v: unknown) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const freeze = (v: unknown): void => { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } };
export const timelineFingerprint = (segments: readonly TimelineSegment[], transitions: readonly TimelineTransition[]) =>
  privateHash({ timelineVersion: "2", segments, transitions, frameRate: 25, baseAudio: "silence" });
export function validateTimelineContent(input: unknown): TimelineContent {
  try {
    const v = jsonSnapshot(input, { depth: 12, nodes: 6000, width: 64, stringLength: 1024, keyLength: 64, totalStringLength: 32768 }) as unknown as TimelineContent;
    if (!exact(v, ["schemaVersion","producerVersion","compositionVersion","userId","contextId","segments","transitions","duration","timelineFingerprint","fingerprint","logicalIdentity","approvalDisposition","specification"]) ||
      v.schemaVersion !== "2" || v.producerVersion !== "1" || v.compositionVersion !== "2" || v.approvalDisposition !== "internal-composition" ||
      ![v.userId,v.contextId].every(isUuid) || !Array.isArray(v.segments) || v.segments.length < 2 || v.segments.length > 8 ||
      !Array.isArray(v.transitions) || v.transitions.length !== v.segments.length - 1) fail();
    const artifacts = new Set<string>();
    v.segments.forEach((s,i) => {
      if (!exact(s,["segmentIndex","sceneIndex","baseJobId","baseArtifactId","baseSha256","baseFingerprint","baseOutputFingerprint","renderSignature","duration","sourceProfile"]) ||
        s.segmentIndex !== i || !Number.isSafeInteger(s.sceneIndex) || s.sceneIndex < 0 || s.sceneIndex > 1023 ||
        ![s.baseJobId,s.baseArtifactId].every(isUuid) || artifacts.has(s.baseArtifactId) ||
        ![s.baseSha256,s.baseFingerprint,s.baseOutputFingerprint,s.renderSignature].every(hex) || !Number.isFinite(s.duration) || s.duration <= 0 || s.duration > 60) fail();
      artifacts.add(s.baseArtifactId);
      if (Math.abs(s.duration*25-Math.round(s.duration*25))>.0001) fail();
      validateSourceProfileBindings({bindingVersion:"1",scenes:[{sceneIndex:s.sceneIndex,profile:s.sourceProfile}]},s.sourceProfile.assetVersion,s.sourceProfile.organId,1024);
    });
    v.transitions.forEach((t,i) => {
      if (!exact(t,["boundaryIndex","kind","duration"]) || t.boundaryIndex !== i ||
        !(t.kind === "cut" && t.duration === 0 || t.kind === "fade-through-neutral" && Number.isFinite(t.duration) && t.duration >= .15 && t.duration <= .75) ||
        t.duration / 2 >= Math.min(v.segments[i].duration,v.segments[i+1].duration)) fail();
    });
    v.segments.forEach((s,i)=> { if (((v.transitions[i-1]?.duration ?? 0)+(v.transitions[i]?.duration ?? 0))/2 >= s.duration) fail(); });
    const duration = v.segments.reduce((n,s)=>n+s.duration,0);
    if (duration > 60 || v.duration !== duration || v.timelineFingerprint !== timelineFingerprint(v.segments,v.transitions) ||
      !exact(v.specification,["compositionVersion","baseAudio","outputProfile","language","textOverlays","numericOverlays","chartOverlays","audioSegments","dynamicNarrationSlots"]) ||
      v.specification.compositionVersion !== "2" || v.specification.baseAudio !== "silence") fail();
    const {logicalIdentity, ...identity} = v;
    if (logicalIdentity !== privateHash(identity) || v.fingerprint !== privateHash({version:"2",userId:v.userId,contextId:v.contextId,
      timelineFingerprint:v.timelineFingerprint,duration:v.duration,specification:v.specification})) fail();
    freeze(v); return v;
  } catch { return fail(); }
}
/** Trusted producer only; no route exposes issuance. Scenes must already pass the full medical gate. */
export function issueTimeline(content: TimelineContent, scenes: readonly CompiledMedicalScene[]): TimelineContent {
  const capability = authorizeTimelineMedia(content, scenes);
  issued.add(capability.content); return capability.content;
}
export const isIssuedTimeline = (value: object) => issued.has(value);
/** Replay obtains compiler-issued scenes again, never authority from the persisted JSON alone. */
export function authorizeTimelineMedia(input: unknown, scenes: readonly CompiledMedicalScene[]): ValidatedTimeline {
  const content = validateTimelineContent(input);
  if (scenes.length !== content.segments.length) fail();
  let presentation: ValidatedComposition | undefined;
  scenes.forEach((scene,i) => {
    if(!validateCompiledMedicalScene(scene)) fail();
    const s = content.segments[i], p = scene.scene.sourceProfile;
    const anatomy=scene.scene.anatomy;
    if (scene.scene.renderIntent === "still" || !p || p.profileId !== s.sourceProfile.profileId || p.profileVersion !== s.sourceProfile.profileVersion ||
      p.fingerprint !== s.sourceProfile.fingerprint || scene.baseFingerprint !== s.baseFingerprint || scene.outputFingerprint !== s.baseOutputFingerprint ||
      scene.scene.usage !== "internal-review" || scene.reuse.classification !== "reusable-base" || !s.sourceProfile.usage.includes("internal-review") ||
      anatomy.length!==1 || anatomy[0].organId!==s.sourceProfile.organId || anatomy[0].assetVersion!==s.sourceProfile.assetVersion ||
      anatomy[0].anatomyVersion!==s.sourceProfile.anatomyVersion || anatomy[0].sources.length!==1 ||
      anatomy[0].sources[0].sourceId!==s.sourceProfile.sourceId || anatomy[0].sources[0].sourceVersion!==s.sourceProfile.sourceVersion) fail();
    const {compositionVersion: _version, ...rest} = content.specification;
    presentation = validatePersonalization({...rest,compositionVersion:"1",baseArtifactId:content.segments[0].baseArtifactId},scene,
      {userId:content.userId,contextId:content.contextId,baseSha256:content.segments[0].baseSha256,duration:content.duration});
  });
  const capability = Object.freeze({content,presentation:presentation!}); mediaIssued.add(capability);
  presentationScenes.set(capability,scenes[0]); return capability;
}
export const isAuthorizedTimelineMedia = (value: object) => mediaIssued.has(value);
/** Internal compositor rebind after trusted normalization; never grants source authority. */
export function rebindTimelinePresentation(capability: ValidatedTimeline, sha256: string): ValidatedComposition {
  const scene = presentationScenes.get(capability); if (!scene) return fail();
  const {compositionVersion: _version,...rest} = capability.content.specification;
  return validatePersonalization({...rest,compositionVersion:"1",baseArtifactId:capability.content.segments[0].baseArtifactId},scene,
    {userId:capability.content.userId,contextId:capability.content.contextId,baseSha256:sha256,duration:capability.content.duration});
}

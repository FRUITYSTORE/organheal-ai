import "server-only";
import { createHash } from "node:crypto";
import type { CompiledMedicalScene, MedicalSceneDsl, OverlayKind, ReuseDecision, SceneOutputProfile } from "./contracts/medical-scene";
import type { MechanismEvaluationContext } from "./contracts/mechanism";
import type { AnatomyStructureId } from "./contracts/anatomy";
import type { OrganModule, AnatomyRequirements } from "./contracts/organ-module";
import type { WholeBodyAnatomyCatalog } from "./contracts/anatomy-foundation";
import { anatomyRenderIdentity } from "./anatomy-foundation";
import { evaluateMechanismCandidate, checkVisualizationOperation, type MechanismRegistry } from "./mechanism-registry";
import { checkMechanismAnatomy } from "./mechanism-readiness";
import { checkAssetReadiness } from "../symptom-explanation/asset-readiness";
import { STRUCTURE_REPRESENTATIONS } from "./contracts/organ-module";
import { checkSourceProfileCohesion } from "./source-profiles";

export function canonicalSceneJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalSceneJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalSceneJson((value as Record<string, unknown>)[k])}`).join(",")}}`;
  if (value === undefined || (typeof value === "number" && !Number.isFinite(value))) throw Error("NON_CANONICAL_SCENE_VALUE");
  const json = JSON.stringify(value);
  if (json === undefined) throw Error("NON_CANONICAL_SCENE_VALUE");
  return json;
}
const hash = (value: unknown) => createHash("sha256").update(canonicalSceneJson(value)).digest("hex");
const freeze = (value: unknown): void => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } };
const sorted = <T extends string>(ids: readonly T[]): T[] => [...new Set(ids)].sort();
const OVERLAYS: readonly OverlayKind[] = ["text-value", "chart", "subtitle", "caption", "voice-segment", "risk-band", "educational-label"];
const EXACT_REPRESENTATIONS = STRUCTURE_REPRESENTATIONS.filter(r => r !== "unknown");
/** Unsupported advanced operations remain explicitly versioned; not implied renderer capabilities. */
export const SCENE_VISUAL_OPERATIONS = Object.freeze({
  highlight: { version: "1", supported: true, representations: EXACT_REPRESENTATIONS },
  "camera-focus": { version: "1", supported: true, representations: EXACT_REPRESENTATIONS },
  "structure-label": { version: "1", supported: true, representations: EXACT_REPRESENTATIONS },
  "flow-direction-cue": { version: "1", supported: false, representations: ["lumen", "centerline"] },
  "pressure-emphasis": { version: "1", supported: false, representations: ["wall", "tissue"] },
  "motion-rate-change": { version: "1", supported: false, representations: ["tissue"] },
  "narrow-lumen": { version: "1", supported: false, representations: ["lumen"] },
} as const);
freeze(SCENE_VISUAL_OPERATIONS);
export type SceneCompilerContext = MechanismEvaluationContext & {
  sourceProfile?: import("./contracts/source-profile").SourceProfileSelection;
  cameraTargets?: readonly string[];
  registry: MechanismRegistry;
  getModule: (organ: string) => OrganModule | null;
  catalog: WholeBodyAnatomyCatalog;
  /** Trusted adapter selections can only reduce the registry highlight set. */
  selections?: readonly AnatomyStructureId[];
  additionalRequirements?: AnatomyRequirements;
  overview?: boolean;
};
export type ScenePresentation = {
  renderIntent: MedicalSceneDsl["renderIntent"];
  durationHint: number;
  outputProfile: SceneOutputProfile;
  overlayKinds: readonly OverlayKind[];
  geometryScope: "shared" | "patient-specific-anatomy" | "patient-specific-pathology";
};
export const DEFAULT_SCENE_PRESENTATION: ScenePresentation = {
  renderIntent: "short-clip", durationHint: 5,
  outputProfile: { aspectRatio: "16:9", resolution: "1080p", lod: "asset-native" },
  overlayKinds: ["text-value", "subtitle", "voice-segment"], geometryScope: "shared",
};
freeze(DEFAULT_SCENE_PRESENTATION);
const compiledScenes = new WeakSet<object>();
/** Neither deserialized DSL nor a matching hash grants compiler/renderer authority. */
export const isCompiledMedicalScene = (value: unknown): value is CompiledMedicalScene => !!value && typeof value === "object" && compiledScenes.has(value);
const failure = (reasons: readonly string[], classification: ReuseDecision["classification"] = "unsupported") =>
  ({ ok: false as const, reuse: { classification, reasons }, reasons });

/** The context is trusted server code, NEVER deserialized from AI or client input.
 * This is the one generic compilation core used by the existing heart adapter. */
export function compileMedicalScene(candidate: unknown, context: SceneCompilerContext, presentation: ScenePresentation = DEFAULT_SCENE_PRESENTATION) {
  // Safety -> resolution -> evidence. Production mechanism approval remains after anatomy.
  if (context?.safety?.allowVideo !== true || context.safety.level !== "none") return failure(["Safety Gate blocks visualization."]);
  const eligibility = evaluateMechanismCandidate(context.registry, candidate, { ...context, mode: "development" });
  if (eligibility.status !== "eligible") return failure(eligibility.reasons);
  const m = context.registry.resolve(candidate)!;
  const highlights = sorted(context.selections ?? m.highlightedAnatomy);
  if (highlights.some(id => !m.highlightedAnatomy.includes(id))) return failure(["Highlight selection is not registry-authorized."]);
  const readiness = checkMechanismAnatomy(m, context.mode, highlights, context.getModule, context.catalog);
  if (!readiness.ok) return { ...failure(readiness.details), errorCode: "errorCode" in readiness ? readiness.errorCode : "REAL_ANATOMICAL_ASSET_REQUIRED" as const };
  if (Object.keys(context.additionalRequirements ?? {}).some(id => !context.catalog.structures.some(s => s.id === id && m.affectedOrgans.includes(s.organId)))) return failure(["Adapter anatomy is not registered for this mechanism's organs."]);
  // Never overwrite a stronger mechanism dependency with adapter requirements.
  for (const organ of m.affectedOrgans) {
    const extra = Object.fromEntries(Object.entries(context.additionalRequirements ?? {}).filter(([id]) => id.startsWith(`${organ}.`)));
    if (!Object.keys(extra).length) continue;
    const checked = checkAssetReadiness(organ, [], context.mode, context.getModule, extra, context.catalog);
    if (!checked.ok) return { ...failure(checked.details), errorCode: checked.errorCode };
  }
  if (Object.keys(context.additionalRequirements ?? {}).some(id => !m.affectedOrgans.some(o => id.startsWith(`${o}.`)))) return failure(["Adapter anatomy belongs to an undeclared organ."]);
  if (!presentation || Object.keys(presentation).some(k => !["renderIntent", "durationHint", "outputProfile", "overlayKinds", "geometryScope"].includes(k)) ||
      !["still", "short-clip", "loop", "educational-segment"].includes(presentation.renderIntent) ||
      !Number.isFinite(presentation.durationHint) || presentation.durationHint <= 0 || presentation.durationHint > 60 ||
      !presentation.outputProfile || Object.keys(presentation.outputProfile).some(k => !["aspectRatio", "resolution", "lod"].includes(k)) ||
      !["16:9", "9:16", "1:1"].includes(presentation.outputProfile.aspectRatio) || !["720p", "1080p"].includes(presentation.outputProfile.resolution) ||
      presentation.outputProfile.lod !== "asset-native" || !Array.isArray(presentation.overlayKinds) || presentation.overlayKinds.some(k => !OVERLAYS.includes(k)) ||
      !["shared", "patient-specific-anatomy", "patient-specific-pathology"].includes(presentation.geometryScope)) return failure(["Unsupported presentation contract."]);
  if (presentation.geometryScope !== "shared") return failure(["Patient-specific geometry requires a separately verified render; not implemented."], "patient-specific-render-required");
  const profile = m.visualizationProfile;
  if (!["none", "baseline"].includes(profile.motionIntent) || profile.flowIntent !== "none") return failure(["Unsupported motion/flow intent."]);
  const modules = sorted(m.affectedOrgans).map(id => context.getModule(id)!);
  if (modules.some(module => !module || !module.anatomyVersion?.trim() || !module.assetVersion?.trim())) return failure(["Explicit anatomy and asset versions are required."]);
  if (profile.motionIntent === "baseline" && modules.some(module => !module.motionControllers.length)) return failure(["No illustrative motion implementation is available."]);
  const operations = sorted([...profile.visualEffectIntent, "camera-focus" as const, ...(highlights.length ? ["highlight" as const] : []),
    ...(profile.labelIntent === "structure-names" ? ["structure-label" as const] : [])]);
  for (const op of operations) {
    if (!Object.hasOwn(SCENE_VISUAL_OPERATIONS, op) || !SCENE_VISUAL_OPERATIONS[op].supported || !checkVisualizationOperation(m, op, context.evidence)) return failure([`Unsupported or unapproved visual operation: ${op}.`]);
  }
  const requirements: AnatomyRequirements = {};
  const ids = sorted([...Object.keys(m.requiredAnatomy), ...Object.keys(context.additionalRequirements ?? {})] as AnatomyStructureId[]);
  for (const id of ids) {
    const a = m.requiredAnatomy[id], b = context.additionalRequirements?.[id];
    requirements[id] = { ...(a?.representations || b?.representations ? { representations: sorted(a?.representations && b?.representations ? a.representations.filter(r => b.representations!.includes(r)) : a?.representations ?? b?.representations ?? []) } : {}),
      requireVerified: !!(a?.requireVerified || b?.requireVerified), completeCoverage: !!(a?.completeCoverage || b?.completeCoverage),
      requireClinicalApproval: !!(a?.requireClinicalApproval || b?.requireClinicalApproval), requiredRegions: sorted([...(a?.requiredRegions ?? []), ...(b?.requiredRegions ?? [])]) };
  }
  const used = sorted([...ids, ...highlights, profile.primaryStructure, ...profile.secondaryStructures,
    ...(context.sourceProfile !== undefined ? modules.flatMap(module=>module.anatomyRegistry.filter(e=>e.availability!=="missing").map(e=>e.id)) : [])]);
  let profileIdentity: ReturnType<typeof checkSourceProfileCohesion> | undefined;
  if (context.sourceProfile !== undefined) {
    try {
      if (modules.length !== 1 || !context.cameraTargets?.length) return failure(["Source profile requires one organ and explicit camera targets."]);
      profileIdentity = checkSourceProfileCohesion(modules[0], context.sourceProfile, context.catalog, {
        structures: used, labels: profile.labelIntent === "structure-names" ? sorted([profile.primaryStructure, ...profile.secondaryStructures]) : [],
        cameraTargets: context.cameraTargets, usage: context.mode === "production" ? "patient-facing" : "internal-review",
      });
    } catch { return failure(["Source profile cohesion failed; no fallback is permitted."]); }
  }
  // Camera/labels also depend on anatomy even if optional or not highlighted.
  for (const organ of m.affectedOrgans) {
    const organRequirements = Object.fromEntries(Object.entries(requirements).filter(([id]) => id.startsWith(`${organ}.`)));
    const checked = checkAssetReadiness(organ, used.filter(id => id.startsWith(`${organ}.`)), context.mode, context.getModule, organRequirements, context.catalog);
    if (!checked.ok) return failure(checked.details);
  }
  for (const op of operations) {
    const targets = op === "highlight" ? highlights : [profile.primaryStructure, ...profile.secondaryStructures];
    const accepted: readonly string[] = SCENE_VISUAL_OPERATIONS[op].representations;
    if (targets.some(id => !accepted.includes(modules.flatMap(module => module.anatomyRegistry).find(entry => entry.id === id)!.representation))) return failure(["Visual operation representation is unsupported; no substitution permitted."]);
  }
  const scene: MedicalSceneDsl = {
    ...(profileIdentity ? { sourceProfile: profileIdentity.sourceProfile, profileAnatomyIdentity: profileIdentity,
      profileCameraTargets: sorted(context.cameraTargets!) } : {}),
    sceneDslVersion: "1", compilerContractVersion: "1", renderIdentityVersion: "1",
    mechanismId: m.mechanismId, mechanismVersion: m.version, bodySystemIds: sorted(m.bodySystems), organIds: sorted(m.affectedOrgans),
    anatomy: modules.map(module => ({ organId: module.id, anatomyVersion: module.anatomyVersion!, assetVersion: module.assetVersion, sources: (profileIdentity ?? anatomyRenderIdentity(module)).sources.map(s => ({ ...s })).sort((a,b) => a.sourceId.localeCompare(b.sourceId) || a.sourceVersion.localeCompare(b.sourceVersion)) })),
    requiredStructures: requirements,
    representations: used.map(id => ({ structureId: id, representation: modules.flatMap(module => module.anatomyRegistry).find(entry => entry.id === id)!.representation })),
    highlightedStructures: highlights,
    cameraIntent: { kind: context.overview || profile.cameraIntent === "overview" ? "organ-overview" : "structure-focus", structures: context.overview ? [] : sorted([profile.primaryStructure, ...profile.secondaryStructures]) },
    motionIntent: presentation.renderIntent === "still" || profile.motionIntent === "none" ? "static" : "illustrative-cycle", flowIntent: "none",
    visualEffects: operations.map(operation => ({ operation, version: "1", structures: operation === "highlight" ? highlights : sorted([profile.primaryStructure, ...profile.secondaryStructures]) })),
    labels: profile.labelIntent === "structure-names" ? sorted([profile.primaryStructure, ...profile.secondaryStructures]) : [],
    visualState: profile.visualEmphasis, durationHint: presentation.durationHint, renderIntent: presentation.renderIntent,
    patientIndependentBase: true, usage: context.mode === "production" ? "patient-facing" : "internal-review",
    overlaySlots: sorted(presentation.overlayKinds).map(kind => ({ id: kind, kind })), outputProfile: structuredClone(presentation.outputProfile),
  };
  // Presentation can change physical output, never silently reuse the wrong variant.
  const { outputProfile, overlaySlots, ...base } = scene;
  const baseFingerprint = hash(base);
  const compiled: CompiledMedicalScene = { scene, baseFingerprint, outputFingerprint: hash({ baseFingerprint, outputProfile, adapterContractVersion: "1" }),
    reuse: { classification: "reusable-base", reasons: ["Registry-approved shared geometry and visual state; personalization is external."] } };
  freeze(compiled); compiledScenes.add(compiled);
  return { ok: true as const, compiled };
}

/** Scene validation after construction; JSON/copies cannot become authoritative DSL. */
export function validateCompiledMedicalScene(value: unknown): boolean {
  if (!isCompiledMedicalScene(value)) return false;
  const { outputProfile, overlaySlots: _slots, ...base } = value.scene;
  return value.baseFingerprint === hash(base) && value.outputFingerprint === hash({ baseFingerprint: value.baseFingerprint, outputProfile, adapterContractVersion: "1" });
}

/** Bounded future composition values. They never enter a base scene or its hash. */
export function validateSceneOverlays(compiled: unknown, values: unknown): boolean {
  if (!isCompiledMedicalScene(compiled) || !values || typeof values !== "object" || Array.isArray(values)) return false;
  return Object.entries(values).every(([id, value]) => compiled.scene.overlaySlots.some(slot => slot.id === id) &&
    ((typeof value === "string" && value.length <= 2000) || (typeof value === "number" && Number.isFinite(value))));
}

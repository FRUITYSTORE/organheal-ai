import { describe, expect, it, vi } from "vitest";
import { compileMedicalScene, DEFAULT_SCENE_PRESENTATION, canonicalSceneJson, isCompiledMedicalScene, validateCompiledMedicalScene, validateSceneOverlays, SCENE_VISUAL_OPERATIONS, type SceneCompilerContext } from "../lib/medical-motion/scene-compiler";
import { MEDICAL_MECHANISMS } from "../lib/medical-motion/mechanism-definitions";
import { createMechanismRegistry } from "../lib/medical-motion/mechanism-registry";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { getOrganModule } from "../lib/medical-motion/organ-modules";
import { WHOLE_BODY_ANATOMY } from "../lib/medical-motion/whole-body-anatomy";
import { CROSS_BODY_FIXTURES, MECHANISM_TEST_CATALOG } from "./helpers/whole-body-mechanism-fixtures";
import { withTestAnatomyReview } from "./helpers/anatomy-review-fixture";
import type { MedicalMechanism } from "../lib/medical-motion/contracts/mechanism";
import type { OrganModule, StructureRepresentation } from "../lib/medical-motion/contracts/organ-module";
import { prepareExplanationAuthorization, readExplanationAuthorization } from "../lib/symptom-explanation/explanation-authorization";
import { getMechanismAnatomy } from "../lib/symptom-explanation/anatomy-resolver";
import { compileExplanationScene } from "../lib/symptom-explanation/compile-explanation-scene";
import { computeRenderSignature } from "../lib/medical-motion/render-signature";
import { buildHeartVisualizationScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";

const heart = () => structuredClone(MEDICAL_MECHANISMS.definitions[1]);
const candidate = (m = heart()) => ({ mechanismId: m.mechanismId, mechanismVersion: m.version });
function fixtureModule(m: MedicalMechanism): OrganModule {
  // Metadata fixtures only. No mesh exists; never sent to Blender or marked patient-ready.
  return withTestAnatomyReview({ ...HEART_ORGAN_MODULE, id: m.affectedOrgans[0], anatomyRegistry: Object.entries(m.requiredAnatomy).map(([id, r]) => ({
    id: id as `${string}.${string}`, kind: "organ", representation: r!.representations![0], verification: "verified",
    availability: "present", blenderObject: "TEST_ONLY_NO_GEOMETRY", fidelity: "reference-derived",
    coverage: { verifiedRegions: ["whole"], unknownRegions: [], excludedRegions: [], evidenceRefs: ["TEST_ONLY_COVERAGE"] },
  })) });
}
function context(m = heart(), module = fixtureModule(m)): SceneCompilerContext {
  return { safety: { allowVideo: true, level: "none" }, mode: "development", claim: "possible-mechanism",
    evidence: m.requiredEvidence.map(r => ({ ...r, origin: r.origin ?? "server-intake", assertion: "present", evidenceRef: "TEST_ONLY_SERVER_FACT" })),
    registry: createMechanismRegistry([m], MECHANISM_TEST_CATALOG), catalog: MECHANISM_TEST_CATALOG, getModule: () => module };
}
function compiled(m = heart(), c = context(m), p = DEFAULT_SCENE_PRESENTATION) {
  const result = compileMedicalScene(candidate(m), c, p);
  if (!result.ok) throw Error(result.reasons.join(" "));
  return result.compiled;
}
describe("generic deterministic scene DSL", () => {
  it.each([heart(), ...CROSS_BODY_FIXTURES].map(m => [m.mechanismId, m] as const))("compiles %s only with TEST anatomy, never patient approval", (_, m) => {
    const c = context(m), value = compiled(m, c);
    expect(value.scene.organIds).toEqual(m.affectedOrgans);
    expect(value.scene.representations.map(r => r.structureId)).toEqual(Object.keys(m.requiredAnatomy).sort());
    expect(value.reuse.classification).toBe("reusable-base");
    expect(compileMedicalScene(candidate(m), { ...c, mode: "production" }).ok).toBe(false);
    expect(compileMedicalScene(candidate(m), { ...c, getModule: () => null }).ok).toBe(false);
  });
  it("detaches and recursively freezes canonical output", () => {
    const m = heart(), module = fixtureModule(m), c = context(m, module), value = compiled(m, c);
    module.assetVersion = "mutated"; m.visualizationProfile.visualEmphasis = "subtle";
    expect(value.scene.anatomy[0].assetVersion).not.toBe("mutated");
    expect(Object.isFrozen(value.scene.requiredStructures)).toBe(true);
    expect(Object.isFrozen(value.scene.visualEffects[0])).toBe(true);
    expect(() => { (value.scene as { mechanismId: string }).mechanismId = "mutated"; }).toThrow();
  });
  it("equivalent unordered sets, requirements and evidence produce identical canonical output", () => {
    const m = heart(), a = compiled(m), other = heart();
    other.requiredAnatomy = Object.fromEntries(Object.entries(other.requiredAnatomy).reverse());
    other.highlightedAnatomy = [...other.highlightedAnatomy].reverse();
    other.visualizationProfile.secondaryStructures = [...other.visualizationProfile.secondaryStructures].reverse();
    const c = context(other); c.evidence = [...c.evidence].reverse();
    expect(compiled(other, c)).toEqual(a);
    expect(canonicalSceneJson({ b: 1, a: 2 })).toBe(canonicalSceneJson({ a: 2, b: 1 }));
  });
  it.each(["mechanism", "anatomy", "asset", "representation", "visual-state"])("changes base identity for %s", kind => {
    const m = heart(), module = fixtureModule(m), original = compiled(m, context(m, module));
    if (kind === "mechanism") m.version = "2";
    if (kind === "anatomy") module.anatomyVersion = "TEST-2";
    if (kind === "asset") module.assetVersion = "TEST-2";
    if (kind === "representation") module.anatomyRegistry[0].representation = "tissue";
    if (kind === "visual-state") m.visualizationProfile.visualEmphasis = "subtle";
    expect(compiled(m, context(m, module)).baseFingerprint).not.toBe(original.baseFingerprint);
  });
  it("patient numerical/text overlays and language do not contaminate reusable base", () => {
    const value = compiled(); const before = value.baseFingerprint;
    expect(validateSceneOverlays(value, { "text-value": 42, subtitle: "شرح عربي", "voice-segment": "English" })).toBe(true);
    expect(validateSceneOverlays(value, { "text-value": 100, subtitle: "Different patient text" })).toBe(true);
    expect(value.baseFingerprint).toBe(before);
    expect(canonicalSceneJson(value.scene)).not.toMatch(/TEST_ONLY_SERVER_FACT|patientName|شرح عربي/);
  });
  it.each(["patientName", "camera", "anatomy", "mechanism", "visualEffects", "diagnosis"])("overlay cannot change %s", key => {
    expect(validateSceneOverlays(compiled(), { [key]: "mutation" })).toBe(false);
  });
  it("rejects nested, oversized and nonfinite overlay values", () => {
    const value = compiled();
    expect(validateSceneOverlays(value, { "text-value": { geometry: "injection" } })).toBe(false);
    expect(validateSceneOverlays(value, { subtitle: "x".repeat(2001) })).toBe(false);
    expect(validateSceneOverlays(value, { "text-value": Infinity })).toBe(false);
  });
  it("presentation/aspect changes physical output identity, not medical base", () => {
    const a = compiled(), b = compiled(heart(), context(), { ...DEFAULT_SCENE_PRESENTATION, outputProfile: { aspectRatio: "9:16", resolution: "720p", lod: "asset-native" } });
    expect(a.baseFingerprint).toBe(b.baseFingerprint); expect(a.outputFingerprint).not.toBe(b.outputFingerprint);
    expect(compiled(heart(), context(), { ...DEFAULT_SCENE_PRESENTATION, outputProfile: { aspectRatio: "1:1", resolution: "1080p", lod: "asset-native" } }).scene.outputProfile.aspectRatio).toBe("1:1");
  });
  it.each(["still", "short-clip", "loop", "educational-segment"] as const)("supports bounded generic %s intent without promising a renderer", renderIntent => {
    const value = compiled(heart(), context(), { ...DEFAULT_SCENE_PRESENTATION, renderIntent });
    expect(value.scene.renderIntent).toBe(renderIntent);
    expect(value.scene.motionIntent).toBe(renderIntent === "still" ? "static" : "illustrative-cycle");
  });
  it.each(["patient-specific-anatomy", "patient-specific-pathology"] as const)("requires a separate verified render for %s", geometryScope => {
    const result = compileMedicalScene(candidate(), context(), { ...DEFAULT_SCENE_PRESENTATION, geometryScope });
    expect(result).toMatchObject({ ok: false, reuse: { classification: "patient-specific-render-required" } });
    expect(result).not.toHaveProperty("compiled");
  });
  it.each(["cameraIntent", "requiredStructures", "motionIntent", "visualEffects", "patientName"])("rejects AI candidate override %s", key => {
    expect(compileMedicalScene({ ...candidate(), [key]: "AI" }, context()).ok).toBe(false);
  });
  it("raw or mutated/deserialized DSL never gains compiler authority", () => {
    const value = compiled();
    expect(isCompiledMedicalScene(value)).toBe(true);
    expect(validateCompiledMedicalScene(value)).toBe(true);
    const raw = structuredClone(value); raw.scene.motionIntent = "physiologic-cycle" as "static";
    expect(isCompiledMedicalScene(raw)).toBe(false);
    expect(validateCompiledMedicalScene(raw)).toBe(false);
    expect(validateSceneOverlays(raw, { subtitle: "text" })).toBe(false);
    expect(compileMedicalScene(raw.scene, context()).ok).toBe(false);
  });
  it.each(["cavity", "wall", "lumen"] as StructureRepresentation[])("never substitutes %s for approved chamber surface/tissue", representation => {
    const m = heart(), module = fixtureModule(m); module.anatomyRegistry[0].representation = representation;
    expect(compileMedicalScene(candidate(m), context(m, module)).ok).toBe(false);
  });
  it("partitions multi-organ anatomy without a heart-only dependency assumption", () => {
    const m = structuredClone(CROSS_BODY_FIXTURES[0]), kidney = CROSS_BODY_FIXTURES[1];
    m.bodySystems = [...m.bodySystems, ...kidney.bodySystems]; m.affectedOrgans = [...m.affectedOrgans, ...kidney.affectedOrgans];
    m.requiredAnatomy = { ...m.requiredAnatomy, ...kidney.requiredAnatomy };
    m.highlightedAnatomy = [...m.highlightedAnatomy, ...kidney.highlightedAnatomy];
    m.visualizationProfile.secondaryStructures = [kidney.visualizationProfile.primaryStructure];
    const c = context(m), lungModule = fixtureModule(CROSS_BODY_FIXTURES[0]), kidneyModule = fixtureModule(kidney);
    c.getModule = id => id === "lungs" ? lungModule : id === "kidneys" ? kidneyModule : null;
    expect(compiled(m, c).scene.organIds).toEqual(["kidneys", "lungs"]);
  });
  it("binds the medical base fingerprint to the existing render signature", () => {
    const scene = buildHeartVisualizationScene("lvAorta"), a = compiled(), m = heart(); m.visualizationProfile.visualEmphasis = "subtle";
    const b = compiled(m);
    expect(computeRenderSignature(scene, "asset", a)).not.toBe(computeRenderSignature(scene, "asset", b));
    expect(computeRenderSignature(scene, "asset")).not.toBe(computeRenderSignature(scene, "asset", a));
  });
  it("validates non-highlighted dependencies and complete coverage", () => {
    const m = heart(), module = fixtureModule(m), c = context(m, module); c.selections = [];
    m.requiredAnatomy["heart.aorta"]!.completeCoverage = true;
    const c2 = { ...context(m, module), selections: [] };
    module.anatomyRegistry[1].coverage.unknownRegions = ["unknown"];
    expect(compileMedicalScene(candidate(m), c2).ok).toBe(false);
    module.anatomyRegistry = module.anatomyRegistry.slice(0,1);
    expect(compileMedicalScene(candidate(m), c).ok).toBe(false);
  });
  it("optional camera/label anatomy is required even without highlights", () => {
    const m = heart(); m.optionalAnatomy = ["heart.pulmonaryVeins"]; m.visualizationProfile.secondaryStructures = ["heart.pulmonaryVeins"];
    expect(compileMedicalScene(candidate(m), context(m)).ok).toBe(false);
  });
  it("unknown effects fail registration and unsupported reviewed effects fail compilation", () => {
    const m = heart(); m.visualizationProfile.visualEffectIntent = ["invent-effect" as "highlight"];
    expect(() => context(m)).toThrow();
    const advanced = heart(); advanced.allowedVisualizations = [...advanced.allowedVisualizations, "narrow-lumen"];
    advanced.visualizationProfile.visualEffectIntent = ["narrow-lumen"];
    advanced.requiredAnatomy = Object.fromEntries(Object.entries(advanced.requiredAnatomy).map(([id, r]) => [id, { ...r, representations: ["lumen"], requireVerified: true }]));
    advanced.effectRequirements["narrow-lumen"] = { requiredEvidence: advanced.requiredEvidence, reviewEvidenceRefs: ["TEST ONLY EFFECT REVIEW"] };
    expect(compileMedicalScene(candidate(advanced), context(advanced))).toMatchObject({ ok: false, reasons: ["Unsupported or unapproved visual operation: narrow-lumen."] });
  });
  it("unsupported motion cannot be implied by a generic baseline intent", () => {
    const m = heart(), module = fixtureModule(m); module.motionControllers = [];
    expect(compileMedicalScene(candidate(m), context(m, module))).toMatchObject({ ok: false, reasons: ["No illustrative motion implementation is available."] });
    expect(compiled().scene.motionIntent).not.toBe("physiologic-cycle");
  });
  it.each(["overlay", "lod", "prose"])("rejects unsupported presentation %s", kind => {
    const p = structuredClone(DEFAULT_SCENE_PRESENTATION);
    if (kind === "overlay") p.overlayKinds = ["anatomy-replacement" as "subtitle"];
    if (kind === "lod") p.outputProfile.lod = "high" as "asset-native";
    if (kind === "prose") Object.assign(p, { aiNarration: "unbounded" });
    expect(compileMedicalScene(candidate(), context(), p).ok).toBe(false);
  });
  it("operation semantics and versions are bounded and immutable", () => {
    expect(SCENE_VISUAL_OPERATIONS["narrow-lumen"].representations).toEqual(["lumen"]);
    expect(Object.values(SCENE_VISUAL_OPERATIONS).every(v => v.version === "1")).toBe(true);
    expect(Object.isFrozen(SCENE_VISUAL_OPERATIONS["narrow-lumen"].representations)).toBe(true);
  });
  it("requires highlight permission even when a profile omits a highlight operation", () => {
    const m = heart(); m.visualizationProfile.visualEffectIntent = []; m.allowedVisualizations = ["camera-focus", "structure-label"];
    expect(compileMedicalScene(candidate(m), context(m)).ok).toBe(false);
  });
  it("reviewed flow remains unsupported rather than implying a deformation controller", () => {
    const m = heart(); m.visualizationProfile.flowIntent = "direction-only";
    m.allowedVisualizations = [...m.allowedVisualizations, "flow-direction-cue"];
    m.effectRequirements["flow-direction-cue"] = { requiredEvidence: m.requiredEvidence, reviewEvidenceRefs: ["TEST ONLY EFFECT REVIEW"] };
    m.requiredAnatomy = Object.fromEntries(Object.entries(m.requiredAnatomy).map(([id, r]) => [id, { ...r, requireVerified: true }]));
    expect(compileMedicalScene(candidate(m), context(m))).toMatchObject({ ok: false, reasons: ["Unsupported motion/flow intent."] });
  });
  it("internal reuse never shares identity with hypothetically fully approved TEST usage", () => {
    const m = heart(); m.medicalReviewStatus = "medically-reviewed"; m.patientFacingStatus = "patient-approved";
    m.medicalReviewEvidenceRefs = ["TEST ONLY REVIEW"]; m.patientApprovalEvidenceRefs = ["TEST ONLY APPROVAL"];
    const module = fixtureModule(m); module.assetStatus = "production"; module.anatomicallyValidated = true;
    const c = context(m, module), a = compiled(m, c), b = compiled(m, { ...c, mode: "production" });
    expect(a.scene.usage).toBe("internal-review"); expect(b.scene.usage).toBe("patient-facing");
    expect(a.baseFingerprint).not.toBe(b.baseFingerprint);
  });
  it("safety precedes resolution and evidence precedes anatomy", () => {
    const c = context(), lookup = vi.fn(() => { throw Error("SHOULD NOT LOOK UP"); });
    expect(compileMedicalScene({}, { ...c, registry: { ...c.registry, resolve: lookup }, safety: { allowVideo: false, level: "emergency", response: "test", matchedSignalIds: ["test"] } }).ok).toBe(false);
    expect(lookup).not.toHaveBeenCalled();
    expect(compileMedicalScene(candidate(), { ...c, evidence: [], getModule: lookup }).ok).toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });
  it("current myocardium mechanism fails before producing DSL", () => {
    const m = MEDICAL_MECHANISMS.definitions[0];
    const result = compileMedicalScene(candidate(m), { ...context(m), registry: MEDICAL_MECHANISMS, catalog: WHOLE_BODY_ANATOMY, getModule: getOrganModule });
    expect(result).toMatchObject({ ok: false, errorCode: "ANATOMY_STRUCTURE_NOT_FOUND" });
    expect(result).not.toHaveProperty("compiled");
  });
  it("existing heart authorization includes DSL; preview has no readiness authority", () => {
    const { organ, primaryFocus, structures, requirements } = getMechanismAnatomy("leftVentricularPressureLoad");
    const plan = { planVersion: "1", organ, topic: "patient prose", safety: { level: "none" }, mechanism: { id: "leftVentricularPressureLoad", evidence: "possible" }, anatomy: { primaryFocus, structures, requirements }, documentedFindings: [], scenes: [{ type: "mechanismExplanation" }, { type: "limitationsAndNextSteps" }] };
    const prepared = prepareExplanationAuthorization({ clinical: { message: "I feel tired.", language: "en" }, plan, sceneIndex: 0 }, { clinicalContextId: "test", assetVersion: HEART_ORGAN_MODULE.assetVersion, outputPath: "test.mp4", mode: "development" });
    if (!("ok" in prepared)) throw Error(prepared.message);
    expect(readExplanationAuthorization(prepared.authorization)!.request.medicalScene?.scene.organIds).toEqual(["heart"]);
    const preview = compileExplanationScene(plan, { sceneIndex: 0, assetVersion: HEART_ORGAN_MODULE.assetVersion });
    expect(preview.ok && preview.request.medicalScene).toBeUndefined();
  });
});

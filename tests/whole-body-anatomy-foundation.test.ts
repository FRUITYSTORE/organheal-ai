import { describe, expect, it } from "vitest";
import { anatomyAssessmentIssues, anatomyLifecycle, anatomyRenderIdentity, createWholeBodyAnatomyCatalog } from "../lib/medical-motion/anatomy-foundation";
import { WHOLE_BODY_ANATOMY } from "../lib/medical-motion/whole-body-anatomy";
import { ANATOMY_SOURCES, ANATOMY_LICENSES } from "../lib/medical-motion/anatomy-sources";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { getOrganModule } from "../lib/medical-motion/organ-modules";
import { checkAssetReadiness } from "../lib/symptom-explanation/asset-readiness";
import { computeRenderSignature } from "../lib/medical-motion/render-signature";
import { buildHeartScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";
import type { AnatomyRegistryEntry, OrganModule } from "../lib/medical-motion/contracts/organ-module";
import type { WholeBodyAnatomyCatalog } from "../lib/medical-motion/contracts/anatomy-foundation";
import { withTestAnatomyReview } from "./helpers/anatomy-review-fixture";

// Hypothetical contracts only. No medical geometry is created by these fixtures.
function fixture(organ = "heart", id: `${string}.${string}` = "heart.leftVentricle"): OrganModule {
  const entry: AnatomyRegistryEntry = { id, kind: "organ", representation: "organ-volume", availability: "present",
    blenderObject: "TEST_ONLY_OBJECT", fidelity: "reference-derived", verification: "verified",
    coverage: { verifiedRegions: ["whole"], unknownRegions: [], excludedRegions: [], evidenceRefs: ["TEST_ONLY_REVIEW"] } };
  return withTestAnatomyReview({ ...HEART_ORGAN_MODULE, id: organ, assetStatus: "production", anatomicallyValidated: true, anatomyRegistry: [entry] });
}
const cloneCatalog = () => structuredClone(WHOLE_BODY_ANATOMY) as WholeBodyAnatomyCatalog;
const ready = (module: OrganModule) => checkAssetReadiness(module.id, module.anatomyRegistry.map(entry => entry.id), "production", () => module);

describe("whole-body foundation: contracts are generic; fixtures do not establish availability", () => {
  it.each([
    ["heart", "heart.leftVentricle"], ["lungs", "lungs.upperLobeLeft"], ["kidneys", "kidneys.left"],
    ["liver", "liver.whole"], ["brain", "brain.whole"],
  ] as const)("accepts explicitly reviewed TEST metadata for %s", (organ, id) => {
    expect(ready(fixture(organ, id))).toEqual({ ok: true, blenderObjects: ["TEST_ONLY_OBJECT"] });
    if (organ !== "heart") expect(getOrganModule(organ)).toBeNull();
  });
  it("registers a future organ/system without editing closed type unions or creating a module", () => {
    const catalog = cloneCatalog();
    const extended = createWholeBodyAnatomyCatalog({ ...catalog,
      bodySystems: [...catalog.bodySystems, { id: "sensory", canonicalName: "Sensory system" }],
      organs: [...catalog.organs, { id: "eye", canonicalName: "Eye", bodySystemIds: ["sensory"] }],
      structures: [...catalog.structures, { id: "eye.retina", organId: "eye", canonicalName: "Retina", evidenceRefs: ["TEST_ONLY_TAXONOMY"] }],
    });
    expect(extended.organs.at(-1)?.id).toBe("eye");
    const module = fixture("eye", "eye.retina");
    expect(checkAssetReadiness("eye", ["eye.retina"], "production", () => module, {}, extended).ok).toBe(true);
    expect(getOrganModule("eye")).toBeNull();
  });
  it.each(["constructor", "__proto__", "toString"])("does not mistake inherited %s for an organ module", id => {
    expect(getOrganModule(id)).toBeNull();
  });
  it("freezes a detached catalog without freezing caller-owned inputs", () => {
    const input = cloneCatalog(); const result = createWholeBodyAnatomyCatalog(input);
    expect(Object.isFrozen(result.structures[0])).toBe(true);
    expect(Object.isFrozen(input.structures[0])).toBe(false);
  });
  it.each(["bodySystems", "organs", "structures", "sources", "licenses"] as const)("rejects duplicate %s", key => {
    const catalog = cloneCatalog();
    const invalid = { ...catalog, [key]: [...catalog[key], catalog[key][0]] };
    expect(() => createWholeBodyAnatomyCatalog(invalid)).toThrow("INVALID_ANATOMY_REGISTRY");
  });
  it("rejects dangling system, organ and source-license relationships", () => {
    const c = cloneCatalog();
    expect(() => createWholeBodyAnatomyCatalog({ ...c, organs: [{ ...c.organs[0], bodySystemIds: ["absent"] }] })).toThrow();
    expect(() => createWholeBodyAnatomyCatalog({ ...c, structures: [{ ...c.structures[0], organId: "absent" }] })).toThrow();
    expect(() => createWholeBodyAnatomyCatalog({ ...c, sources: [{ ...c.sources[0], licenseId: "absent" }] })).toThrow();
  });
});

describe("independent provenance, engineering, anatomical and clinical gates", () => {
  it.each(["geometryStatus", "semanticStatus", "clinicalApprovalStatus"] as const)("does not render an explicitly rejected %s even internally", axis => {
    const module = fixture(); module.anatomyRegistry[0].assessment![axis] = "rejected";
    expect(checkAssetReadiness("heart", ["heart.leftVentricle"], "development", () => module).ok).toBe(false);
  });
  it.each([
    ["missing provenance", (e: AnatomyRegistryEntry) => { delete e.provenance; }],
    ["unknown source", (e: AnatomyRegistryEntry) => { e.provenance!.sourceId = "absent"; }],
    ["wrong source version", (e: AnatomyRegistryEntry) => { e.provenance!.sourceVersion = "absent"; }],
    ["inconsistent license", (e: AnatomyRegistryEntry) => { e.provenance!.licenseId = "CC-BY-4.0"; }],
    ["uncleared derivative license", (e: AnatomyRegistryEntry) => { e.provenance!.licenseReview.status = "unresolved"; }],
    ["unverified geometry", (e: AnatomyRegistryEntry) => { e.assessment!.geometryStatus = "imported"; }],
    ["absent geometry evidence", (e: AnatomyRegistryEntry) => { e.assessment!.geometryEvidenceRefs = []; }],
    ["unverified semantics", (e: AnatomyRegistryEntry) => { e.assessment!.semanticStatus = "unverified"; }],
    ["absent semantic evidence", (e: AnatomyRegistryEntry) => { e.assessment!.semanticEvidenceRefs = []; }],
    ["clinical approval absent", (e: AnatomyRegistryEntry) => { e.assessment!.clinicalApprovalStatus = "unreviewed"; }],
    ["clinical evidence absent", (e: AnatomyRegistryEntry) => { e.assessment!.clinicalEvidenceRefs = []; }],
    ["Blender compatibility absent", (e: AnatomyRegistryEntry) => { e.assessment!.renderCompatibility = "unvalidated"; }],
  ] as const)("rejects %s despite a mesh and legacy verified flags", (_, change) => {
    const module = fixture(); change(module.anatomyRegistry[0]); expect(ready(module).ok).toBe(false);
  });
  it("requires independent anatomy version and registered structure/organ", () => {
    const module = fixture(); delete module.anatomyVersion; expect(ready(module).ok).toBe(false);
    expect(ready(fixture("heart", "heart.unsupported")).ok).toBe(false);
    expect(checkAssetReadiness("brain", ["heart.leftVentricle"], "production", () => fixture()).ok).toBe(false);
  });
  it.each(["unresolved", "noncommercial", "requires-license"] as const)("does not clear %s terms using per-asset approval", commercialCompatibility => {
    const module = fixture(), catalog = cloneCatalog();
    const altered = { ...catalog, licenses: catalog.licenses.map(l => l.id === "Apache-2.0" ? { ...l, commercialCompatibility } : l) };
    expect(checkAssetReadiness(module.id, [module.anatomyRegistry[0].id], "production", () => module, {}, altered).ok).toBe(false);
  });
  it("cannot bypass patient approval by requesting no dependencies", () => {
    const module = fixture();
    expect(checkAssetReadiness("heart", [], "production", () => module).ok).toBe(false);
    delete module.anatomyVersion;
    expect(checkAssetReadiness("heart", [], "production", () => module).ok).toBe(false);
  });
  it("requires clinical approval independently when requested in internal review", () => {
    const module = fixture(); module.anatomyRegistry[0].assessment!.clinicalApprovalStatus = "unreviewed";
    expect(checkAssetReadiness("heart", ["heart.leftVentricle"], "development", () => module, { "heart.leftVentricle": { requireVerified: true } }).ok).toBe(true);
    expect(checkAssetReadiness("heart", ["heart.leftVentricle"], "development", () => module, { "heart.leftVentricle": { requireClinicalApproval: true } }).ok).toBe(false);
  });
  it("never substitutes a cavity for a required wall", () => {
    const module = fixture(); module.anatomyRegistry[0].representation = "cavity";
    expect(checkAssetReadiness("heart", [], "development", () => module, { "heart.leftVentricle": { representations: ["wall"] } }).ok).toBe(false);
    expect(checkAssetReadiness("heart", [], "development", () => module, { "heart.leftVentricle": { representations: ["cavity"] } })).toEqual({ ok: true, blenderObjects: [] });
  });
  it("validates unhighlighted dependencies without adding them to returned highlights", () => {
    const module = fixture();
    expect(checkAssetReadiness("heart", [], "production", () => module, { "heart.leftVentricle": {} })).toEqual({ ok: true, blenderObjects: [] });
    module.anatomyRegistry[0].assessment!.semanticStatus = "unverified";
    expect(checkAssetReadiness("heart", [], "production", () => module, { "heart.leftVentricle": {} }).ok).toBe(false);
    expect(checkAssetReadiness("heart", [], "development", () => module, { "heart.myocardium": {} }).ok).toBe(false);
  });
  it("does not turn current imported chambers, primitive valves or missing myocardium into patient assets", () => {
    expect(HEART_ORGAN_MODULE.anatomicallyValidated).toBe(false);
    expect(HEART_ORGAN_MODULE.anatomyRegistry).toHaveLength(22);
    expect(HEART_ORGAN_MODULE.anatomyRegistry.filter(e => e.availability !== "missing")).toHaveLength(13);
    for (const e of HEART_ORGAN_MODULE.anatomyRegistry) {
      expect(e.verification).not.toBe("verified");
      expect(checkAssetReadiness("heart", [e.id], "production").ok).toBe(false);
    }
    expect(checkAssetReadiness("heart", [], "development", undefined, { "heart.myocardium": { requireVerified: true, representations: ["tissue"] } }).ok).toBe(false);
  });
  it("high-resolution label discovery has no review or imported module side effect", () => {
    expect(ANATOMY_SOURCES.find(s => s.id === "totalsegmentator-v2-heartchambers")?.limitations.join(" ")).toContain("unresolved");
    expect(ANATOMY_LICENSES.find(l => l.id === "totalsegmentator-commercial-unresolved")?.reviewStatus).toBe("unresolved");
    expect(HEART_ORGAN_MODULE.anatomyRegistry.some(e => e.provenance?.sourceId === "totalsegmentator-v2-heartchambers")).toBe(false);
  });
  it("reports every derived lifecycle without performing an approval transition", () => {
    const module = fixture(), e = module.anatomyRegistry[0];
    expect(anatomyLifecycle(e)).toBe("clinically-approved");
    e.assessment!.clinicalEvidenceRefs = []; expect(anatomyLifecycle(e)).toBe("anatomically-verified");
    e.verification = "unverified"; expect(anatomyLifecycle(e)).toBe("geometry-verified");
    e.assessment!.geometryStatus = "imported"; expect(anatomyLifecycle(e)).toBe("imported");
    e.assessment!.semanticStatus = "unverified"; expect(anatomyLifecycle(e)).toBe("semantically-unverified");
    e.assessment!.geometryStatus = "not-imported"; expect(anatomyLifecycle(e)).toBe("discovered");
    expect(anatomyLifecycle({ ...e, availability: "missing", blenderObject: null, fidelity: null })).toBe("missing");
    e.assessment!.clinicalApprovalStatus = "rejected"; expect(anatomyLifecycle(e)).toBe("rejected");
    expect(anatomyAssessmentIssues(e, module, WHOLE_BODY_ANATOMY, true, true).length).toBeGreaterThan(0);
  });
});

describe("versioned anatomy identity without implementing a cache", () => {
  it.each(["anatomy", "source", "asset"])("changes render identity for independent %s revision", axis => {
    const scene = buildHeartScene({ coronaryArteries: false, leftVentricleAndAorta: false });
    const altered = structuredClone(scene);
    if (axis === "anatomy") altered.anatomyIdentity!.anatomyVersion += "-changed";
    if (axis === "source") altered.anatomyIdentity!.sources[0].sourceVersion += "-changed";
    expect(computeRenderSignature(altered, axis === "asset" ? "asset2" : "asset1")).not.toBe(computeRenderSignature(scene, "asset1"));
  });
  it("sorts provenance independently from caller property and registry order", () => {
    const module = structuredClone(HEART_ORGAN_MODULE);
    module.anatomyRegistry = [...module.anatomyRegistry].reverse();
    expect(anatomyRenderIdentity(module)).toEqual(anatomyRenderIdentity(HEART_ORGAN_MODULE));
    const scene = buildHeartScene({ coronaryArteries: false, leftVentricleAndAorta: false }), copy = structuredClone(scene);
    copy.anatomyIdentity!.sources = [...copy.anatomyIdentity!.sources].reverse();
    expect(computeRenderSignature(copy, "asset1")).toBe(computeRenderSignature(scene, "asset1"));
  });
});

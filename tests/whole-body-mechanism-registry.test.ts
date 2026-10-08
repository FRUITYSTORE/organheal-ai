import { describe, expect, it } from "vitest";
import { MEDICAL_MECHANISMS } from "../lib/medical-motion/mechanism-definitions";
import { createMechanismRegistry, evaluateMechanismCandidate, checkVisualizationOperation, patientMechanismApproved } from "../lib/medical-motion/mechanism-registry";
import { checkMechanismAnatomy as registeredAnatomyReadiness } from "../lib/medical-motion/mechanism-readiness";
import { WHOLE_BODY_ANATOMY } from "../lib/medical-motion/whole-body-anatomy";
import { CROSS_BODY_FIXTURES, MECHANISM_TEST_CATALOG } from "./helpers/whole-body-mechanism-fixtures";
import { withTestAnatomyReview } from "./helpers/anatomy-review-fixture";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import type { MedicalMechanism, MechanismEvaluationContext, MechanismEvidence } from "../lib/medical-motion/contracts/mechanism";
import { computeRenderSignature } from "../lib/medical-motion/render-signature";
import { buildHeartScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";
import { getMechanismAnatomy } from "../lib/symptom-explanation/anatomy-resolver";
import { compileExplanationScene } from "../lib/symptom-explanation/compile-explanation-scene";
import { prepareExplanationAuthorization } from "../lib/symptom-explanation/explanation-authorization";
import type { OrganModule } from "../lib/medical-motion/contracts/organ-module";

const base = () => structuredClone(MEDICAL_MECHANISMS.definitions[1]);
const candidate = (m = base()) => ({ mechanismId: m.mechanismId, mechanismVersion: m.version });
const evidenceFor = (m = base()): MechanismEvidence[] => m.requiredEvidence.map(r => ({ ...r, origin: r.origin ?? "server-intake", assertion: "present", evidenceRef: "TEST-ONLY-SERVER-EVIDENCE" }));
const context = (m = base()): MechanismEvaluationContext => ({ safety: { allowVideo: true, level: "none" }, mode: "development", claim: "possible-mechanism", evidence: evidenceFor(m) });
const registry = (m = base()) => createMechanismRegistry([m], MECHANISM_TEST_CATALOG);
const checkMechanismAnatomy: typeof registeredAnatomyReadiness = (m, ...args) => registeredAnatomyReadiness(registry(m).get(m.mechanismId, m.version)!, ...args);
function reviewedModule(m: MedicalMechanism): OrganModule {
  return withTestAnatomyReview({ ...HEART_ORGAN_MODULE, id: m.affectedOrgans[0], assetStatus: "production", anatomicallyValidated: true,
    anatomyRegistry: Object.entries(m.requiredAnatomy).map(([id, requirement]) => ({ id: id as `${string}.${string}`, kind: "organ",
      availability: "present", blenderObject: "TEST-ONLY-NO-GEOMETRY", fidelity: "reference-derived", verification: "verified",
      representation: requirement!.representations![0], coverage: { verifiedRegions: ["whole"], unknownRegions: [], excludedRegions: [], evidenceRefs: ["TEST-ONLY-COVERAGE"] } })),
  });
}

describe("versioned whole-body mechanism registry", () => {
  it("registers detached immutable definitions, not mutable AI definitions", () => {
    const m = base(), r = registry(m); m.requiredAnatomy["heart.leftVentricle"]!.representations = ["cavity"];
    expect(r.resolve(candidate())?.requiredAnatomy["heart.leftVentricle"]?.representations).toEqual(["surface", "tissue"]);
    expect(Object.isFrozen(r.definitions[0].visualizationProfile)).toBe(true);
    expect(Object.isFrozen(m)).toBe(false);
  });
  it("resolves exact versions and never silently upgrades", () => {
    const one = base(), two = { ...base(), version: "2" }, r = createMechanismRegistry([one, two], WHOLE_BODY_ANATOMY);
    expect(r.get(one.mechanismId, "1")?.version).toBe("1"); expect(r.get(one.mechanismId, "2")?.version).toBe("2");
    expect(r.get(one.mechanismId, "3")).toBeNull(); expect(() => createMechanismRegistry([one, one], WHOLE_BODY_ANATOMY)).toThrow();
  });
  it("adds a future body system/organ through registration without an engine union edit", () => {
    const m = base(); m.mechanismId = "TEST_skin_mechanism"; m.bodySystems = ["integumentary"]; m.affectedOrgans = ["skin"];
    m.requiredAnatomy = { "skin.testRegion": { representations: ["tissue"], requireVerified: true } };
    m.highlightedAnatomy = ["skin.testRegion"]; m.visualizationProfile.primaryStructure = "skin.testRegion"; m.visualizationProfile.secondaryStructures = [];
    const catalog = { ...WHOLE_BODY_ANATOMY, bodySystems: [...WHOLE_BODY_ANATOMY.bodySystems, { id: "integumentary", canonicalName: "TEST ONLY" }],
      organs: [...WHOLE_BODY_ANATOMY.organs, { id: "skin", canonicalName: "TEST ONLY", bodySystemIds: ["integumentary"] }],
      structures: [...WHOLE_BODY_ANATOMY.structures, { id: "skin.testRegion" as const, organId: "skin", canonicalName: "TEST ONLY", evidenceRefs: ["TEST ONLY"] }] };
    expect(createMechanismRegistry([m], catalog).resolve(candidate(m))?.bodySystems).toEqual(["integumentary"]);
  });
  it("does not embed patient values in patient-independent profile definitions", () => {
    expect(() => registry({ ...base(), patientName: "TEST" } as MedicalMechanism)).toThrow();
    const m = base(); Object.assign(m.visualizationProfile, { patientLabValue: 100 });
    expect(() => registry(m)).toThrow();
  });
  it.each(["constructor", "__proto__", "invented-diagnosis"])("does not resolve AI-invented %s", id => {
    expect(MEDICAL_MECHANISMS.resolve({ mechanismId: id, mechanismVersion: "1" })).toBeNull();
  });
  it.each(["requiredAnatomy", "confidence", "allowedVisualizations", "patientFacingStatus", "diagnosis"])("rejects candidate override %s", key => {
    expect(registry().resolve({ ...candidate(), [key]: "AI override" })).toBeNull();
  });
  it.each(["kind", "anatomy", "system", "safety", "version", "approval", "pathology", "reviewless-effect"])("rejects invalid definition %s", kind => {
    const m = base();
    if (kind === "kind") m.kind = "diagnosis" as MedicalMechanism["kind"];
    if (kind === "anatomy") m.requiredAnatomy = { "heart.unknown": { representations: ["tissue"] } };
    if (kind === "system") m.bodySystems = ["unregistered"];
    if (kind === "safety") m.safetyRequirements.noDiagnosisInference = false as true;
    if (kind === "version") m.version = "";
    if (kind === "approval") m.patientFacingStatus = "patient-approved";
    if (kind === "pathology") m.allowedVisualizations = ["invent-plaque" as "highlight"];
    if (kind === "reviewless-effect") m.allowedVisualizations = ["narrow-lumen"];
    expect(() => registry(m)).toThrow();
  });
  it.each(CROSS_BODY_FIXTURES.map(m => [m.mechanismId, m] as const))("supports %s as a non-approved TEST fixture", (_, m) => {
    const r = registry(m); expect(evaluateMechanismCandidate(r, candidate(m), context(m)).status).toBe("eligible");
    expect(patientMechanismApproved(m)).toBe(false);
    expect(evaluateMechanismCandidate(r, candidate(m), { ...context(m), mode: "production" }).status).toBe("needs-clinical-review");
    expect(checkMechanismAnatomy(m, "development", [], undefined, MECHANISM_TEST_CATALOG).ok).toBe(false);
    expect(checkMechanismAnatomy(m, "development", [], () => reviewedModule(m), MECHANISM_TEST_CATALOG).ok).toBe(true);
    expect(checkMechanismAnatomy(m, "production", [], () => reviewedModule(m), MECHANISM_TEST_CATALOG).ok).toBe(false);
  });
});

describe("deterministic evidence, claims, safety and visualization", () => {
  it("copies and rewritten definitions cannot authorize anatomy or visual effects", () => {
    const resolved = registry().get(base().mechanismId, "1")!;
    expect(checkVisualizationOperation(resolved, "highlight", [])).toBe(true);
    expect(checkVisualizationOperation(structuredClone(resolved), "highlight", [])).toBe(false);
    expect(registeredAnatomyReadiness(structuredClone(resolved), "development").ok).toBe(false);
  });
  it.each(["insufficient-evidence", "needs-clinical-review"] as const)("preserves missing-evidence policy %s", behavior => {
    const m = { ...base(), missingEvidenceBehavior: behavior };
    expect(evaluateMechanismCandidate(registry(m), candidate(m), { ...context(m), evidence: [] }).status).toBe(behavior);
  });
  it.each(["absent", "unknown"] as const)("does not count %s evidence as positive", assertion => {
    expect(evaluateMechanismCandidate(registry(), candidate(), { ...context(), evidence: evidenceFor().map(e => ({ ...e, assertion })) }).status).toBe("insufficient-evidence");
  });
  it("supporting evidence cannot replace required evidence", () => {
    const m = base(); m.supportingEvidence = [{ kind: "lab", code: "supporting" }];
    expect(evaluateMechanismCandidate(registry(m), candidate(m), { ...context(m), evidence: [{ kind: "lab", code: "supporting", origin: "verified-record", assertion: "present", evidenceRef: "TEST" }] }).status).toBe("insufficient-evidence");
    const full = [...evidenceFor(m), { kind: "lab" as const, code: "supporting", origin: "verified-record" as const, assertion: "present" as const, evidenceRef: "TEST-SUPPORT" }];
    expect(evaluateMechanismCandidate(registry(m), candidate(m), { ...context(m), evidence: full }).supportingEvidenceRefs).toEqual(["TEST-SUPPORT"]);
  });
  it("conflicting positive/negative normalized facts require clinical review", () => {
    const facts = evidenceFor(), opposite = { ...facts[0], assertion: "absent" as const, evidenceRef: "TEST-CONFLICT" };
    expect(evaluateMechanismCandidate(registry(), candidate(), { ...context(), evidence: [...facts, opposite] }).status).toBe("needs-clinical-review");
  });
  it("safety requirements must be literal true values", () => {
    const m = base(); m.safetyRequirements.requireSafetyGate = "true" as unknown as true;
    expect(() => registry(m)).toThrow();
  });
  it.each(["contradiction", "contraindication"])("blocks %s before missing evidence", kind => {
    const m = base(), rule = { kind: "verified-report-finding" as const, code: "blocking", origin: "verified-record" as const };
    if (kind === "contradiction") m.contradictoryEvidence = [rule]; else m.contraindications = [{ evidence: rule, reason: "TEST-only contraindication" }];
    expect(evaluateMechanismCandidate(registry(m), candidate(m), { ...context(m), evidence: [{ ...rule, assertion: "present", evidenceRef: "TEST" }] }).status).toBe("blocked");
  });
  it("Safety Gate precedes candidate resolution", () => {
    const throwingRegistry = { ...registry(), resolve: () => { throw Error("LOOKUP MUST NOT RUN"); } };
    expect(evaluateMechanismCandidate(throwingRegistry, {}, { ...context(), safety: { allowVideo: false, level: "emergency", response: "test", matchedSignalIds: ["test"] } }).status).toBe("blocked");
  });
  it.each(["engineeringStatus", "medicalReviewStatus", "patientFacingStatus"] as const)("blocks rejected %s", key => {
    const m = base(); m[key] = "rejected";
    expect(evaluateMechanismCandidate(registry(m), candidate(m), context(m)).status).toBe("blocked");
    expect(checkVisualizationOperation(m, "highlight", [])).toBe(false);
  });
  it("does not accept AI-origin evidence or a diagnosis claim", () => {
    const c = context(); c.evidence = evidenceFor().map(e => ({ ...e, origin: "ai" as "server-intake" }));
    expect(evaluateMechanismCandidate(registry(), candidate(), c).status).toBe("blocked");
    expect(evaluateMechanismCandidate(registry(), candidate(), { ...context(), claim: "diagnosis" as "possible-mechanism" }).status).toBe("blocked");
  });
  it("documented mechanism needs server-verified mechanism-specific evidence", () => {
    const c = { ...context(), claim: "documented-mechanism" as const };
    expect(evaluateMechanismCandidate(registry(), candidate(), c).status).toBe("insufficient-evidence");
    c.evidence = [...c.evidence, { kind: "verified-report-finding", code: `mechanism-confirmation:${base().mechanismId}`, origin: "verified-record", assertion: "present", evidenceRef: "TEST-ONLY-VERIFIED-RECORD" }];
    expect(evaluateMechanismCandidate(registry(), candidate(), c).status).toBe("eligible");
  });
  it("requires independent medical and patient review evidence", () => {
    const m = base(); expect(patientMechanismApproved(m)).toBe(false);
    m.medicalReviewStatus = "medically-reviewed"; m.medicalReviewEvidenceRefs = ["TEST-ONLY-MEDICAL-REVIEW"];
    expect(patientMechanismApproved(m)).toBe(false); m.patientFacingStatus = "patient-approved"; m.patientApprovalEvidenceRefs = ["TEST-ONLY-APPROVAL"];
    expect(evaluateMechanismCandidate(registry(m), candidate(m), { ...context(m), mode: "production" }).status).toBe("eligible");
  });
  it.each(["invent-plaque", "invent-tumor", "invent-clot", "invent-scar", "unsupported-pathology", "unvalidated-deformation", "narrow-lumen"])("forbids %s in current mechanisms", operation => {
    expect(checkVisualizationOperation(base(), operation, evidenceFor())).toBe(false);
  });
  it("advanced effects require reviewed rules, explicit suitable anatomy and evidence", () => {
    const m = base(); m.allowedVisualizations = [...m.allowedVisualizations, "narrow-lumen"];
    m.effectRequirements["narrow-lumen"] = { requiredEvidence: [{ kind: "verified-report-finding", code: "TEST-ONLY-EFFECT", origin: "verified-record" }], reviewEvidenceRefs: ["TEST-ONLY-RULE-REVIEW"] };
    m.requiredAnatomy = Object.fromEntries(Object.entries(m.requiredAnatomy).map(([id, r]) => [id, { ...r, requireVerified: true }]));
    expect(() => registry(m)).toThrow();
    m.requiredAnatomy[m.visualizationProfile.primaryStructure]!.representations = ["lumen"];
    const resolved = registry(m).get(m.mechanismId, m.version)!;
    expect(checkVisualizationOperation(resolved, "narrow-lumen", [])).toBe(false);
    expect(checkVisualizationOperation(resolved, "narrow-lumen", [{ kind: "verified-report-finding", code: "TEST-ONLY-EFFECT", origin: "verified-record", assertion: "present", evidenceRef: "TEST" }])).toBe(true);
  });
  it("keeps clinical severity independent from immutable visual emphasis", () => {
    const m = base(), r = registry(m);
    for (const clinicalSeverity of m.severityModel.clinicalLevels) expect(evaluateMechanismCandidate(r, candidate(m), { ...context(m), clinicalSeverity }).status).toBe("eligible");
    expect(r.resolve(candidate(m))?.visualizationProfile.visualEmphasis).toBe("neutral");
    expect(r.resolve(candidate(m))?.visualizationProfile.patientIndependent).toBe(true);
  });
});

describe("anatomy dependencies and compatible explanation integration", () => {
  it("validates required anatomy even without highlights and never substitutes representation", () => {
    const m = base(), module = reviewedModule(m);
    expect(checkMechanismAnatomy(m, "development", [], () => module).ok).toBe(true);
    module.anatomyRegistry[0].representation = "cavity";
    expect(checkMechanismAnatomy(m, "development", [], () => module).ok).toBe(false);
    module.anatomyRegistry = module.anatomyRegistry.slice(1);
    expect(checkMechanismAnatomy(m, "development", [], () => module).ok).toBe(false);
  });
  it("does not require optional anatomy unless selected; does not turn it into highlights", () => {
    const m = base(); m.optionalAnatomy = ["heart.pulmonaryVeins"]; m.highlightedAnatomy = ["heart.leftVentricle"];
    registry(m); const module = reviewedModule(m);
    expect(checkMechanismAnatomy(m, "development", [], () => module).ok).toBe(true);
    expect(checkMechanismAnatomy(m, "development", ["heart.pulmonaryVeins"], () => module).ok).toBe(false);
    expect(checkMechanismAnatomy(m, "development", ["heart.unknown"], () => module).ok).toBe(false);
    expect(m.highlightedAnatomy).not.toContain("heart.aorta");
  });
  it("preserves current myocardial dependency and internal LV behavior", () => {
    const myocardium = MEDICAL_MECHANISMS.definitions[0];
    expect(myocardium.requiredAnatomy["heart.myocardium"]?.requiredRegions).toEqual(["LV", "RV", "septum", "LA", "RA"]);
    expect(myocardium.highlightedAnatomy).not.toContain("heart.myocardium");
    expect(checkMechanismAnatomy(myocardium, "development").ok).toBe(false);
    expect(checkMechanismAnatomy(base(), "development").ok).toBe(true);
  });
  it("fingerprints mechanism ID/version independently from anatomy/asset", () => {
    const scene = buildHeartScene({ coronaryArteries: false, leftVentricleAndAorta: false });
    scene.mechanismIdentity = candidate();
    expect(computeRenderSignature({ ...scene, mechanismIdentity: { ...candidate(), mechanismVersion: "2" } }, "asset")).not.toBe(computeRenderSignature(scene, "asset"));
    expect(computeRenderSignature({ ...scene, mechanismIdentity: { ...candidate(), mechanismId: "another" } }, "asset")).not.toBe(computeRenderSignature(scene, "asset"));
  });
  it("compiler emits registry identity; stale version and AI confidence cannot override it", () => {
    const anatomy = getMechanismAnatomy("leftVentricularPressureLoad");
    const plan = { planVersion: "1", organ: anatomy.organ, topic: "physiology", safety: { level: "none" }, mechanism: { id: "leftVentricularPressureLoad", evidence: "possible" },
      anatomy, documentedFindings: [], scenes: [{ type: "mechanismExplanation" }, { type: "limitationsAndNextSteps" }] };
    delete (plan.anatomy as Partial<typeof anatomy>).organ; delete (plan.anatomy as Partial<typeof anatomy>).rationale;
    const compiled = compileExplanationScene(plan, { sceneIndex: 0, assetVersion: HEART_ORGAN_MODULE.assetVersion });
    expect(compiled.ok && compiled.request.scene.mechanismIdentity).toEqual(candidate());
    expect(compileExplanationScene({ ...plan, mechanism: { ...plan.mechanism, version: "99" } }, { sceneIndex: 0, assetVersion: "test" }).ok).toBe(false);
    const options = { clinicalContextId: "test", assetVersion: HEART_ORGAN_MODULE.assetVersion, mode: "development" as const, outputPath: "test.mp4" };
    expect(prepareExplanationAuthorization({ clinical: { message: "I feel tired.", language: "en" }, plan: { ...plan, mechanism: { ...plan.mechanism, evidence: "documented" } }, sceneIndex: 0 }, options)).toMatchObject({ status: "failed", errorCode: "CLINICAL_EXPLANATION_FAILED" });
    expect(prepareExplanationAuthorization({ clinical: { message: "I have chest pain.", language: "en" }, plan: {}, sceneIndex: 0 }, options)).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
  });
});

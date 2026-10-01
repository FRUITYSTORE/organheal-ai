import { beforeEach, describe, expect, it, vi } from "vitest";
import { spawn } from "node:child_process";
import { orchestrateExplanationRender } from "../lib/symptom-explanation/orchestrate-explanation-render";
import { getMechanismAnatomy } from "../lib/symptom-explanation/anatomy-resolver";
import type { MechanismId, VideoExplanationPlan } from "../lib/symptom-explanation/contracts";
import type { AnatomyRegistryEntry, OrganModule } from "../lib/medical-motion/contracts/organ-module";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { renderHeartScene } from "../lib/medical-motion/render/blender-renderer";
import * as compiler from "../lib/symptom-explanation/compile-explanation-scene";
import * as validator from "../lib/symptom-explanation/validate-explanation-plan";
import * as gate from "../lib/symptom-explanation/safety-gate";
import * as modules from "../lib/medical-motion/organ-modules";

vi.mock("../lib/medical-motion/render/blender-renderer", () => ({ renderHeartScene: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: vi.fn(() => { throw new Error("Unexpected Blender invocation"); }) }));
const options = { clinicalContextId: "server-request-17", assetVersion: HEART_ORGAN_MODULE.assetVersion,
  mode: "development" as const, outputPath: "test.mp4" };
function plan(mechanism: MechanismId = "leftVentricularPressureLoad"): VideoExplanationPlan {
  const { organ, primaryFocus, structures, requirements } = getMechanismAnatomy(mechanism);
  return { planVersion: "1", organ, topic: "normal physiology", safety: { level: "none" },
    mechanism: { id: mechanism, evidence: "possible" }, anatomy: { primaryFocus, structures, requirements },
    documentedFindings: [], scenes: [{ type: "mechanismExplanation" }, { type: "limitationsAndNextSteps" }] };
}
function input(message = "I have been feeling tired lately.", p = plan()) {
  return { clinical: { message, language: "en" }, plan: p, sceneIndex: 0 };
}
// Reviewed metadata fixtures only, not new geometry or a claim of real asset approval.
function reviewed(): OrganModule {
  return { ...HEART_ORGAN_MODULE, assetStatus: "production", anatomicallyValidated: true,
    anatomyRegistry: HEART_ORGAN_MODULE.anatomyRegistry.map((entry): AnatomyRegistryEntry => {
      if (entry.id === "heart.myocardium") return { ...entry, availability: "present", blenderObject: "TEST_MYOCARDIUM",
        fidelity: "reference-derived", representation: "tissue", verification: "verified",
        coverage: { verifiedRegions: ["LV", "RV", "septum", "LA", "RA"], unknownRegions: [], excludedRegions: [], evidenceRefs: ["test-review"] } };
      if (entry.availability === "missing") return entry;
      return { ...entry, availability: "present", fidelity: "reference-derived", verification: "verified",
        representation: entry.representation === "placeholder" ? "surface" : entry.representation,
        coverage: { verifiedRegions: [entry.id], unknownRegions: [], excludedRegions: [], evidenceRefs: ["test-review"] } };
    }) };
}
function noRendering() { expect(renderHeartScene).not.toHaveBeenCalled(); expect(spawn).not.toHaveBeenCalled(); }
describe("clinical triage to explanation rendering", () => {
  beforeEach(() => {
    vi.restoreAllMocks(); vi.mocked(renderHeartScene).mockReset(); vi.mocked(spawn).mockClear();
    vi.mocked(renderHeartScene).mockResolvedValue({ status: "completed", outputPath: "test.mp4", durationSeconds: 1 });
  });
  it("safe supported flow reaches renderer when all production dependencies are reviewed", async () => {
    vi.spyOn(modules, "getOrganModule").mockReturnValue(reviewed());
    expect(await orchestrateExplanationRender(input(), { ...options, mode: "production" })).toMatchObject({ status: "completed", safety: { allowVideo: true } });
    expect(renderHeartScene).toHaveBeenCalledOnce();
  });
  it.each(["I have chest pain.", "My abdominal pain is getting worse.", "لا أستطيع التنفس"])("blocks escalation before validation or compilation: %s", async (message) => {
    const compile = vi.spyOn(compiler, "compileExplanationScene"); const validate = vi.spyOn(validator, "validateVideoExplanationPlan");
    const lookup = vi.spyOn(modules, "getOrganModule");
    expect(await orchestrateExplanationRender(input(message), options)).toMatchObject({ status: "failed", errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(compile).not.toHaveBeenCalled(); expect(validate).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled(); noRendering();
  });
  it("preconstructed scene cannot bypass triage", async () => {
    const compiled = compiler.compileExplanationScene(plan(), { sceneIndex: 0, assetVersion: options.assetVersion });
    expect(await orchestrateExplanationRender({ ...input("I have chest pain."), scene: compiled }, options)).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" }); noRendering();
  });
  it("prevalidated plan cannot bypass triage", async () => {
    const p = validator.validateVideoExplanationPlan(plan());
    expect(await orchestrateExplanationRender(input("I have chest pain.", p.ok ? p.plan : plan()), options)).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" }); noRendering();
  });
  it("client safe claims cannot bypass real emergency assessment", async () => {
    expect(await orchestrateExplanationRender({ ...input("I have chest pain."), safety: { allowVideo: true, level: "none" }, verifiedAnatomy: true }, options)).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" }); noRendering();
  });
  it.each(["safeToRender", "triagePassed", "validatedPlan", "scene", "verifiedAnatomy"])("rejects unsupported client field %s even with safe input", async (key) => {
    expect(await orchestrateExplanationRender({ ...input(), [key]: true }, options)).toMatchObject({ errorCode: "CLINICAL_EXPLANATION_FAILED" }); noRendering();
  });
  it.each([null, {}, { clinical: { message: "", language: "en" } }, { clinical: { message: "tired", language: "fr" } }])("rejects unsupported clinical input %#", async (value) => {
    expect(await orchestrateExplanationRender(value, options)).toMatchObject({ errorCode: "CLINICAL_EXPLANATION_FAILED" }); noRendering();
  });
  it.each([{ allowVideo: true, level: "urgent" }, { allowVideo: false, level: "none" }, { allowVideo: "yes", level: "none" }])("fails closed on an invalid server safety decision %#", async (decision) => {
    vi.spyOn(gate, "evaluateSafetyGate").mockReturnValue(decision as ReturnType<typeof gate.evaluateSafetyGate>);
    expect(await orchestrateExplanationRender(input(), options)).toMatchObject({ errorCode: "CLINICAL_EXPLANATION_FAILED" }); noRendering();
  });
  it("rejects tampered plan before compiler", async () => {
    const p = plan(); p.anatomy.requirements = {};
    const compile = vi.spyOn(compiler, "compileExplanationScene");
    expect(await orchestrateExplanationRender(input(undefined, p), options)).toMatchObject({ errorCode: "INVALID_SCENE_PLAN" });
    expect(compile).not.toHaveBeenCalled(); noRendering();
  });
  it("rejects unsupported mechanism", async () => {
    const p = { ...plan(), mechanism: { id: "invented", evidence: "possible" } };
    expect(await orchestrateExplanationRender({ ...input(), plan: p }, options)).toMatchObject({ errorCode: "INVALID_SCENE_PLAN" }); noRendering();
  });
  it("safe input does not bypass missing required myocardium", async () => {
    expect(await orchestrateExplanationRender(input(undefined, plan("myocardialOxygenDemandSupply")), options)).toMatchObject({ errorCode: "ANATOMY_STRUCTURE_NOT_FOUND", safety: { allowVideo: true } }); noRendering();
  });
  it.each(["representation", "verification", "coverage", "evidence"])("safe input still rejects invalid anatomy: %s", async (kind) => {
    const module = reviewed();
    module.anatomyRegistry = module.anatomyRegistry.map((entry) => entry.id !== "heart.myocardium" ? entry : {
      ...entry, representation: kind === "representation" ? "cavity" : entry.representation,
      verification: kind === "verification" ? "anatomy-conditional" : entry.verification,
      coverage: { ...entry.coverage, unknownRegions: kind === "coverage" ? ["RV"] : [], evidenceRefs: kind === "evidence" ? [] : entry.coverage.evidenceRefs },
    });
    vi.spyOn(modules, "getOrganModule").mockReturnValue(module);
    expect(await orchestrateExplanationRender(input(undefined, plan("myocardialOxygenDemandSupply")), options)).toMatchObject({ errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" }); noRendering();
  });
  it("anatomy-ready state cannot override clinical block", async () => {
    vi.spyOn(modules, "getOrganModule").mockReturnValue(reviewed());
    expect(await orchestrateExplanationRender(input("I have chest pain.", plan("myocardialOxygenDemandSupply")), { ...options, mode: "production" })).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" }); noRendering();
  });
  it("compiler rejection prevents renderer invocation", async () => {
    expect(await orchestrateExplanationRender({ ...input(), sceneIndex: 99 }, options)).toMatchObject({ errorCode: "INVALID_SCENE_PLAN" }); noRendering();
  });
  it("production readiness still rejects development anatomy", async () => {
    expect(await orchestrateExplanationRender(input(), { ...options, mode: "production" })).toMatchObject({ errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" }); noRendering();
  });
  it("enforces deterministic triage, validation, compiler, readiness ordering", async () => {
    const events: string[] = [];
    const originalGate = gate.evaluateSafetyGate, originalValidate = validator.validateVideoExplanationPlan, originalCompile = compiler.compileExplanationScene, originalModule = modules.getOrganModule;
    vi.spyOn(gate, "evaluateSafetyGate").mockImplementation((...args) => { events.push("triage"); return originalGate(...args); });
    vi.spyOn(validator, "validateVideoExplanationPlan").mockImplementation((...args) => { events.push("validation"); return originalValidate(...args); });
    vi.spyOn(compiler, "compileExplanationScene").mockImplementation((...args) => { events.push("compiler"); return originalCompile(...args); });
    vi.spyOn(modules, "getOrganModule").mockImplementation((...args) => { events.push("readiness"); return originalModule(...args); });
    vi.mocked(renderHeartScene).mockImplementation(async () => { events.push("renderer"); return { status: "completed", outputPath: "test.mp4", durationSeconds: 1 }; });
    await orchestrateExplanationRender(input(), options);
    expect(events.slice(0, 3)).toEqual(["triage", "validation", "compiler"]);
    expect(events.indexOf("readiness")).toBeGreaterThan(events.indexOf("compiler")); expect(events.at(-1)).toBe("renderer");
  });
  it("preserves deterministic context, safety, plan, mechanism and render identity", async () => {
    const first = await orchestrateExplanationRender(input(), options), second = await orchestrateExplanationRender(input(), options);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ clinicalContextId: options.clinicalContextId, safetySignature: expect.any(String),
      orchestrationId: expect.any(String), requestId: expect.any(String), planSignature: expect.any(String), mechanism: plan().mechanism });
  });
  it("does not send raw clinical text or context ids into renderer metadata", async () => {
    const marker = "unique clinical text 3928 fatigue";
    await orchestrateExplanationRender(input(marker), options);
    const metadata = JSON.stringify(vi.mocked(renderHeartScene).mock.calls);
    expect(metadata).not.toContain(marker); expect(metadata).not.toContain(options.clinicalContextId);
  });
  it("keeps existing cause-question policy unchanged", async () => {
    expect(await orchestrateExplanationRender(input("Why am I having chest pain?"), options)).toMatchObject({ status: "completed", safety: { level: "none" } });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeMedicalMotionRequest, EXECUTION_INPUT_LIMITS as limits } from "../lib/medical-motion/execute-medical-motion";
import { getMechanismAnatomy } from "../lib/symptom-explanation/anatomy-resolver";
import type { MechanismId } from "../lib/symptom-explanation/contracts";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import * as blender from "../lib/medical-motion/render/blender-renderer";
import * as validator from "../lib/symptom-explanation/validate-explanation-plan";
import * as gate from "../lib/symptom-explanation/safety-gate";
import * as modules from "../lib/medical-motion/organ-modules";
import { readExplanationAuthorization } from "../lib/symptom-explanation/explanation-authorization";
import { validArtifactName } from "../lib/medical-motion/render/artifact-output";

vi.mock("../lib/medical-motion/render/blender-renderer", async (original) => ({
  ...await original<typeof blender>(), renderHeartScene: vi.fn(),
}));
const options = { clinicalContextId: "opaque-server-context", assetVersion: HEART_ORGAN_MODULE.assetVersion,
  mode: "development" as const, outputPath: "medical-motion.mp4" };
function request(mechanism: MechanismId = "leftVentricularPressureLoad") {
  const { organ, primaryFocus, structures, requirements } = getMechanismAnatomy(mechanism);
  return { schemaVersion: "1", clinical: { message: "I feel tired lately.", language: "en" }, sceneIndex: 0,
    plan: { planVersion: "1", organ, topic: "normal physiology", safety: { level: "none" },
      mechanism: { id: mechanism, evidence: "possible" }, anatomy: { primaryFocus, structures, requirements },
      documentedFindings: [], scenes: [{ type: "mechanismExplanation" }, { type: "limitationsAndNextSteps" }] } };
}
function noRender() { expect(blender.renderHeartScene).not.toHaveBeenCalled(); }
describe("untrusted serializable Medical Motion execution", () => {
  beforeEach(() => {
    vi.mocked(blender.renderHeartScene).mockResolvedValue({ status: "completed", outputPath: "owned/medical-motion.mp4", durationSeconds: 1 });
  });
  it("passes the exact trusted signal separately without snapshotting, serialization or identity changes", async () => {
    const first = await executeMedicalMotionRequest(request(), options);
    const controller = new AbortController();
    const serialize = vi.fn(() => { throw new Error("Signal must not be serialized"); });
    Object.defineProperty(controller.signal, "toJSON", { value: serialize });
    const second = await executeMedicalMotionRequest(request(), options, { signal: controller.signal });
    expect(first).toEqual(second); expect(serialize).not.toHaveBeenCalled();
    const call = vi.mocked(blender.renderHeartScene).mock.calls.at(-1)!;
    expect(call[3]?.signal).toBe(controller.signal);
    const authority = readExplanationAuthorization(call[2].clinicalAuthorization)!;
    expect(authority.options).not.toHaveProperty("signal"); expect(authority.request).not.toHaveProperty("signal");
    expect(call[2]).not.toHaveProperty("signal"); expect(second).not.toHaveProperty("signal");
  });
  it("rejects a late completed renderer result after trusted abort", async () => {
    const controller = new AbortController();
    vi.mocked(blender.renderHeartScene).mockImplementationOnce(async (_scene, _path, _options, control) => {
      expect(control?.signal).toBe(controller.signal); controller.abort();
      return { status: "completed", outputPath: "private-late-artifact", durationSeconds: 1 };
    });
    const result = await executeMedicalMotionRequest(request(), options, { signal: controller.signal });
    expect(result).toMatchObject({ status: "failed", errorCode: "RENDER_CANCELLED" }); expect(result).not.toHaveProperty("outputPath");
    expect(JSON.stringify(result)).not.toContain("private-late-artifact");
  });
  it.each(["signal", "cancelled", "executionControl", "ownership", "attemptToken", "authorization"])("untrusted root %s cannot supply trusted control", async key => {
    const controller = new AbortController();
    expect(await executeMedicalMotionRequest({ ...request(), [key]: { aborted: true } }, options, { signal: controller.signal }))
      .toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" }); expect(controller.signal.aborted).toBe(false); noRender();
  });
  it.each(["signal", "cancelled", "ownership", "authorization"])("untrusted clinical %s remains rejected", async key => {
    const input = request();
    expect(await executeMedicalMotionRequest({ ...input, clinical: { ...input.clinical, [key]: true } }, options))
      .toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" }); noRender();
  });
  it.each(["signal", "cancelled", "executionControl", "ownership", "authorization"])("untrusted plan %s remains rejected by plan validation", async key => {
    const input = request();
    expect(await executeMedicalMotionRequest({ ...input, plan: { ...input.plan, [key]: { aborted: true } } }, options))
      .toMatchObject({ errorCode: "INVALID_SCENE_PLAN" }); noRender();
  });
  it("pre-abort preserves urgency before plan validation", async () => {
    const controller = new AbortController(); controller.abort(); const input = request(); input.clinical.message = "I have chest pain.";
    const validate = vi.spyOn(validator, "validateVideoExplanationPlan");
    expect(await executeMedicalMotionRequest(input, options, { signal: controller.signal })).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(validate).not.toHaveBeenCalled(); noRender();
  });
  it("pre-abort does not hide invalid plans or unavailable myocardium", async () => {
    const controller = new AbortController(); controller.abort(); const bad = request(); bad.plan.anatomy.requirements = {};
    expect(await executeMedicalMotionRequest(bad, options, { signal: controller.signal })).toMatchObject({ errorCode: "INVALID_SCENE_PLAN" });
    expect(await executeMedicalMotionRequest(request("myocardialOxygenDemandSupply"), options, { signal: controller.signal }))
      .toMatchObject({ errorCode: "ANATOMY_STRUCTURE_NOT_FOUND" }); noRender();
  });
  it("round-tripped v1 data reconstructs real runtime authority and renders in development", async () => {
    expect(await executeMedicalMotionRequest(JSON.parse(JSON.stringify(request())), options)).toMatchObject({ status: "completed" });
    const authorization = vi.mocked(blender.renderHeartScene).mock.calls[0][2]?.clinicalAuthorization;
    expect(readExplanationAuthorization(authorization)).not.toBeNull();
    expect(readExplanationAuthorization(JSON.parse(JSON.stringify(authorization)))).toBeNull();
  });
  it.each([null, {}, "{}", { ...request(), schemaVersion: "2" }, { ...request(), sceneIndex: -1 },
    { ...request(), clinical: { message: "", language: "en" } }, { ...request(), clinical: { message: "tired", language: "fr" } }])("rejects malformed/versioned input %#", async (input) => {
    expect(await executeMedicalMotionRequest(input, options)).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" }); noRender();
  });
  it.each(["triagePassed", "safetyApproved", "verifiedAnatomy", "authorization", "capability", "outputRoot",
    "blenderExecutable", "trusted", "mode", "outputPath", "timeoutMs", "assetVersion", "clinicalContextId", "scene"])("rejects extra authority/configuration key %s", async (key) => {
    const triage = vi.spyOn(gate, "evaluateSafetyGate");
    expect(await executeMedicalMotionRequest({ ...request(), [key]: key === "authorization" || key === "capability" ? {} : true }, options))
      .toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" }); expect(triage).not.toHaveBeenCalled(); noRender();
  });
  it.each([undefined, () => true, new Date(), new Map(), new AbortController(), NaN, Infinity, BigInt(1),
    Symbol("authority"), new (class Authority {})(), [, 1]])("rejects non JSON candidate %#", async (plan) => {
    expect(await executeMedicalMotionRequest({ ...request(), plan }, options)).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" }); noRender();
  });
  it("rejects cycles, symbols and accessors without invoking getters", async () => {
    const cycle: Record<string, unknown> = {}; cycle.self = cycle;
    const getter = vi.fn(() => "trusted");
    const accessor = Object.defineProperty({}, "claim", { enumerable: true, get: getter });
    for (const plan of [cycle, accessor, { [Symbol("cap")]: true }]) {
      expect(await executeMedicalMotionRequest({ ...request(), plan }, options)).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" });
    }
    expect(getter).not.toHaveBeenCalled(); noRender();
  });
  it("rejects oversized/deep decoded trees", async () => {
    let deep: unknown = null; for (let i = 0; i < 66; i++) deep = [deep];
    for (const plan of [deep, Array(10001).fill(null)]) expect(await executeMedicalMotionRequest({ ...request(), plan }, options))
      .toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" }); noRender();
  });
  it("revalidates candidate requirements rather than trusting a stored valid marker", async () => {
    const input = request(); input.plan.anatomy.requirements = {};
    const validate = vi.spyOn(validator, "validateVideoExplanationPlan");
    expect(await executeMedicalMotionRequest(input, options)).toMatchObject({ errorCode: "INVALID_SCENE_PLAN" });
    expect(validate).toHaveBeenCalled(); noRender();
  });
  it("runs real urgency evaluation before plan validation or renderer", async () => {
    const input = request(); input.clinical.message = "I have chest pain.";
    const validate = vi.spyOn(validator, "validateVideoExplanationPlan");
    expect(await executeMedicalMotionRequest(input, options)).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(validate).not.toHaveBeenCalled(); noRender();
  });
  it("missing anatomy blocks the render invocation", async () => {
    vi.spyOn(modules, "getOrganModule").mockReturnValue({ ...HEART_ORGAN_MODULE,
      anatomyRegistry: HEART_ORGAN_MODULE.anatomyRegistry.filter((entry) => entry.id !== "heart.leftVentricle") });
    expect(await executeMedicalMotionRequest(request(), options)).toMatchObject({ errorCode: "ANATOMY_STRUCTURE_NOT_FOUND" }); noRender();
  });
  it("current unavailable myocardium remains blocked", async () => {
    expect(await executeMedicalMotionRequest(request("myocardialOxygenDemandSupply"), options)).toMatchObject({ errorCode: "ANATOMY_STRUCTURE_NOT_FOUND" }); noRender();
  });
  it("server production policy cannot be downgraded by a payload", async () => {
    expect(await executeMedicalMotionRequest(request(), { ...options, mode: "production" })).toMatchObject({ errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" }); noRender();
  });
  it("clinical text/context are absent from actual Blender config conversion and filename", async () => {
    const input = request(); input.clinical.message = "unique clinical marker 927 fatigue";
    await executeMedicalMotionRequest(input, options);
    const [scene, filename] = vi.mocked(blender.renderHeartScene).mock.calls[0];
    const shot = blender.resolveCameraShot(HEART_ORGAN_MODULE, scene.camera.preset)!;
    const config = JSON.stringify(blender.toBlenderSceneConfig(scene, [], shot));
    expect(config).not.toContain(input.clinical.message); expect(config).not.toContain(options.clinicalContextId);
    expect(filename).toBe(options.outputPath); expect(filename).not.toContain(input.clinical.message);
  });
  it.each(["../escape.mp4", "C:\\escape.mp4", "/escape.mp4"])("serialized output names cannot cross boundary: %s", async (outputPath) => {
    expect(await executeMedicalMotionRequest({ ...request(), outputPath }, options)).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" });
    expect(validArtifactName(outputPath, "video")).toBe(false); noRender();
  });
  it("equivalent round trips preserve existing deterministic identities", async () => {
    const first = await executeMedicalMotionRequest(request(), options);
    const second = await executeMedicalMotionRequest(JSON.parse(JSON.stringify(request())), options);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ requestId: expect.any(String), planSignature: expect.any(String), orchestrationId: expect.any(String) });
  });
  it("preserves renderer failures without inventing durable job state", async () => {
    vi.mocked(blender.renderHeartScene).mockResolvedValue({ status: "failed", errorCode: "BLENDER_FAILED", message: "Process failed." });
    expect(await executeMedicalMotionRequest(request(), options)).toMatchObject({ status: "failed", errorCode: "BLENDER_FAILED" });
  });
  it.each(["clinical", "plan"])("rejects multi-megabyte %s strings before triage", async (where) => {
    const input = request(); const huge = "x".repeat(2_000_000);
    if (where === "clinical") input.clinical.message = huge; else input.plan.topic = huge;
    const triage = vi.spyOn(gate, "evaluateSafetyGate");
    expect(await executeMedicalMotionRequest(input, options)).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" });
    expect(triage).not.toHaveBeenCalled(); noRender();
  });
  it("enforces individual string boundary without truncation", async () => {
    const input = request(); input.clinical.message = "x".repeat(limits.stringLength);
    expect(await executeMedicalMotionRequest(input, options)).toMatchObject({ status: "completed" });
    input.clinical.message += "x";
    expect(await executeMedicalMotionRequest(input, options)).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" });
  });
  it("rejects aggregate string values within the individual bound", async () => {
    const plan = Array(5).fill("x".repeat(limits.stringLength));
    expect(await executeMedicalMotionRequest({ ...request(), plan }, options)).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" }); noRender();
  });
  it("counts property names in the aggregate text budget", async () => {
    const plan = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [String(i).padEnd(1000, "x"), null]));
    expect(await executeMedicalMotionRequest({ ...request(), plan }, options)).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" }); noRender();
  });
  it("rejects oversized property names", async () => {
    expect(await executeMedicalMotionRequest({ ...request(), plan: { ["x".repeat(limits.keyLength + 1)]: null } }, options))
      .toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" }); noRender();
  });
  it("rejects wide objects before describing every property", async () => {
    const plan = Object.fromEntries(Array.from({ length: limits.width + 1 }, (_, i) => [String(i), null]));
    const descriptors = vi.spyOn(Object, "getOwnPropertyDescriptors");
    const result = await executeMedicalMotionRequest({ ...request(), plan }, options);
    const calls = descriptors.mock.calls.length; descriptors.mockRestore();
    expect(result).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" });
    expect(calls).toBe(0); noRender();
  });
  it("rejects wide arrays before examining their elements", async () => {
    const getter = vi.fn(); const plan = Array(limits.width + 1).fill(null);
    Object.defineProperty(plan, "0", { get: getter, enumerable: true });
    expect(await executeMedicalMotionRequest({ ...request(), plan }, options)).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" });
    expect(getter).not.toHaveBeenCalled(); noRender();
  });
  it("enforces node count independently of depth, width and strings", async () => {
    const plan = Array.from({ length: 20 }, () => Array(600).fill(null));
    expect(await executeMedicalMotionRequest({ ...request(), plan }, options)).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" }); noRender();
  });
  it.each(["en", "ar"] as const)("accepts realistic %s text without modifying it", async (language) => {
    const input = request(); const clinical = { language, message: language === "ar"
      ? "أشعر بالتعب بعد يوم عمل طويل وأريد فهم وظائف الجسم بشكل تعليمي."
      : "I feel tired after a long working day and want to understand normal physiology." };
    const triage = vi.spyOn(gate, "evaluateSafetyGate");
    expect(await executeMedicalMotionRequest({ ...input, clinical }, options)).toMatchObject({ status: "completed" });
    expect(triage).toHaveBeenCalledWith(clinical.message, language);
  });
  it.each(["anatomy", "unknownKey", "topicScene", "clinicalCopy", "region"])("does not reflect untrusted %s text", async (where) => {
    const input = request(); const marker = "private synthetic marker 682 fatigue";
    let value: unknown = input;
    if (where === "anatomy") input.plan.anatomy.structures.push(marker as typeof input.plan.anatomy.structures[number]);
    if (where === "unknownKey") value = { ...input, plan: { ...input.plan, [marker]: true } };
    if (where === "topicScene") value = { ...input, plan: { ...input.plan, topic: marker, scenes: [{ type: marker }] } };
    if (where === "clinicalCopy") { input.clinical.message = marker; input.plan.anatomy.structures.push(marker as typeof input.plan.anatomy.structures[number]); }
    if (where === "region") input.plan.anatomy.requirements["heart.leftVentricle"] = {
      ...input.plan.anatomy.requirements["heart.leftVentricle"], requiredRegions: [marker] };
    const result = await executeMedicalMotionRequest(value, options);
    expect(result.status).toBe("failed"); expect(JSON.stringify(result)).not.toContain(marker);
    expect(result).toMatchObject({ errorCode: where === "region" ? "REAL_ANATOMICAL_ASSET_REQUIRED" : "INVALID_SCENE_PLAN" }); noRender();
  });
  it.each(["I have chest pain.", "My abdominal pain is getting worse.", "لا أستطيع التنفس"])("preserves trusted urgency guidance: %s", async (message) => {
    const input = request(); input.clinical.message = message;
    const trusted = gate.evaluateSafetyGate(message, "en");
    expect(await executeMedicalMotionRequest(input, options)).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST", message: !trusted.allowVideo ? trusted.response : null }); noRender();
  });
  it.each(['{"toString":"not callable"}', '{"toString":null,"valueOf":false}',
    '{"nested":{"toString":{}}}'])("malformed nested anatomy resolves explicitly %#", async (json) => {
    const structure: unknown = JSON.parse(json);
    const input = request();
    const value = { ...input, plan: { ...input.plan, anatomy: { ...input.plan.anatomy, structures: [...input.plan.anatomy.structures, structure] } } };
    await expect(executeMedicalMotionRequest(value, options)).resolves.toMatchObject({ errorCode: "INVALID_SCENE_PLAN" }); noRender();
  });
  it("narrow validator fix also returns diagnostics to local callers", () => {
    const input = request();
    expect(validator.validateVideoExplanationPlan({ ...input.plan, anatomy: { ...input.plan.anatomy, structures: [{ toString: "not callable" }] } }))
      .toMatchObject({ ok: false, errorCode: "INVALID_SCENE_PLAN" });
  });
  it("unexpected internal validator defects remain distinct and PHI-free", async () => {
    vi.spyOn(validator, "validateVideoExplanationPlan").mockImplementation(() => { throw new Error("private defect marker"); });
    await expect(executeMedicalMotionRequest(request(), options)).resolves.toEqual({ status: "failed", errorCode: "INTERNAL_EXECUTION_FAILED",
      message: "Medical Motion execution encountered an unexpected internal failure." }); noRender();
  });
  it.each(["BLENDER_FAILED", "RENDER_TIMEOUT", "OUTPUT_VALIDATION_FAILED"] as const)("preserves %s identity while removing arbitrary process diagnostics", async (errorCode) => {
    vi.mocked(blender.renderHeartScene).mockResolvedValue({ status: "failed", errorCode, message: "private process marker" });
    const result = await executeMedicalMotionRequest(request(), options);
    expect(result).toMatchObject({ status: "failed", errorCode }); expect(JSON.stringify(result)).not.toContain("private process marker");
  });
  it("contains unexpected renderer rejection without misclassifying it as malformed input", async () => {
    vi.mocked(blender.renderHeartScene).mockRejectedValue(new Error("private renderer exception"));
    await expect(executeMedicalMotionRequest(request(), options)).resolves.toMatchObject({ errorCode: "INTERNAL_EXECUTION_FAILED" });
  });
  it.each(["clinical", "plan"])("nested forged trust stays rejected in %s", async (where) => {
    const input = request();
    const value = where === "clinical" ? { ...input, clinical: { ...input.clinical, trusted: true } }
      : { ...input, plan: { ...input.plan, authorization: {} } };
    expect(await executeMedicalMotionRequest(value, options)).toMatchObject({ errorCode: where === "clinical" ? "INVALID_EXECUTION_REQUEST" : "INVALID_SCENE_PLAN" }); noRender();
  });
});

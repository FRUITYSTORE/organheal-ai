import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authorizationSurface from "../lib/symptom-explanation/explanation-authorization";
import { prepareExplanationAuthorization, readExplanationAuthorization } from "../lib/symptom-explanation/explanation-authorization";
import { renderExplanationRequest } from "../lib/medical-motion/render/explanation-renderer";
import { renderHeartScene } from "../lib/medical-motion/render/blender-renderer";
import { compileExplanationScene } from "../lib/symptom-explanation/compile-explanation-scene";
import { getMechanismAnatomy } from "../lib/symptom-explanation/anatomy-resolver";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import type { MechanismId } from "../lib/symptom-explanation/contracts";

vi.mock("../lib/medical-motion/render/blender-renderer", () => ({ renderHeartScene: vi.fn() }));
const options = { clinicalContextId: "server-test", assetVersion: HEART_ORGAN_MODULE.assetVersion,
  mode: "development" as const, outputPath: "out.mp4" };
function input(mechanism: MechanismId = "leftVentricularPressureLoad", message = "I feel tired.") {
  const { organ, primaryFocus, structures, requirements } = getMechanismAnatomy(mechanism);
  return { clinical: { message, language: "en" }, sceneIndex: 0, plan: {
    planVersion: "1", organ, topic: "normal physiology", safety: { level: "none" },
    mechanism: { id: mechanism, evidence: "possible" }, anatomy: { primaryFocus, structures, requirements },
    documentedFindings: [], scenes: [{ type: "mechanismExplanation" }, { type: "limitationsAndNextSteps" }],
  } };
}
function issued() {
  const prepared = prepareExplanationAuthorization(input(), options);
  if (!("ok" in prepared)) throw new Error(prepared.message);
  return prepared.authorization;
}
describe("server-owned clinical render authorization", () => {
  beforeEach(() => { vi.mocked(renderHeartScene).mockReset(); vi.mocked(renderHeartScene).mockResolvedValue({ status: "completed", outputPath: "out.mp4", durationSeconds: 1 }); });
  it("trusted cancellation cannot mint or replace clinical authorization", async () => {
    const controller = new AbortController(); controller.abort();
    expect(await renderExplanationRequest({}, options.outputPath, { mode: options.mode }, { signal: controller.signal }))
      .toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" }); expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it("passes trusted control separately and rejects late renderer success after abort", async () => {
    const controller = new AbortController(), capability = issued(); const snapshot = readExplanationAuthorization(capability);
    vi.mocked(renderHeartScene).mockImplementationOnce(async (_scene, _path, _options, control) => {
      expect(control?.signal).toBe(controller.signal); controller.abort();
      return { status: "completed", outputPath: "late-private-file", durationSeconds: 1 };
    });
    const result = await renderExplanationRequest(capability, options.outputPath, { mode: options.mode }, { signal: controller.signal });
    expect(result).toMatchObject({ status: "failed", errorCode: "RENDER_CANCELLED" }); expect(result).not.toHaveProperty("outputPath");
    expect(readExplanationAuthorization(capability)).toEqual(snapshot);
  });
  it.each([undefined, null, {}, { safety: { level: "none" } }, { triagePassed: true }, { safeToRender: true },
    { planSignature: "hash", requestId: "hash", renderSignature: "hash" }])("plain public data cannot authorize %#", async (value) => {
    expect(await renderExplanationRequest(value, options.outputPath, { mode: options.mode })).toMatchObject({ status: "failed", errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it("a preconstructed safe plan cannot authorize itself", async () => {
    expect(await renderExplanationRequest(input().plan, options.outputPath, { mode: options.mode })).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it("a precompiled request with valid signatures cannot authorize itself", async () => {
    const compiled = compileExplanationScene(input().plan, { sceneIndex: 0, assetVersion: options.assetVersion });
    expect(compiled.ok).toBe(true);
    if (compiled.ok) expect(await renderExplanationRequest(compiled.request, options.outputPath, { mode: options.mode })).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it.each(["I have chest pain.", "My abdominal pain is getting worse."])("blocked triage issues no capability: %s", (message) => {
    const prepared = prepareExplanationAuthorization(input("leftVentricularPressureLoad", message), options);
    expect(prepared).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(prepared).not.toHaveProperty("authorization"); expect(readExplanationAuthorization(prepared)).toBeNull();
  });
  it("invalid plan issues no capability", () => {
    const value = input(); value.plan.anatomy.requirements = {};
    expect(prepareExplanationAuthorization(value, options)).not.toHaveProperty("authorization");
  });
  it("compiler rejection issues no capability", () => {
    expect(prepareExplanationAuthorization({ ...input(), sceneIndex: 99 }, options)).not.toHaveProperty("authorization");
  });
  it("exposes gated preparation and read-only lookup, no unchecked issuer", () => {
    expect(Object.keys(authorizationSurface).sort()).toEqual(["prepareExplanationAuthorization", "readExplanationAuthorization"]);
    expect(readExplanationAuthorization(Object.freeze({}))).toBeNull();
  });
  it.each(["spread", "clone", "json", "prototype"])("copied capability loses authorization: %s", async (kind) => {
    const capability = issued();
    const copied = kind === "spread" ? { ...capability } : kind === "clone" ? structuredClone(capability) :
      kind === "json" ? JSON.parse(JSON.stringify(capability)) : Object.create(capability);
    expect(readExplanationAuthorization(copied)).toBeNull();
    expect(await renderExplanationRequest(copied, options.outputPath, { mode: options.mode })).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it("allowed preparation issues identity accepted by clinical renderer", async () => {
    const capability = issued(); expect(Object.keys(capability)).toEqual([]); expect(Object.isFrozen(capability)).toBe(true);
    expect(await renderExplanationRequest(capability, options.outputPath, { mode: options.mode })).toMatchObject({ status: "completed" });
    expect(renderHeartScene).toHaveBeenCalledOnce();
  });
  it("caller mutation of lookup snapshot cannot alter issued request", async () => {
    const capability = issued(); const snapshot = readExplanationAuthorization(capability)!;
    snapshot.request.scene.highlight.structures = ["heart.rightAtrium"]; snapshot.options.mode = "production";
    expect(readExplanationAuthorization(capability)!.request.scene.highlight.structures).toEqual(["heart.leftVentricle"]);
    expect(await renderExplanationRequest(capability, options.outputPath, { mode: options.mode })).toMatchObject({ status: "completed" });
  });
  it("later candidate mutation cannot alter issued request", async () => {
    const value = input(); const prepared = prepareExplanationAuthorization(value, options);
    value.plan.topic = "changed";
    if (!("ok" in prepared)) throw new Error(prepared.message);
    expect(readExplanationAuthorization(prepared.authorization)!.request.explanationPlan.topic).toBe("normal physiology");
  });
  it.each(["path", "mode", "timeout"])("capability cannot authorize changed options: %s", async (kind) => {
    expect(await renderExplanationRequest(issued(), kind === "path" ? "other.mp4" : options.outputPath,
      { mode: kind === "mode" ? "production" : "development", ...(kind === "timeout" ? { timeoutMs: 1 } : {}) })).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it("authorization does not grant anatomical readiness for unavailable myocardium", async () => {
    const prepared = prepareExplanationAuthorization(input("myocardialOxygenDemandSupply"), options);
    if (!("ok" in prepared)) throw new Error(prepared.message);
    expect(await renderExplanationRequest(prepared.authorization, options.outputPath, { mode: options.mode })).toMatchObject({ errorCode: "ANATOMY_STRUCTURE_NOT_FOUND" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
});

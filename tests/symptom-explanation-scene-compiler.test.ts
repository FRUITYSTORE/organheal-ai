import { beforeEach, describe, expect, it, vi } from "vitest";
import { withTestAnatomyReview } from "./helpers/anatomy-review-fixture";
import { getMechanismAnatomy } from "../lib/symptom-explanation/anatomy-resolver";
import { compileExplanationScene } from "../lib/symptom-explanation/compile-explanation-scene";
import type { MechanismId, VideoExplanationPlan } from "../lib/symptom-explanation/contracts";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import type { AnatomyRegistryEntry, OrganModule } from "../lib/medical-motion/contracts/organ-module";
import * as modules from "../lib/medical-motion/organ-modules";
import { renderHeartScene } from "../lib/medical-motion/render/blender-renderer";
import { renderExplanationRequest } from "../lib/medical-motion/render/explanation-renderer";
import { prepareExplanationAuthorization } from "../lib/symptom-explanation/explanation-authorization";

async function renderAfterTriage(r: ReturnType<typeof request>, outputPath: string, options: { mode: "development" | "production" }) {
  const prepared = prepareExplanationAuthorization({ clinical: { message: "I feel tired.", language: "en" },
    plan: r.explanationPlan, sceneIndex: r.sceneIndex }, { ...options, outputPath, clinicalContextId: "server-test", assetVersion: r.assetVersion });
  return "ok" in prepared ? renderExplanationRequest(prepared.authorization, outputPath, options) : prepared;
}

vi.mock("../lib/medical-motion/render/blender-renderer", () => ({ renderHeartScene: vi.fn() }));
function plan(mechanism: MechanismId = "leftVentricularPressureLoad"): VideoExplanationPlan {
  const { organ, primaryFocus, structures, requirements } = getMechanismAnatomy(mechanism);
  return { planVersion: "1", organ, topic: "physiology", safety: { level: "none" },
    mechanism: { id: mechanism, evidence: "possible" }, anatomy: { primaryFocus, structures, requirements },
    documentedFindings: [], scenes: [{ type: "mechanismExplanation" }, { type: "limitationsAndNextSteps" }] };
}
const config = { sceneIndex: 0, assetVersion: HEART_ORGAN_MODULE.assetVersion };
function request(p = plan(), sceneIndex = 0) {
  const result = compileExplanationScene(p, { ...config, sceneIndex });
  if (!result.ok) throw new Error(result.issues.join(" "));
  return result.request;
}
// Test metadata only; these fixtures make no claim about available real geometry.
function reviewed(): OrganModule {
  return withTestAnatomyReview({ ...HEART_ORGAN_MODULE, anatomyRegistry: HEART_ORGAN_MODULE.anatomyRegistry.map((entry): AnatomyRegistryEntry =>
    entry.id === "heart.myocardium" ? {
      ...entry, availability: "present", blenderObject: "TEST_MYOCARDIUM", fidelity: "reference-derived",
      representation: "tissue", verification: "verified",
      coverage: { verifiedRegions: ["LV", "RV", "septum", "LA", "RA"], unknownRegions: [], excludedRegions: [], evidenceRefs: ["test-review"] },
    } : entry) });
}

describe("validated explanation compiler and clinical render boundary", () => {
  beforeEach(() => {
    vi.restoreAllMocks(); vi.mocked(renderHeartScene).mockReset();
    vi.mocked(renderHeartScene).mockResolvedValue({ status: "completed", outputPath: "test.mp4", durationSeconds: 1 });
  });
  it("is deterministic for identical plan and configuration", () => expect(request()).toEqual(request()));
  it("ignores object insertion order for trace identity", () => {
    const p = plan(); const reversed = Object.fromEntries(Object.entries(p).reverse());
    expect(compileExplanationScene(reversed, config)).toEqual(compileExplanationScene(p, config));
  });
  it("preserves mechanism, safety and entire explanation context", () => expect(request().explanationPlan).toEqual(plan()));
  it("preserves exact intent and index", () => expect(request(plan(), 1)).toMatchObject({ sceneIndex: 1, sceneIntent: { type: "limitationsAndNextSteps" } }));
  it("keeps non-highlighted myocardium dependency", () => {
    const r = request(plan("myocardialOxygenDemandSupply"));
    expect(r.scene.highlight.structures).toEqual(["heart.coronary.lad", "heart.coronary.rca", "heart.coronary.lcx"]);
    expect(r.scene.anatomyRequirements?.["heart.myocardium"]).toEqual(r.explanationPlan.anatomy.requirements["heart.myocardium"]);
  });
  it("keeps requirements when nothing is highlighted", () => {
    const r = request(plan("myocardialOxygenDemandSupply"), 1);
    expect(r.scene.highlight.structures).toEqual([]); expect(r.scene.anatomyRequirements?.["heart.myocardium"]).toBeDefined();
  });
  it("structure focus does not highlight its other dependencies", () => {
    const p = plan(); p.scenes = [{ type: "structureFocus", target: "heart.leftVentricle" }, { type: "limitationsAndNextSteps" }];
    expect(request(p).scene.highlight.structures).toEqual(["heart.leftVentricle"]);
    expect(request(p).scene.anatomyRequirements?.["heart.aorta"]).toBeDefined();
  });
  it("snapshots input without mutation or aliases", () => {
    const p = plan(); const r = request(p); p.topic = "changed";
    expect(r.explanationPlan.topic).toBe("physiology"); expect(plan().topic).toBe("physiology");
  });
  it("trace changes with explanation context", () => { const p = plan(); p.topic = "other"; expect(request(p).requestId).not.toBe(request().requestId); });
  it("trace changes with asset version", () => {
    const r = compileExplanationScene(plan(), { ...config, assetVersion: "next" });
    expect(r.ok && r.request.requestId).not.toBe(request().requestId);
  });
  it("rejects arbitrary shape", () => expect(compileExplanationScene({}, config).ok).toBe(false));
  it("rejects dropped mechanism minimum requirements before renderer", async () => {
    const r = request(plan("myocardialOxygenDemandSupply"));
    r.explanationPlan.anatomy.requirements["heart.myocardium"] = {};
    expect(await renderAfterTriage(r, "test.mp4", { mode: "development" })).toMatchObject({ errorCode: "INVALID_SCENE_PLAN" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it("rejects an unknown render mode instead of weakening production checks", async () => {
    expect(await renderAfterTriage(request(), "test.mp4", { mode: "unknown" as "development" })).toMatchObject({ errorCode: "CLINICAL_EXPLANATION_FAILED" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it("safety gate precedes malformed anatomy", () => expect(compileExplanationScene({ safety: { level: "emergency" } }, config)).toMatchObject({ ok: false, errorCode: "UNSAFE_FOR_VIDEO_FIRST" }));
  it.each([-1, 20, 0.5])("rejects invalid index %s", (sceneIndex) => expect(compileExplanationScene(plan(), { ...config, sceneIndex }).ok).toBe(false));
  it("rejects unsupported mechanism", () => expect(compileExplanationScene({ ...plan(), mechanism: { id: "invented", evidence: "possible" } }, config).ok).toBe(false));
  it("rejects undocumented or unauthorized focus", () => {
    const p = plan(); p.scenes = [{ type: "structureFocus", target: "heart.coronary.lad" }, { type: "limitationsAndNextSteps" }];
    expect(compileExplanationScene(p, config).ok).toBe(false);
  });
  it("rejects unsupported finding visualization even with evidence", () => {
    const p = plan(); p.documentedFindings = [{ id: "finding", structure: "heart.leftVentricle", evidenceRef: "test-report" }];
    p.scenes = [{ type: "findingVisualization", findingId: "finding" }, { type: "limitationsAndNextSteps" }];
    expect(compileExplanationScene(p, config)).toMatchObject({ ok: false, errorCode: "INVALID_SCENE_PLAN" });
  });
  it("renders valid LV development request with mandatory context and trace", async () => {
    const r = request(); const result = await renderAfterTriage(r, "test.mp4", { mode: "development" });
    expect(result).toMatchObject({ status: "completed", requestId: r.requestId, planSignature: r.planSignature });
    expect(renderHeartScene).toHaveBeenCalledWith(r.scene, "test.mp4", { mode: "development", explanationPlan: r.explanationPlan, clinicalAuthorization: expect.any(Object) }, {});
  });
  it("blocks development assets in production before renderer", async () => {
    expect(await renderAfterTriage(request(), "test.mp4", { mode: "production" })).toMatchObject({ status: "failed", errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it("blocks unavailable myocardium even without highlights; no substitution", async () => {
    expect(await renderAfterTriage(request(plan("myocardialOxygenDemandSupply"), 1), "test.mp4", { mode: "development" })).toMatchObject({ status: "failed", errorCode: "ANATOMY_STRUCTURE_NOT_FOUND" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it.each(["representation", "verification", "coverage", "regionEvidence"])("rejects unsuitable non-highlighted myocardium: %s", async (kind) => {
    const module = reviewed();
    module.anatomyRegistry = module.anatomyRegistry.map((entry) => {
      if (entry.id !== "heart.myocardium") return entry;
      if (kind === "representation") return { ...entry, representation: "cavity" };
      if (kind === "verification") return { ...entry, verification: "anatomy-conditional" };
      return { ...entry, coverage: { ...entry.coverage,
        unknownRegions: kind === "coverage" ? ["RV"] : [], evidenceRefs: kind === "regionEvidence" ? [] : ["test-review"] } };
    });
    vi.spyOn(modules, "getOrganModule").mockReturnValue(module);
    expect(await renderAfterTriage(request(plan("myocardialOxygenDemandSupply")), "test.mp4", { mode: "development" })).toMatchObject({ status: "failed", errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it("accepts valid reviewed mechanism requirements", async () => {
    vi.spyOn(modules, "getOrganModule").mockReturnValue(reviewed());
    expect(await renderAfterTriage(request(plan("myocardialOxygenDemandSupply")), "test.mp4", { mode: "development" })).toMatchObject({ status: "completed" });
  });
  it.each(["highlight", "dependencies", "duration", "identity", "intent", "context"])("rejects tampered %s before renderer", async (kind) => {
    const r = request();
    if (kind === "highlight") r.scene.highlight.structures = ["heart.rightAtrium"];
    if (kind === "dependencies") r.scene.anatomyRequirements = {};
    if (kind === "duration") r.scene.durationSeconds = 100;
    if (kind === "identity") r.requestId = "forged";
    if (kind === "intent") r.sceneIntent = { type: "organOverview" };
    if (kind === "context") delete (r as Partial<typeof r>).explanationPlan;
    expect(await renderExplanationRequest(r, "test.mp4", { mode: "development" })).toMatchObject({ status: "failed" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it("does not look up assets for an unsafe plan", async () => {
    const lookup = vi.spyOn(modules, "getOrganModule"); const r = request();
    (r.explanationPlan.safety as { level: string }).level = "emergency";
    expect(await renderExplanationRequest(r, "test.mp4", { mode: "development" })).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(lookup).not.toHaveBeenCalled(); expect(renderHeartScene).not.toHaveBeenCalled();
  });
  it("rejects stale asset identity", async () => {
    const result = compileExplanationScene(plan(), { ...config, assetVersion: "stale" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(await renderAfterTriage(result.request, "test.mp4", { mode: "development" })).toMatchObject({ errorCode: "INVALID_SCENE_PLAN" });
    expect(renderHeartScene).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import type { AnatomyRegistryEntry, OrganModule } from "../lib/medical-motion/contracts/organ-module";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { buildHeartScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";
import { getMechanismAnatomy } from "../lib/symptom-explanation/anatomy-resolver";
import { checkAssetReadiness, checkExplanationPlanReadiness } from "../lib/symptom-explanation/asset-readiness";
import type { MechanismId, VideoExplanationPlan } from "../lib/symptom-explanation/contracts";
import { validateVideoExplanationPlan } from "../lib/symptom-explanation/validate-explanation-plan";

function plan(mechanism: MechanismId = "myocardialOxygenDemandSupply"): VideoExplanationPlan {
  const { organ, primaryFocus, structures, requirements } = getMechanismAnatomy(mechanism);
  return {
    planVersion: "1", organ, topic: "normal physiology", safety: { level: "none" },
    mechanism: { id: mechanism, evidence: "possible" },
    anatomy: { primaryFocus, structures, requirements }, documentedFindings: [],
    scenes: [{ type: "structureFocus", target: primaryFocus }, { type: "limitationsAndNextSteps" }],
  };
}

// Reviewed metadata fixtures only: no anatomical geometry is generated.
function reviewedModule(): OrganModule {
  const anatomyRegistry = plan().anatomy.structures.map((id): AnatomyRegistryEntry => ({
    id, kind: id === "heart.myocardium" ? "myocardium" : "coronaryArtery",
    availability: "present", blenderObject: `TEST_${id}`, fidelity: "reference-derived",
    representation: id === "heart.myocardium" ? "tissue" : "centerline", verification: "verified",
    coverage: { verifiedRegions: id === "heart.myocardium" ? ["LV", "RV", "septum", "LA", "RA"] : [id],
      unknownRegions: [], excludedRegions: [], evidenceRefs: ["test-review"] },
  }));
  return { ...HEART_ORGAN_MODULE, assetStatus: "production", anatomicallyValidated: true, anatomyRegistry };
}

function changeMyocardium(overrides: Partial<AnatomyRegistryEntry>): OrganModule {
  const module = reviewedModule();
  return { ...module, anatomyRegistry: module.anatomyRegistry.map((entry) =>
    entry.id === "heart.myocardium" ? { ...entry, ...overrides } as AnatomyRegistryEntry : entry) };
}

describe("mechanism-specific anatomy dependencies", () => {
  it("validates a non-highlighted required myocardium without turning it into a highlight", () => {
    const scene = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false });
    expect(scene.highlight.structures).not.toContain("heart.myocardium");
    const requirements = plan().anatomy.requirements;
    const result = checkAssetReadiness("heart", scene.highlight.structures, "production", reviewedModule, requirements);
    expect(result).toEqual({ ok: true, blenderObjects: scene.highlight.structures.map((id) => `TEST_${id}`) });
    expect(checkExplanationPlanReadiness(plan(), "production", reviewedModule).ok).toBe(true);
  });

  it("checks requirements even with an empty highlight list", () => {
    expect(checkAssetReadiness("heart", [], "development", undefined, plan().anatomy.requirements))
      .toMatchObject({ ok: false, errorCode: "ANATOMY_STRUCTURE_NOT_FOUND", details: ["heart.myocardium"] });
  });

  it("fails for missing dependencies instead of using the available coronary meshes", () => {
    const missing = { ...reviewedModule(), anatomyRegistry: reviewedModule().anatomyRegistry.filter((entry) => entry.id !== "heart.myocardium") };
    expect(checkExplanationPlanReadiness(plan(), "production", () => missing))
      .toEqual({ ok: false, errorCode: "ANATOMY_STRUCTURE_NOT_FOUND", details: ["heart.myocardium"] });
  });

  it("fails for wrong representation", () => {
    expect(checkExplanationPlanReadiness(plan(), "development", () => changeMyocardium({ representation: "cavity" })))
      .toMatchObject({ ok: false, errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
  });

  it.each(["unverified", "anatomy-conditional", "rejected"] as const)("fails with %s myocardium", (verification) => {
    expect(checkExplanationPlanReadiness(plan(), "development", () => changeMyocardium({ verification })))
      .toMatchObject({ ok: false, errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
  });

  it("fails with partial availability", () => {
    expect(checkExplanationPlanReadiness(plan(), "development", () => changeMyocardium({ availability: "partial" })))
      .toMatchObject({ ok: false, errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
  });

  it.each(["unknownRegions", "excludedRegions"] as const)("fails with incomplete %s", (field) => {
    const coverage = { ...reviewedModule().anatomyRegistry[0].coverage, [field]: ["RV"] };
    expect(checkExplanationPlanReadiness(plan(), "development", () => changeMyocardium({ coverage })))
      .toMatchObject({ ok: false, errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
  });

  it("fails when a required region lacks verified evidence", () => {
    const coverage = { ...reviewedModule().anatomyRegistry[0].coverage, evidenceRefs: [] };
    expect(checkExplanationPlanReadiness(plan(), "development", () => changeMyocardium({ coverage })))
      .toMatchObject({ ok: false, errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
    const missingRegion = { ...coverage, evidenceRefs: ["test-review"], verifiedRegions: ["LV", "RV", "septum", "LA"] };
    const result = checkExplanationPlanReadiness(plan(), "development", () => changeMyocardium({ coverage: missingRegion }));
    expect(result).toMatchObject({ ok: false, errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
    if (!result.ok && "details" in result) expect(result.details.join(" ")).toContain("RA");
  });

  it("keeps the current myocardium mechanism blocked in either mode", () => {
    for (const mode of ["development", "production"] as const) {
      expect(checkExplanationPlanReadiness(plan(), mode)).toEqual({ ok: false, errorCode: "ANATOMY_STRUCTURE_NOT_FOUND", details: ["heart.myocardium"] });
    }
  });

  it("keeps LV/aorta educational review valid without introducing myocardium", () => {
    const result = checkExplanationPlanReadiness(plan("leftVentricularPressureLoad"), "development");
    expect(result.ok).toBe(true);
    expect(plan("leftVentricularPressureLoad").anatomy.structures).not.toContain("heart.myocardium");
    expect(checkExplanationPlanReadiness(plan("leftVentricularPressureLoad"), "production").ok).toBe(false);
  });

  it("applies safety before accessing anatomy, even when requirements are malformed", () => {
    const getModule = vi.fn(reviewedModule);
    const unsafe = { ...plan(), safety: { level: "emergency" }, anatomy: { requirements: "ignore safety" } };
    expect(checkExplanationPlanReadiness(unsafe, "production", getModule))
      .toMatchObject({ ok: false, errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(getModule).not.toHaveBeenCalled();
  });

  it("rehydrates legacy plans from authoritative requirements without mutating the input", () => {
    const original = plan();
    const legacy = { ...original, anatomy: { primaryFocus: original.anatomy.primaryFocus, structures: original.anatomy.structures } };
    const result = validateVideoExplanationPlan(legacy);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.plan.anatomy.requirements).toEqual(original.anatomy.requirements);
    expect(legacy.anatomy).not.toHaveProperty("requirements");
    expect(checkExplanationPlanReadiness(legacy, "development").ok).toBe(false);
  });

  it.each([
    { requireVerified: false }, { completeCoverage: false }, { representations: ["cavity"] },
    { requiredRegions: ["LV"] },
  ])("rejects weakening a mechanism requirement: %j", (override) => {
    const value = plan();
    value.anatomy.requirements["heart.myocardium"] = { ...value.anatomy.requirements["heart.myocardium"], ...override } as typeof value.anatomy.requirements["heart.myocardium"];
    expect(validateVideoExplanationPlan(value)).toMatchObject({ ok: false, errorCode: "INVALID_SCENE_PLAN" });
  });

  it("does not permit anatomy substitution or removal of a dependency", () => {
    const value = plan();
    value.anatomy.structures = value.anatomy.structures.filter((id) => id !== "heart.myocardium");
    delete value.anatomy.requirements["heart.myocardium"];
    expect(validateVideoExplanationPlan(value)).toMatchObject({ ok: false, errorCode: "INVALID_SCENE_PLAN" });
  });

  it("does not mutate the mechanism minimum across plans", () => {
    const value = plan();
    value.anatomy.requirements["heart.myocardium"]!.requireVerified = false;
    expect(getMechanismAnatomy("myocardialOxygenDemandSupply").requirements["heart.myocardium"]!.requireVerified).toBe(true);
  });

  it.each([
    null, [], { "lungs.trachea": {} }, { "heart.myocardium": { requireVerified: "true" } },
    { "heart.myocardium": { representations: [] } }, { "heart.myocardium": { requiredRegions: [""] } },
    { "heart.myocardium": { overrideReadiness: true } },
  ])("rejects malformed requirement JSON: %j", (requirements) => {
    const value = { ...plan(), anatomy: { ...plan().anatomy, requirements } };
    expect(validateVideoExplanationPlan(value).ok).toBe(false);
  });
});

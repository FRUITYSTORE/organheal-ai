import { describe, expect, it } from "vitest";

import { getMechanismAnatomy, resolveAnatomy, type OrganStructureLookup } from "../lib/symptom-explanation/anatomy-resolver";
import { MECHANISM_IDS, type AnatomyStructureId } from "../lib/symptom-explanation/contracts";
import { validateVideoExplanationPlan } from "../lib/symptom-explanation/validate-explanation-plan";

const FULL_HEART: readonly AnatomyStructureId[] = [
  "heart.myocardium",
  "heart.leftVentricle",
  "heart.aorta",
  "heart.coronary.lad",
  "heart.coronary.rca",
  "heart.coronary.lcx",
];

const heartOnly: OrganStructureLookup = (organ) => (organ === "heart" ? FULL_HEART : null);

describe("resolveAnatomy", () => {
  it("maps exertional oxygen demand to the myocardium and the LAD, RCA and LCx", () => {
    const result = resolveAnatomy("myocardialOxygenDemandSupply", heartOnly);

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    expect(result.anatomy).toEqual({
      organ: "heart",
      primaryFocus: "heart.coronary",
      structures: ["heart.myocardium", "heart.coronary.lad", "heart.coronary.rca", "heart.coronary.lcx"],
      requirements: getMechanismAnatomy("myocardialOxygenDemandSupply").requirements,
    });
  });

  it("maps the blood pressure education case to the left ventricle and aorta", () => {
    const result = resolveAnatomy("leftVentricularPressureLoad", heartOnly);

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    expect(result.anatomy).toEqual({
      organ: "heart",
      primaryFocus: "heart.leftVentricle",
      structures: ["heart.leftVentricle", "heart.aorta"],
      requirements: getMechanismAnatomy("leftVentricularPressureLoad").requirements,
    });
  });

  it("fails whole with every missing id when the real asset lacks a structure, never a partial result", () => {
    const missingLcx: OrganStructureLookup = () => FULL_HEART.filter((id) => id !== "heart.coronary.lcx");
    const result = resolveAnatomy("myocardialOxygenDemandSupply", missingLcx);

    expect(result).toEqual({
      ok: false,
      errorCode: "ANATOMY_STRUCTURE_NOT_FOUND",
      organ: "heart",
      missing: ["heart.coronary.lcx"],
    });
  });

  it("reports ORGAN_MODULE_NOT_FOUND when the organ has no module at all", () => {
    const result = resolveAnatomy("leftVentricularPressureLoad", () => null);

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.errorCode).toBe("ORGAN_MODULE_NOT_FOUND");
    expect(result.missing).toEqual(["heart.leftVentricle", "heart.aorta"]);
  });

  it("resolves every mechanism to anatomy that forms a valid plan, naming normal anatomy only", () => {
    for (const mechanism of MECHANISM_IDS) {
      const result = resolveAnatomy(mechanism, heartOnly);

      expect(result.ok, mechanism).toBe(true);

      if (!result.ok) continue;

      const { organ, primaryFocus, structures } = result.anatomy;

      expect(structures.join(" ")).not.toMatch(/plaque|stenosis|thromb|infarct|hypertroph|block/i);
      expect(result.rationale.length).toBeGreaterThan(0);

      const plan = validateVideoExplanationPlan({
        planVersion: "1",
        organ,
        topic: mechanism,
        safety: { level: "none" },
        mechanism: { id: mechanism, evidence: "possible" },
        anatomy: { primaryFocus, structures },
        documentedFindings: [],
        scenes: [{ type: "structureFocus", target: primaryFocus }, { type: "limitationsAndNextSteps" }],
      });

      expect(plan.ok, mechanism).toBe(true);
    }
  });

  it("returns a fresh copy, so a caller mutating its result cannot change the next one", () => {
    const first = resolveAnatomy("myocardialOxygenDemandSupply", heartOnly);

    if (!first.ok) throw new Error("expected a resolution");

    (first.anatomy.structures as AnatomyStructureId[]).length = 0;

    const second = resolveAnatomy("myocardialOxygenDemandSupply", heartOnly);

    expect(second.ok && second.anatomy.structures).toHaveLength(4);
  });
});

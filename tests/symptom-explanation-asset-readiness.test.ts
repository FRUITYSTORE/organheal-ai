import { describe, expect, it } from "vitest";

import type { OrganModule } from "../lib/medical-motion/contracts/organ-module";
import { getOrganModule } from "../lib/medical-motion/organ-modules";
import { resolveAnatomy } from "../lib/symptom-explanation/anatomy-resolver";
import { checkAssetReadiness, createOrganStructureLookup } from "../lib/symptom-explanation/asset-readiness";

const lookup = createOrganStructureLookup();

function reviewedModule(overrides: Partial<OrganModule> = {}): OrganModule {
  return {
    id: "heart",
    assetVersion: "test",
    assetStatus: "production",
    anatomicallyValidated: true,
    anatomyRegistry: [
      { id: "heart.leftVentricle", kind: "chamber", blenderObject: "LV", fidelity: "reference-derived" },
      { id: "heart.aorta", kind: "greatVessel", blenderObject: "AO", fidelity: "reference-derived" },
    ],
    landmarks: [],
    cameraTargets: [],
    motionControllers: [],
    cutawayStates: [],
    renderStyles: ["clinicalIllustration"],
    ...overrides,
  };
}

describe("organ module structure lookup", () => {
  it("fails the spec's own coronary demo on today's heart asset, because it has no myocardium object", () => {
    expect(resolveAnatomy("myocardialOxygenDemandSupply", lookup)).toEqual({
      ok: false,
      errorCode: "ANATOMY_STRUCTURE_NOT_FOUND",
      organ: "heart",
      missing: ["heart.myocardium"],
    });
  });

  it("resolves the LV and aorta case, which today's asset does contain", () => {
    expect(resolveAnatomy("leftVentricularPressureLoad", lookup).ok).toBe(true);
  });

  it("returns null for organs that have no module yet", () => {
    expect(lookup("lungs")).toBeNull();
    expect(getOrganModule("kidneys")).toBeNull();
  });
});

describe("checkAssetReadiness", () => {
  it("allows a development render of real registry structures and maps them to Blender objects", () => {
    expect(checkAssetReadiness("heart", ["heart.leftVentricle", "heart.aorta"], "development")).toEqual({
      ok: true,
      blenderObjects: ["HEART_LEFT_VENTRICLE", "AORTA"],
    });
  });

  it("refuses a production render from today's placeholder heart, listing every reason", () => {
    const result = checkAssetReadiness("heart", ["heart.leftVentricle", "heart.aorta"], "production");

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.errorCode).toBe("REAL_ANATOMICAL_ASSET_REQUIRED");
    expect(result.details).toEqual([
      "The heart asset is a development-placeholder.",
      "The heart asset has not been anatomically validated.",
      "heart.aorta is placeholder geometry.",
    ]);
  });

  it("reports every structure the asset lacks, in either mode, with no fallback", () => {
    for (const mode of ["development", "production"] as const) {
      expect(checkAssetReadiness("heart", ["heart.myocardium", "heart.leftVentricle", "heart.valve.aortic"], mode)).toEqual({
        ok: false,
        errorCode: "ANATOMY_STRUCTURE_NOT_FOUND",
        details: ["heart.myocardium", "heart.valve.aortic"],
      });
    }
  });

  it("reports ORGAN_MODULE_NOT_FOUND for an organ with no module", () => {
    const result = checkAssetReadiness("liver", ["liver.rightLobe"], "development");

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.errorCode).toBe("ORGAN_MODULE_NOT_FOUND");
  });

  it("allows production only when the asset is production, validated, and every structure is real", () => {
    expect(checkAssetReadiness("heart", ["heart.leftVentricle", "heart.aorta"], "production", () => reviewedModule())).toEqual({
      ok: true,
      blenderObjects: ["LV", "AO"],
    });

    const unvalidated = checkAssetReadiness(
      "heart",
      ["heart.leftVentricle"],
      "production",
      () => reviewedModule({ anatomicallyValidated: false })
    );

    expect(unvalidated.ok).toBe(false);

    const withPlaceholder = checkAssetReadiness("heart", ["heart.aorta"], "production", () =>
      reviewedModule({
        anatomyRegistry: [{ id: "heart.aorta", kind: "greatVessel", blenderObject: "AO", fidelity: "placeholder" }],
      })
    );

    expect(withPlaceholder).toEqual({
      ok: false,
      errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED",
      details: ["heart.aorta is placeholder geometry."],
    });
  });
});

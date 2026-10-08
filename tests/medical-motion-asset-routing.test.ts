import { describe, it, expect } from "vitest";
import { createOrganModuleRegistry, getOrganModule, getOrganModuleForAsset } from "../lib/medical-motion/organ-modules";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { renderHeartScene } from "../lib/medical-motion/render/blender-renderer";
import { buildHeartScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";

describe("trusted exact asset routing", () => {
  it("retains legacy default and exact development identity", () => {
    expect(getOrganModule("heart")).toBe(HEART_ORGAN_MODULE);
    expect(getOrganModuleForAsset("heart", "heart-v2-development")).toEqual(HEART_ORGAN_MODULE);
  });
  it.each(["heart-v2", "heart-v2-development-extra", "latest", "../heart-v2-development", "unknown-heart-version"])("no fuzzy or path resolution: %s", version => {
    expect(getOrganModuleForAsset("heart", version)).toBeNull();
  });
  it("rejects wrong organ/version pair", () => expect(getOrganModuleForAsset("lungs", "heart-v2-development")).toBeNull());
  it("rejects duplicates and wrong-organ inventory", () => {
    expect(() => createOrganModuleRegistry([HEART_ORGAN_MODULE, HEART_ORGAN_MODULE])).toThrow("ORGAN_MODULE_DUPLICATE");
    expect(() => createOrganModuleRegistry([{...HEART_ORGAN_MODULE, id: "lungs"}])).toThrow("ORGAN_MODULE_INVALID");
  });
  it("isolated historical versions coexist without latest selection or mutable input", () => {
    const old = structuredClone(HEART_ORGAN_MODULE); old.assetVersion = "test-old";
    const newer = {...old, assetVersion: "test-new"};
    const registry = createOrganModuleRegistry([old, newer]); old.anatomyRegistry = [];
    expect(registry.resolve("heart", "test-old")!.anatomyRegistry.length).toBeGreaterThan(0);
    expect(registry.resolve("heart", "test-new")!.assetVersion).toBe("test-new");
    expect(registry.resolve("heart", "latest")).toBeNull();
    expect(Object.isFrozen(registry.resolve("heart", "test-old")!.anatomyRegistry)).toBe(true);
    expect(getOrganModuleForAsset("heart", "test-old")).toBeNull();
  });
  it("unknown explicit server asset fails before rendering", async () => {
    expect(await renderHeartScene(buildHeartScene({coronaryArteries:false,leftVentricleAndAorta:false}), "routing.png", {mode:"development",assetVersion:"unknown-heart-version"}))
      .toMatchObject({status:"failed",errorCode:"INVALID_SCENE"});
  });
});

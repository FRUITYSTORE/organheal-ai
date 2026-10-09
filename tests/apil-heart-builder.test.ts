import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getOrganModuleForAsset } from "../lib/medical-motion/organ-modules";
import { APIL_LOCAL_HEART_CANDIDATE } from "../lib/medical-motion/organs/heart/apil-local-heart-candidate";

it("routes only the exact APIL asset and preserves the default", () => {
  expect(getOrganModuleForAsset("heart", "heart-apil-local-reference-v1")).toEqual(APIL_LOCAL_HEART_CANDIDATE);
  expect(getOrganModuleForAsset("heart", "heart-apil-local-reference-unknown")).toBeNull();
  expect(getOrganModuleForAsset("heart", "heart-v2-development")!.assetVersion).toBe("heart-v2-development");
  const dispatch = readFileSync("render/blender/render_scene.py", "utf8");
  expect(dispatch).toContain('("heart", "heart-apil-local-reference-v1"): build_apil_heart');
});

it("pins the audited FBX and four unsplit source objects", () => {
  const builder = readFileSync("render/blender/apil_heart_builder.py", "utf8");
  expect(builder).toContain("e5a2a81a38f456c54e8d556b1db1c9c2000fcbf342374aa42b5f7369484dbf27");
  expect(builder).toContain("'APIL HEART 1 RARV Edit': (70770, 141628)");
  expect(builder).toContain("APIL_SOURCE_HASH_INVALID");
  expect(builder).toContain("len(imported) != 14");
});

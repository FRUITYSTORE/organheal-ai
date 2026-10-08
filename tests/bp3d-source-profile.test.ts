import { describe, expect, it, vi } from "vitest";
import { renderHeartScene } from "../lib/medical-motion/render/blender-renderer";
import * as blender from "../lib/medical-motion/render/blender-process";
import type { SceneDefinition } from "../lib/medical-motion/contracts/scene";
import type { RenderOptions } from "../lib/medical-motion/render/blender-renderer";
import { BP3D_HEART_SOURCE_PROFILE as profile } from "../lib/medical-motion/organs/heart/bp3d-source-profile";
import { BP3D_HEART_CANDIDATE as module, BP3D_HEART_SELECTION } from "../lib/medical-motion/organs/heart/bp3d-heart-candidate";
import { SOURCE_PROFILES, createSourceProfileRegistry, sourceProfileSnapshot, resolveStoredSourceProfile, checkSourceProfileCohesion } from "../lib/medical-motion/source-profiles";
import { WHOLE_BODY_ANATOMY } from "../lib/medical-motion/whole-body-anatomy";
const selection = SOURCE_PROFILES.resolve({ profileId: profile.profileId, profileVersion: profile.profileVersion });
const references = { structures: BP3D_HEART_SELECTION.map(([id]) => id), labels: [], cameraTargets: profile.cameraTargets.map(c => c.id), usage: "internal-review" as const };

describe("BP3D trusted internal-review profile", () => {
  it("binds exact identity and a deterministic fingerprint independent of set ordering", () => {
    const snapshot = sourceProfileSnapshot(selection);
    expect(snapshot).toMatchObject({ profileId: "bp3d-heart-internal-review", profileVersion: "1", sourceId: "bodyparts3d-current-archive", sourceVersion: "archive-4.0-license-2025-02-27", anatomyVersion: "heart-bp3d-4.0-cavity-vessel-anatomy-v1", assetVersion: "heart-bp3d-4.0-internal-review-v1", usage: ["internal-review"] });
    expect(snapshot.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    const registry = createSourceProfileRegistry([{ ...profile, structures: [...profile.structures].reverse(), cameraTargets: [...profile.cameraTargets].reverse() }]);
    expect(sourceProfileSnapshot(registry.resolve({ profileId: snapshot.profileId, profileVersion: snapshot.profileVersion })).fingerprint).toBe(snapshot.fingerprint);
  });
  it("permits exactly 14 cavity/vessel structures and three asset-local review cameras", () => {
    expect(profile.structures.map(s => s.structureId)).toEqual(BP3D_HEART_SELECTION.map(([id]) => id));
    expect(profile.structures.map(s => s.representation)).toEqual([...Array(4).fill("cavity"), ...Array(10).fill("vessel")]);
    expect(profile.cameraTargets.map(c => c.id)).toEqual(["CAM_BP3D_REVIEW_CHAMBERS", "CAM_BP3D_REVIEW_CORONARY", "CAM_BP3D_REVIEW_VESSELS"]);
    for (const camera of profile.cameraTargets) for (const id of camera.landmarks) {
      expect(id.startsWith("heart.bp3d.")).toBe(true);
      expect(module.landmarks.some(l => l.id === id)).toBe(true);
    }
    expect(checkSourceProfileCohesion(module, selection, WHOLE_BODY_ANATOMY, references).structureSources).toHaveLength(14);
  });
  it("rejects whole overview, unavailable myocardium/septum, and patient-facing usage", () => {
    for (const cameraTargets of [["CAM_BP3D_REVIEW_WHOLE"]]) expect(() => checkSourceProfileCohesion(module, selection, WHOLE_BODY_ANATOMY, { ...references, cameraTargets })).toThrow("SOURCE_PROFILE_INVALID");
    for (const id of ["heart.myocardium", "heart.septum.interventricular"] as const) expect(() => checkSourceProfileCohesion(module, selection, WHOLE_BODY_ANATOMY, { ...references, structures: [id] })).toThrow("SOURCE_PROFILE_INVALID");
    expect(() => checkSourceProfileCohesion(module, selection, WHOLE_BODY_ANATOMY, { ...references, usage: "patient-facing" })).toThrow("SOURCE_PROFILE_INVALID");
  });
  it.each(["assetVersion", "anatomyVersion", "sourceId", "sourceVersion", "profileVersion"] as const)("rejects wrong stored %s", key => {
    expect(() => resolveStoredSourceProfile({ ...sourceProfileSnapshot(selection), [key]: "wrong" }, SOURCE_PROFILES)).toThrow("SOURCE_PROFILE_INVALID");
  });
  it("rejects wrong module asset and borrowed provenance", () => {
    expect(() => checkSourceProfileCohesion({ ...module, assetVersion: "heart-v2-development" }, selection, WHOLE_BODY_ANATOMY, references)).toThrow("SOURCE_PROFILE_INVALID");
    const borrowed = structuredClone(module);
    borrowed.anatomyRegistry[0].provenance!.sourceId = "other";
    expect(() => checkSourceProfileCohesion(borrowed, selection, WHOLE_BODY_ANATOMY, references)).toThrow("SOURCE_PROFILE_INVALID");
  });
});

describe("non-clinical source-profile render boundary", () => {
  const scene: SceneDefinition = { organ: "heart", sceneVersion: "3", durationSeconds: 1, focus: "internal-review",
    camera: { preset: "CAM_BP3D_REVIEW_CHAMBERS" }, motion: { preset: "none" },
    highlight: { structures: ["heart.leftVentricle"], intensity: 0 },
    anatomyRequirements: { "heart.leftVentricle": { representations: ["cavity"] } },
    output: { media: "still", resolution: "720p", aspectRatio: "1:1" } };
  const options: RenderOptions = { mode: "development", assetVersion: profile.assetVersion, internalReviewSourceProfile: selection };
  it("accepts trusted exact review authority through all gates without launching Blender", async () => {
    const spawn = vi.spyOn(blender, "runBlenderProcess");
    try {
      expect(await renderHeartScene(scene, "review.png", options, { signal: AbortSignal.abort() })).toMatchObject({ status: "failed", errorCode: "RENDER_CANCELLED" });
      expect(spawn).not.toHaveBeenCalled();
      expect(scene.sourceProfile).toBeUndefined();
    } finally { spawn.mockRestore(); }
  });
  it("rejects copied authority, missing/wrong assets, forbidden cameras and clinical mixing before spawn", async () => {
    const spawn = vi.spyOn(blender, "runBlenderProcess");
    const cases: [SceneDefinition, RenderOptions][] = [
      [scene, { ...options, internalReviewSourceProfile: structuredClone(selection) }],
      [scene, { ...options, assetVersion: undefined }],
      [scene, { ...options, assetVersion: "unknown" }],
      [scene, { ...options, assetVersion: "heart-v2-development" }],
      [scene, { ...options, mode: "production" }],
      [scene, { ...options, clinicalAuthorization: {} }],
      [scene, { ...options, explanationPlan: {} }],
      [{ ...scene, mechanismIdentity: { mechanismId: "leftVentricularPressureLoad", mechanismVersion: "1" } }, options],
      [{ ...scene, camera: { preset: "CAM_BP3D_REVIEW_WHOLE" } }, options],
      [{ ...scene, camera: { preset: "unknown" } }, options],
      [{ ...scene, camera: { preset: scene.camera.preset, from: "CAM_BP3D_REVIEW_WHOLE" } }, options],
      [{ ...scene, sourceProfile: { profileId: "wrong", profileVersion: "1", fingerprint: "0".repeat(64) } }, options],
    ];
    try {
      for (const [input, opts] of cases) expect(await renderHeartScene(input, "review.png", opts)).toMatchObject({ status: "failed", errorCode: "INVALID_SCENE" });
      expect(spawn).not.toHaveBeenCalled();
    } finally { spawn.mockRestore(); }
  });
  it("keeps cavity-versus-tissue requirements and clinical capability checks intact", async () => {
    const spawn = vi.spyOn(blender, "runBlenderProcess");
    try {
      expect(await renderHeartScene({ ...scene, anatomyRequirements: { "heart.leftVentricle": { representations: ["tissue"] } } }, "review.png", options)).toMatchObject({ status: "failed", errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
      expect(await renderHeartScene(scene, "review.png", { mode: "development", assetVersion: profile.assetVersion, clinicalAuthorization: {} })).toMatchObject({ status: "failed", errorCode: "INVALID_SCENE" });
      expect(spawn).not.toHaveBeenCalled();
    } finally { spawn.mockRestore(); }
  });
});

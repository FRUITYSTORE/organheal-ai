import { expect, it } from "vitest";
import manifest from "../medical-assets/LICENSE_MANIFEST.json";
import { HEART_VISUAL_SAFETY_POLICY, ORGANHEAL_HEART_VISUAL_PRESET, VISUAL_AUDIO_POLICY,
  VISUAL_OUTPUT_PROFILES, validateHeartVisualRecipe } from "../lib/medical-motion/visual-foundation";

const recipe = () => ({ visualEngineVersion: "1", sceneRecipeVersion: "1", organ: "heart", usage: "internal-review",
  visualPreset: "ORGANHEAL_HEART_V1", language: "en", outputProfile: "MOBILE_VERTICAL_9_16", duration: 6,
  exportIntent: "patient-education-preview", music: "disabled",
  assets: [{ role: "HEART_HERO_V1", assetVersion: "test-hero-candidate-v1", sourceReferences: ["HEART_HERO/ownerVisualSelection"], evidenceReferences: ["B-final-hero.png"] },
    { role: "HEART_MOTION_V1", assetVersion: "test-motion-candidate-v1", sourceReferences: ["HEART_MOTION/ownerVisualSelection"], evidenceReferences: ["Beating-heart-final-motion.mp4"] }],
  cues: [{ kind: "hero-reveal", role: "HEART_HERO_V1", start: 0, end: 2 },
    { kind: "narration-slot", slot: "voice-segment", start: 0, end: 6 },
    { kind: "subtitle-slot", slot: "subtitle", start: 0, end: 6 },
    { kind: "heartbeat", role: "HEART_MOTION_V1", motionPreset: "NORMAL_HEARTBEAT_V1", start: 2, end: 5 },
    { kind: "camera-movement", role: "HEART_MOTION_V1", from: "review-start", to: "review-end", start: 2, end: 5 },
    { kind: "structure-focus", role: "HEART_MOTION_V1", structures: ["heart.leftVentricle"], addressability: "requires-source-supported-review", start: 3, end: 4 },
    { kind: "outro", start: 5, end: 6 }], transitions: [{ boundaryIndex: 0, kind: "cut", duration: 0 }] });

it("reuses scene output conventions with exact dimensions and bounded safe text regions", () => {
  expect(VISUAL_OUTPUT_PROFILES.MOBILE_VERTICAL_9_16).toMatchObject({ width: 1080, height: 1920, aspectRatio: "9:16", resolution: "1080p", lod: "asset-native" });
  expect(VISUAL_OUTPUT_PROFILES.DESKTOP_16_9).toMatchObject({ width: 1920, height: 1080, aspectRatio: "16:9" });
  for (const p of Object.values(VISUAL_OUTPUT_PROFILES)) {
    const [l,t,r,b] = p.safeTextRegion; expect(l).toBeLessThan(r); expect(t).toBeLessThan(b);
    expect(p.safeTextRegion.every(v => v >= 0 && v <= 1)).toBe(true);
  }
  expect(ORGANHEAL_HEART_VISUAL_PRESET).toMatchObject({ particles: false, gameStyling: false, sourceMaterials: "preserve", geometry: "preserve" });
});
it("retains owner-selected roles and native heartbeat safety without granting approval", () => {
  const motion = manifest.productionHeartCandidates.find(c => c.id === "HEART_MOTION")!.ownerVisualSelection!;
  if (!motion.normalHeartbeat) throw new Error("Missing native heartbeat selection");
  expect(motion.normalHeartbeat.id).toBe(HEART_VISUAL_SAFETY_POLICY.motionPreset);
  expect(motion.normalHeartbeat.diseaseLabelAloneMayAlterMotion).toBe(false);
  expect(HEART_VISUAL_SAFETY_POLICY).toMatchObject({ patientFacing: false, executionAuthority: false, licenseClearance: "unresolved", clinicalApproval: "unreviewed", geometryMixing: false });
});
it("snapshots a reproducible recipe without mutating input or promoting structure addressability", () => {
  const input = recipe(), a = validateHeartVisualRecipe(input), b = validateHeartVisualRecipe(input);
  expect(a).toEqual(b); expect(a).not.toBe(input); expect(Object.isFrozen(a.cues)).toBe(true);
  expect(a.assets.map(x => x.assetVersion)).toEqual(["test-hero-candidate-v1","test-motion-candidate-v1"]);
  expect(a.cues.find(c => c.kind === "structure-focus")).toHaveProperty("addressability","requires-source-supported-review");
});
it("requires narration ducking and rejects music in clinical doctor previews", () => {
  expect(VISUAL_AUDIO_POLICY.narration).toBe("primary"); expect(VISUAL_AUDIO_POLICY.ducking.requiredUnderSpeech).toBe(true);
  expect(() => validateHeartVisualRecipe({ ...recipe(), exportIntent: "clinical-doctor-preview", music: "optional-ducked" })).toThrow("VISUAL_RECIPE_INVALID");
  expect(validateHeartVisualRecipe({ ...recipe(), exportIntent: "clinical-doctor-preview" }).music).toBe("disabled");
});
it.each([
  { usage: "patient-facing" }, { organ: "liver" }, { diseaseLabel: "tachycardia" }, { outputProfile: "custom" }, { duration: NaN },
  { assets: [{ ...recipe().assets[0], role: "HEART_MOTION_V1" }] },
  { assets: recipe().assets.map(a => ({ ...a, assetVersion: "same-version" })) },
  { assets: [{ ...recipe().assets[0], evidenceReferences: [] }] },
  { cues: [{ kind: "heartbeat", role: "HEART_MOTION_V1", motionPreset: "disease-driven", start: 0, end: 6 }] },
  { cues: [{ kind: "heartbeat", role: "HEART_MOTION_V1", motionPreset: "NORMAL_HEARTBEAT_V1", rate: 120, start: 0, end: 6 }] },
  { cues: [{ kind: "background-music", start: 0, end: 6 }] },
  { cues: [{ kind: "outro", start: 0, end: 7 }] },
  { transitions: [{ boundaryIndex: 0, kind: "morph", duration: .5 }] },
])("rejects unsupported policy/configuration %j", override => {
  expect(() => validateHeartVisualRecipe({ ...recipe(), ...override })).toThrow("VISUAL_RECIPE_INVALID");
});

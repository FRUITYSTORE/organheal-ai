import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import manifest from "../medical-assets/LICENSE_MANIFEST.json";
import { getHeartbeatMotionMaster } from "../lib/medical-motion/heartbeat-motion-master";
import { getHeartMasterVisual } from "../lib/medical-motion/heart-master-visual";

it("pins the selected separate motion source and reuses the exact locked visual configuration", () => {
  const m = getHeartbeatMotionMaster("HEARTBEAT_MOTION_MASTER_V1");
  const selection = manifest.productionHeartCandidates.find(c => c.id === "HEART_MOTION")!.ownerVisualSelection!;
  expect(m.preset.assetRole).toBe("HEART_MOTION_V1");
  expect(m.preset.sourceSha256).toBe("0e52a7fe26bb12a267796b532de2312b1e023d228b7e76b3e40c5c4314bcdc59");
  expect(selection.sourceSha256).toBe(m.preset.sourceSha256);
  expect(m.preset.sourceFile).toBe("source/Beating heart.glb");
  expect(m.visual).toBe(getHeartMasterVisual("HEART_MASTER_VISUAL_V1"));
  expect(m.preset.sourceSha256).not.toBe(m.visual.configuration.source.sha256);
  expect(Object.isFrozen(m.preset)).toBe(true);
  expect(() => getHeartbeatMotionMaster("HEART_HERO_V1")).toThrow("HEARTBEAT_MOTION_MASTER_UNAVAILABLE");
});
it("locks native armature cycle only with explicit safety and output identity", () => {
  const {preset,visual} = getHeartbeatMotionMaster("HEARTBEAT_MOTION_MASTER_V1");
  expect(preset).toMatchObject({ motionPreset: "NORMAL_HEARTBEAT_V1", sourceAction: "test", sourceCycle: [0,24], renderCycle: [0,23],
    repeatCount: 6, outputFrames: [1,144], fps: 24, durationSeconds: 6, sourceCurves: "unchanged", geometryOperations: [],
    geometryMixing: false, diseaseDrivenRateRhythmMutation: false, usage: "internal-review", patientFacing: false,
    licenseClearance: "unresolved", clinicalApproval: "unreviewed", motionVisualApproval: "owner-visual-approved", visualRole: "INTERNAL_CUTAWAY_HEARTBEAT_MASTER" });
  expect([visual.configuration.width,visual.configuration.height]).toEqual([1080,1920]);
  expect(preset.presentation).toMatchObject({ cameraScale: 1.18, saturation: .72, keyEnergyScale: .95, fillEnergyScale: 1.15, rimEnergyScale: .9 });
});
it("locks builder integrity without deformation or animation curve edits", () => {
  const {lock} = getHeartbeatMotionMaster("HEARTBEAT_MOTION_MASTER_V1");
  const source = readFileSync(resolve(lock.builderRef),"utf8");
  expect(createHash("sha256").update(source.replace(/\r\n/g,"\n")).digest("hex")).toBe(lock.builderSha256);
  expect(source).not.toMatch(/bpy\.ops\.(mesh|sculpt|transform)|keyframe_insert|keyframe_delete|nla_tracks\.new|import_scene\.fbx/);
});
it("rejects missing and substituted GLB before Blender import", () => {
  const root = mkdtempSync(join(tmpdir(),"motion-guard-"));
  try {
    const script = `import importlib.util,pathlib
s=importlib.util.spec_from_file_location('motion',${JSON.stringify(resolve("render/blender/heartbeat_motion_master.py"))})
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
p=pathlib.Path(${JSON.stringify(join(root,"Beating heart.glb"))})
for expected in ['MOTION_SOURCE_MISSING','MOTION_SOURCE_HASH_INVALID']:
 if expected.endswith('INVALID'): p.write_bytes(b'wrong asset')
 try: m.checked_configuration(p)
 except RuntimeError as e: assert str(e)==expected,str(e)
 else: raise AssertionError('source accepted')
assert 'bpy' not in __import__('sys').modules
`;
    const result = spawnSync(process.env.ORGANHEAL_TEST_PYTHON ?? "C:/Program Files/Blender Foundation/Blender 5.2/5.2/python/bin/python.exe",["-c",script],{encoding:"utf8"});
    expect(result.error).toBeUndefined(); expect(result.stderr).toBe(""); expect(result.status).toBe(0);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

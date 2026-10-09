import { expect, it } from "vitest";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { getHeartMasterVisual } from "../lib/medical-motion/heart-master-visual";
import config from "../render/blender/heart_hero_master.json";
import selected from "../medical-assets/heart-hero-selected-local-inventory.json";
import historical from "../medical-assets/heart-hero-local-inventory.json";
import manifest from "../medical-assets/LICENSE_MANIFEST.json";
import { VISUAL_OUTPUT_PROFILES, ORGANHEAL_HEART_VISUAL_PRESET } from "../lib/medical-motion/visual-foundation";

it("locks the approved polished visual without duplicating configuration or granting approval", () => {
  const visual = getHeartMasterVisual("HEART_MASTER_VISUAL_V1");
  expect(visual.configuration).toBe(config);
  expect(visual.lock).toMatchObject({ id: "HEART_MASTER_VISUAL_V1", version: "1", usage: "internal-review", patientFacing: false, licenseClearance: "unresolved" });
  expect(Object.isFrozen(visual.configuration.lighting)).toBe(true);
  expect(visual.configuration.materialPresentation).toEqual({ roughnessScale: .8, roughnessOffset: .2, specularScale: .45 });
  expect(visual.configuration.camera.safeOrganRectangle).toEqual([.08,.23,.92,.90]);
  expect(visual.lock.configurationSha256).toBe(createHash("sha256").update(JSON.stringify(config)).digest("hex"));
  expect(visual.lock.builderSha256).toBe(createHash("sha256").update(readFileSync(resolve(visual.lock.builderRef),"utf8").replace(/\r\n/g,"\n")).digest("hex"));
  expect(() => getHeartMasterVisual("unknown")).toThrow("HEART_MASTER_VISUAL_UNAVAILABLE");
});

it("separates the rejected historical hero from the selected exact local identity", () => {
  expect(historical).toMatchObject({ organHealRole: "MEDIUM_SHOT_VISUAL_REFERENCE_ONLY", historicalEvidence: true,
    ownerVisualDecision: "REJECTED_AS_PRODUCTION_HERO_MASTER", sourceModelSha256: "2091d877ce87b452f10dcddcd28ae04b6369d220728baddfb10341bed5e86bed" });
  expect(historical.files[0].filename).toBe("source/anatomisches+herz+3d-modell.fbx");
  expect(selected).toMatchObject({ organHealRole: "HEART_HERO_V1", sourceFile: "source/Heart.fbx", patientFacing: false,
    anatomicallyValidated: false, productionApproved: false, clinicalApproval: "unreviewed", licenseClearance: "unresolved",
    exactSketchfabArtifactIdentity: "UNRESOLVED", authorUploader: null, license: null, usage: ["internal-review"] });
  const selection = manifest.productionHeartCandidates.find(c => c.id === "HEART_HERO")!.ownerVisualSelection!;
  expect(selection.inventoryRef).toBe(config.inventoryRef);
  expect(selection.sourceSha256).toBe(selected.sourceModelSha256);
  expect(selected.sourceModelSha256).toBe(config.source.sha256);
  expect(selected.files.find(f => f.filename === selected.sourceFile)?.sha256).toBe(config.source.sha256);
  expect(Object.fromEntries(selected.files.filter(f => f.filename.startsWith("textures/")).map(f => [f.filename.slice(9),f.sha256]))).toEqual(config.source.textures);
  expect(selected.textures).toHaveLength(4);
  expect(selected.historicalReferenceInventory).toBe("medical-assets/heart-hero-local-inventory.json");
});

it("selects only the accepted hero with the foundation portrait profile and review status", () => {
  expect(config.preset).toBe("HEART_HERO_V1");
  const profile = VISUAL_OUTPUT_PROFILES.MOBILE_VERTICAL_9_16;
  expect([config.width,config.height]).toEqual([profile.width,profile.height]);
  expect(config.visualPreset).toBe(ORGANHEAL_HEART_VISUAL_PRESET.id);
  expect(config.background.charcoal).toBe(ORGANHEAL_HEART_VISUAL_PRESET.background.charcoal);
  expect(config).toMatchObject({ usage: "internal-review", patientFacing: false, licenseClearance: "unresolved", geometryOperations: [] });
  expect(config.source).toMatchObject({ filename: "Heart.fbx", vertices: 11281, triangles: 22562 });
  expect(config.source.sha256).toBe("3c117d9d212c5368897b70698c7d6d915868a2a0c7c2d31202a093a5e63e7761");
});
it("fails closed on missing or substituted source before importing Blender", () => {
  const directory = mkdtempSync(join(tmpdir(),"hero-guard-"));
  try {
    const python = process.env.ORGANHEAL_TEST_PYTHON ?? "C:/Program Files/Blender Foundation/Blender 5.2/5.2/python/bin/python.exe";
    const script = `import importlib.util,json,pathlib
spec=importlib.util.spec_from_file_location('hero',${JSON.stringify(resolve("render/blender/heart_hero_master.py"))})
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
c=json.loads(pathlib.Path(${JSON.stringify(resolve("render/blender/heart_hero_master.json"))}).read_text())
root=pathlib.Path(${JSON.stringify(directory)})
changed=json.loads(json.dumps(c));changed['materialPresentation']['roughnessOffset']=0.3
try: m.checked_files(changed,root/'Heart.fbx',root)
except RuntimeError as e: assert str(e)=='HERO_VISUAL_LOCK_INVALID'
else: raise AssertionError('changed visual accepted')
for expected in ['HERO_SOURCE_MISSING','HERO_SOURCE_HASH_INVALID']:
 if expected.endswith('INVALID'): (root/'Heart.fbx').write_bytes(b'substitute')
 try: m.checked_files(c,root/'Heart.fbx',root)
 except RuntimeError as e: assert str(e)==expected,(str(e),expected)
 else: raise AssertionError('source accepted')
assert 'bpy' not in __import__('sys').modules
print('GUARDS_PASS')`;
    const result = spawnSync(python,["-c",script],{encoding:"utf8"});
    expect(result.error).toBeUndefined(); expect(result.stderr).toBe("");
    expect(result.status).toBe(0); expect(result.stdout).toContain("GUARDS_PASS");
  } finally { rmSync(directory,{recursive:true,force:true}); }
});
it("limits builder operations to original import and scene presentation", () => {
  const source = readFileSync(resolve("render/blender/heart_hero_master.py"),"utf8");
  expect(source).toContain("bpy.ops.import_scene.fbx");
  expect(source).toContain("use_custom_normals=True");
  expect(source).not.toMatch(/bpy\.ops\.(mesh|sculpt|transform)|modifier_add|shade_smooth|vertices\[.*\]\.co\s*=/);
  expect(source).not.toContain("build_heart(");
});

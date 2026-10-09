import { expect,it } from "vitest";
import { CINEMATIC_CAMERA_V1,compileCinematicCamera } from "../lib/medical-motion/render/cinematic-camera";
import { HEART_CINEMATIC_EXPLAINER_V1 } from "../lib/medical-motion/cinematic-guidance";
import { readFileSync } from "node:fs";
const approach=HEART_CINEMATIC_EXPLAINER_V1.scenes[2].camera;
it("compiles bounded versioned camera presets without client transforms",()=>{
  expect(compileCinematicCamera(approach)).toMatchObject({preset:"GUIDED_APPROACH",version:"1",movement:"approach",maximumApproachRatio:1.15,
    maximumTranslationExtentsPerSecond:.4,maximumRotationDegreesPerSecond:0,rollDegrees:0,shake:false,penetration:"prohibited"});
  expect(CINEMATIC_CAMERA_V1.safeOrganRectangle).toEqual([.04,.16,.96,.96]);
  expect(CINEMATIC_CAMERA_V1.safeSubtitleRectangle[3]).toBeLessThan(CINEMATIC_CAMERA_V1.safeOrganRectangle[1]);
});
it.each([{zoomRatio:2},{zoomRatio:NaN},{contextMargin:0},{targetCoverage:1},{proximityInOrganExtents:.2},
  {duration:20},{easing:"linear"},{clipping:"allowed"},{roll:30},{fov:170},{matrix:[1,0,0]},{target:"heart.coronary.lad"}])("rejects unsafe camera input %j",change=>{
  expect(()=>compileCinematicCamera({...approach,...change})).toThrow("CINEMATIC_TIMELINE_INVALID");
});
it("executes source camera projection and penetration checks without geometry/animation edits",()=>{
  const python=readFileSync("render/blender/cinematic_master_executor.py","utf8");
  expect(python).toContain("CINEMATIC_CAMERA_FOV_INVALID");
  expect(python).toContain("CINEMATIC_CAMERA_PENETRATION");
  expect(python).toContain("CINEMATIC_CAMERA_SPEED_INVALID");
  expect(python).toContain("CINEMATIC_CAMERA_FRAMING_INVALID");
  expect(python).not.toMatch(/bpy\.ops\.(mesh|sculpt|transform)|keyframe_insert|nla_tracks|shape_key_add/);
});

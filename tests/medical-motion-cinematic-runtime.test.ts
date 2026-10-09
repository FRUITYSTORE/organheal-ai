import { expect, it } from "vitest";
import { resolveRuntimeOutputProfile, validateRuntimeOutput, runtimeFrameCount } from "../lib/medical-motion/composition/runtime-output";
import { CINEMATIC_MASTER_MODULES, resolveCinematicMaster, CINEMATIC_MASTER_SOURCE_PROFILES, authorizeCinematicMaster } from "../lib/medical-motion/cinematic-master-runtime";
import { sourceProfileSnapshot } from "../lib/medical-motion/source-profiles";

it("preserves the legacy timeline output and selects portrait only by exact version", () => {
  expect(resolveRuntimeOutputProfile("LEGACY_720P_25")).toMatchObject({ width:1280,height:720,fps:25,resolution:"720p",timelineVersion:"2" });
  const p=resolveRuntimeOutputProfile("CINEMATIC_PORTRAIT_1080X1920_24_V1");
  expect(p).toMatchObject({width:1080,height:1920,fps:24,aspect:"9:16",timelineVersion:"cinematic-1",internalReviewOnly:true});
  expect(validateRuntimeOutput(p)).toBe(p);
  expect(runtimeFrameCount(p.id,11.5)).toBe(276);
  expect(runtimeFrameCount("LEGACY_720P_25",6)).toBe(150);
  expect(()=>runtimeFrameCount("LEGACY_720P_25",11.5)).toThrow("OUTPUT_PROFILE_INVALID");
});
it.each(["unknown","MOBILE_VERTICAL_9_16","1080p",null])("fails closed for unregistered output %s", id=>{
  expect(()=>resolveRuntimeOutputProfile(id)).toThrow("OUTPUT_PROFILE_INVALID");
});
it.each([{fps:25},{width:1920},{height:1080},{aspect:"16:9"},{id:"LEGACY_720P_25"},{resolution:"720p"},{patientFacing:true}])("rejects output mismatch %j",change=>{
  expect(()=>validateRuntimeOutput({...resolveRuntimeOutputProfile("CINEMATIC_PORTRAIT_1080X1920_24_V1"),...change})).toThrow("OUTPUT_PROFILE_INVALID");
});
it("registers separate exact source-local masters, not canonical anatomy",()=>{
  const hero=resolveCinematicMaster("HEART_MASTER_VISUAL_V1","1"), motion=resolveCinematicMaster("HEARTBEAT_MOTION_MASTER_V1","1");
  expect(hero.sourceSha256).toBe("3c117d9d212c5368897b70698c7d6d915868a2a0c7c2d31202a093a5e63e7761");
  expect(motion.sourceSha256).toBe("0e52a7fe26bb12a267796b532de2312b1e023d228b7e76b3e40c5c4314bcdc59");
  expect(hero.sourceId).not.toBe(motion.sourceId);
  expect(motion).toMatchObject({motionPreset:"NORMAL_HEARTBEAT_V1",sourceAction:"test",sourceCycle:[0,24]});
  for(const m of Object.values(CINEMATIC_MASTER_MODULES)) expect(m).toMatchObject({patientFacing:false,usage:"internal-review",licenseClearance:"unresolved",clinicalApproval:"unreviewed",representation:"composite"});
  expect(()=>resolveCinematicMaster("unknown","1")).toThrow("MASTER_UNAVAILABLE");
  expect(()=>resolveCinematicMaster(hero.masterId,"latest")).toThrow("MASTER_UNAVAILABLE");
});
const hero=resolveCinematicMaster("HEART_MASTER_VISUAL_V1","1");
const selection=CINEMATIC_MASTER_SOURCE_PROFILES.resolve({profileId:"heart-hero-local-visual-review",profileVersion:"1"});
const request={masterId:hero.masterId,version:"1",sourceSha256:hero.sourceSha256,selection,
  runtimeOutputProfileId:"CINEMATIC_PORTRAIT_1080X1920_24_V1",mode:"development",usage:"internal-review",patientFacing:false,
  sourcePath:"/missing/Heart.fbx",repositoryRoot:process.cwd()};
it.each([{patientFacing:true},{usage:"patient-facing"},{mode:"production"},{selection:{}},{selection:sourceProfileSnapshot(selection)},
  {selection:CINEMATIC_MASTER_SOURCE_PROFILES.resolve({profileId:"heart-native-cutaway-visual-review",profileVersion:"1"})},
  {disease:"tachycardia"},{retarget:true},{merge:true},{morph:true}])("rejects unauthorized master request %j",async change=>{
  await expect(authorizeCinematicMaster({...request,...change})).rejects.toThrow("MASTER_AUTHORITY_INVALID");
});
it("checks actual source bytes before issuing readiness",async()=>{
  await expect(authorizeCinematicMaster(request)).rejects.toThrow("MASTER_SOURCE_INVALID");
  await expect(authorizeCinematicMaster({...request,sourceSha256:"0".repeat(64)})).rejects.toThrow("MASTER_SOURCE_INVALID");
});
it("rejects old output profile for a cinematic master",async()=>{
  await expect(authorizeCinematicMaster({...request,runtimeOutputProfileId:"LEGACY_720P_25"})).rejects.toThrow("OUTPUT_PROFILE_INVALID");
});

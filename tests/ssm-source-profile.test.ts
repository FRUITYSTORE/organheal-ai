import { expect, it } from "vitest";
import { SSM_HEART_SOURCE_PROFILE as profile } from "../lib/medical-motion/organs/heart/ssm-source-profile";
import { SSM_HEART_CANDIDATE as module } from "../lib/medical-motion/organs/heart/ssm-heart-candidate";
import { SOURCE_PROFILES, sourceProfileSnapshot, resolveStoredSourceProfile, checkSourceProfileCohesion, createSourceProfileRegistry } from "../lib/medical-motion/source-profiles";
import { WHOLE_BODY_ANATOMY } from "../lib/medical-motion/whole-body-anatomy";
const selection=SOURCE_PROFILES.resolve({profileId:profile.profileId,profileVersion:profile.profileVersion});
const refs={structures:profile.structures.map(s=>s.structureId),labels:[],cameraTargets:["CAM_SSM_REVIEW_VENTRICLES"],usage:"internal-review" as const};
it("binds exact source/asset identity and deterministic fingerprint",()=>{
 const snapshot=sourceProfileSnapshot(selection);
 expect(snapshot).toMatchObject({profileId:"ssm-heart-internal-review",profileVersion:"1",sourceId:"zenodo-4506463",sourceVersion:"v2",assetVersion:module.assetVersion,anatomyVersion:module.anatomyVersion,usage:["internal-review"]});
 expect(snapshot.fingerprint).toMatch(/^[a-f0-9]{64}$/);
 const reversed=createSourceProfileRegistry([{...profile,structures:[...profile.structures].reverse()}]);
 expect(sourceProfileSnapshot(reversed.resolve({profileId:profile.profileId,profileVersion:"1"}))).toEqual(snapshot);
 expect(profile.structures).toHaveLength(5);
 expect(checkSourceProfileCohesion(module,selection,WHOLE_BODY_ANATOMY,refs).structureSources).toHaveLength(5);
});
it("rejects wrong identity, camera, patient usage and copied authority",()=>{
 for(const key of ["sourceId","sourceVersion","assetVersion","anatomyVersion"] as const) expect(()=>resolveStoredSourceProfile({...sourceProfileSnapshot(selection),[key]:"wrong"},SOURCE_PROFILES)).toThrow("SOURCE_PROFILE_INVALID");
 expect(()=>checkSourceProfileCohesion(module,selection,WHOLE_BODY_ANATOMY,{...refs,usage:"patient-facing"})).toThrow("SOURCE_PROFILE_INVALID");
 expect(()=>checkSourceProfileCohesion(module,selection,WHOLE_BODY_ANATOMY,{...refs,cameraTargets:["CAM_BP3D_REVIEW_CHAMBERS"]})).toThrow("SOURCE_PROFILE_INVALID");
 expect(()=>checkSourceProfileCohesion(module,structuredClone(selection),WHOLE_BODY_ANATOMY,refs)).toThrow("SOURCE_PROFILE_INVALID");
 for(const id of ["heart.myocardium","heart.septum.interventricular"] as const) expect(()=>checkSourceProfileCohesion(module,selection,WHOLE_BODY_ANATOMY,{...refs,structures:[id]})).toThrow("SOURCE_PROFILE_INVALID");
});

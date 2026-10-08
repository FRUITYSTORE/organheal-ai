import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {profileFixture} from "./helpers/source-profile-fixture";
import {createSourceProfileRegistry,readSourceProfile,sourceProfileSnapshot,checkSourceProfileCohesion,anatomyRenderIdentityForProfile,SOURCE_PROFILES} from "../lib/medical-motion/source-profiles";
import {compileMedicalScene,canonicalSceneJson,DEFAULT_SCENE_PRESENTATION} from "../lib/medical-motion/scene-compiler";
import {MEDICAL_MECHANISMS} from "../lib/medical-motion/mechanism-definitions";
import {WHOLE_BODY_ANATOMY} from "../lib/medical-motion/whole-body-anatomy";
import {reusableArtifactIdentity} from "../lib/medical-motion/artifacts/reuse";
import type {AnatomySourceProfile} from "../lib/medical-motion/contracts/source-profile";
const candidate={mechanismId:"leftVentricularPressureLoad",mechanismVersion:"1"};
function setup(edit?:(p:AnatomySourceProfile)=>void){const {module,profile}=profileFixture();edit?.(profile);
  const registry=createSourceProfileRegistry([profile]),selected=registry.resolve({profileId:profile.profileId,profileVersion:profile.profileVersion});
  const context={sourceProfile:selected,cameraTargets:["CAM_LV_APPROACH"],registry:MEDICAL_MECHANISMS,getModule:()=>module,catalog:WHOLE_BODY_ANATOMY,
    safety:{allowVideo:true as const,level:"none" as const},mode:"development" as const,claim:"possible-mechanism" as const,
    evidence:[{kind:"assessment-response" as const,code:"clinical-message-provided",origin:"server-intake" as const,assertion:"present" as const,evidenceRef:"TEST-ONLY-EVIDENCE"}]};
  return {module,profile,registry,selected,context};}
function compiled(edit?:(p:AnatomySourceProfile)=>void){const t=setup(edit),r=compileMedicalScene(candidate,t.context);expect(r.ok).toBe(true);if(!r.ok)throw Error(r.reasons.join(" "));return r.compiled;}
describe("trusted source profiles and source-coherent compiler",()=>{
  it("accepts registry-issued authority and freezes a detached bounded definition",()=>{const t=setup();t.profile.sourceId="changed";expect(readSourceProfile(t.selected).sourceId).not.toBe("changed");expect(Object.isFrozen(readSourceProfile(t.selected).structures)).toBe(true);expect(compileMedicalScene(candidate,t.context).ok).toBe(true);});
  it.each([{},null,{profileId:"unknown",profileVersion:"1"},{profileId:"TEST-coherent-heart",profileVersion:"latest"}])("unknown profile/version cannot resolve %#",v=>{const t=setup();expect(()=>t.registry.resolve(v as never)).toThrow();});
  it("no research candidate is registered in the active registry",()=>{expect(()=>SOURCE_PROFILES.resolve({profileId:"BodyParts3D",profileVersion:"4.0"})).toThrow();});
  it("JSON copy cannot mint authority",()=>{const t=setup();expect(()=>readSourceProfile(JSON.parse(JSON.stringify(t.selected)))).toThrow("SOURCE_PROFILE_INVALID");expect(compileMedicalScene(candidate,{...t.context,sourceProfile:structuredClone(t.selected)}).ok).toBe(false);});
  it.each(["organId","sourceId","sourceVersion","assetVersion","anatomyVersion"] as const)("wrong %s fails exact binding",key=>{const t=setup(p=>{if(key!=="organId")p[key]="wrong";});if(key==="organId")t.module.id="wrong";expect(compileMedicalScene(candidate,t.context).ok).toBe(false);});
  it.each(["required","highlight","label","representation","source","camera","cavity","myocardium"])("rejects %s borrowing/substitution",kind=>{
    const t=setup(p=>{if(kind==="required"||kind==="highlight"){p.structures=p.structures.filter(s=>s.structureId!=="heart.aorta");p.labels=p.labels.filter(id=>id!=="heart.aorta");}
      if(kind==="label")p.labels=p.labels.filter(id=>id!=="heart.leftVentricle");if(kind==="representation"||kind==="cavity")p.structures=p.structures.map(s=>s.structureId==="heart.leftVentricle"?{...s,representation:kind==="cavity"?"cavity":"wall"}:s);});
    if(kind==="source")t.module.anatomyRegistry=t.module.anatomyRegistry.map(e=>e.id==="heart.rightAtrium"?{...e,provenance:{...e.provenance!,sourceId:"other"}}:e);
    if(kind==="camera")t.context.cameraTargets=["unavailable"];
    expect(compileMedicalScene(kind==="myocardium"?{mechanismId:"myocardialOxygenDemandSupply",mechanismVersion:"1"}:candidate,t.context).ok).toBe(false);
  });
  it("valid camera and labels are permitted but arbitrary labels/landmarks are rejected",()=>{
    const t=setup(),references={structures:["heart.leftVentricle" as const],labels:["heart.leftVentricle" as const],cameraTargets:["CAM_LV_APPROACH"],usage:"internal-review" as const};
    expect(checkSourceProfileCohesion(t.module,t.selected,WHOLE_BODY_ANATOMY,references).sourceProfile.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(()=>checkSourceProfileCohesion(t.module,t.selected,WHOLE_BODY_ANATOMY,{...references,labels:["heart.myocardium"]})).toThrow();
    t.module.landmarks=[];expect(()=>checkSourceProfileCohesion(t.module,t.selected,WHOLE_BODY_ANATOMY,references)).toThrow();
  });
  it("mixed-source non-highlighted geometry fails even though highlighted anatomy matches",()=>{
    const t=setup();t.module.anatomyRegistry=t.module.anatomyRegistry.map(e=>e.id==="heart.rightAtrium"?{...e,provenance:{...e.provenance!,sourceId:"organheal-development",sourceVersion:t.module.assetVersion}}:e);
    expect(compileMedicalScene(candidate,t.context).ok).toBe(false);
  });
  it("internal-review profile never grants patient approval or weakens urgent triage",()=>{
    const t=setup();expect(compileMedicalScene(candidate,{...t.context,mode:"production"}).ok).toBe(false);
    expect(compileMedicalScene(candidate,{...t.context,safety:{allowVideo:false,level:"urgent",response:null,matchedSignalIds:[]}})).toMatchObject({ok:false,reasons:["Safety Gate blocks visualization."]});
    expect(t.module.assetStatus).toBe("development-placeholder");expect(t.module.anatomicallyValidated).toBe(false);
  });
  it.each(["license","clinical","coverage","real-asset"])("profile cannot override %s safety gates",kind=>{
    const t=setup();const entry=t.module.anatomyRegistry.find(e=>e.id==="heart.leftVentricle")!;
    if(kind==="license")entry.provenance!.licenseReview.status="rejected";
    if(kind==="clinical")entry.assessment!.clinicalApprovalStatus="unreviewed";
    if(kind==="coverage")entry.coverage.unknownRegions=["TEST-UNKNOWN"];
    const r=compileMedicalScene(candidate,{...t.context,additionalRequirements:{"heart.leftVentricle":{requireClinicalApproval:kind==="clinical",completeCoverage:kind==="coverage"}},...(kind==="real-asset"?{mode:"production" as const}:{})});
    expect(r.ok).toBe(false);
  });
  it("same profile is deterministic; id/version/definition changes isolate base and cache",()=>{
    const a=compiled(),b=compiled();expect(a.baseFingerprint).toBe(b.baseFingerprint);
    for(const edit of [(p:AnatomySourceProfile)=>{p.profileId="TEST-other";},(p:AnatomySourceProfile)=>{p.profileVersion="2";},(p:AnatomySourceProfile)=>{p.evidenceRefs=["TEST-CHANGED-EVIDENCE"];}]){
      const c=compiled(edit);expect(c.baseFingerprint).not.toBe(a.baseFingerprint);
      expect(reusableArtifactIdentity(c,"a".repeat(64),"video")!.key).not.toBe(reusableArtifactIdentity(a,"a".repeat(64),"video")!.key);
    }
    expect(reusableArtifactIdentity(a,"a".repeat(64),"video")!.sourceProfile).toEqual(a.scene.sourceProfile);
  });
  it("legacy scene/base/cache projections retain exact v1 hash construction",()=>{
    const t=setup(),{sourceProfile:_profile,cameraTargets:_camera,...legacy}=t.context,r=compileMedicalScene(candidate,legacy);
    expect(r.ok).toBe(true);if(!r.ok)throw Error("TEST_COMPILER");
    expect(r.compiled.scene).not.toHaveProperty("sourceProfile");
    const {outputProfile,overlaySlots,...base}=r.compiled.scene;
    const hash=(v:unknown)=>createHash("sha256").update(canonicalSceneJson(v)).digest("hex");
    expect(r.compiled.baseFingerprint).toBe(hash(base));
    const key=reusableArtifactIdentity(r.compiled,"a".repeat(64),"video")!,{key:_key,...core}=key;
    expect(Object.keys(key)).toHaveLength(10);expect(key.key).toBe(hash({reuseIdentityVersion:"1",...core}));
    expect(key.key).not.toBe(reusableArtifactIdentity(compiled(),"a".repeat(64),"video")!.key);
  });
  it("profile sets have stable canonical binding fingerprints",()=>{const a=setup(),b=setup(p=>{p.structures=[...p.structures].reverse();p.labels=[...p.labels].reverse();p.cameraTargets=[...p.cameraTargets].reverse();});expect(sourceProfileSnapshot(a.selected)).toEqual(sourceProfileSnapshot(b.selected));expect(anatomyRenderIdentityForProfile(a.module,a.selected,WHOLE_BODY_ANATOMY).sources).toHaveLength(1);});
});

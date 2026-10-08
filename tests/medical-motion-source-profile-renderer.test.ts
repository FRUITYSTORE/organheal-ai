import {installTestOrganModuleResolution} from "./helpers/organ-module-resolution";
import {describe,it,expect,vi} from "vitest";
import {profileFixture} from "./helpers/source-profile-fixture";
import {contextContent} from "./helpers/medical-motion-context";
import {createSourceProfileRegistry} from "../lib/medical-motion/source-profiles";
import * as modules from "../lib/medical-motion/organ-modules";
import {prepareExplanationAuthorization,readExplanationAuthorization} from "../lib/symptom-explanation/explanation-authorization";
import {renderHeartScene} from "../lib/medical-motion/render/blender-renderer";
import * as processBoundary from "../lib/medical-motion/render/blender-process";
describe("renderer source profile invariants before process/file work",()=>{
  function prepare(){const {module,profile}=profileFixture();installTestOrganModuleResolution(module);
    const selected=createSourceProfileRegistry([profile]).resolve({profileId:profile.profileId,profileVersion:profile.profileVersion}),c=contextContent();
    const prepared=prepareExplanationAuthorization({clinical:c.clinical,plan:c.candidatePlan,sceneIndex:0},{sourceProfile:selected,clinicalContextId:"TEST-CONTEXT",assetVersion:c.assetVersion,mode:"development",outputPath:"test.mp4"});
    if(!("ok" in prepared))throw Error(prepared.message);
    const request=readExplanationAuthorization(prepared.authorization)!.request;
    return {module,request,prepared,options:{mode:"development" as const,clinicalAuthorization:prepared.authorization,explanationPlan:request.explanationPlan}};}
  it.each(["profileId","profileVersion","fingerprint","sourceVersion"])("renderer rejects changed %s without Blender",async key=>{
    const t=prepare(),spy=vi.spyOn(processBoundary,"runBlenderProcess");
    if(key==="sourceVersion")(t.request.scene.anatomyIdentity!.sources[0] as {sourceVersion:string}).sourceVersion="changed";
    else (t.request.scene.sourceProfile as unknown as Record<string,string>)[key]="changed";
    expect(await renderHeartScene(t.request.scene,"test.mp4",t.options)).toMatchObject({status:"failed"});expect(spy).not.toHaveBeenCalled();
  });
  it("post-authorization non-highlighted source drift fails before Blender",async()=>{
    const t=prepare(),spy=vi.spyOn(processBoundary,"runBlenderProcess");
    t.module.anatomyRegistry=t.module.anatomyRegistry.map(e=>e.id==="heart.rightAtrium"?{...e,provenance:{...e.provenance!,sourceId:"other"}}:e);
    expect(await renderHeartScene(t.request.scene,"test.mp4",t.options)).toMatchObject({status:"failed"});expect(spy).not.toHaveBeenCalled();
  });
  it("generic scene cannot claim a trusted profile without server authorization",async()=>{
    const t=prepare(),spy=vi.spyOn(processBoundary,"runBlenderProcess");
    expect(await renderHeartScene(t.request.scene,"test.mp4",{mode:"development"})).toMatchObject({status:"failed"});expect(spy).not.toHaveBeenCalled();
  });
  it("valid authorized coherent fixture passes renderer guards to the stub process boundary",async()=>{
    const t=prepare(),spy=vi.spyOn(processBoundary,"runBlenderProcess").mockResolvedValue({outcome:"process-error",exitCode:null,
      stdout:"",stderr:"",reportedRenderOk:false,terminationConfirmed:true,durationSeconds:0});
    expect(await renderHeartScene(t.request.scene,"test.mp4",t.options)).toMatchObject({errorCode:"BLENDER_FAILED"});
    expect(spy).toHaveBeenCalledOnce();
  });
});

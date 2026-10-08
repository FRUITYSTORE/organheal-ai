import {describe,it,expect,vi} from "vitest";
import {profileFixture} from "./helpers/source-profile-fixture";
import {contextContent} from "./helpers/medical-motion-context";
import {createSourceProfileRegistry,sourceProfileSnapshot} from "../lib/medical-motion/source-profiles";
import * as modules from "../lib/medical-motion/organ-modules";
import * as authority from "../lib/symptom-explanation/explanation-authorization";
import {validateExplanationRenderRequest} from "../lib/medical-motion/render/explanation-renderer";
import {computeRenderSignature} from "../lib/medical-motion/render-signature";
import {reusableArtifactIdentity} from "../lib/medical-motion/artifacts/reuse";
function issued(){const {module,profile}=profileFixture();vi.spyOn(modules,"getOrganModule").mockReturnValue(module);
  const registry=createSourceProfileRegistry([profile]),selected=registry.resolve({profileId:profile.profileId,profileVersion:profile.profileVersion}),c=contextContent();
  const options={clinicalContextId:"TEST-ONLY-CONTEXT",assetVersion:c.assetVersion,mode:"development" as const,outputPath:"test.mp4",sourceProfile:selected};
  const input={clinical:c.clinical,plan:c.candidatePlan,sceneIndex:0};
  const result=authority.prepareExplanationAuthorization(input,options);if(!("ok" in result))throw Error(result.message);
  return {result,options,input,selected,module};}
describe("source profile authorization and explicit cache identity",()=>{
  it("valid profile binds authorized scene, signature and cache fingerprint",()=>{
    const t=issued(),checked=validateExplanationRenderRequest(t.result.authorization,t.options.outputPath,{mode:"development"});
    expect("ok" in checked).toBe(true);if(!("ok" in checked))throw Error("TEST-AUTH");
    const snapshot=sourceProfileSnapshot(t.selected),cache=reusableArtifactIdentity(checked.request.medicalScene!,checked.request.renderSignature,"video")!;
    expect(checked.request.scene.sourceProfile).toEqual({profileId:snapshot.profileId,profileVersion:snapshot.profileVersion,fingerprint:snapshot.fingerprint});
    expect(cache.sourceProfile).toEqual(checked.request.scene.sourceProfile);expect(Object.keys(cache)).toHaveLength(11);
    expect(authority.readExplanationAuthorization(t.result.authorization)!.options.sourceProfile).toBe(t.selected);
  });
  it.each(["profileId","profileVersion","fingerprint","sourceId","sourceVersion"])("tampered %s invalidates authorization",key=>{
    const t=issued(),snapshot=authority.readExplanationAuthorization(t.result.authorization)!;
    if(["profileId","profileVersion","fingerprint"].includes(key))(snapshot.request.scene.sourceProfile as unknown as Record<string,string>)[key]="changed";
    else (snapshot.request.scene.anatomyIdentity!.sources[0] as unknown as Record<string,string>)[key]="changed";
    vi.spyOn(authority,"readExplanationAuthorization").mockReturnValue(snapshot);
    expect(validateExplanationRenderRequest(t.result.authorization,t.options.outputPath,{mode:"development"})).toMatchObject({status:"failed"});
  });
  it("snapshot mutation cannot change stored authorization and copied tokens are rejected",()=>{
    const t=issued(),snapshot=authority.readExplanationAuthorization(t.result.authorization)!;snapshot.request.scene.sourceProfile!.profileVersion="changed";
    expect(authority.readExplanationAuthorization(t.result.authorization)!.request.scene.sourceProfile!.profileVersion).toBe("1");
    expect(authority.prepareExplanationAuthorization(t.input,{...t.options,sourceProfile:structuredClone(t.selected)})).not.toHaveProperty("authorization");
    expect(authority.prepareExplanationAuthorization({...t.input,sourceProfile:t.options.sourceProfile},t.options)).not.toHaveProperty("authorization");
  });
  it("render signatures include profile id, version and immutable binding fingerprint",()=>{
    const t=issued(),request=authority.readExplanationAuthorization(t.result.authorization)!.request;
    const baseline=computeRenderSignature(request.scene,request.assetVersion,request.medicalScene);
    for(const key of ["profileId","profileVersion","fingerprint"] as const){const scene=structuredClone(request.scene);scene.sourceProfile![key]="changed";expect(computeRenderSignature(scene,request.assetVersion,request.medicalScene)).not.toBe(baseline);}
  });
  it("unbound generic development behavior and urgent safety ordering remain valid",()=>{
    const t=issued(),{sourceProfile,...legacy}=t.options;
    expect(authority.prepareExplanationAuthorization(t.input,legacy)).toHaveProperty("authorization");
    expect(authority.prepareExplanationAuthorization({...t.input,clinical:{message:"I have chest pain.",language:"en"}},t.options)).toMatchObject({errorCode:"UNSAFE_FOR_VIDEO_FIRST"});
    expect(authority.prepareExplanationAuthorization(t.input,{...t.options,mode:"production"})).not.toHaveProperty("authorization");
  });
});

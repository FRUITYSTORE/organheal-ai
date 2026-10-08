import { describe, it, expect } from "vitest";
import { installTestOrganModuleResolution } from "./helpers/organ-module-resolution";
import { profileFixture } from "./helpers/source-profile-fixture";
import { contextContent } from "./helpers/medical-motion-context";
import * as modules from "../lib/medical-motion/organ-modules";
import { createSourceProfileRegistry } from "../lib/medical-motion/source-profiles";
import { prepareExplanationAuthorization, readExplanationAuthorization } from "../lib/symptom-explanation/explanation-authorization";
import { renderHeartScene } from "../lib/medical-motion/render/blender-renderer";
describe("test module resolution remains fail-closed", () => {
 it.each([["heart","latest"],["heart","heart-v2"],["lungs","heart-v2-development"],["heart","unknown"]])("rejects %s/%s", (organ, version) => {
  const {module}=profileFixture(); installTestOrganModuleResolution(module);
  expect(modules.getOrganModuleForAsset(organ,version)).toBeNull();
 });
 it("same exact module for legacy and exact fixture lookups",()=>{
  const {module}=profileFixture();installTestOrganModuleResolution(module);
  expect(modules.getOrganModule(module.id)).toBe(module);
  expect(modules.getOrganModuleForAsset(module.id,module.assetVersion)).toBe(module);
  expect(modules.getOrganModule("lungs")).toBeNull();
 });
 it("profile cannot override exact selected asset",()=>{
  const {module,profile}=profileFixture();installTestOrganModuleResolution(module);profile.assetVersion="wrong-version";
  const sourceProfile=createSourceProfileRegistry([profile]).resolve({profileId:profile.profileId,profileVersion:profile.profileVersion}),c=contextContent();
  expect(prepareExplanationAuthorization({clinical:c.clinical,plan:c.candidatePlan,sceneIndex:0},
   {clinicalContextId:"test",assetVersion:module.assetVersion,mode:"development",outputPath:"test.mp4",sourceProfile})).not.toHaveProperty("authorization");
 });
 it("clinical authorization cannot swap server render asset",async()=>{
  const {module}=profileFixture();installTestOrganModuleResolution(module);const c=contextContent();
  const p=prepareExplanationAuthorization({clinical:c.clinical,plan:c.candidatePlan,sceneIndex:0},
   {clinicalContextId:"test",assetVersion:module.assetVersion,mode:"development",outputPath:"test.mp4"});
  if(!("ok" in p))throw Error(p.message);const a=readExplanationAuthorization(p.authorization)!;
  expect(await renderHeartScene(a.request.scene,"test.mp4",{mode:"development",assetVersion:"wrong-version",clinicalAuthorization:p.authorization,explanationPlan:a.request.explanationPlan}))
   .toMatchObject({status:"failed",errorCode:"INVALID_SCENE"});
 });
});

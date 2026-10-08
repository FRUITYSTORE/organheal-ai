import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { compileExplanationScene } from "../lib/symptom-explanation/compile-explanation-scene";
import { prepareExplanationAuthorization, readExplanationAuthorization } from "../lib/symptom-explanation/explanation-authorization";
import { contextContent } from "./helpers/medical-motion-context";
import { profileFixture } from "./helpers/source-profile-fixture";
import { installTestOrganModuleResolution } from "./helpers/organ-module-resolution";
import { createSourceProfileRegistry } from "../lib/medical-motion/source-profiles";
import { reusableArtifactIdentity } from "../lib/medical-motion/artifacts/reuse";
it("accepted parent and exact routing produce identical development requests and cache identity",async()=>{
 const root=mkdtempSync(path.join(tmpdir(),"organheal-routing-baseline-"));
 const file=path.join(root,"parent-compiler.ts");
 const parent=execFileSync("git",["show","242f27fd9ae5c643ef9129faf19d1ef32ff0e8bd:lib/symptom-explanation/compile-explanation-scene.ts"],{encoding:"utf8"});
 writeFileSync(file,parent.replace('"./asset-readiness"',JSON.stringify(path.resolve("lib/symptom-explanation/asset-readiness.ts").replaceAll('\\','/'))));
 const baseline=await import(/* @vite-ignore */ file) as {compileExplanationScene:typeof compileExplanationScene};
 const c=contextContent(),{module,profile}=profileFixture();installTestOrganModuleResolution(module);
 const registry=createSourceProfileRegistry([profile]);
 for(const sourceProfile of [undefined,registry.resolve({profileId:profile.profileId,profileVersion:profile.profileVersion})]){
  const prepared=prepareExplanationAuthorization({clinical:c.clinical,plan:c.candidatePlan,sceneIndex:0},
   {clinicalContextId:"TEST-COMPATIBILITY",assetVersion:c.assetVersion,mode:"development",outputPath:"test.mp4",...(sourceProfile?{sourceProfile}:{})});
  if(!("ok" in prepared))throw Error(prepared.message);const gate=readExplanationAuthorization(prepared.authorization)!.compilationContext;
  const config={sceneIndex:0,assetVersion:c.assetVersion};const before=baseline.compileExplanationScene(c.candidatePlan,config,gate),after=compileExplanationScene(c.candidatePlan,config,gate);
  expect(after).toEqual(before);if(!after.ok||!before.ok)throw Error("baseline unavailable");
  expect(after.request.renderSignature).toBe(before.request.renderSignature);
  expect(after.request.medicalScene!.baseFingerprint).toBe(before.request.medicalScene!.baseFingerprint);
  expect(after.request.medicalScene!.outputFingerprint).toBe(before.request.medicalScene!.outputFingerprint);
  expect(reusableArtifactIdentity(after.request.medicalScene!,after.request.renderSignature,"video"))
   .toEqual(reusableArtifactIdentity(before.request.medicalScene!,before.request.renderSignature,"video"));
 }
});

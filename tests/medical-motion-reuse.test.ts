import {installTestOrganModuleResolution} from "./helpers/organ-module-resolution";
import { randomUUID,createHash } from "node:crypto";
import { afterEach,describe,expect,it,vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DurableBackgroundJob } from "../lib/jobs/background-job-worker.repository";
import { compileMedicalScene,DEFAULT_SCENE_PRESENTATION } from "../lib/medical-motion/scene-compiler";
import { reusableArtifactIdentity,cacheSourceLicenseCompatible,cacheAnatomyVerified,ReusableArtifactCache,ReusableArtifactRepository } from "../lib/medical-motion/artifacts/reuse";
import { CROSS_BODY_FIXTURES,MECHANISM_TEST_CATALOG } from "./helpers/whole-body-mechanism-fixtures";
import { withTestAnatomyReview } from "./helpers/anatomy-review-fixture";
import { MEDICAL_MECHANISMS } from "../lib/medical-motion/mechanism-definitions";
import { createMechanismRegistry } from "../lib/medical-motion/mechanism-registry";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import * as modules from "../lib/medical-motion/organ-modules";
import { getMechanismAnatomy } from "../lib/symptom-explanation/anatomy-resolver";
import { prepareExplanationAuthorization } from "../lib/symptom-explanation/explanation-authorization";
import { mp4Fixture } from "./fixtures/medical-motion-artifact";
import type { MedicalMechanism } from "../lib/medical-motion/contracts/mechanism";
import type { OrganModule } from "../lib/medical-motion/contracts/organ-module";

function moduleFor(m:MedicalMechanism):OrganModule {return withTestAnatomyReview({...HEART_ORGAN_MODULE,id:m.affectedOrgans[0],anatomyRegistry:Object.entries(m.requiredAnatomy).map(([id,r])=>({
  id:id as `${string}.${string}`,kind:"organ",availability:"present",representation:r!.representations![0],verification:"verified",blenderObject:"TEST_ONLY_NO_GEOMETRY",fidelity:"reference-derived",
  coverage:{verifiedRegions:["whole"],unknownRegions:[],excludedRegions:[],evidenceRefs:["TEST ONLY COVERAGE"]}}))});}
function compile(m=structuredClone(MEDICAL_MECHANISMS.definitions[1]),module=moduleFor(m),mode:"development"|"production"="development") {
  const result=compileMedicalScene({mechanismId:m.mechanismId,mechanismVersion:m.version},{registry:createMechanismRegistry([m],MECHANISM_TEST_CATALOG),getModule:()=>module,catalog:MECHANISM_TEST_CATALOG,
    safety:{allowVideo:true,level:"none"},mode,claim:"possible-mechanism",evidence:m.requiredEvidence.map(r=>({...r,origin:r.origin??"server-intake",assertion:"present",evidenceRef:"TEST ONLY SERVER"}))});
  if(!result.ok)throw Error(result.reasons.join(" "));return result.compiled;
}
function authority() {
  const ctx=randomUUID(),a=getMechanismAnatomy("leftVentricularPressureLoad");
  const prepared=prepareExplanationAuthorization({clinical:{message:"I feel tired.",language:"en"},sceneIndex:0,plan:{planVersion:"1",organ:a.organ,topic:"patient text stays outside base",safety:{level:"none"},
    mechanism:{id:"leftVentricularPressureLoad",evidence:"possible"},anatomy:{primaryFocus:a.primaryFocus,structures:a.structures,requirements:a.requirements},documentedFindings:[],scenes:[{type:"mechanismExplanation"},{type:"limitationsAndNextSteps"}]}},
    {clinicalContextId:ctx,assetVersion:HEART_ORGAN_MODULE.assetVersion,mode:"development",outputPath:"render.mp4"});
  if(!("ok" in prepared))throw Error(prepared.message);
  const job={id:randomUUID(),userId:randomUUID(),attemptToken:randomUUID(),type:"medical-motion-render",status:"running",payload:{executionContextId:ctx,sceneIndex:0}} as DurableBackgroundJob;
  return {job,authorization:prepared.authorization};
}
const hash="a".repeat(64),signal=()=>new AbortController().signal;
describe("generic cache identity and current safety",()=>{
  afterEach(()=>vi.restoreAllMocks());
  it.each([structuredClone(MEDICAL_MECHANISMS.definitions[1]),...CROSS_BODY_FIXTURES].map(m=>[m.mechanismId,m] as const))("supports %s TEST fixture without patient readiness",(_,m)=>{
    const a=compile(m),key=reusableArtifactIdentity(a,hash,"video")!;
    expect(key.scope).toBe("internal-review");expect(key.key).toMatch(/^[a-f0-9]{64}$/);expect(key.mechanismId).toBe(m.mechanismId);
    expect(key).toEqual(reusableArtifactIdentity(compile(m),hash,"video"));
    expect(cacheSourceLicenseCompatible(a,()=>moduleFor(m),MECHANISM_TEST_CATALOG)).toBe(true);
  });
  it.each(["mechanism","anatomy","asset","visual-state","renderer"])("version/state change %s cannot reuse the old key",kind=>{
    const m=structuredClone(MEDICAL_MECHANISMS.definitions[1]),module=moduleFor(m),before=reusableArtifactIdentity(compile(m,module),hash,"video")!;
    if(kind==="mechanism")m.version="2";if(kind==="anatomy")module.anatomyVersion="TEST-2";if(kind==="asset")module.assetVersion="TEST-2";if(kind==="visual-state")m.visualizationProfile.visualEmphasis="subtle";
    const after=reusableArtifactIdentity(compile(m,module),kind==="renderer"?"b".repeat(64):hash,"video")!;
    expect(after.key).not.toBe(before.key);
  });
  it.each(["sceneDslVersion","compilerContractVersion","patientIndependentBase","usage"])("copied or compatibility-mutated %s DSL is ineligible",key=>{
    const value=structuredClone(compile());Object.assign(value.scene,{[key]:"mutated"});expect(reusableArtifactIdentity(value,hash,"video")).toBeNull();
  });
  it("patient-specific geometry and forged reusable claims cannot enter lookup identity",()=>{
    expect(reusableArtifactIdentity({...compile(),reuse:{classification:"patient-specific-render-required",reasons:[]}},hash,"video")).toBeNull();
  });
  it("overlay values, account identifiers, text and paths never enter identity",()=>{
    const value=compile(),key=reusableArtifactIdentity(value,hash,"video")!;
    expect(Object.keys(key).sort()).toEqual(["baseFingerprint","compilerVersion","key","mechanismId","mechanismVersion","media","outputFingerprint","renderSignature","sceneDslVersion","scope"].sort());
    expect(JSON.stringify(key)).not.toMatch(/userId|patient|jobId|path|timestamp|TEST ONLY SERVER/);
  });
  it("media must agree with the compiled render intent",()=>expect(reusableArtifactIdentity(compile(),hash,"still")).toBeNull());
  it("explicit license rejection blocks even internal review",()=>{
    const m=structuredClone(MEDICAL_MECHANISMS.definitions[1]),module=moduleFor(m),a=compile(m,module);
    module.anatomyRegistry[0].provenance!.licenseReview.status="rejected";
    expect(cacheSourceLicenseCompatible(a,()=>module,MECHANISM_TEST_CATALOG)).toBe(false);
  });
  it("unknown source/version or license relationship blocks reuse",()=>{
    const m=structuredClone(MEDICAL_MECHANISMS.definitions[1]),module=moduleFor(m),a=compile(m,module);
    module.anatomyRegistry[0].provenance!.sourceVersion="unknown";
    expect(cacheSourceLicenseCompatible(a,()=>module,MECHANISM_TEST_CATALOG)).toBe(false);
  });
  it("hypothetical TEST approvals cannot promote an internal cache identity into patient scope",()=>{
    const m=structuredClone(MEDICAL_MECHANISMS.definitions[1]),module=moduleFor(m);
    m.medicalReviewStatus="medically-reviewed";m.medicalReviewEvidenceRefs=["TEST ONLY REVIEW"];m.patientFacingStatus="patient-approved";m.patientApprovalEvidenceRefs=["TEST ONLY APPROVAL"];
    module.assetStatus="production";module.anatomicallyValidated=true;
    const internal=reusableArtifactIdentity(compile(m,module),hash,"video")!,patient=reusableArtifactIdentity(compile(m,module,"production"),hash,"video")!;
    expect(internal.scope).toBe("internal-review");expect(patient.scope).toBe("patient-facing");expect(internal.key).not.toBe(patient.key);
  });
  it.each(["unresolved","rejected"] as const)("withdrawn %s commercial review invalidates patient reuse",status=>{
    const m=structuredClone(MEDICAL_MECHANISMS.definitions[1]),module=moduleFor(m);
    m.medicalReviewStatus="medically-reviewed";m.medicalReviewEvidenceRefs=["TEST ONLY REVIEW"];m.patientFacingStatus="patient-approved";m.patientApprovalEvidenceRefs=["TEST ONLY APPROVAL"];
    module.assetStatus="production";module.anatomicallyValidated=true;
    const scene=compile(m,module,"production");module.anatomyRegistry[0].provenance!.licenseReview.status=status;
    expect(cacheSourceLicenseCompatible(scene,()=>module,MECHANISM_TEST_CATALOG)).toBe(false);
  });
  it.each(["availability","representation","anatomyVersion","license"])("rechecks current %s before any database/cache lookup",async kind=>{
    const {job,authorization}=authority(),module=structuredClone(HEART_ORGAN_MODULE),rpc=vi.fn();
    if(kind==="availability")module.anatomyRegistry=module.anatomyRegistry.filter(e=>e.id!=="heart.leftVentricle");
    if(kind==="representation")module.anatomyRegistry.find(e=>e.id==="heart.leftVentricle")!.representation="cavity";
    if(kind==="anatomyVersion")module.anatomyVersion="new";
    if(kind==="license")module.anatomyRegistry.find(e=>e.id==="heart.leftVentricle")!.provenance!.licenseReview.status="rejected";
    installTestOrganModuleResolution(module).legacy;
    const cache=new ReusableArtifactCache(new ReusableArtifactRepository({rpc} as unknown as SupabaseClient),{read:vi.fn(),put:vi.fn()});
    expect(await cache.lookup(job,authorization,signal())).toMatchObject({disposition:"CACHE_STALE"});expect(rpc).not.toHaveBeenCalled();
  });
  it("raw AI/hash claims cannot authorize lookup and metrics contain only bounded events",async()=>{
    const {job}=authority(),rpc=vi.fn(),events:unknown[]=[];
    const cache=new ReusableArtifactCache(new ReusableArtifactRepository({rpc} as unknown as SupabaseClient),{read:vi.fn(),put:vi.fn()},e=>events.push(e));
    expect(await cache.lookup(job,{baseFingerprint:hash,scope:"patient-facing"},signal())).toMatchObject({disposition:"CACHE_INELIGIBLE"});
    expect(rpc).not.toHaveBeenCalled();expect(events).toEqual([{event:"MEDICAL_MOTION_CACHE",disposition:"CACHE_LOOKUP"},{event:"MEDICAL_MOTION_CACHE",disposition:"CACHE_INELIGIBLE"}]);
    expect(cache.metrics.CACHE_INELIGIBLE).toBe(1);
  });
  it("current unverified heart is cache-ineligible even for internal review",async()=>{
    const {job,authorization}=authority(),rpc=vi.fn(),cache=new ReusableArtifactCache(new ReusableArtifactRepository({rpc} as unknown as SupabaseClient),{read:vi.fn(),put:vi.fn()});
    expect(await cache.lookup(job,authorization,signal())).toMatchObject({disposition:"CACHE_INELIGIBLE"});expect(rpc).not.toHaveBeenCalled();
    expect(cacheAnatomyVerified(compile(),()=>HEART_ORGAN_MODULE,MECHANISM_TEST_CATALOG)).toBe(false);
  });
  it("current patient-facing gate and missing myocardium issue no reuse authority",()=>{
    const a=getMechanismAnatomy("myocardialOxygenDemandSupply");
    const plan={planVersion:"1",organ:a.organ,topic:"physiology",safety:{level:"none"},mechanism:{id:"myocardialOxygenDemandSupply",evidence:"possible"},anatomy:{primaryFocus:a.primaryFocus,structures:a.structures,requirements:a.requirements},documentedFindings:[],scenes:[{type:"mechanismExplanation"},{type:"limitationsAndNextSteps"}]};
    expect(prepareExplanationAuthorization({clinical:{message:"I feel tired.",language:"en"},sceneIndex:0,plan},{clinicalContextId:randomUUID(),assetVersion:HEART_ORGAN_MODULE.assetVersion,mode:"production",outputPath:"render.mp4"})).not.toHaveProperty("authorization");
  });
});

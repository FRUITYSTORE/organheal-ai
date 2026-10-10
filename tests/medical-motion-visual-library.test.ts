import { beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { loadVisualLibrary, libraryAssetBytes, parseAssetIndex, validateLibraryPolicy, verifyLibraryAssetBytes, type VisualLibrary } from "../lib/medical-motion/visual-library/visual-library-loader";
import { HEART_LIBRARY_ROUTES, resolveHeartLibraryConcept, isHeartLibrarySelection } from "../lib/medical-motion/visual-library/visual-library-resolver";
import { adaptMedicalMotionContext, authorizeExplanationExecution } from "../lib/medical-motion/explanation-execution";
import { buildExecutionNarration, executionNarrationIdentity } from "../lib/medical-motion/execution-narration";
import { MEDICAL_EXPLANATION_DEMOS_V1 } from "../lib/medical-motion/explanation-planner-demos";
import { planHeartKnowledgeExplanation } from "../lib/medical-motion/heart-knowledge/resolver";
import { audioHash, audioIdentity } from "../lib/medical-motion/composition/narration-foundation";

it("separates spoken content, visual hashes and final composition identity",()=>{
  const sections=[{sectionId:"section-0",text:"General educational explanation.",purpose:"WHAT_THIS_IS"}];
  const narration=executionNarrationIdentity("en",sections,0);
  const visualA={assetId:"reference-a",sha256:audioHash("a"),authority:"REFERENCE_ONLY"};
  const visualB={...visualA,sha256:audioHash("b")};
  const a={narration,voice:"marin",visual:audioIdentity(visualA),timing:"1"};
  const b={...a,visual:audioIdentity(visualB)};
  expect(a.narration).toBe(b.narration);
  expect(a.visual).not.toBe(b.visual);
  expect(audioIdentity(a)).not.toBe(audioIdentity(b));
  expect(executionNarrationIdentity("en",[{...sections[0],text:"Changed explanation."}],0)).not.toBe(narration);
  expect(()=>validateLibraryPolicy({...visualB,visualAuthority:"CLINICAL",medicalReviewStatus:"PENDING",patientFacing:false})).toThrow();
});

it.each([true,"true",undefined])("rejects unsupported patientFacing %s",patientFacing=>{
  expect(()=>validateLibraryPolicy({patientFacing,medicalReviewStatus:"PENDING",visualAuthority:"REFERENCE_ONLY"})).toThrow();
});
it.each(["APPROVED","CLINICAL","MESH_AUTHORITY"])("rejects authority upgrade %s",visualAuthority=>{
  expect(()=>validateLibraryPolicy({patientFacing:false,medicalReviewStatus:"PENDING",visualAuthority})).toThrow();
});
it("rejects malformed/unbounded asset indexes",()=>{
  for(const v of [null,{},[],Array(474).fill({})])expect(()=>parseAssetIndex(v)).toThrow();
});
// Explicit local prerequisite; deployment does not depend on this workstation.
const root=process.env.ORGANHEAL_TEST_VISUAL_LIBRARY_ROOT;
let library:VisualLibrary;
beforeAll(async()=>{if(root)library=await loadVisualLibrary(root);},30000);
it.skipIf(!root)("loads pinned 18-pack/473-asset library and discovers exactly 64 Heart assets",()=>{
  expect(library.assets).toHaveLength(473);expect(library.assets.filter(a=>a.pack==="heart")).toHaveLength(64);
  expect(library.assets.every(a=>a.patientFacing===false&&a.medicalReviewStatus==="PENDING")).toBe(true);
});
it.skipIf(!root).each(Object.keys(HEART_LIBRARY_ROUTES) as (keyof typeof HEART_LIBRARY_ROUTES)[])("resolves explicit %s education",concept=>{
  const s=resolveHeartLibraryConcept(library,"heart",concept);expect(s.scenes.length).toBeGreaterThan(0);
  expect(s.scenes.every(s=>s.asset.organ==="heart"&&s.visualUse==="GENERAL_EDUCATIONAL"&&!s.patientPathologyClaim)).toBe(true);
  expect(isHeartLibrarySelection(JSON.parse(JSON.stringify(s)))).toBe(false);
});
it.skipIf(!root)("fails closed for copied registry, absent identity, cross-organ and clinical claims",async()=>{
  expect(()=>resolveHeartLibraryConcept(JSON.parse(JSON.stringify(library)),"heart","HEART_ORIENTATION")).toThrow();
  expect(()=>resolveHeartLibraryConcept(library,"kidney","HEART_ORIENTATION")).toThrow();
  expect(()=>resolveHeartLibraryConcept(library,"heart","LDL_EDUCATION","CONFIRMED_PATHOLOGY_REQUIRED")).toThrow("CLINICAL_AUTHORITY_REQUIRED");
  expect(()=>resolveHeartLibraryConcept(library,"heart","HEART_AGE","PERSONALIZED_SAFE")).toThrow("VALIDATED_CONTEXT_REQUIRED");
  await expect(libraryAssetBytes(library,"missing")).rejects.toThrow("VISUAL_ASSET_MISSING");
});
it.skipIf(!root)("checks selected bytes against exact asset SHA",async()=>{
  const a=resolveHeartLibraryConcept(library,"heart","HEART_ORIENTATION").scenes[0].asset;
  expect(audioHash(await libraryAssetBytes(library,a.id))).toBe(a.sha256);
});
it("rejects changed bytes and unsupported containers without altering source files",()=>{
  expect(()=>verifyLibraryAssetBytes(Buffer.from("changed"),audioHash("original"))).toThrow("VISUAL_ASSET_HASH_MISMATCH");
  const b=Buffer.from("not-image");expect(()=>verifyLibraryAssetBytes(b,audioHash(b))).toThrow("VISUAL_FORMAT_UNSUPPORTED");
});
it.skipIf(!root)("connects opaque context/planner/chapter to LDL library scenes without native-motion claims",async()=>{
  const ownerId=randomUUID(),ctx=await adaptMedicalMotionContext(ownerId,"library-context",async()=>({ownerId,revision:"1",evidence:[{
    evidenceId:"ldl",evidenceType:"LDL_RESULT",sourceAuthority:"LAB_VERIFIED",clinicalMeaning:"RESULT_PRESENT",verification:"source-verified",temporalContext:null,sourceReference:"lab"}]}));
  const request=MEDICAL_EXPLANATION_DEMOS_V1[0].request;
  const c=authorizeExplanationExecution(request,ctx,null,undefined,library).chapters[0];
  expect(c.visualStrategy).toBe("LIBRARY_REFERENCE_COMPOSE");expect(c.visualRecipe).toBeNull();expect(c.librarySelection?.scenes).toHaveLength(7);
  expect(c.pathology).toBe(false);expect(c.patientFacing).toBe(false);
  const text=buildExecutionNarration(c).sections.map(s=>s.text).join(" ");
  expect(text).toContain("لا يثبت");expect(text).not.toContain("حركة المصدر");
  expect(()=>authorizeExplanationExecution(request,JSON.parse(JSON.stringify(ctx)),null,undefined,library)).toThrow();
  const plan=planHeartKnowledgeExplanation({...request,teachingTargets:["ldl"]},ctx.plannerContext,{topicId:"ldl",authorityLevel:"GENERAL_EDUCATIONAL",durationSeconds:20,cacheSceneIdentities:[],library});
  expect(plan.fallback).toBe("GENERAL_EDUCATIONAL_LIBRARY");expect(plan.scene.moduleId).toBeNull();
  expect(plan.scene.sourceAssetProfile).toBe("MASTER_VISUAL_LIBRARY_V1");
});

import { expect,it } from "vitest";
import { randomUUID } from "node:crypto";
import { explanationVisualRecipe,recipePresentationFilter } from "../lib/medical-motion/render/explanation-visual-recipe";
import { adaptMedicalMotionContext,authorizeExplanationExecution } from "../lib/medical-motion/explanation-execution";
import { MEDICAL_EXPLANATION_DEMOS_V1 } from "../lib/medical-motion/explanation-planner-demos";
import { audioIdentity } from "../lib/medical-motion/composition/narration-foundation";
import { buildExecutionNarration } from "../lib/medical-motion/execution-narration";
it("same heart selects distinct deterministic educational recipes",()=>{
  const ldl=explanationVisualRecipe("LDL"),age=explanationVisualRecipe("HEART_AGE");
  expect(ldl?.id).toBe("LDL_HEART_EDUCATION_RECIPE_V1");expect(age?.id).toBe("HEART_AGE_EXPLANATION_RECIPE_V1");
  expect(ldl).toBe(explanationVisualRecipe("LDL"));expect(ldl?.phases).not.toEqual(age?.phases);
  expect(ldl?.returnExterior).toBe(true);expect(age?.returnExterior).toBe(false);
  expect(audioIdentity({visual:"same-master",recipe:ldl})).not.toBe(audioIdentity({visual:"same-master",recipe:age}));
});
it.each(["plaque","stenosis","age-damaged","scarred","accelerated-heartbeat"])("cannot select %s as a visual recipe",intent=>{
  expect(explanationVisualRecipe(intent)).toBeNull();
});
it("presentation stays below approved magnification and cannot change native speed",()=>{
  for(const intent of ["LDL","HEART_AGE"]){const r=explanationVisualRecipe(intent)!;
    expect(Math.max(r.heroStart,r.heroEnd)).toBeLessThan(1.095);
    expect(Math.max(r.nativeStart,r.nativeEnd)).toBeLessThanOrEqual(1);
    expect(recipePresentationFilter(240,r.nativeStart,r.nativeEnd)).not.toMatch(/setpts|atempo|rotate/);
  }
  expect(()=>recipePresentationFilter(240,.9,1.096)).toThrow("RECIPE_PRESENTATION_INVALID");
});
it("recipe enters execution identity without upgrading evidence authority",async()=>{
  const ownerId=randomUUID(),c=await adaptMedicalMotionContext(ownerId,"risk",async()=>({ownerId,revision:"1",evidence:[{
    evidenceId:"risk",evidenceType:"HEART_AGE",sourceAuthority:"RISK_ESTIMATE",clinicalMeaning:"RISK_COMMUNICATION",
    verification:"unverified",temporalContext:null,sourceReference:"risk-record"}]}));
  const p=authorizeExplanationExecution(MEDICAL_EXPLANATION_DEMOS_V1[1].request,c);
  expect(p.chapters[0].visualRecipe?.id).toBe("HEART_AGE_EXPLANATION_RECIPE_V1");
  expect(p.chapters[0].evidence).toEqual(c.evidence);expect(p.chapters[0].pathology).toBe(false);
  const {visualRecipe,chapterId,...previousMedicalChapter}=p.chapters[0];
  void visualRecipe;void chapterId;
  // Exact pre-polish chapter identity: adding presentation metadata must not
  // invalidate the existing medical script and provider request cache.
  expect(buildExecutionNarration(p.chapters[0]).chapterId).toBe(audioIdentity(previousMedicalChapter));
  expect(p.executionPlanId).toBe(authorizeExplanationExecution(MEDICAL_EXPLANATION_DEMOS_V1[1].request,c).executionPlanId);
});

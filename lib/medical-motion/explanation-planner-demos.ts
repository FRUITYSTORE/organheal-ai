import { deepAudioFreeze } from "./composition/narration-foundation";
import type { ExplanationRequest } from "./contracts/medical-explanation-plan";
const base:ExplanationRequest={requestType:"EXPLAIN_THIS_RESULT",organ:"heart",audienceMode:"PATIENT",lane:"PERSONAL_HEALTH_MOTION",
  explanationDepth:"QUICK",language:"ar",teachingTargets:["LDL"],safetyQualifierCount:1,crossOrganDependencyCount:0,
  terminologyDensity:"LOW",requiresComparison:false,requiresNextAction:true,estimatedNarrationWords:50};
/** Synthetic requests only: no patient record, diagnosis or clinical authority. */
export const MEDICAL_EXPLANATION_DEMOS_V1=deepAudioFreeze<readonly {id:string;request:ExplanationRequest}[]>([
  {id:"simple-ldl",request:{...base}},
  {id:"heart-age",request:{...base,requestType:"EXPLAIN_RISK",explanationDepth:"STANDARD",teachingTargets:["heart-age","risk-uncertainty"],estimatedNarrationWords:100}},
  {id:"kidney-result",request:{...base,organ:"kidney",teachingTargets:["creatinine"],requiresNextAction:false,estimatedNarrationWords:45}},
  {id:"symptom-safe-heart",request:{...base,requestType:"EXPLAIN_SYMPTOM_SAFELY",explanationDepth:"STANDARD",teachingTargets:["symptom-context","uncertainty"],safetyQualifierCount:3,estimatedNarrationWords:100}},
  {id:"multi-factor-cardiovascular",request:{...base,requestType:"EXPLAIN_TREND",explanationDepth:"COMPREHENSIVE",teachingTargets:["LDL","blood-pressure","heart-age","trend","risk-uncertainty","next-action"],safetyQualifierCount:4,crossOrganDependencyCount:2,terminologyDensity:"HIGH",requiresComparison:true,estimatedNarrationWords:700}},
  {id:"creator-general-education",request:{...base,requestType:"GENERAL_MEDICAL_EDUCATION",lane:"MEDICAL_CREATOR_MOTION",audienceMode:"CREATOR",explanationDepth:"DETAILED",teachingTargets:["heart-function","ventricle","aorta"],requiresNextAction:false,estimatedNarrationWords:150}},
]);

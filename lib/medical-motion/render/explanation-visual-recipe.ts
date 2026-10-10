import "server-only";
import { audioInvalid, deepAudioFreeze } from "../composition/narration-foundation";
/** Source-honest screen-space recipes; no anatomy labels or camera-space claims. */
export const EXPLANATION_VISUAL_RECIPES_V1=deepAudioFreeze({
  LDL:{id:"LDL_HEART_EDUCATION_RECIPE_V1",version:"1",heroStart:.9,heroEnd:1.04,
    nativeStart:.94,nativeEnd:1,returnExterior:true,focus:"GENERIC_HEART_REGION",
    phases:["RISK_ORIENTATION","UNCERTAINTY","EXPLICIT_INTERNAL_TRANSITION","NATIVE_CONTEXT","EXTERNAL_NEXT_ACTION"]},
  HEART_AGE:{id:"HEART_AGE_EXPLANATION_RECIPE_V1",version:"1",heroStart:.78,heroEnd:.94,
    nativeStart:.88,nativeEnd:.98,returnExterior:false,focus:"RISK_COMMUNICATION_NOT_TISSUE_AGE",
    phases:["ESTABLISH","RISK_METRIC","EXPLICIT_INTERNAL_TRANSITION","FACTORS","NATIVE_CONTEXT_REORIENT"]}
});
export type ExplanationVisualRecipe=typeof EXPLANATION_VISUAL_RECIPES_V1[keyof typeof EXPLANATION_VISUAL_RECIPES_V1];
export function explanationVisualRecipe(intent:string):ExplanationVisualRecipe|null{
  return intent==="LDL"?EXPLANATION_VISUAL_RECIPES_V1.LDL:intent==="HEART_AGE"?EXPLANATION_VISUAL_RECIPES_V1.HEART_AGE:null;
}
export function recipePresentationFilter(frames:number,start:number,end:number){
  if(!Number.isSafeInteger(frames)||frames<2||frames>1440||![start,end].every(x=>Number.isFinite(x)&&x>=.75&&x<=1.04))audioInvalid("RECIPE_PRESENTATION_INVALID");
  const t=`min(1,on/${frames-1})`,smooth=`(${t})*(${t})*(3-2*(${t}))`;
  return `pad=1440:2560:180:320:color=0x000a14,zoompan=z='(${start}+(${end-start})*${smooth})/0.75':x='iw/2-iw/(2*zoom)':y='ih/2-ih/(2*zoom)':d=1:s=1080x1920:fps=24`;
}

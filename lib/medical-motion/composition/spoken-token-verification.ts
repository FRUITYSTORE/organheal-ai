import "server-only";
import { audioInvalid } from "./narration-foundation";

export const MEDICAL_SPOKEN_TOKENS_V1=Object.freeze({version:"1",
  cholesterol:Object.freeze(["الكوليسترول","الكولسترول","الكولستيرول"]),
  ldl:Object.freeze(["LDL","إل دي إل"])});
function orthography(text:string){
  if(typeof text!=="string"||!text||text.length>800||/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(text))audioInvalid("VOICE_TRANSCRIPT_INVALID");
  return text.normalize("NFC").replace(/[\u064b-\u065f\u0670\u0640]/g,"");
}
/** Legacy harmless normalization; no vocabulary equivalence here. */
export function normalizedSpokenText(text:string){
  return orthography(text).replace(/[^\p{L}\p{N}]/gu,"");
}
/** Exact ordered lexical tokens only. No fuzzy matching or semantic adjudication.
 * Percent/sign symbols are retained because they can change numerical meaning. */
export function canonicalMedicalSpokenTokens(text:string){
  const words=orthography(text).match(/[\p{L}\p{N}]+|[%٪+−-]/gu)??[];
  const tokens:string[]=[];
  for(let i=0;i<words.length;i++){
    const word=words[i];
    if(word==="إل"&&words[i+1]==="دي"&&words[i+2]==="إل"){
      tokens.push("LDL");i+=2;
    }else tokens.push(MEDICAL_SPOKEN_TOKENS_V1.cholesterol.some(v=>v===word)?"الكوليسترول":word);
  }
  return Object.freeze(tokens);
}
export function medicalSpokenTextMatches(expected:string,transcript:string){
  const a=canonicalMedicalSpokenTokens(expected),b=canonicalMedicalSpokenTokens(transcript);
  return a.length>0&&a.length===b.length&&a.every((token,i)=>token===b[i]);
}

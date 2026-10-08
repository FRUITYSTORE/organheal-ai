import {describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {SceneSequenceRegistry,validateSequence,assertTrustedSequence,sequenceFingerprint,type SceneSequenceDefinition} from "../lib/medical-motion/orchestration/sequence";
function definition(count=2):SceneSequenceDefinition{return {sequenceId:"TEST-sequence",sequenceVersion:"1",usage:"internal-review",sceneIndices:Array.from({length:count},(_,i)=>i),
 transitions:Array.from({length:Math.max(0,count-1)},(_,i)=>({boundaryIndex:i,kind:"cut",duration:0})),aspectRatios:["16:9"]};}
describe("internal trusted sequence capability",()=>{
 it.each([2,8])("accepts %i scenes",n=>{const s=new SceneSequenceRegistry([definition(n)]).resolve("TEST-sequence","1",randomUUID(),randomUUID());expect(s.definition.sceneIndices).toHaveLength(n);expect(Object.isFrozen(s.definition.sceneIndices)).toBe(true);});
 it.each([1,9])("rejects %i scenes",n=>expect(()=>validateSequence(definition(n))).toThrow());
 it("JSON copy is not authority",()=>{const owner=randomUUID(),ctx=randomUUID(),s=new SceneSequenceRegistry([definition()]).resolve("TEST-sequence","1",owner,ctx);expect(()=>assertTrustedSequence(structuredClone(s),owner,ctx)).toThrow();});
 it("version or arbitrary scene injection cannot retain capability authority",()=>{const owner=randomUUID(),ctx=randomUUID(),s=new SceneSequenceRegistry([definition()]).resolve("TEST-sequence","1",owner,ctx);
  for(const change of [{sequenceVersion:"2"},{sceneIndices:[0,77]}])expect(()=>assertTrustedSequence({...s,definition:{...s.definition,...change}},owner,ctx)).toThrow();});
 it.each(["owner","context"])("rejects %s swap",field=>{const owner=randomUUID(),ctx=randomUUID(),s=new SceneSequenceRegistry([definition()]).resolve("TEST-sequence","1",owner,ctx);expect(()=>assertTrustedSequence(s,field==="owner"?randomUUID():owner,field==="context"?randomUUID():ctx)).toThrow();});
 it("rejects duplicate scene",()=>expect(()=>validateSequence({...definition(),sceneIndices:[0,0]})).toThrow());
 it.each(["crossfade","morph","unknown"])("rejects %s",kind=>expect(()=>validateSequence({...definition(),transitions:[{boundaryIndex:0,kind,duration:.4}]})).toThrow());
 it("no candidate or patient sequence activated by default",()=>{expect(()=>new SceneSequenceRegistry([]).resolve("TEST-sequence","1",randomUUID(),randomUUID())).toThrow("SEQUENCE_UNAVAILABLE");expect(()=>validateSequence({...definition(),usage:"patient-facing"})).toThrow();});
 it("ordered policy identity changes on order or transition",()=>{const d=definition();expect(sequenceFingerprint(d)).not.toBe(sequenceFingerprint({...d,sceneIndices:[1,0]}));expect(sequenceFingerprint(d)).not.toBe(sequenceFingerprint({...d,transitions:[{boundaryIndex:0,kind:"fade-through-neutral",duration:.4}]}));});
});

import { randomUUID } from "node:crypto";
import { profileFixture } from "./source-profile-fixture";
import { createSourceProfileRegistry, sourceProfileSnapshot } from "../../lib/medical-motion/source-profiles";
import { compileMedicalScene, DEFAULT_SCENE_PRESENTATION } from "../../lib/medical-motion/scene-compiler";
import { MEDICAL_MECHANISMS } from "../../lib/medical-motion/mechanism-definitions";
import { WHOLE_BODY_ANATOMY } from "../../lib/medical-motion/whole-body-anatomy";
import { timelineFingerprint, type TimelineContent, type TimelineSegment, type TimelineTransition } from "../../lib/medical-motion/composition/timeline-specification";
import { privateHash } from "../../lib/medical-motion/composition/approved-spec";
export function timelineFixture(count=2) {
 const scenes=[], segments:TimelineSegment[]=[];
 for(let i=0;i<count;i++) {
  const {module,profile}=profileFixture();profile.profileId=`TEST-profile-${i}`;
  let catalog=structuredClone(WHOLE_BODY_ANATOMY);
  if(i%2){const source=catalog.sources.find(s=>s.id===profile.sourceId&&s.sourceVersion===profile.sourceVersion)!;
   profile.sourceId='TEST-HYPOTHETICAL-SOURCE-B';catalog={...catalog,sources:[...catalog.sources,{...source,id:profile.sourceId,canonicalName:'TEST metadata only; no geometry'}]};
   module.anatomyRegistry=module.anatomyRegistry.map(e=>({...e,provenance:{...e.provenance!,sourceId:profile.sourceId}}));}
  const registry=createSourceProfileRegistry([profile]),selection=registry.resolve({profileId:profile.profileId,profileVersion:profile.profileVersion});
  const r=compileMedicalScene({mechanismId:"leftVentricularPressureLoad",mechanismVersion:"1"},{sourceProfile:selection,cameraTargets:["CAM_LV_APPROACH"],
   registry:MEDICAL_MECHANISMS,getModule:()=>module,catalog,safety:{allowVideo:true,level:"none"},mode:"development",claim:"possible-mechanism",
   evidence:[{kind:"assessment-response",code:"clinical-message-provided",origin:"server-intake",assertion:"present",evidenceRef:"TEST-ONLY"}]},
   {...DEFAULT_SCENE_PRESENTATION,renderIntent:"short-clip",overlayKinds:["subtitle","text-value","chart","voice-segment"]});
  if(!r.ok)throw Error(r.reasons.join(" "));scenes.push(r.compiled);
  segments.push({segmentIndex:i,sceneIndex:i,baseJobId:randomUUID(),baseArtifactId:randomUUID(),baseSha256:"a".repeat(64),
   baseFingerprint:r.compiled.baseFingerprint,baseOutputFingerprint:r.compiled.outputFingerprint,renderSignature:"b".repeat(64),duration:3,sourceProfile:sourceProfileSnapshot(selection)});
 }
 const transitions:TimelineTransition[]=segments.slice(1).map((_,i)=>({boundaryIndex:i,kind:"cut",duration:0}));
 const content={schemaVersion:"2",producerVersion:"1",compositionVersion:"2",userId:randomUUID(),contextId:randomUUID(),segments,transitions,duration:count*3,
  timelineFingerprint:"",fingerprint:"",logicalIdentity:"",approvalDisposition:"internal-composition",specification:{compositionVersion:"2",baseAudio:"silence",
   outputProfile:{aspectRatio:"16:9",policy:"fit",resolution:"720p"},language:"en",textOverlays:[],numericOverlays:[],chartOverlays:[],audioSegments:[],dynamicNarrationSlots:[]}} as TimelineContent;
 return {content:rehashTimeline(content),scenes};
}
export function rehashTimeline(c:TimelineContent):TimelineContent {
 const timeline=timelineFingerprint(c.segments,c.transitions),duration=c.segments.reduce((n,s)=>n+s.duration,0);
 const {logicalIdentity:_logical,...identity}={...c,duration,timelineFingerprint:timeline,fingerprint:privateHash({version:"2",userId:c.userId,contextId:c.contextId,timelineFingerprint:timeline,duration,specification:c.specification})};
 return {...identity,logicalIdentity:privateHash(identity)};
}

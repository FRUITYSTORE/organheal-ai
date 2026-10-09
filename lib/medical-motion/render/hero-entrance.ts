import "server-only";
import { audioInvalid,deepAudioFreeze } from "../composition/narration-foundation";
import { CINEMATIC_CAMERA_V1 } from "./cinematic-camera";

export const HERO_ENTRANCE_V1=deepAudioFreeze({id:"HERO_ENTRANCE_V1",version:"1",method:"bounded-screen-space-approach",
  startRatio:.9,intermediateRatio:.99,endRatio:1.095,firstStageFrames:96,
  easing:"two-stage-cubic-smoothstep",cameraDistanceDelta:0,perspectiveModification:false,
  canvas:[1440,2560],background:"0x000a14",geometryMutation:false,patientFacing:false});
function endFrame(heroFrames:number){
  if(!Number.isSafeInteger(heroFrames)||heroFrames<144||heroFrames>1440)audioInvalid("HERO_ENTRANCE_INVALID");
  return Math.floor(heroFrames-.2*24);
}
export function heroEntranceRatio(frame:number,heroFrames:number){
  const end=endFrame(heroFrames);
  if(!Number.isSafeInteger(frame)||frame<0||frame>=heroFrames)audioInvalid("HERO_ENTRANCE_INVALID");
  const smooth=(t:number)=>t*t*(3-2*t);
  return frame<96?.9+.09*smooth(frame/96):.99+.105*smooth(Math.min(1,(frame-96)/(end-96)));
}
export function auditHeroEntrance(bounds:readonly number[],heroFrames:number){
  const safe=CINEMATIC_CAMERA_V1.safeOrganRectangle;
  if(bounds.length!==4||bounds.some(v=>!Number.isFinite(v))||bounds[0]>=bounds[2]||bounds[1]>=bounds[3])audioInvalid();
  let margin=Infinity;
  for(let f=0;f<heroFrames;f++){
    const r=heroEntranceRatio(f,heroFrames),p=bounds.map(v=>.5+(v-.5)*r);
    margin=Math.min(margin,p[0]-safe[0],p[1]-safe[1],safe[2]-p[2],safe[3]-p[3]);
    if(margin<0)audioInvalid("HERO_PRESENTATION_CLIPPING");
  }
  const coverage=(r:number)=>({width:(bounds[2]-bounds[0])*r,height:(bounds[3]-bounds[1])*r,
    boundingBoxArea:(bounds[2]-bounds[0])*(bounds[3]-bounds[1])*r*r});
  return deepAudioFreeze({preset:HERO_ENTRANCE_V1,start:coverage(.9),end:coverage(1.095),
    previousStart:coverage(1),previousEnd:coverage(1.095),minimumSafeRectangleMargin:margin,
    scaleIncreasePercent:(1.095/.9-1)*100,completedByFrame:endFrame(heroFrames),cameraDistanceDelta:0});
}
export function heroEntranceFilter(heroFrames:number){
  const end=endFrame(heroFrames),first="(on/96)*(on/96)*(3-2*on/96)",t=`min(1,(on-96)/${end-96})`,second=`(${t})*(${t})*(3-2*(${t}))`;
  // Exact 9:16 canvas avoids stretching. Padding makes a farther starting view
  // possible without zoompan's forbidden sub-1 zoom or invented perspective.
  return `pad=1440:2560:180:320:color=0x000a14,zoompan=z='if(lt(on,96),(0.9+0.09*${first})/0.75,(0.99+0.105*${second})/0.75)':x='iw/2-iw/(2*zoom)':y='ih/2-ih/(2*zoom)':d=1:s=1080x1920:fps=24`;
}

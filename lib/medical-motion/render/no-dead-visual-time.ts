import "server-only";
import { audioInvalid,deepAudioFreeze } from "../composition/narration-foundation";

export const NO_DEAD_VISUAL_TIME_V1=deepAudioFreeze({id:"NO_DEAD_VISUAL_TIME_V1",version:"1",
  maximumUnexplainedHoldMs:1000,openingContentStartMs:400,heroPresentation:"bounded-screen-space-approach",
  additionalMaximumRatio:1.035,approachEndFrame:96,handoffEndFrame:120,sourceBoundaryFrame:132,
  anatomyMotion:"prohibited",rotationDegrees:0,shake:false});
type Activity={durationMs:number;nativeMotion:boolean;cameraMotion:null|{startRatio:number;endRatio:number;durationMs:number};
  visualFocus:boolean;meaningfulTransition:boolean;
  hold:null|{reason:"narration-comprehension"|"subtitle-label-reading"|"clinical-comparison"|"intentional-pause";evidenceRef:string}};
/** Planning validation, not a way for planner JSON to issue render authority.
 * Executable callers must derive activity/hold evidence from approved inputs. */
export function validateVisualActivity(a:Activity){
  if(!Number.isFinite(a.durationMs)||a.durationMs<=0||a.durationMs>60000||
    [a.nativeMotion,a.visualFocus,a.meaningfulTransition].some(v=>typeof v!=="boolean"))audioInvalid("VISUAL_ACTIVITY_INVALID");
  let moving=false;
  if(a.cameraMotion){const c=a.cameraMotion;
    if(!Number.isFinite(c.startRatio)||!Number.isFinite(c.endRatio)||c.startRatio<1||c.endRatio<1||c.startRatio>1.15||c.endRatio>1.15||
      !Number.isFinite(c.durationMs)||c.durationMs<1000||c.durationMs>a.durationMs)audioInvalid("VISUAL_ACTIVITY_INVALID");
    moving=c.startRatio!==c.endRatio;
  }
  if(a.hold&&(!["narration-comprehension","subtitle-label-reading","clinical-comparison","intentional-pause"].includes(a.hold.reason)||
    typeof a.hold.evidenceRef!=="string"||!a.hold.evidenceRef.trim()))audioInvalid("VISUAL_ACTIVITY_INVALID");
  if(a.durationMs>NO_DEAD_VISUAL_TIME_V1.maximumUnexplainedHoldMs&&!a.nativeMotion&&!moving&&!a.visualFocus&&!a.meaningfulTransition&&!a.hold)
    audioInvalid("DEAD_VISUAL_TIME");
  if(moving&&a.cameraMotion&&a.durationMs-a.cameraMotion.durationMs>NO_DEAD_VISUAL_TIME_V1.maximumUnexplainedHoldMs&&
    !a.nativeMotion&&!a.visualFocus&&!a.meaningfulTransition&&!a.hold)audioInvalid("DEAD_VISUAL_TIME");
  return true;
}
/** Smooth extra push over 0–4s, then hand off over 4–5s to the already approved
 * physical approach. Nothing is added to the source change or native motion. */
export function heroPresentationRatio(frame:number){
  if(!Number.isSafeInteger(frame)||frame<0||frame>=276)audioInvalid();
  const smooth=(t:number)=>t*t*(3-2*t);
  return frame<96?1+.035*smooth(frame/96):frame<120?1+.035*(1-smooth((frame-96)/24)):1;
}
export function heroPresentationFilter(){
  const smooth="(on/96)*(on/96)*(3-2*on/96)",handoff="((on-96)/24)*((on-96)/24)*(3-2*(on-96)/24)";
  return `zoompan=z='if(lt(on,96),1+0.035*${smooth},if(lt(on,120),1+0.035*(1-${handoff}),1))':x='iw/2-iw/(2*zoom)':y='ih/2-ih/(2*zoom)':d=1:s=1080x1920:fps=24`;
}

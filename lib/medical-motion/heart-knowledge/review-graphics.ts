import "server-only";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { audioHash,audioIdentity,audioInvalid,deepAudioFreeze } from "../composition/narration-foundation";
import { isApprovedSubtitleFont,type ApprovedSubtitleFont } from "../composition/audio-media-authority";
import { HEART_REVIEW_MODULES_V1,type HeartReviewModuleId } from "./coverage";
import { HEART_SCENE_LIBRARY_V1 } from "./library";
import { validateVisualActivity } from "../render/no-dead-visual-time";

const issued=new WeakSet<object>();
const preparedScenes=new WeakSet<object>();
/** Only fixed original schematic modules can be compiled for owner review.
 * Does not grant patient rendering/publication or accept patient values. */
export function compileHeartReviewScene(moduleId:HeartReviewModuleId,language:"ar"|"en",profile:"MOBILE_VERTICAL_9_16"|"DESKTOP_16_9",durationSeconds=8){
  if(!Object.hasOwn(HEART_REVIEW_MODULES_V1,moduleId)||!["ar","en"].includes(language)||
    !["MOBILE_VERTICAL_9_16","DESKTOP_16_9"].includes(profile)||!Number.isSafeInteger(durationSeconds)||durationSeconds<6||durationSeconds>20)audioInvalid("HEART_REVIEW_SCENE_INVALID");
  validateVisualActivity({durationMs:durationSeconds*1000,nativeMotion:false,cameraMotion:null,
    visualFocus:true,meaningfulTransition:false,hold:{reason:"subtitle-label-reading",evidenceRef:`heart:${moduleId}:fixed-bilingual-caption`}});
  const content={moduleId,moduleVersion:"1",language,profile,width:profile==="MOBILE_VERTICAL_9_16"?1080:1920,
    height:profile==="MOBILE_VERTICAL_9_16"?1920:1080,fps:24,frameCount:durationSeconds*24,durationSeconds,
    sceneReferences:HEART_SCENE_LIBRARY_V1.scenes.filter(s=>s.moduleId===moduleId).map(s=>s.cacheIdentity),
    source:"ORGANHEAL_ORIGINAL_SCHEMATIC_V1",medicalReview:"unreviewed",productionExecutable:false,
    activity:{progressiveRevealFraction:.625,remainingHoldReason:"subtitle-label-reading",noDeadVisualTimePolicy:"NO_DEAD_VISUAL_TIME_V1"},
    patientFacing:false,patientData:false,anatomicalGeometry:false,physiologicalTiming:false,blenderInvocations:0};
  const result=deepAudioFreeze({...content,cacheIdentity:audioIdentity(content)});issued.add(result);return result;
}
export type HeartReviewScene=ReturnType<typeof compileHeartReviewScene>;
const text={
  "ldl-particles":{en:["LDL / cholesterol","Transport particles","Cholesterol carried in blood","A result is not proof of blockage"],ar:["LDL / الكوليسترول","جسيمات النقل","حمل الكوليسترول في الدم","النتيجة لا تثبت انسداد الشريان"]},
  "triglyceride-particles":{en:["Triglycerides","Energy transport","Triglyceride-rich particles","One result does not diagnose disease"],ar:["الدهون الثلاثية","نقل الطاقة","جسيمات غنية بالدهون الثلاثية","نتيجة واحدة لا تشخص مرضا"]},
  "glucose-window":{en:["Glucose / HbA1c","Glucose exposure","HbA1c: roughly the past 2–3 months","Different measurements; not a diagnosis"],ar:["الغلوكوز / HbA1c","التعرض للغلوكوز","HbA1c: نحو الشهرين إلى الثلاثة الماضية","قياسات مختلفة وليست تشخيصا"]},
  "pressure-mechanics":{en:["Blood pressure","Systolic: ventricular ejection","Diastolic: between heartbeats","Pressure alone does not prove hypertrophy"],ar:["ضغط الدم","الانقباضي: ضخ البطينين","الانبساطي: بين ضربات القلب","الضغط وحده لا يثبت تضخم القلب"]},
  "heart-age-risk":{en:["Heart Age","Chronological age","Estimated cardiovascular risk","Risk communication, not tissue age"],ar:["عمر القلب","العمر الزمني","تقدير خطر أمراض القلب والأوعية","تواصل حول الخطر وليس عمر النسيج"]},
  "electrical-sequence":{en:["Electrical activity / ECG","SA node → AV node","Ventricular electrical activation","Sequence diagram; not a measured ECG"],ar:["النشاط الكهربائي / ECG","العقدة الجيبية ثم الأذينية البطينية","التنشيط الكهربائي للبطينين","مخطط تسلسل وليس تخطيطا مقاسا"]},
  "circulation-flow":{en:["Normal circulation","Body → right heart → lungs","Lungs → left heart → body","Flow order; not a phase-timed simulation"],ar:["الدورة الدموية الطبيعية","الجسم ثم القلب الأيمن ثم الرئتان","الرئتان ثم القلب الأيسر ثم الجسم","ترتيب التدفق وليس محاكاة زمنية"]},
  "heart-coronary-context":{en:["Coronary blood supply","Heart muscle needs blood supply","Coronary vessels supply the heart","Concept only; no named branch geometry"],ar:["التروية التاجية","عضلة القلب تحتاج إلى تروية","الأوعية التاجية تزود القلب بالدم","مفهوم عام دون هندسة فروع مسماة"]}
} as const;
const label=(v:string)=>v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
/** Prepare static shaped text once; per-frame graphics have no external resources. */
export async function prepareHeartReviewGraphics(scene:HeartReviewScene,font:ApprovedSubtitleFont){
  if(!issued.has(scene)||!isApprovedSubtitleFont(font))audioInvalid("HEART_REVIEW_AUTHORITY_INVALID");
  const fontfile="C:/Windows/Fonts/arial.ttf";
  if(audioHash(await readFile(fontfile))!==font.sha256)audioInvalid("HEART_REVIEW_FONT_CHANGED");
  const lines=text[scene.moduleId][scene.language];
  const plates=await Promise.all([...lines,scene.language==="ar"?"رسم توضيحي عام • للمراجعة الداخلية فقط":"GENERAL SCHEMATIC • INTERNAL REVIEW ONLY"].map(async(line,i)=>{
    const rendered=await sharp({text:{text:`<span foreground="${i===0?"#f1eee7":"#bac8d1"}">${label(line)}</span>`,font:`Arial ${i===0?64:i===4?26:36}`,fontfile,width:900,align:"centre",rgba:true}}).png().toBuffer({resolveWithObject:true});
    return {input:rendered.data,left:Math.floor((1080-rendered.info.width)/2),top:[170,400,1200,1470,1740][i]};
  }));
  const ar=scene.language==="ar";
  const nodes:readonly (readonly [string,number,number])[]=scene.moduleId==="electrical-sequence"?
    [[ar?"العقدة الجيبية":"SA node",540,610],[ar?"العقدة الأذينية البطينية":"AV node",540,820],[ar?"تنشيط البطينين":"Ventricular activation",540,1030]]:
    scene.moduleId==="circulation-flow"?
    [[ar?"الجسم":"Body",540,590],[ar?"الأذين الأيمن":"Right atrium",540,690],[ar?"البطين الأيمن":"Right ventricle",540,790],
      [ar?"الرئتان":"Lungs",540,890],[ar?"الأذين الأيسر":"Left atrium",540,990],[ar?"البطين الأيسر":"Left ventricle",540,1090]]:
    scene.moduleId==="heart-age-risk"?
    [[ar?"ضغط الدم":"Blood pressure",280,580],[ar?"الكوليسترول":"Cholesterol",800,580],[ar?"التدخين":"Smoking",280,1100],[ar?"العمر":"Age",800,1100]]:
    scene.moduleId==="heart-coronary-context"?
    [[ar?"الدم":"Blood",540,610],[ar?"التروية التاجية":"Coronary supply",540,820],[ar?"عضلة القلب":"Heart muscle",540,1030]]:[];
  // Node text is composited AFTER animated boxes so it remains legible.
  const nodePlates=await Promise.all(nodes.map(async([line,x,y])=>{
    const r=await sharp({text:{text:`<span foreground="#f1eee7">${label(line)}</span>`,font:"Arial 25",fontfile,width:260,align:"centre",rgba:true}}).png().toBuffer({resolveWithObject:true});
    return {input:r.data,left:Math.floor(x-r.info.width/2),top:y};
  }));
  const base=await sharp(Buffer.from('<svg width="1080" height="1920"><defs><radialGradient id="b"><stop stop-color="#162c3b"/><stop offset="1" stop-color="#070e16"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#b)"/><path d="M90 310H990M90 1660H990" stroke="#3b5260"/></svg>')).composite(plates).png().toBuffer();
  const result={scene,base,nodePlates,cacheIdentity:audioIdentity({scene:scene.cacheIdentity,fontSha256:font.sha256,baseSha256:audioHash(base),rendererVersion:"1"})};
  preparedScenes.add(result);return result;
}
/** Progressive mechanisms use abstract nodes, not fabricated anatomical meshes.
 * Animation progress is editorial reveal time, NEVER a simulated heart rate. */
export async function renderHeartReviewFrame(prepared:Awaited<ReturnType<typeof prepareHeartReviewGraphics>>,frame:number){
  const {scene}=prepared;
  if(!preparedScenes.has(prepared)||!issued.has(scene)||!Number.isSafeInteger(frame)||frame<0||frame>=scene.frameCount)audioInvalid("HEART_REVIEW_FRAME_INVALID");
  const t=frame/(scene.frameCount-1),reveal=Math.min(1,t*1.6),gold="#c7a976",teal="#7bb4bb",white="#d4dce0";
  const circle=(x:number,y:number,r:number,color:string,opacity=1)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
  const box=(x:number,y:number,w:number,h:number,color:string)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#101f2a" stroke="${color}" stroke-width="3"/>`;
  let shapes="";
  if(scene.moduleId==="ldl-particles"||scene.moduleId==="triglyceride-particles"){
    shapes='<path d="M140 810H940" stroke="#365462" stroke-width="3" stroke-dasharray="8 12"/>';
    for(let i=0;i<6;i++){
      const x=160+i*128+reveal*40,y=810+(i%2?85:-85),r=scene.moduleId==="ldl-particles"?38:48;
      shapes+=circle(x,y,r,gold,.85)+circle(x,y,r-14,"#223d4a");
      if(scene.moduleId==="triglyceride-particles")shapes+=circle(x-8,y,7,teal)+circle(x+8,y-10,7,teal)+circle(x+8,y+10,7,teal);
    }
  }else if(scene.moduleId==="pressure-mechanics"){
    shapes=box(130,630,360,440,teal)+box(590,630,360,440,gold);
    for(let i=0;i<5;i++){const h=(i+1)*48*reveal;shapes+=`<rect x="${160+i*61}" y="${1030-h}" width="35" height="${h}" fill="${teal}"/>`;}
    shapes+='<path d="M630 890H900" stroke="#c7a976" stroke-width="5"/>'+circle(630+250*reveal,890,14,gold);
  }else if(scene.moduleId==="heart-age-risk"){
    const nodes=[[280,650],[800,650],[280,1040],[800,1040]];
    shapes=box(380,770,320,160,teal);
    nodes.forEach(([x,y],i)=>{shapes+=`<path d="M540 850L${x} ${y}" stroke="#46636d" stroke-width="3" opacity="${reveal}"/>`+circle(x,y,52,i<2?gold:teal,Math.min(1,Math.max(.15,reveal*4-i*.4)));});
    // Equal nodes communicate categories; NOT invented contribution weights.
    shapes+='<path d="M450 815V885M540 815V885M630 815V885" stroke="#d4dce0" stroke-width="4"/>';
  }else if(scene.moduleId==="glucose-window"){
    shapes=box(160,630,760,420,teal)+'<path d="M200 980H880" stroke="#657b85" stroke-width="4"/>';
    for(let i=0;i<12;i++)shapes+=circle(220+i*57,840,13,i/12<reveal?gold:"#34454f");
    shapes+=`<rect x="200" y="960" width="${680*reveal}" height="20" rx="8" fill="${teal}"/>`;
  }else{
    const n=scene.moduleId==="circulation-flow"?6:scene.moduleId==="electrical-sequence"?3:3;
    for(let i=0;i<n;i++){
      const x=540,y=570+i*(n===6?100:210);
      shapes+=box(x-150,y,300,n===6?72:120,i/Math.max(1,n-1)<=reveal?teal:"#3b5260");
      if(i<n-1){const end=y+(n===6?100:210);shapes+=`<path d="M540 ${y+(n===6?72:120)}V${end}M533 ${end-10}L540 ${end}L547 ${end-10}" fill="none" stroke="${white}" stroke-width="3"/>`;}
      shapes+=circle(x-120+(i/Math.max(1,n-1)<=reveal?240:0),y+(n===6?36:60),8,gold);
    }
    if(scene.moduleId==="circulation-flow")shapes+='<path d="M390 1106H320V606H390" fill="none" stroke="#7bb4bb" stroke-width="3"/><path d="M374 596L390 606L374 616" fill="none" stroke="#7bb4bb" stroke-width="3"/>';
  }
  const graphics=Buffer.from(`<svg width="1080" height="1920">${shapes}<rect x="90" y="1620" width="${900*t}" height="3" fill="${teal}"/></svg>`);
  const image=sharp(prepared.base).composite([{input:graphics,left:0,top:0},...prepared.nodePlates]);
  return scene.profile==="MOBILE_VERTICAL_9_16"?image.png().toBuffer():image.resize(608,1080).extend({left:656,right:656,top:0,bottom:0,background:"#070e16"}).png().toBuffer();
}

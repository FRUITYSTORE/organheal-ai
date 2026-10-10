import "server-only";
import { isExecutionChapter, type ExecutionChapter } from "./explanation-execution";
import { audioIdentity, audioInvalid, deepAudioFreeze } from "./composition/narration-foundation";

export const EXECUTION_NARRATION_BUILDER_V1=Object.freeze({id:"EXECUTION_NARRATION_BUILDER_V1",version:"1",clinicalApproval:"unreviewed"});
/** Content identity only; this hash never issues execution or script authority. */
export function executionNarrationIdentity(language:"ar"|"en",sections:readonly {sectionId:string;text:string;purpose:string}[],chapterIndex:number){
  return audioIdentity({builderVersion:"1",language,sections,chapterIndex});
}
/** Reviewed-intent templates. No numeric result, disease finding or recommendation
 * is interpolated from user prose. Unknown clinical meaning fails at context intake. */
const text={
  ar:{
    LDL:["نشرح هنا نتيجة الكوليسترول في سياق خطر القلب.","النتيجة وحدها لا تثبت وجود مرض في الشرايين.","ننتقل الآن إلى نموذج داخلي تعليمي للقلب.","هذه حركة المصدر الأصلية، وليست قياسًا لنبضك.","راجع النتيجة مع مختص، مع بقية عوامل الخطر."],
    HEART_AGE:["عمر القلب مقياس للتواصل حول الخطر المتوقع.","لا يقيس العمر الحقيقي لنسيج القلب، ولا يشخّص مرضًا.","ننتقل الآن إلى نموذج داخلي تعليمي للقلب.","ضغط الدم والتدخين والكوليسترول من عوامل الخطر.","ناقش عوامل الخطر القابلة للتعديل مع مختص."],
    KIDNEY:["نشرح نتيجة الكلى ضمن سياقها الصحي.","نتيجة واحدة لا تكفي وحدها لتشخيص مرض.","لا يتوفر هنا نموذج بصري موثوق للكلى.","نكتفي بالشرح، ولا نستبدل الكلى بنموذج للقلب.","ناقش معنى النتيجة واتجاهها مع مختص."],
    SYMPTOM:["لألم الصدر أسباب متعددة، ولا يمكن تحديدها هنا.","قد يحتاج ألم الصدر إلى تقييم عاجل.","النموذج التعليمي لا يثبت وجود مرض في القلب.","مع ألم شديد أو ضيق نفس، اطلب المساعدة الطارئة.","لا تعتمد على هذا الشرح لتأخير طلب الرعاية."],
    GENERAL:["نشرح عوامل خطر القلب بصورة تعليمية.","تقدير الخطر لا يثبت وجود مرض أو ضرر في القلب.","ننتقل الآن إلى نموذج داخلي تعليمي للقلب.","نحافظ على حركة المصدر الأصلية دون تغيير إيقاعها.","ناقش الأسئلة والخطوات المناسبة مع مختص."],
  },
  en:{
    LDL:["We explain cholesterol results in the context of heart risk.","A result alone does not establish coronary disease.","We now move to an educational internal heart model.","This is native source motion, not a measurement of your pulse.","Review the result with a clinician alongside other risk factors."],
    HEART_AGE:["Heart Age communicates estimated cardiovascular risk.","It is not the literal age of heart tissue or a diagnosis.","We now move to an educational internal heart model.","Blood pressure, smoking and cholesterol can contribute to risk.","Discuss modifiable risk factors with a clinician."],
    KIDNEY:["We explain a kidney result in its health context.","One result alone cannot diagnose disease.","No trusted kidney visual is available here.","We use narration without substituting a heart for a kidney.","Discuss the result and its trend with a clinician."],
    SYMPTOM:["Chest discomfort has many possible causes.","Some causes need urgent medical evaluation.","An educational model cannot establish heart disease.","Seek emergency help for severe pain or difficulty breathing.","Do not use this explanation to delay medical care."],
    GENERAL:["We explain cardiovascular risk factors educationally.","Estimated risk does not prove disease or heart damage.","We now move to an educational internal heart model.","We preserve native source motion without changing its rhythm.","Discuss appropriate questions and next steps with a clinician."],
  },
} as const;
export function buildExecutionNarration(chapter:ExecutionChapter){
  if(!isExecutionChapter(chapter))audioInvalid("NARRATION_EXECUTION_AUTHORITY_INVALID");
  const script:readonly string[]=text[chapter.language][chapter.intent];
  const sections=script.map((value,i)=>{
    if(chapter.librarySelection&&chapter.intent==="LDL"){
      return chapter.language==="ar"?[
        "نشرح نتيجة الكوليسترول ضمن سياق خطر أمراض القلب.",
        "يحمل الكوليسترول في الدم بواسطة جسيمات، ومنها إل دي إل.",
        "نرى شريانًا سليمًا، ثم مثالًا تعليميًا عامًا لتراكم اللويحات.",
        "ارتفاع النتيجة لا يثبت وجود لويحات أو انسداد في شرايينك.",
        "ناقش النتيجة مع مختص، مع بقية عوامل الخطر والخطوات المناسبة."
      ][i]:[
        "We explain cholesterol results in the context of heart risk.",
        "Particles including LDL carry cholesterol in the bloodstream.",
        "We show a healthy artery and a general educational plaque example.",
        "An elevated result does not prove plaque or blockage in your arteries.",
        "Review the result with a clinician alongside other risk factors and next steps."
      ][i];
    }
    if(chapter.librarySelection&&i===2)return chapter.language==="ar"?"هذه صور مرجعية للتعليم العام، وليست قياسًا لحالة قلبك.":"These references provide general education, not a measurement of your heart.";
    if(chapter.visualStrategy==="NARRATION_ONLY"&&chapter.intent!=="KIDNEY"&&chapter.intent!=="SYMPTOM"){
      if(i===2)return chapter.language==="ar"?"نكتفي بالشرح، لعدم توفر نموذج بصري موثوق هنا.":"We use narration because no trusted visual is available here.";
      if(i===3&&(chapter.intent==="LDL"||chapter.intent==="GENERAL"))return chapter.language==="ar"?"لا نستنتج وجود ضرر في القلب من نتيجة واحدة.":"One result does not establish damage to the heart.";
    }
    if(i===0&&chapter.evidence.some(e=>e.sourceAuthority==="USER_STATED"))return (chapter.language==="ar"?"بحسب ما ذكرت: ":"From your unverified report: ")+value;
    return value;
  });
  // Recipe changes invalidate composition, not the medical script or voice cache.
  const {visualRecipe,librarySelection,chapterId,...medicalChapter}=chapter;
  void visualRecipe;void librarySelection;void chapterId;
  const narrationChapterId=audioIdentity(medicalChapter);
  const content={builderVersion:"1",chapterId:narrationChapterId,contextId:chapter.contextId,
    language:chapter.language,sections:sections.map((text,i)=>({sectionId:`section-${i}`,text,
      purpose:["WHAT_THIS_IS","WHAT_WE_KNOW","VISUAL_ORIENTATION","WHAT_IT_MEANS","WHAT_TO_DO_NEXT"][i]})),
    evidence:chapter.evidence,patientFacing:false};
  // The chapter ID remains an execution compatibility reference. It is not a
  // synthesis/cache input: ownership and visual selection stay in execution.
  const narrationIdentity=executionNarrationIdentity(content.language,content.sections,chapter.chapterIndex);
  return deepAudioFreeze({...content,narrationPlanId:narrationIdentity,
    narrationScriptId:narrationIdentity});
}

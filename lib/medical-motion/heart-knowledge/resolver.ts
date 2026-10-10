import "server-only";
import { type VisualLibrary } from "../visual-library/visual-library-loader";
import { resolveHeartLibraryConcept, type HeartLibraryConcept } from "../visual-library/visual-library-resolver";
import { audioIdentity,audioInvalid,deepAudioFreeze } from "../composition/narration-foundation";
import { planMedicalExplanation,type MedicalExplanationContext } from "../medical-explanation-planner";
import type { ExplanationRequest } from "../contracts/medical-explanation-plan";
import { HEART_COVERAGE_MATRIX_V1 } from "./coverage";
import { HEART_SCENE_LIBRARY_V1,HEART_VISUAL_RECIPE_REGISTRY_V1 } from "./library";

const aliases:Record<string,readonly string[]>={
  ldl:["ldl","ldl high","what is ldl","ما هو ldl","لماذا الكوليسترول مرتفع","هل الكوليسترول يؤثر على القلب"],
  triglycerides:["triglycerides","ما معنى الدهون الثلاثية"],"heart-age":["heart age","ما هو heart age","عمر القلب"],
  "blood-pressure":["blood pressure","bp","لماذا ضغط الدم يؤثر على القلب"],troponin:["troponin","ما هو troponin"],
  bnp:["bnp","nt probnp","ماذا يعني bnp"],ecg:["ecg","ekg","ماذا يعني تخطيط القلب"],echo:["echo","echocardiogram","ما هو echo"],
  "calcium-score":["calcium score","ما هو calcium score"],stenosis:["blocked artery","ما هو انسداد الشريان"],
  mi:["heart attack","myocardial infarction","ما هي الجلطة القلبية"],"heart-failure":["heart failure","ما هو فشل القلب"],
  af:["atrial fibrillation","ما هو الرجفان الأذيني"],palpitations:["palpitations","لماذا أشعر بخفقان"],
  "chest-pain":["chest pain","لماذا أشعر بألم في الصدر"],"valve-disease":["valve stenosis","ما هو تضيق الصمام"],
  ef:["ef","ما معنى ef"],angiography:["catheterization","لماذا يحتاج المريض قسطرة"],stent:["stent","ما هو stent"],statin:["statin","كيف يعمل statin"],hba1c:["hba1c","a1c"],"blood-flow":["blood flow","تدفق الدم"]
};
const englishQuestions:Record<string,readonly string[]>={
  ldl:["why is cholesterol high","does cholesterol affect the heart"],triglycerides:["what do triglycerides mean"],
  "heart-age":["what is heart age"],"blood-pressure":["why does blood pressure affect the heart"],
  troponin:["what is troponin"],bnp:["what does bnp mean"],ecg:["what does an ecg mean","what is an ecg"],
  echo:["what is echo","what is an echocardiogram"],"calcium-score":["what is a calcium score"],
  stenosis:["what is an artery blockage"],mi:["what is a heart attack"],"heart-failure":["what is heart failure"],
  af:["what is atrial fibrillation"],palpitations:["why do i feel palpitations"],"chest-pain":["why do i have chest pain"],
  "valve-disease":["what is valve stenosis"],ef:["what does ef mean"],angiography:["why does a patient need catheterization"],
  stent:["what is a stent"],statin:["how does a statin work"]
};
function normalize(s:string){return s.normalize("NFKC").toLowerCase().replace(/[\u064b-\u065f\u0670]/g,"").replace(/[؟?.,!]/g,"").replaceAll("-"," ").replace(/\s+/g," ").trim();}
export const HEART_QUERY_INTENT_REGISTRY_V1=deepAudioFreeze({id:"HEART_QUERY_INTENT_REGISTRY_V1",version:"1",
  entries:HEART_COVERAGE_MATRIX_V1.topics.map(t=>({topicId:t.topicId,aliases:[t.topicId,t.terminology.en,t.terminology.ar,...(aliases[t.topicId]??[]),...(englishQuestions[t.topicId]??[])].map(normalize)}))});
/** Exact bilingual intent lookup only. Free text cannot classify evidence or authorize render. */
export function mapHeartQuery(query:string){
  if(typeof query!=="string"||query.length>500)return null;
  const q=normalize(query),matches=HEART_QUERY_INTENT_REGISTRY_V1.entries.filter(e=>e.aliases.includes(q));
  return matches.length===1?matches[0].topicId:null;
}
/** Additive planning adapter, using the EXISTING opaque owner context validator.
 * This is not another render authority, diagnostic classifier or execution engine. */
export function planHeartKnowledgeExplanation(request:ExplanationRequest,context:MedicalExplanationContext,
  options:{topicId:string;authorityLevel:"GENERAL_EDUCATIONAL"|"PERSONALIZED_SAFE"|"CONFIRMED_PATHOLOGY_REQUIRED";durationSeconds:number;cacheSceneIdentities:readonly string[];library?:VisualLibrary}){
  const base=planMedicalExplanation(request,context);
  if(request.organ!=="heart"||!Number.isFinite(options.durationSeconds)||options.durationSeconds<6||options.durationSeconds>240||
    !["GENERAL_EDUCATIONAL","PERSONALIZED_SAFE","CONFIRMED_PATHOLOGY_REQUIRED"].includes(options.authorityLevel)||
    !Array.isArray(options.cacheSceneIdentities)||options.cacheSceneIdentities.length>128||options.cacheSceneIdentities.some(x=>typeof x!=="string"||!/^[a-f0-9]{64}$/.test(x)))audioInvalid("HEART_KNOWLEDGE_REQUEST_INVALID");
  const topic=HEART_COVERAGE_MATRIX_V1.topics.find(t=>t.topicId===options.topicId);
  if(!topic)audioInvalid("HEART_TOPIC_UNSUPPORTED");
  if(!request.teachingTargets.some(t=>mapHeartQuery(t)===topic.topicId))audioInvalid("HEART_TOPIC_TARGET_MISMATCH");
  const scene=HEART_SCENE_LIBRARY_V1.scenes.find(s=>s.conceptId===topic.topicId)!;
  const recipe=HEART_VISUAL_RECIPE_REGISTRY_V1.recipes.find(r=>r.topicId===topic.topicId)!;
  const personalized=options.authorityLevel==="PERSONALIZED_SAFE";
  const libraryConcepts:Record<string,HeartLibraryConcept>={ldl:"LDL_EDUCATION","heart-age":"HEART_AGE","blood-pressure":"BLOOD_PRESSURE",
    ecg:"ELECTRICAL",echo:"ECHO_EF","calcium-score":"CALCIUM_SCORE","blood-flow":"BLOOD_FLOW",pacemaker:"PACEMAKER",icd:"ICD",ablation:"ABLATION"};
  const eligible=context.evidence.filter(e=>mapHeartQuery(e.topic)===topic.topicId&&topic.requiredEvidenceAuthority.personalization.includes(e.authority));
  const reasons=[...(options.authorityLevel==="CONFIRMED_PATHOLOGY_REQUIRED"?["FINDING_SPECIFIC_CLINICAL_AND_SCENE_APPROVAL_REQUIRED"]:[]),
    ...(topic.category==="symptoms"?["EXISTING_URGENT_CLINICAL_SAFETY_GATE_REQUIRED"]:[]),...(personalized&&(!topic.personalizedPlanningAllowed||!eligible.length)?["VERIFIED_TOPIC_SPECIFIC_EVIDENCE_REQUIRED"]:[])];
  const librarySelection=options.library&&!reasons.length&&libraryConcepts[topic.topicId]?
    resolveHeartLibraryConcept(options.library,"heart",libraryConcepts[topic.topicId],"GENERAL_EDUCATIONAL"):null;
  if(options.library&&!librarySelection&&!reasons.length)reasons.push("LIBRARY_CONCEPT_UNSUPPORTED");
  const migratedScene={...scene,moduleId:null,sourceAssetProfile:"MASTER_VISUAL_LIBRARY_V1",anatomyStructures:[],
    cameraPresets:[],safeFocusRegions:[],cacheIdentity:librarySelection?.identity??scene.cacheIdentity,
    provenance:{...scene.provenance,sourceId:"organheal-master-visual-library-v1",geometrySource:"Reference raster only; no mesh authority",
      licenseStatus:"SOURCE_LIBRARY_RIGHTS_REVIEW_REQUIRED",attribution:"Library reference; medical evidence remains separate"}};
  const content={version:"1",topicId:topic.topicId,recipe:options.library?{...recipe,sceneIds:librarySelection?.scenes.map(s=>s.asset.id)??[]}:recipe,
    scene:options.library?migratedScene:scene,librarySelection,authorityLevel:options.authorityLevel,
    status:reasons.length?"BLOCKED":scene.readinessStatus,blockReasons:reasons,medicalPlanIdentity:base.identity,
    evidenceReferences:base.evidenceReferences,patientPathologyClaim:false,patientSpecificAllowed:false,
    personalizedPlanning:personalized&&eligible.length>0&&!reasons.length,
    renderAuthority:false,productionExecutable:false,clinicalApproval:"unreviewed",patientFacing:false,
    durationSeconds:options.durationSeconds,cacheHint:options.cacheSceneIdentities.includes(scene.cacheIdentity),cacheAvailabilityVerified:false,
    estimatedRenderClass:options.library?(librarySelection?"INSTANT_COMPOSE":"CUSTOM_RENDER"):scene.moduleId?"INSTANT_COMPOSE":"CUSTOM_RENDER",
    fallback:options.library?(librarySelection?"GENERAL_EDUCATIONAL_LIBRARY":"ASSET_REQUIRED_NO_GENERIC_HEART_SUBSTITUTION"):scene.moduleId?"GENERAL_EDUCATIONAL_SCHEMATIC":"ASSET_REQUIRED_NO_GENERIC_HEART_SUBSTITUTION",
    preferredVoice:"marin",fallbackVoice:"cedar",rejectedVoices:["onyx-ar"],nativeMotionSpeedRatio:1};
  return deepAudioFreeze({...content,identity:audioIdentity(content)});
}

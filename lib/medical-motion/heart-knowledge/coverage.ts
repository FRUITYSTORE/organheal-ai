import "server-only";
import { audioIdentity, deepAudioFreeze } from "../composition/narration-foundation";

export const HEART_VISUAL_AUTHORITY_V1=deepAudioFreeze({
  GENERAL_EDUCATIONAL:{patientClaim:false,allowed:["concept","general-mechanism","test-explanation"],pathologyInPatient:false},
  PERSONALIZED_SAFE:{patientClaim:false,allowed:["verified-number","emphasis","trend","risk-context"],pathologyInPatient:false},
  CONFIRMED_PATHOLOGY_REQUIRED:{patientClaim:true,allowed:[],pathologyInPatient:false,
    gate:"Existing clinical authority plus finding-specific structural evidence and approved scene required; NOT ACTIVE"}
});
export const HEART_KNOWLEDGE_SOURCES_V1=deepAudioFreeze({
  anatomy:"https://www.nhlbi.nih.gov/health/heart",
  flow:"https://www.nhlbi.nih.gov/health/heart/blood-flow",
  electrical:"https://www.nhlbi.nih.gov/health/heart/heart-beats",
  tests:"https://www.nhlbi.nih.gov/health/heart-tests",
  lipids:"https://www.nhlbi.nih.gov/health/blood-cholesterol",
  plaque:"https://www.nhlbi.nih.gov/health/atherosclerosis",
  risk:"https://www.cdc.gov/mmwr/preview/mmwrhtml/mm6434a6.htm",
  labs:"https://medlineplus.gov/lab-tests/",
  troponin:"https://medlineplus.gov/lab-tests/troponin-test/",
  bnp:"https://medlineplus.gov/lab-tests/natriuretic-peptide-tests-bnp-nt-probnp/",
  failure:"https://www.nhlbi.nih.gov/health/heart-failure",
  valves:"https://www.nhlbi.nih.gov/health/heart-valve-diseases",
  procedures:"https://www.nhlbi.nih.gov/health/heart-treatments-procedures"
});
type Definition=readonly [string,string,string];
const categories={
  anatomy:[
    ["orientation","Heart orientation","اتجاه القلب"],["apex","Apex","قمة القلب"],["base","Base","قاعدة القلب"],
    ["anterior-posterior","Anterior and posterior","الأمامي والخلفي"],["myocardium","Myocardium","عضلة القلب"],
    ["pericardium","Pericardium","التامور"],["right-atrium","Right atrium","الأذين الأيمن"],["right-ventricle","Right ventricle","البطين الأيمن"],
    ["left-atrium","Left atrium","الأذين الأيسر"],["left-ventricle","Left ventricle","البطين الأيسر"],
    ["tricuspid-valve","Tricuspid valve","الصمام ثلاثي الشرفات"],["pulmonary-valve","Pulmonary valve","الصمام الرئوي"],
    ["mitral-valve","Mitral valve","الصمام التاجي"],["aortic-valve","Aortic valve","الصمام الأبهري"],
    ["aorta","Aorta","الأبهر"],["pulmonary-arteries","Pulmonary arteries","الشرايين الرئوية"],
    ["pulmonary-veins","Pulmonary veins","الأوردة الرئوية"],["svc","Superior vena cava","الوريد الأجوف العلوي"],
    ["ivc","Inferior vena cava","الوريد الأجوف السفلي"],["coronary-distribution","Coronary distribution","توزع الشرايين التاجية"],
    ["coronary-supply","Coronary blood supply","التروية التاجية"],["septum","Interventricular septum","الحاجز بين البطينين"]],
  physiology:[
    ["cardiac-cycle","Cardiac cycle","الدورة القلبية"],["systole","Systole","الانقباض"],["diastole","Diastole","الانبساط"],
    ["chamber-filling","Chamber filling","امتلاء الحجرات"],["ventricular-contraction","Ventricular contraction","انقباض البطينين"],
    ["blood-flow","Blood flow direction","اتجاه تدفق الدم"],["valve-motion","Valve opening and closing","فتح الصمامات وإغلاقها"],
    ["pulmonary-circulation","Pulmonary circulation","الدورة الرئوية"],["systemic-circulation","Systemic circulation","الدورة الجهازية"],
    ["cardiac-output","Cardiac output","النتاج القلبي"],["stroke-volume","Stroke volume","حجم الضربة"],["heart-rate","Heart rate","معدل ضربات القلب"]],
  electrical:[
    ["sinus-rhythm","Sinus rhythm","النظم الجيبي"],["sa-node","SA node","العقدة الجيبية"],["av-node","AV node","العقدة الأذينية البطينية"],
    ["conduction","Electrical conduction","التوصيل الكهربائي"],["ecg-concept","ECG electrical concept","مفهوم تخطيط القلب الكهربائي"],
    ["af","Atrial fibrillation","الرجفان الأذيني"],["tachycardia","Tachycardia","تسرع القلب"],["bradycardia","Bradycardia","بطء القلب"],
    ["svt","Supraventricular tachycardia","تسرع القلب فوق البطيني"],["ventricular-arrhythmia","Ventricular arrhythmia","اضطراب النظم البطيني"]],
  risk:[
    ["ldl","LDL cholesterol","كوليسترول البروتين الدهني منخفض الكثافة"],["triglycerides","Triglycerides","الدهون الثلاثية"],
    ["hdl","HDL cholesterol","كوليسترول البروتين الدهني مرتفع الكثافة"],["blood-pressure","Blood pressure","ضغط الدم"],
    ["vascular-resistance","Vascular resistance","المقاومة الوعائية"],["heart-workload","Cardiac workload","عبء العمل القلبي"],
    ["heart-age","Heart Age risk communication","عمر القلب كمقياس للتواصل حول الخطر"],
    ["risk-factors","Modifiable and non-modifiable risk factors","عوامل الخطر القابلة وغير القابلة للتعديل"],
    ["risk-uncertainty","Risk uncertainty","عدم اليقين في تقدير الخطر"],["prevention","Prevention and next actions","الوقاية والخطوات التالية"]],
  labs:[
    ["total-cholesterol","Total cholesterol","الكوليسترول الكلي"],["non-hdl","Non-HDL cholesterol","الكوليسترول غير المرتبط بالبروتين الدهني مرتفع الكثافة"],
    ["troponin","Troponin","التروبونين"],["bnp","BNP and NT-proBNP","الببتيد المدر للصوديوم وطلائعه"],
    ["hba1c","HbA1c","الهيموغلوبين السكري"],["glucose","Glucose","الغلوكوز"],
    ["creatinine-egfr","Creatinine and eGFR","الكرياتينين ومعدل الترشيح الكبيبي المقدر"],
    ["potassium","Potassium","البوتاسيوم"],["sodium","Sodium","الصوديوم"],["crp","CRP context","البروتين المتفاعل سي"],
    ["coagulation","Coagulation tests","اختبارات التخثر"]],
  diagnostics:[
    ["bp-measurement","Blood pressure measurement","قياس ضغط الدم"],["ecg","ECG / EKG","تخطيط القلب الكهربائي"],
    ["holter","Holter monitoring","مراقبة هولتر"],["echo","Echocardiogram","تخطيط صدى القلب"],
    ["stress-test","Stress test","اختبار الجهد"],["cta","Coronary CT angiography","تصوير الشرايين التاجية المقطعي"],
    ["calcium-score","Coronary calcium score","درجة تكلس الشرايين التاجية"],["cardiac-mri","Cardiac MRI","الرنين المغناطيسي للقلب"],
    ["angiography-test","Coronary angiography test","تصوير الشرايين التاجية"],["pulse-monitor","Pulse monitoring","مراقبة النبض"]],
  disease:[
    ["healthy-artery","Healthy artery cross-section","مقطع شريان سليم"],["arterial-wall","Arterial wall","جدار الشريان"],
    ["atherosclerosis","Atherosclerosis progression","تطور تصلب الشرايين"],["stenosis","Coronary stenosis","تضيق الشريان التاجي"],
    ["ischemia","Myocardial ischemia","نقص تروية عضلة القلب"],["mi","Myocardial infarction mechanism","آلية احتشاء عضلة القلب"],
    ["hypertension","Hypertension","ارتفاع ضغط الدم"],["lvh","Left ventricular hypertrophy","تضخم البطين الأيسر"],
    ["heart-failure","Heart failure","فشل القلب"],["ef","Ejection fraction","الكسر القذفي"],
    ["congestion","Fluid congestion","الاحتقان"],["aortic-stenosis","Aortic stenosis","تضيق الصمام الأبهري"],
    ["mitral-regurgitation","Mitral regurgitation","قلس الصمام التاجي"],["valve-disease","Valve stenosis and regurgitation","تضيق الصمامات وقلسها"],
    ["dcm","Dilated cardiomyopathy","اعتلال عضلة القلب التوسعي"],["hcm","Hypertrophic cardiomyopathy","اعتلال عضلة القلب الضخامي"],
    ["myocarditis","Myocarditis","التهاب عضلة القلب"],["pericarditis","Pericarditis","التهاب التامور"]],
  congenital:[
    ["asd","Atrial septal defect","عيب الحاجز الأذيني"],["vsd","Ventricular septal defect","عيب الحاجز البطيني"],
    ["pda","Patent ductus arteriosus","القناة الشريانية السالكة"],["tof","Tetralogy of Fallot","رباعية فالو"]],
  symptoms:[
    ["chest-pain","Chest pain","ألم الصدر"],["palpitations","Palpitations","الخفقان"],["dyspnea","Shortness of breath","ضيق التنفس"],
    ["syncope","Dizziness and syncope","الدوخة والإغماء"],["edema","Edema","الوذمة"],["exercise-intolerance","Exercise intolerance","عدم تحمل الجهد"]],
  procedures:[
    ["angiography","Angiography / catheterization","تصوير الشرايين والقسطرة"],["angioplasty","Angioplasty","رأب الوعاء"],
    ["stent","Stent","الدعامة"],["cabg","CABG","مجازة الشريان التاجي"],["pacemaker","Pacemaker","منظم ضربات القلب"],
    ["defibrillator","Defibrillator","مزيل الرجفان"],["ablation","Ablation","الاستئصال بالقسطرة"],
    ["valve-procedure","Valve repair or replacement","إصلاح الصمام أو استبداله"]],
  medication:[
    ["statin","Statins","الستاتينات"],["antihypertensive","Antihypertensives","خافضات ضغط الدم"],
    ["antiplatelet","Antiplatelets","مضادات الصفيحات"],["anticoagulant","Anticoagulants","مضادات التخثر"],
    ["beta-blocker","Beta blockers","حاصرات بيتا"],["diuretic","Diuretics","مدرات البول"]]
} satisfies Record<string,readonly Definition[]>;

export const HEART_REVIEW_MODULES_V1=deepAudioFreeze({
  "ldl-particles":{topics:["ldl"],type:"C",concept:"LDL transport, not artery disease",source:"lipids"},
  "triglyceride-particles":{topics:["triglycerides"],type:"C",concept:"Triglyceride-rich transport",source:"lipids"},
  "glucose-window":{topics:["hba1c","glucose"],type:"F",concept:"Exposure and measurement window, no diagnosis",source:"labs"},
  "pressure-mechanics":{topics:["blood-pressure","bp-measurement","hypertension","vascular-resistance","heart-workload"],type:"D",concept:"Pressure and resistance relationships, no hypertrophy",source:"electrical"},
  "heart-age-risk":{topics:["heart-age","risk-factors","risk-uncertainty","prevention"],type:"E",concept:"Risk comparison, not tissue age",source:"risk"},
  "electrical-sequence":{topics:["ecg","ecg-concept","sa-node","av-node","conduction"],type:"D",concept:"Electrical signal sequence, not a patient ECG or validated rhythm simulation",source:"electrical"},
  "circulation-flow":{topics:["blood-flow","pulmonary-circulation","systemic-circulation"],type:"D",concept:"Ordered circulation graph, not anatomical or phase-accurate mechanical simulation",source:"flow"},
  "heart-coronary-context":{topics:["coronary-supply"],type:"D",concept:"Heart requires its own blood supply; no named branch geometry",source:"flow"}
} as const);
export type HeartReviewModuleId=keyof typeof HEART_REVIEW_MODULES_V1;
export type HeartTopicId=typeof categories[keyof typeof categories][number][0];
const structures:Record<string,readonly string[]>={
  "right-atrium":["heart.rightAtrium"],"right-ventricle":["heart.rightVentricle"],"left-atrium":["heart.leftAtrium"],"left-ventricle":["heart.leftVentricle"],
  myocardium:["heart.myocardium"],septum:["heart.septum.interventricular"],aorta:["heart.aorta"],svc:["heart.superiorVenaCava"],ivc:["heart.inferiorVenaCava"],
  "pulmonary-veins":["heart.pulmonaryVeins"],"pulmonary-arteries":["heart.pulmonaryTrunk","heart.rightPulmonaryArtery","heart.leftPulmonaryArtery"],
  "tricuspid-valve":["heart.valve.tricuspid"],"pulmonary-valve":["heart.valve.pulmonary"],"mitral-valve":["heart.valve.mitral"],"aortic-valve":["heart.valve.aortic"],
  "coronary-distribution":["heart.coronary.leftMain","heart.coronary.lad","heart.coronary.lcx","heart.coronary.rca"]
};
const sourceByCategory:Record<string,keyof typeof HEART_KNOWLEDGE_SOURCES_V1>={anatomy:"anatomy",physiology:"flow",electrical:"electrical",risk:"risk",labs:"labs",diagnostics:"tests",disease:"plaque",congenital:"anatomy",symptoms:"tests",procedures:"procedures",medication:"procedures"};
export const HEART_COVERAGE_MATRIX_V1=deepAudioFreeze({id:"HEART_COVERAGE_MATRIX_V1",version:"1",patientFacing:false,
  topics:Object.entries(categories).flatMap(([category,defs])=>defs.map(([topicId,en,ar])=>{
    const module=(Object.keys(HEART_REVIEW_MODULES_V1) as HeartReviewModuleId[]).find(id=>(HEART_REVIEW_MODULES_V1[id].topics as readonly string[]).includes(topicId))??null;
    const disease=category==="disease"||category==="congenital"||["af","tachycardia","bradycardia","svt","ventricular-arrhythmia"].includes(topicId);
    const symptom=category==="symptoms";
    const source=topicId==="troponin"?"troponin":topicId==="bnp"?"bnp":topicId==="heart-failure"?"failure":topicId.includes("valve")||topicId==="aortic-stenosis"||topicId==="mitral-regurgitation"?"valves":sourceByCategory[category];
    return {topicId,category,medicalConcept:en,userIntents:["GENERAL_MEDICAL_EDUCATION",...(symptom?["EXPLAIN_SYMPTOM_SAFELY"]:["EXPLAIN_THIS_RESULT","EXPLAIN_RISK"])],
      requiredEvidenceAuthority:{education:"EDUCATIONAL_CONTEXT",personalization:category==="labs"||["ldl","triglycerides","hdl"].includes(topicId)?["LAB_VERIFIED","REPORT_VERIFIED"]:category==="risk"?["RISK_ESTIMATE","SYSTEM_DERIVED","REPORT_VERIFIED"]:[],pathology:"CONFIRMED_DIAGNOSIS_PLUS_FINDING_SPECIFIC_CLINICAL_GATE"},
      educationalVisualAllowed:!symptom,personalizedVisualAllowed:false,personalizedPlanningAllowed:["risk","labs"].includes(category),confirmedPathologyRequired:disease,
      patientPathologyAlwaysRequiresConfirmation:true,requiredAnatomicalStructures:structures[topicId]??(module?[]:["CONCEPT_SPECIFIC_ASSET_REQUIRED"]),
      requiredAnimationMotion:module?"PROGRESSIVE_SCHEMATIC_NOT_PHYSIOLOGICAL_TIMING":category==="electrical"?"MEDICALLY_VALIDATED_RHYTHM_PRESET":"SOURCE_SUPPORTED_REVIEWED_MECHANISM_OR_STATIC_DIAGRAM",
      existingTrustedAssetCoverage:module?["ORIGINAL_SCHEMATIC_INTERNAL_REVIEW_ONLY"]:category==="anatomy"?["BP3D_SSM_APIL_PARTIAL_INTERNAL_REFERENCE_ONLY"]:[],
      missingVisualCapability:module?["MEDICAL_REVIEW","PRODUCTION_LICENSE_REVIEW","OWNED_RUNTIME_ACTIVATION"]:[category==="congenital"?"FUTURE_ASSET_REQUIRED":"ASSET_REQUIRED","MEDICAL_REVIEW"],
      plannedVisualModule:module??`heart-${topicId}-education-v1`,narrationSupport:"BILINGUAL_CONCEPT_TERMINOLOGY_ONLY_NOT_APPROVED_NARRATION",
      terminology:{ar,en},sourceReferences:[HEART_KNOWLEDGE_SOURCES_V1[source]],
      safetyNotes:["GENERAL_EDUCATION_IS_NOT_A_PATIENT_FINDING","LAB_OR_RISK_IS_NOT_DIAGNOSIS","NO_SOURCE_MIXING","NO_NATIVE_RHYTHM_MUTATION",
        ...(topicId==="heart-age"?["NOT_LITERAL_TISSUE_AGE","NO_FABRICATED_FACTOR_WEIGHTS"]:[]),...(topicId==="hdl"?["DO_NOT_CLAIM_HDL_CLEANS_ARTERIES"]:[]),
        ...(topicId==="troponin"?["DOES_NOT_DIAGNOSE_MI_ALONE"]:[]),...(category==="medication"?["NOT_PRESCRIBING_ADVICE"]:[]),...(symptom?["EXISTING_URGENT_CLINICAL_GATE_REQUIRED","SYMPTOM_IS_NOT_DIAGNOSIS"]:[])],
      executionReadiness:module?"INTERNAL_REVIEW":symptom?"BLOCKED":category==="congenital"?"FUTURE_ASSET_REQUIRED":"ASSET_REQUIRED",
      medicalReviewStatus:"unreviewed",patientFacing:false};
  }))});
export const HEART_MEDICAL_VISUAL_KNOWLEDGE_PACK_V1=deepAudioFreeze({id:"HEART_MEDICAL_VISUAL_KNOWLEDGE_PACK_V1",version:"1",
  matrixIdentity:audioIdentity(HEART_COVERAGE_MATRIX_V1),status:"INTERNAL_REVIEW_INCOMPLETE",patientFacing:false});
export const HEART_AGE_VISUALIZATION_V1=deepAudioFreeze({id:"HEART_AGE_VISUALIZATION_V1",version:"1",moduleId:"heart-age-risk",
  concepts:["CHRONOLOGICAL_AGE","ESTIMATED_RISK","MODIFIABLE_FACTORS","NON_MODIFIABLE_FACTORS","COMPARISON","UNCERTAINTY","NEXT_ACTION"],
  factorWeights:null,calculationEngine:false,tissueAge:false,improvementPrediction:false,
  verifiedNumbersExecution:"BLOCKED_PENDING_TOPIC_SPECIFIC_CLINICAL_VALUE_AUTHORITY",patientFacing:false});
const labMeanings:Record<string,string>={
  ldl:"Cholesterol carried by LDL; cardiovascular risk context, not proof of plaque",
  hdl:"Cholesterol carried by HDL; do not depict artery cleaning or infer protection from one result",
  triglycerides:"Triglycerides in blood; interpret with clinical/metabolic context",
  "total-cholesterol":"Total cholesterol in blood; components and context matter",
  "non-hdl":"Total cholesterol minus HDL cholesterol; not a direct artery scan",
  troponin:"Blood troponin concentration; cardiac muscle injury context, not MI diagnosis alone",
  bnp:"BNP/NT-proBNP concentration; cardiac stress context, not heart-failure diagnosis alone",
  hba1c:"Glycated hemoglobin; roughly 2–3 month glucose context, not a heart damage measure",
  glucose:"Glucose concentration at sampling; timing and context matter",
  "creatinine-egfr":"Creatinine and estimated kidney filtration; relevant care context, not a heart diagnosis",
  potassium:"Electrolyte concentration relevant to cardiac electrical function; not a rhythm diagnosis",
  sodium:"Electrolyte/fluid-balance context; not a diagnosis of congestion alone",
  crp:"Inflammation marker; nonspecific, not evidence of coronary plaque",
  coagulation:"Test-specific clotting measurements; not proof of an arterial clot"
};
export const CARDIAC_LAB_VISUAL_PACK_V1=deepAudioFreeze({id:"CARDIAC_LAB_VISUAL_PACK_V1",version:"1",
  entries:Object.entries(labMeanings).map(([topicId,measurement])=>({topicId,
    whatMeasured:measurement,biologicalRelationship:HEART_COVERAGE_MATRIX_V1.topics.find(t=>t.topicId===topicId)!.medicalConcept,
    highLowMeaning:"Requires test-specific reference range, clinical context and source-reviewed interpretation; no automatic diagnosis",
    cannotProve:"A laboratory value alone cannot establish patient structural disease, plaque, infarction or arrhythmia",
    cardiovascularContext:"Educational context only; clinician review and complementary information may be needed",
    thresholds:null,personalizedInterpretationActive:false,medicalReview:"unreviewed"})),patientFacing:false});

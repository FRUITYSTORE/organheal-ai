import "server-only";
import { audioIdentity, deepAudioFreeze } from "../composition/narration-foundation";
import { HEART_COVERAGE_MATRIX_V1,HEART_REVIEW_MODULES_V1,type HeartReviewModuleId } from "./coverage";

/** Existing anatomy packages remain separate, partial references. None gains approval. */
export const HEART_EXISTING_ASSET_ASSESSMENT_V1=deepAudioFreeze([
  {id:"HEART_MASTER_VISUAL_V1",evidence:"medical-assets/heart-hero-selected-local-inventory.json",coverage:"External silhouette only; no trustworthy structure addressing",license:"unresolved",anatomicallyValidated:false,status:"REFERENCE_ONLY"},
  {id:"HEARTBEAT_MOTION_MASTER_V1",evidence:"render/blender/heartbeat_motion_master_v1.lock.json",coverage:"Native heartbeat/leaflet reference, not validated phase or pathological rhythm",license:"Existing candidate CC BY 4.0; final clearance unresolved",anatomicallyValidated:false,status:"REFERENCE_ONLY"},
  {id:"heart-bp3d-4.0-internal-review-v1",evidence:"medical-assets/candidates/bodyparts3d-4.0/selection-manifest.json",coverage:"14 cavity/vessel source parts; no complete myocardium/septa/valves/pulmonary-vein aggregate",license:"CC BY 4.0; review unresolved",anatomicallyValidated:false,status:"REFERENCE_ONLY"},
  {id:"heart-ssm-4506463-v2-internal-review-v1",evidence:"medical-assets/candidates/zenodo-4506463-v2/selection-manifest.json",coverage:"Ventricular surfaces/composite boundary/reference; not complete myocardium or separate septum",license:"CC BY 4.0; review unresolved",anatomicallyValidated:false,status:"REFERENCE_ONLY"},
  {id:"heart-apil-local-reference-v1",evidence:"medical-assets/apil-local-heart-inventory.json",coverage:"Source-labeled LV/LA/aorta and combined RARV, never separate RA/RV",license:"Exact upstream artifact identity/license clearance unresolved",anatomicallyValidated:false,status:"REFERENCE_ONLY"}
]);
export const HEART_SCENE_LIBRARY_V1=deepAudioFreeze({id:"HEART_SCENE_LIBRARY_V1",version:"1",
  scenes:HEART_COVERAGE_MATRIX_V1.topics.map(t=>{
    const implemented=Object.hasOwn(HEART_REVIEW_MODULES_V1,t.plannedVisualModule);
    const module=implemented?HEART_REVIEW_MODULES_V1[t.plannedVisualModule as HeartReviewModuleId]:null;
    const definition={sceneId:`heart:${t.topicId}:education:1`,conceptId:t.topicId,category:t.category,organ:"heart",
      sourceAssetProfile:implemented?"ORGANHEAL_ORIGINAL_SCHEMATIC_V1":null,anatomyStructures:t.requiredAnatomicalStructures,
      provenance:{sourceId:implemented?"organheal-original-concept-graphics-v1":null,sourceVersion:"1",evidenceRefs:t.sourceReferences,
        geometrySource:implemented?"Original code-drawn abstract diagram; not anatomical geometry":"ASSET_REQUIRED",
        licenseStatus:implemented?"NO_THIRD_PARTY_MEDIA_USED_PROJECT_RELEASE_REVIEW_REQUIRED":"UNRESOLVED",attribution:"Medical references retained; no source media copied"},
      medicalValidationStatus:"unreviewed",educationalAuthority:"GENERAL_EDUCATIONAL",pathologyAuthority:null,
      patientSpecificAllowed:false,durationRange:[6,20],nativeMotionRules:{speedRatio:1,heartbeatMutation:false,physiologySimulation:false},
      cameraPresets:implemented?["FIXED_DIAGRAM_LAYOUT"]:[],safeFocusRegions:implemented?[[.07,.18,.93,.78]]:[],
      supportedAspectRatios:implemented?["9:16","16:9"]:[],expectedRenderClass:implemented?"INSTANT_COMPOSE":"CUSTOM_RENDER",
      visualModuleType:module?.type??"A",moduleId:implemented?t.plannedVisualModule:null,
      readinessStatus:implemented?"INTERNAL_REVIEW":t.executionReadiness,productionExecutable:false,
      blockers:t.missingVisualCapability};
    return {...definition,cacheIdentity:audioIdentity(definition)};
  })});
export const HEART_VISUAL_RECIPE_REGISTRY_V1=deepAudioFreeze({id:"HEART_VISUAL_RECIPE_REGISTRY_V1",version:"1",
  recipes:HEART_COVERAGE_MATRIX_V1.topics.map(t=>({recipeId:`HEART_${t.topicId.replaceAll("-","_").toUpperCase()}_EDUCATION_RECIPE_V1`,topicId:t.topicId,
    sceneIds:[`heart:${t.topicId}:education:1`],sequence:["CONCEPT","RELATIONSHIP","LIMITATION","NEXT_ACTION"],
    medicalMeaning:t.medicalConcept,status:t.executionReadiness,music:"MUSIC_OFF",patientFacing:false}))});
export const HEART_ASSET_GAP_REPORT_V1=deepAudioFreeze({id:"HEART_ASSET_GAP_REPORT_V1",version:"1",
  gaps:HEART_COVERAGE_MATRIX_V1.topics.map(t=>({topicId:t.topicId,existingMasterCanExplainConcept:false,
    safeNonAnatomicalDerivation:Object.hasOwn(HEART_REVIEW_MODULES_V1,t.plannedVisualModule),
    trustedModelRequired:!Object.hasOwn(HEART_REVIEW_MODULES_V1,t.plannedVisualModule),
    proceduralAnatomyAllowed:false,proceduralGraphicsAllowed:Object.hasOwn(HEART_REVIEW_MODULES_V1,t.plannedVisualModule),
    licenseClearance:"NOT_GRANTED",medicalReviewRequired:true,missing:t.missingVisualCapability,
    acquisitionRequirements:["OFFICIAL_URL","AUTHOR_INSTITUTION","EXACT_LICENSE","ARCHIVE_SHA256","ATTRIBUTION","DERIVATIVE_AND_COMMERCIAL_RIGHTS","REDISTRIBUTION_CONSTRAINTS","SOURCE_COHERENCE","UNITS_AXES","TOPOLOGY","MEDICAL_REVIEW"]}))});
const count=(category:string)=>HEART_COVERAGE_MATRIX_V1.topics.filter(t=>t.category===category).length;
const total=HEART_COVERAGE_MATRIX_V1.topics.length;
export const HEART_VISUAL_COVERAGE_SCORE_V1=deepAudioFreeze({id:"HEART_VISUAL_COVERAGE_SCORE_V1",version:"1",
  denominator:total,catalogCoverage:{covered:total,total},
  categories:Object.fromEntries(["anatomy","physiology","electrical","risk","labs","diagnostics","disease","congenital","symptoms","procedures","medication"].map(c=>[c,{catalogued:count(c),medicallyReviewed:0,productionExecutable:0}])),
  language:{ar:{terminology:total,approvedScripts:0},en:{terminology:total,approvedScripts:0}},
  visualAssetCoverage:{conceptsWithInternalSchematic:HEART_SCENE_LIBRARY_V1.scenes.filter(s=>s.moduleId).length,total,anatomicallyValidated:0},
  executableCoverage:{production:0,internalReviewModules:Object.keys(HEART_REVIEW_MODULES_V1).length,total},
  medicalReviewCoverage:{covered:0,total},safeFallbackCoverage:{covered:total,total,strategy:"FAIL_CLOSED_OR_GENERAL_CONCEPT_NO_DISEASE_CLAIM"},
  complete:false,patientFacing:false});

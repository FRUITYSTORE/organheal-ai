import "server-only";
import { createHash } from "node:crypto";
import { canonicalSceneJson } from "./scene-compiler";
import { jsonSnapshot } from "./validation/json-snapshot";
import { validateSequence } from "./orchestration/sequence";
import { getHeartMasterVisual } from "./heart-master-visual";
import { getHeartbeatMotionMaster } from "./heartbeat-motion-master";
import { VISUAL_OUTPUT_PROFILES, VISUAL_AUDIO_POLICY } from "./visual-foundation";
import type { AnatomicalAppearanceProfile, CinematicPlan, CinematicRecipe, CinematicScene } from "./contracts/cinematic";

function freeze<T>(v: T): T { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
export const CINEMATIC_GUIDANCE_V1 = freeze({
  version: "1", phases: ["ESTABLISH","ORIENT","APPROACH","FOCUS","EXPLAIN","REORIENT"],
  rules: {
    ESTABLISH: ["whole-organ-or-contextual-overview", "no-extreme-close-up", "source-orientation-preserved", "quiet-background", "no-initial-labels"],
    ORIENT: ["hold-or-gentle-approach", "no-flips-or-fast-orbits", "sparse-source-supported-labels"],
    APPROACH: ["smoothstep", "retain-landmarks-and-context", "no-anatomy-clipping", "explicit-duration"],
    FOCUS: ["no-geometry-edits-or-disproportionate-enlargement", "do-not-hide-important-neighbors", "no-game-glow"],
    EXPLAIN: ["narration-primary", "captions-and-label-slots", "educational-emphasis-is-not-pathology"],
    REORIENT: ["contextual-pull-back", "source-change-is-explicit", "no-cross-source-morph"],
  },
  approach: { durationRange: [1,4], targetCoverageRange: [.2,.65], minimumContextMargin: .12, maximumZoomRatio: 1.5,
    minimumProximityInOrganExtents: 1.2, easing: "smoothstep" },
  safety: { shake: false, randomZoom: false, whipPan: false, arbitraryOrbit: false, orientationReversal: false, clipping: false },
  safeRegions: { MOBILE_VERTICAL_9_16: { organ: [.08,.23,.92,.90], subtitle: [.08,.80,.92,.94], label: [.04,.1,.96,.74] },
    DESKTOP_16_9: { organ: [.12,.12,.88,.75], subtitle: [.08,.8,.92,.94], label: [.04,.08,.96,.75] } },
});
export const PRESENTATION_POLICIES = freeze({
  PATIENT_EDUCATION: { maxSimultaneousLabels: 2, progressiveExplanation: true, detail: "restrained-source-detail", music: "optional-ducked", removesImportantContext: false },
  CLINICAL_REVIEW: { maxSimultaneousLabels: 6, progressiveExplanation: true, detail: "all-source-supported-detail", music: "disabled", removesImportantContext: false },
});
export const MEDICAL_VISUAL_SAFETY = freeze({
  riskIsDiagnosis: false, symptomIsConfirmedDisease: false, labAbnormalityIsVisiblePathology: false,
  diseaseLabelsAlterHeartbeat: false, highLdlAcceleratesHeartbeat: false, elevatedBpImpliesTachycardia: false,
  pathologicalRhythm: "separately-validated-input-and-preset-required", riskDeformsAnatomy: false,
  plaqueStenosisHypertrophy: "unsupported-without-separate-evidence-and-approved-logic",
  highlightsIndicatePathology: false,
});
export const HEART_APPEARANCE_PROFILE_V1: Readonly<AnatomicalAppearanceProfile> = freeze({
  id: "HEART_APPEARANCE_PROFILE_V1", version: "1", organ: "heart", masterVisualId: "HEART_MASTER_VISUAL_V1",
  base: { kind: "ANATOMICAL_BASE_APPEARANCE", meaning: "anatomical", sourceMaterials: "authoritative",
    tissueDirection: "Source-supported natural red-brown/dark-red tissue; restrained saturation/wetness, preserved texture variation. Conventional cutaway colors remain source encoding, not medical truth.",
    exactMedicalRgb: null, preserveTextureMeaning: true },
  highlight: { kind: "EDUCATIONAL_HIGHLIGHT", meaning: "educational", temporary: true, indicatesPathology: false,
    effects: ["outline","spotlight","label-relationship"] }, clinicalDetail: "source-supported-only",
});
const fail = (): never => { throw new Error("CINEMATIC_RECIPE_INVALID"); };
const exact = (v: object, keys: string[]) => !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).sort().join() === [...keys].sort().join();
const id = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9_.@/-]{0,199}$/.test(v);
const range = (v: number, a: number, b: number) => Number.isFinite(v) && v >= a && v <= b;
const roles = () => {
  const hero = getHeartMasterVisual("HEART_MASTER_VISUAL_V1"), motion = getHeartbeatMotionMaster("HEARTBEAT_MOTION_MASTER_V1");
  return {
    HEART_MASTER_VISUAL_V1: { assetVersion: "HEART_HERO_V1", sourceSha256: hero.configuration.source.sha256,
      profileId: "heart-hero-local-visual-review", visualRole: "EXTERNAL_HEART_HERO", source: "medical-assets/heart-hero-selected-local-inventory.json", motion: "static", focus: "whole-organ" },
    HEARTBEAT_MOTION_MASTER_V1: { assetVersion: "HEART_MOTION_V1", sourceSha256: motion.preset.sourceSha256,
      profileId: "heart-native-cutaway-visual-review", visualRole: motion.preset.visualRole, source: "medical-assets/LICENSE_MANIFEST.json#HEART_MOTION/ownerVisualSelection", motion: "NORMAL_HEARTBEAT_V1", focus: "whole-cutaway" },
  } as const;
};

/** Planning compiler only. No compiler-issued scene/profile/sequence capability is fabricated.
 * Existing trusted render/orchestration services remain the sole future execution boundary. */
export function compileCinematicRecipe(input: unknown): CinematicPlan {
  try {
    const r = jsonSnapshot(input, { depth: 12, nodes: 6000, width: 64, stringLength: 200, keyLength: 64, totalStringLength: 24000 }) as unknown as CinematicRecipe;
    if (!exact(r,["id","version","visualEngineVersion","cinematicGuidanceVersion","organ","usage","patientFacing","mode","language","outputProfile","fps","music","scenes","transitions"]) ||
      !id(r.id) || r.version !== "1" || r.visualEngineVersion !== "1" || r.cinematicGuidanceVersion !== "1" || r.organ !== "heart" ||
      r.usage !== "internal-review" || r.patientFacing !== false || !["PATIENT_EDUCATION","CLINICAL_REVIEW"].includes(r.mode) ||
      !["en","ar"].includes(r.language) || !Object.hasOwn(VISUAL_OUTPUT_PROFILES,r.outputProfile) || r.fps !== 24 ||
      !["disabled","optional-ducked"].includes(r.music) || r.mode === "CLINICAL_REVIEW" && r.music !== "disabled" ||
      !Array.isArray(r.scenes) || r.scenes.length !== 6 || !Array.isArray(r.transitions) || r.transitions.length !== 5) fail();
    const masters = roles();
    const durations: number[] = [];
    r.scenes.forEach((s,i) => {
      if (!exact(s,["phase","masterId","sourceProfile","camera","targets","focus","appearanceProfile","highlight","slots","duration","timing","narrationDuration","narrationRef","subtitleRef"]) ||
        s.phase !== CINEMATIC_GUIDANCE_V1.phases[i] || !Object.hasOwn(masters,s.masterId) || s.appearanceProfile !== "HEART_APPEARANCE_PROFILE_V1" ||
        !exact(s.sourceProfile,["profileId","profileVersion"]) || s.sourceProfile.profileId !== masters[s.masterId].profileId || s.sourceProfile.profileVersion !== "1" ||
        !Array.isArray(s.targets) || s.targets.length !== 0 || s.focus !== masters[s.masterId].focus ||
        !exact(s.highlight,["meaning","enabled","indicatesPathology"]) || s.highlight.meaning !== "educational" || s.highlight.enabled !== false || s.highlight.indicatesPathology !== false ||
        !exact(s.slots,["narration","subtitle","label"]) || s.slots.narration !== "voice-segment" || s.slots.subtitle !== "subtitle" || s.slots.label !== "educational-label" ||
        !range(s.duration,.5,12) || !["fixed","narration-duration"].includes(s.timing) ||
        s.timing === "fixed" && s.narrationDuration !== null || s.timing === "narration-duration" && !range(s.narrationDuration ?? NaN,.5,12) ||
        ![s.narrationRef,s.subtitleRef].every(v => v === null || id(v)) || s.timing === "narration-duration" && !s.narrationRef) fail();
      const c = s.camera;
      if (!exact(c,["preset","duration","targetCoverage","contextMargin","zoomRatio","proximityInOrganExtents","easing","movement","clipping"]) ||
        !["full-organ","medium-anatomical","guided-push-in","focused-close-up","controlled-pull-back"].includes(c.preset) || c.easing !== "smoothstep" || c.clipping !== "prohibited" ||
        !["hold","approach","pull-back"].includes(c.movement) || !range(c.duration,0,s.duration) ||
        !range(c.targetCoverage,.2,.65) || !range(c.contextMargin,.12,.4) || !range(c.zoomRatio,1,1.5) || !range(c.proximityInOrganExtents,1.2,10) ||
        c.movement === "hold" && (c.duration !== 0 || c.zoomRatio !== 1) || c.movement !== "hold" && !range(c.duration,1,4) ||
        s.phase === "ESTABLISH" && (c.preset !== "full-organ" || c.movement !== "hold") ||
        s.phase === "APPROACH" && (c.preset !== "guided-push-in" || c.movement !== "approach") ||
        s.phase === "REORIENT" && (c.preset !== "controlled-pull-back" || c.movement !== "pull-back")) fail();
      durations.push(s.timing === "narration-duration" ? s.narrationDuration! : s.duration);
      if (c.duration > durations[i]) fail();
    });
    r.transitions.forEach((t,i) => {
      const change = r.scenes[i].masterId !== r.scenes[i+1].masterId;
      if (!exact(t,["boundaryIndex","kind","duration","sourceBoundary"]) ||
        t.sourceBoundary !== (change ? "explicit-source-change" : "same-source") ||
        t.duration/2 >= Math.min(durations[i],durations[i+1])) fail();
    });
    const totalDuration = durations.reduce((a,b)=>a+b,0); if (totalDuration > 60) fail();
    const sequence = validateSequence({ sequenceId:r.id,sequenceVersion:r.version,sceneIndices:r.scenes.map((_,i)=>i),
      transitions:r.transitions.map(({sourceBoundary:_,...t})=>t), usage:r.usage,aspectRatios:[VISUAL_OUTPUT_PROFILES[r.outputProfile].aspectRatio] });
    const scenes: CinematicPlan["scenes"] = r.scenes.map((s,i) => {
      const m = masters[s.masterId];
      return { definition: { organ:r.organ,sceneVersion:"1",durationSeconds:durations[i],focus:s.focus,
        camera:{preset:s.camera.preset},motion:{preset:m.motion},highlight:{structures:[],intensity:0},
        output:{aspectRatio:VISUAL_OUTPUT_PROFILES[r.outputProfile].aspectRatio,resolution:"1080p",media:"video"} },
        phase:s.phase,masterId:s.masterId,motionMasterId:m.motion === "static" ? null : s.masterId,
        assetVersion:m.assetVersion,assetVersionDisposition:"visual-role-only-not-runtime-registered",
        sourceSha256:m.sourceSha256,sourceProfile:s.sourceProfile,sourceProfileDisposition:"unregistered-no-authority",visualRole:m.visualRole,
        appearanceProfileVersion:"1",cameraGuidance:s.camera,overlaySlots:["voice-segment","subtitle","educational-label"],
        highlightMeaning:"educational",narrationRef:s.narrationRef,subtitleRef:s.subtitleRef,
        evidenceRefs:["render/blender/heart_master_visual_v1.lock.json","render/blender/heartbeat_motion_master_v1.lock.json"],
        sourceRefs:[m.source],safetyDisposition:"internal-review-no-clinical-authority",patientFacing:false };
    });
    const content = {recipe:r,totalDuration,sequence,scenes,execution:"blocked-until-exact-modules-and-trusted-profiles-exist" as const,
      guidance:CINEMATIC_GUIDANCE_V1,appearance:HEART_APPEARANCE_PROFILE_V1,presentation:PRESENTATION_POLICIES[r.mode],audio:VISUAL_AUDIO_POLICY,
      safety:MEDICAL_VISUAL_SAFETY,masterLocks:{visual:getHeartMasterVisual("HEART_MASTER_VISUAL_V1").lock,motion:getHeartbeatMotionMaster("HEARTBEAT_MOTION_MASTER_V1").lock} };
    return freeze({...content,fingerprint:createHash("sha256").update(canonicalSceneJson(content)).digest("hex")});
  } catch { return fail(); }
}

const camera = (preset: CinematicScene["camera"]["preset"], movement: CinematicScene["camera"]["movement"], duration: number) =>
  ({preset,movement,duration,targetCoverage:.55,contextMargin:.15,zoomRatio:movement === "hold" ? 1 : 1.15,proximityInOrganExtents:2,easing:"smoothstep",clipping:"prohibited"} as const);
export const HEART_CINEMATIC_EXPLAINER_V1: Readonly<CinematicRecipe> = freeze({
  id:"HEART_CINEMATIC_EXPLAINER_V1",version:"1",visualEngineVersion:"1",cinematicGuidanceVersion:"1",organ:"heart",
  usage:"internal-review",patientFacing:false,mode:"PATIENT_EDUCATION",language:"en",outputProfile:"MOBILE_VERTICAL_9_16",fps:24,music:"disabled",
  scenes:CINEMATIC_GUIDANCE_V1.phases.map((phase,i) => {
    const hero = i < 3;
    return {phase:phase as CinematicScene["phase"], masterId:hero ? "HEART_MASTER_VISUAL_V1" : "HEARTBEAT_MOTION_MASTER_V1",
      sourceProfile:{profileId:hero ? "heart-hero-local-visual-review" : "heart-native-cutaway-visual-review",profileVersion:"1"},
      camera:i === 0 ? camera("full-organ","hold",0) : i === 2 ? camera("guided-push-in","approach",1) :
        i === 5 ? camera("controlled-pull-back","pull-back",1) : camera("medium-anatomical","hold",0),
      targets:[],focus:hero ? "whole-organ" : "whole-cutaway",appearanceProfile:"HEART_APPEARANCE_PROFILE_V1",
      highlight:{meaning:"educational",enabled:false,indicatesPathology:false},slots:{narration:"voice-segment",subtitle:"subtitle",label:"educational-label"},
      duration:i === 0 ? 2.5 : i === 4 ? 3 : 1.5,timing:"fixed",narrationDuration:null,narrationRef:null,subtitleRef:null };
  }),
  transitions:Array.from({length:5},(_,i)=>i === 2 ?
    {boundaryIndex:i,kind:"fade-through-neutral" as const,duration:.4,sourceBoundary:"explicit-source-change" as const} :
    {boundaryIndex:i,kind:"cut" as const,duration:0 as const,sourceBoundary:"same-source" as const}),
});

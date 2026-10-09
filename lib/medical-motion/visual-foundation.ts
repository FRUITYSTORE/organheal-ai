import type { HeartVisualRecipe, VisualOutputProfile, VisualOutputProfileId } from "./contracts/visual-recipe";
import { jsonSnapshot } from "./validation/json-snapshot";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const VISUAL_OUTPUT_PROFILES: Readonly<Record<VisualOutputProfileId, VisualOutputProfile>> = freeze({
  MOBILE_VERTICAL_9_16: { aspectRatio: "9:16", resolution: "1080p", lod: "asset-native", width: 1080, height: 1920, safeTextRegion: [.08, .76, .92, .92] },
  DESKTOP_16_9: { aspectRatio: "16:9", resolution: "1080p", lod: "asset-native", width: 1920, height: 1080, safeTextRegion: [.08, .78, .92, .92] },
});
/** Declarative lighting targets, not source material edits or a new renderer. */
export const ORGANHEAL_HEART_VISUAL_PRESET = freeze({
  id: "ORGANHEAL_HEART_V1", version: "1", background: { charcoal: "#10151D", navy: "#111C2B" },
  lighting: { key: { type: "soft-area", relativeEnergy: 1 }, fill: { type: "soft-area", relativeEnergy: .35 },
    rim: { type: "soft-area", relativeEnergy: .55 }, highlights: "restrained", shadows: "soft-depth-preserving" },
  presentation: "cinematic-clinical", sourceMaterials: "preserve", geometry: "preserve",
  particles: false, gameStyling: false, textLayout: "output-profile-safe-region",
});
export const HEART_VISUAL_SAFETY_POLICY = freeze({
  usage: "internal-review", patientFacing: false, anatomicallyValidated: false,
  clinicalApproval: "unreviewed", licenseClearance: "unresolved",
  motionPreset: "NORMAL_HEARTBEAT_V1", motionDefinition: "native-source-cycle-only",
  sourceAnimationCurves: "unchanged", diseaseLabelMayAlterRateOrRhythm: false,
  personalization: "unsupported-until-validated-input-or-preset", geometryMixing: false,
  structureHighlighting: "requires-source-supported-addressability", executionAuthority: false,
});
export const VISUAL_AUDIO_POLICY = freeze({
  narration: "primary", educationMusic: "optional", clinicalDoctorMusicDefault: "disabled",
  ducking: { requiredUnderSpeech: true, musicGainDbUnderSpeech: -18, attackMs: 150, releaseMs: 400 },
});
const invalid = (): never => { throw new Error("VISUAL_RECIPE_INVALID"); };
const exact = (value: object, keys: readonly string[]) => value && typeof value === "object" &&
  !Array.isArray(value) && Object.keys(value).sort().join() === [...keys].sort().join();
const identifier = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_.:@/-]{1,200}$/.test(v);
const role = (v: unknown) => v === "HEART_HERO_V1" || v === "HEART_MOTION_V1";
/** Bounded reproducible planning data only. Existing authorization must independently resolve
 * assets, source profiles, cameras, structures and media before any future execution. */
export function validateHeartVisualRecipe(input: unknown): HeartVisualRecipe {
  try {
    const r = jsonSnapshot(input, { depth: 8, nodes: 2000, width: 64, stringLength: 200, keyLength: 64, totalStringLength: 16000 }) as unknown as HeartVisualRecipe;
    if (!exact(r, ["visualEngineVersion","sceneRecipeVersion","organ","usage","visualPreset","language","outputProfile","duration","exportIntent","music","assets","cues","transitions"]) ||
      r.visualEngineVersion !== "1" || r.sceneRecipeVersion !== "1" || r.organ !== "heart" || r.usage !== "internal-review" ||
      r.visualPreset !== "ORGANHEAL_HEART_V1" || !["ar","en"].includes(r.language) || !Object.hasOwn(VISUAL_OUTPUT_PROFILES, r.outputProfile) ||
      !Number.isFinite(r.duration) || r.duration <= 0 || r.duration > 60 ||
      !["patient-education-preview","clinical-doctor-preview"].includes(r.exportIntent) || !["disabled","optional-ducked"].includes(r.music) ||
      r.exportIntent === "clinical-doctor-preview" && r.music !== "disabled" ||
      !Array.isArray(r.assets) || r.assets.length < 1 || r.assets.length > 2 || !Array.isArray(r.cues) || r.cues.length < 1 || r.cues.length > 32) invalid();
    const roles = new Set<string>(), versions = new Set<string>();
    for (const a of r.assets) {
      if (!exact(a,["role","assetVersion","sourceReferences","evidenceReferences"]) || !role(a.role) || roles.has(a.role) ||
        !identifier(a.assetVersion) || versions.has(a.assetVersion)) invalid();
      for (const refs of [a.sourceReferences,a.evidenceReferences]) if (!Array.isArray(refs) || refs.length < 1 || refs.length > 8 || refs.some(v => !identifier(v))) invalid();
      roles.add(a.role); versions.add(a.assetVersion);
    }
    const kindKeys = {
      "hero-reveal": ["role"], heartbeat: ["role","motionPreset"], "camera-movement": ["role","from","to"],
      "structure-focus": ["role","structures","addressability"], "narration-slot": ["slot"], "subtitle-slot": ["slot"],
      "background-music": [], outro: [],
    };
    let previousStart = -1;
    for (const c of r.cues) {
      if (!c || !Object.hasOwn(kindKeys,c.kind) || !exact(c,["kind","start","end",...kindKeys[c.kind]]) ||
        !Number.isFinite(c.start) || !Number.isFinite(c.end) || c.start < previousStart || c.start < 0 || c.end <= c.start || c.end > r.duration) invalid();
      previousStart = c.start;
      if ("role" in c && !roles.has(c.role)) invalid();
      if (c.kind === "hero-reveal" && c.role !== "HEART_HERO_V1" || c.kind === "heartbeat" &&
        (c.role !== "HEART_MOTION_V1" || c.motionPreset !== "NORMAL_HEARTBEAT_V1")) invalid();
      if (c.kind === "camera-movement" && (!identifier(c.from) || !identifier(c.to))) invalid();
      if (c.kind === "structure-focus" && (c.addressability !== "requires-source-supported-review" || !Array.isArray(c.structures) ||
        c.structures.length < 1 || c.structures.length > 32 || c.structures.some(s => typeof s !== "string" || !/^heart\.[A-Za-z0-9_.-]+$/.test(s)))) invalid();
      if (c.kind === "narration-slot" && c.slot !== "voice-segment" || c.kind === "subtitle-slot" && c.slot !== "subtitle" ||
        c.kind === "background-music" && r.music !== "optional-ducked") invalid();
    }
    if (!Array.isArray(r.transitions) || r.transitions.length > 7) invalid();
    r.transitions.forEach((t,i) => {
      if (!exact(t,["boundaryIndex","kind","duration"]) || t.boundaryIndex !== i ||
        !(t.kind === "cut" && t.duration === 0 || t.kind === "fade-through-neutral" && Number.isFinite(t.duration) && t.duration >= .15 && t.duration <= .75)) invalid();
    });
    return freeze(r);
  } catch { return invalid(); }
}

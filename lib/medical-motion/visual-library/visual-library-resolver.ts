import "server-only";
import { audioIdentity, deepAudioFreeze } from "../composition/narration-foundation";
import { invalidLibrary, isVisualLibrary, type VisualLibrary } from "./visual-library-loader";

/** Editorial concept routing, never inferred diagnosis from media filenames. */
export const HEART_LIBRARY_ROUTES = {
  HEART_ORIENTATION: ["anatomy/heart-external-visual-reference-v1"],
  HEART_INTERNAL: ["anatomy/heart-internal-cutaway-v1"],
  LDL_EDUCATION: ["anatomy/heart-external-visual-reference-v1", "coronary/heart-coronary-focus-v1",
    "ldl/heart-ldl-bloodstream-premium-v1", "artery/heart-artery-healthy-premium-reference-v1",
    "artery/heart-artery-plaque-premium-v1", "risk/cardiovascular-risk-factors-v1", "risk/heart-healthy-lifestyle-v1"],
  HEART_AGE: ["anatomy/heart-external-visual-reference-v1", "risk/heart-age-comparison-v1", "risk/cardiovascular-risk-factors-v1"],
  BLOOD_PRESSURE: ["labs/blood-pressure-mechanics-v1"],
  ELECTRICAL: ["electrical/heart-electrical-conduction-v1"],
  BLOOD_FLOW: ["flow/heart-blood-flow-v1"],
  ECHO_EF: ["diagnostics/echocardiography-ef-v1"],
  CTA: ["diagnostics/coronary-cta-v1"],
  CALCIUM_SCORE: ["diagnostics/calcium-score-v1"],
  PACEMAKER: ["procedures/pacemaker-system-v1"],
  ICD: ["procedures/icd-defibrillator-v1"],
  ABLATION: ["procedures/catheter-ablation-v1"],
  MITRAL_VALVE_REPAIR: ["procedures/mitral-valve-repair-v1"],
  AORTIC_VALVE_REPLACEMENT: ["procedures/aortic-valve-replacement-v1"],
} as const;
export type HeartLibraryConcept = keyof typeof HEART_LIBRARY_ROUTES;
export type VisualUse = "GENERAL_EDUCATIONAL" | "PERSONALIZED_SAFE" | "CONFIRMED_PATHOLOGY_REQUIRED";
const issued = new WeakSet<object>();
/** Server planning only. Patient/pathology execution is deliberately unavailable.
 * Context-backed personalization occurs upstream; these reference images remain general. */
export function resolveHeartLibraryConcept(library: VisualLibrary, organ: string, concept: HeartLibraryConcept, use: VisualUse = "GENERAL_EDUCATIONAL") {
  if (!isVisualLibrary(library)) invalidLibrary("VISUAL_LIBRARY_AUTHORITY_INVALID");
  if (organ !== "heart" || !Object.hasOwn(HEART_LIBRARY_ROUTES, concept)) invalidLibrary("VISUAL_CONCEPT_UNSUPPORTED");
  if (use !== "GENERAL_EDUCATIONAL") invalidLibrary(use === "CONFIRMED_PATHOLOGY_REQUIRED" ? "CLINICAL_AUTHORITY_REQUIRED" : "VALIDATED_CONTEXT_REQUIRED");
  const scenes = HEART_LIBRARY_ROUTES[concept].map((route, sceneIndex) => {
    const file = `packs/heart/heart/${route}.png`, asset = library.assets.find(a => a.file === file);
    if (!asset || asset.organ !== "heart") invalidLibrary("VISUAL_ASSET_MISSING");
    return { sceneIndex, asset, visualUse: "GENERAL_EDUCATIONAL" as const, patientPathologyClaim: false,
      authorityDecision: "REFERENCE_PRESENTATION_ONLY", anatomyMeshAuthority: false, nativeMotion: false };
  });
  const content = { recipeVersion: "1", libraryFingerprint: library.fingerprint, concept, scenes,
    visualAuthority: "REFERENCE_ONLY", medicalReviewStatus: "PENDING", patientFacing: false,
    motionPolicy: "NATIVE_HEARTBEAT_UNCHANGED_NO_PNG_ANIMATION_CLAIM", usage: "internal-review" };
  const plan = deepAudioFreeze({ ...content, identity: audioIdentity(content) }); issued.add(plan); return plan;
}
export type HeartLibrarySelection = ReturnType<typeof resolveHeartLibraryConcept>;
export const isHeartLibrarySelection = (v: unknown): v is HeartLibrarySelection => !!v && typeof v === "object" && issued.has(v);

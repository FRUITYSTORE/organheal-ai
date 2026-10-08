import { createHash } from "node:crypto";
import type { ExplanationRenderRequest } from "@/lib/medical-motion/contracts/render";
import { buildHeartVisualizationScene, type HeartVisualizationFocus } from "@/lib/medical-motion/organs/heart/heart-visualization-resolver";
import { computeRenderSignature } from "@/lib/medical-motion/render-signature";
import { validateVideoExplanationPlan } from "@/lib/symptom-explanation/validate-explanation-plan";
import { MEDICAL_MECHANISMS, LEGACY_MECHANISM_BINDINGS } from "@/lib/medical-motion/mechanism-definitions";
import { checkVisualizationOperation, evaluateMechanismCandidate } from "@/lib/medical-motion/mechanism-registry";
import { canonicalSceneJson, compileMedicalScene, DEFAULT_SCENE_PRESENTATION, validateCompiledMedicalScene } from "@/lib/medical-motion/scene-compiler";
import { checkAssetReadiness } from "./asset-readiness";
import type { MechanismEvaluationContext } from "@/lib/medical-motion/contracts/mechanism";
import { getOrganModule } from "@/lib/medical-motion/organ-modules";
import { WHOLE_BODY_ANATOMY } from "@/lib/medical-motion/whole-body-anatomy";

/** Object key order is irrelevant; array order (including scene order) is meaningful. */
export function canonicalExplanationJson(value: unknown): string {
  return canonicalSceneJson(value);
}

const signature = (value: unknown) => createHash("sha256").update(canonicalExplanationJson(value)).digest("hex");
const invalid = (issue: string) => ({ ok: false as const, errorCode: "INVALID_SCENE_PLAN" as const, issues: [issue] });

/** Compiles exactly one indexed shot, not a narrated video or clinical decision.
 * Always revalidate unknown input; a TypeScript annotation is not authorization. */
export type ExplanationCompilationContext = MechanismEvaluationContext & { sourceProfile?: import("@/lib/medical-motion/contracts/source-profile").SourceProfileSelection };
export function compileExplanationScene(value: unknown, config: { sceneIndex: number; assetVersion: string }, gate?: ExplanationCompilationContext) {
  if (gate && (gate.safety?.allowVideo !== true || gate.safety.level !== "none")) return { ...invalid("Safety Gate blocks visualization."), errorCode: "UNSAFE_FOR_VIDEO_FIRST" as const };
  const validation = validateVideoExplanationPlan(value);
  if (!validation.ok) return validation;
  if (!config || !Number.isInteger(config.sceneIndex) || config.sceneIndex < 0 ||
      config.sceneIndex >= validation.plan.scenes.length || typeof config.assetVersion !== "string" || !config.assetVersion.trim()) {
    return invalid("A valid scene index and explicit asset version are required.");
  }
  const plan = structuredClone(validation.plan);
  const intent = plan.scenes[config.sceneIndex];
  if (plan.organ !== "heart" || intent.type === "findingVisualization") {
    return invalid("This compiler has no supported rendering capability for this organ or finding visualization.");
  }
  const target = intent.type === "structureFocus" ? intent.target :
    intent.type === "mechanismExplanation" ? plan.anatomy.primaryFocus : null;
  let focus: HeartVisualizationFocus = "overview";
  if (target !== null) {
    if (target === "heart.coronary" || target.startsWith("heart.coronary.")) focus = "coronary";
    else if (target === "heart.leftVentricle" || target === "heart.aorta") focus = "lvAorta";
    else return invalid(`No supported camera/highlight preset for ${target}.`);
  }
  const scene = structuredClone(buildHeartVisualizationScene(focus));
  const mechanism = MEDICAL_MECHANISMS.get(plan.mechanism.id, plan.mechanism.version ?? LEGACY_MECHANISM_BINDINGS[plan.mechanism.id].version);
  if (!mechanism || !checkVisualizationOperation(mechanism, "highlight", []) || !checkVisualizationOperation(mechanism, "camera-focus", [])) return invalid("Mechanism visualization is not permitted.");
  scene.mechanismIdentity = { mechanismId: mechanism.mechanismId, mechanismVersion: mechanism.version };
  // Intent controls highlights. Required dependencies never become selections.
  scene.highlight.structures = target === null ? [] : plan.anatomy.structures.filter((id) =>
    (id === target || id.startsWith(`${target}.`)) && mechanism.highlightedAnatomy.includes(id));
  if (target !== null && scene.highlight.structures.length === 0) return invalid("The intent has no authorized highlight.");
  // Retain visual camera/motion dependencies and all explanation requirements.
  // Both sets are also checked independently by the clinical render boundary.
  scene.anatomyRequirements = { ...scene.anatomyRequirements, ...plan.anatomy.requirements };
  let medicalScene;
  if (gate) {
    const eligible = evaluateMechanismCandidate(MEDICAL_MECHANISMS, scene.mechanismIdentity, { ...gate, mode: "development" });
    if (eligible.status !== "eligible") return invalid(eligible.reasons.join(" "));
    const module = getOrganModule(scene.organ);
    if (!module || module.assetVersion !== config.assetVersion) return invalid("Asset version does not match the registered module.");
    const presetReady = checkAssetReadiness(scene.organ, scene.highlight.structures, gate.mode, getOrganModule, buildHeartVisualizationScene(focus).anatomyRequirements);
    if (!presetReady.ok) return { ...invalid(presetReady.details.join(" ")), errorCode: presetReady.errorCode };
    const result = compileMedicalScene(scene.mechanismIdentity, { ...gate, registry: MEDICAL_MECHANISMS, getModule: getOrganModule, catalog: WHOLE_BODY_ANATOMY,
      ...(gate.sourceProfile ? { cameraTargets: [scene.camera.preset, ...(scene.camera.from ? [scene.camera.from] : [])] } : {}),
      selections: scene.highlight.structures, additionalRequirements: scene.anatomyRequirements, overview: target === null },
      { ...DEFAULT_SCENE_PRESENTATION, durationHint: scene.durationSeconds, outputProfile: { aspectRatio: scene.output.aspectRatio, resolution: scene.output.resolution, lod: "asset-native" } });
    if (!result.ok) return { ...invalid(result.reasons.join(" ")), ...("errorCode" in result ? { errorCode: result.errorCode } : {}) };
    medicalScene = result.compiled;
    if (medicalScene.scene.sourceProfile) {
      scene.sourceProfile = medicalScene.scene.sourceProfile;
      scene.anatomyIdentity = medicalScene.scene.profileAnatomyIdentity;
    }
    if (!validateCompiledMedicalScene(medicalScene)) return invalid("Compiled DSL validation failed.");
  }
  const core = {
    compilerVersion: "1" as const, assetVersion: config.assetVersion, sceneIndex: config.sceneIndex,
    sceneIntent: intent, explanationPlan: plan, scene,
    renderSignature: computeRenderSignature(scene, config.assetVersion, medicalScene), planSignature: signature(plan),
    ...(medicalScene ? { medicalScene } : {}),
  };
  const request: ExplanationRenderRequest = { ...core, requestId: signature(core) };
  return { ok: true as const, request };
}

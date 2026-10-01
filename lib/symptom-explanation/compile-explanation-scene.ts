import { createHash } from "node:crypto";
import type { ExplanationRenderRequest } from "@/lib/medical-motion/contracts/render";
import { buildHeartVisualizationScene, type HeartVisualizationFocus } from "@/lib/medical-motion/organs/heart/heart-visualization-resolver";
import { computeRenderSignature } from "@/lib/medical-motion/render-signature";
import { validateVideoExplanationPlan } from "@/lib/symptom-explanation/validate-explanation-plan";

/** Object key order is irrelevant; array order (including scene order) is meaningful. */
export function canonicalExplanationJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalExplanationJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalExplanationJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  const json = JSON.stringify(value);
  if (json === undefined) throw new Error("Explanation requests must contain JSON values.");
  return json;
}

const signature = (value: unknown) => createHash("sha256").update(canonicalExplanationJson(value)).digest("hex");
const invalid = (issue: string) => ({ ok: false as const, errorCode: "INVALID_SCENE_PLAN" as const, issues: [issue] });

/** Compiles exactly one indexed shot, not a narrated video or clinical decision.
 * Always revalidate unknown input; a TypeScript annotation is not authorization. */
export function compileExplanationScene(value: unknown, config: { sceneIndex: number; assetVersion: string }) {
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
  // Intent controls highlights. Required dependencies never become selections.
  scene.highlight.structures = target === null ? [] : plan.anatomy.structures.filter((id) =>
    id === target || id.startsWith(`${target}.`));
  if (target !== null && scene.highlight.structures.length === 0) return invalid("The intent has no authorized highlight.");
  // Retain visual camera/motion dependencies and all explanation requirements.
  // Both sets are also checked independently by the clinical render boundary.
  scene.anatomyRequirements = { ...scene.anatomyRequirements, ...plan.anatomy.requirements };
  const core = {
    compilerVersion: "1" as const, assetVersion: config.assetVersion, sceneIndex: config.sceneIndex,
    sceneIntent: intent, explanationPlan: plan, scene,
    renderSignature: computeRenderSignature(scene, config.assetVersion), planSignature: signature(plan),
  };
  const request: ExplanationRenderRequest = { ...core, requestId: signature(core) };
  return { ok: true as const, request };
}

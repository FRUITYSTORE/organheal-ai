import { transferExecutionResources } from "./execution-resources";
import "server-only";
import type { RenderResult, ExplanationRenderRequest } from "@/lib/medical-motion/contracts/render";
import { getOrganModule } from "@/lib/medical-motion/organ-modules";
import { buildHeartVisualizationScene } from "@/lib/medical-motion/organs/heart/heart-visualization-resolver";
import { renderHeartScene } from "@/lib/medical-motion/render/blender-renderer";
import { checkAssetReadiness, checkExplanationPlanReadiness, type RenderMode } from "@/lib/symptom-explanation/asset-readiness";
import { canonicalExplanationJson, compileExplanationScene } from "@/lib/symptom-explanation/compile-explanation-scene";
import type { SymptomExplanationErrorCode } from "@/lib/symptom-explanation/contracts";
import { readExplanationAuthorization } from "@/lib/symptom-explanation/explanation-authorization";

type Failure = { status: "failed"; errorCode: SymptomExplanationErrorCode; message: string };
type TracedResult = (RenderResult | Failure) & { requestId?: string; planSignature?: string };

/** Mandatory-context clinical boundary. Generic rendering remains for internal review.
 * No triage orchestration, queue, narration, or clinical inference occurs here. */
export function validateExplanationRenderRequest(
  value: unknown, outputPath: string, options: { mode: RenderMode; timeoutMs?: number },
): Extract<TracedResult, {status:"failed"}> | {ok:true;request:ExplanationRenderRequest;trace:{requestId:string;planSignature:string}} {
  const authorized = readExplanationAuthorization(value);
  if (!authorized || outputPath !== authorized.options.outputPath || options?.mode !== authorized.options.mode ||
      options?.timeoutMs !== authorized.options.timeoutMs) {
    return { status: "failed", errorCode: "UNSAFE_FOR_VIDEO_FIRST", message: "A matching server-issued clinical authorization is required." };
  }
  const raw = authorized.request;
  const compiled = compileExplanationScene(raw?.explanationPlan, {
    sceneIndex: raw?.sceneIndex as number, assetVersion: raw?.assetVersion as string,
  }, authorized.compilationContext);
  if (!compiled.ok) return { status: "failed", errorCode: compiled.errorCode, message: compiled.issues.join(" ") };
  if (!options || (options.mode !== "development" && options.mode !== "production")) {
    return { status: "failed", errorCode: "INVALID_SCENE_PLAN", message: "An explicit supported render mode is required." };
  }
  const { request } = compiled;
  const trace = { requestId: request.requestId, planSignature: request.planSignature };
  try {
    if (canonicalExplanationJson(raw) !== canonicalExplanationJson(request)) {
      return { status: "failed", errorCode: "INVALID_SCENE_PLAN", message: "Compiled request was altered.", ...trace };
    }
  } catch {
    return { status: "failed", errorCode: "INVALID_SCENE_PLAN", message: "Request must be serializable JSON.", ...trace };
  }
  const ready = checkExplanationPlanReadiness(request.explanationPlan, options.mode);
  if (!ready.ok) return { status: "failed", errorCode: ready.errorCode,
    message: ("issues" in ready ? ready.issues : ready.details).join(" "), ...trace };
  const module = getOrganModule(request.scene.organ);
  if (!module || module.assetVersion !== request.assetVersion) {
    return { status: "failed", errorCode: "INVALID_SCENE_PLAN", message: "Asset version no longer matches the compiled request.", ...trace };
  }
  // Check the presentation preset independently so a plan cannot weaken it.
  const preset = buildHeartVisualizationScene(request.scene.focus as "overview" | "coronary" | "lvAorta" | "combined");
  for (const requirements of [preset.anatomyRequirements, request.scene.anatomyRequirements]) {
    const sceneReady = checkAssetReadiness(request.scene.organ, request.scene.highlight.structures,
      options.mode, getOrganModule, requirements);
    if (!sceneReady.ok) return { status: "failed", errorCode: sceneReady.errorCode, message: sceneReady.details.join(" "), ...trace };
  }
  return { ok: true as const, request, trace };
}

export async function renderExplanationRequest(
  value: unknown, outputPath: string, options: { mode: RenderMode; timeoutMs?: number },
  control: Parameters<typeof renderHeartScene>[3] = {},
): Promise<TracedResult> {
  const checked = validateExplanationRenderRequest(value, outputPath, options);
  if (!("ok" in checked)) return checked;
  const { request, trace } = checked;
  const result = await renderHeartScene(request.scene, outputPath, { ...options, explanationPlan: request.explanationPlan, clinicalAuthorization: value }, control);
  if (result.status === "completed" && control?.signal?.aborted) {
    return transferExecutionResources(result, { status: "failed", errorCode: "RENDER_CANCELLED", message: "Render execution was cancelled.", ...trace });
  }
  return transferExecutionResources(result, { ...result, ...trace });
}

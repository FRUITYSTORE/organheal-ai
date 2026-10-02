import { recordExecutionResources } from "./execution-resources";
import "server-only";
import { validateRenderDuration } from "./duration-policy";
import { resolveOutputDimensions } from "./dimension-policy";
import { createArtifactOwnership, discardArtifact, validArtifactName, validateArtifact, type ArtifactOwnership } from "./artifact-output";

import { runBlenderProcess } from "./blender-process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { RENDER_ERROR_CODE, type RenderErrorCode, type RenderResult } from "@/lib/medical-motion/contracts/render";
import type { AnatomicalDirection, LandmarkId, OrganModule } from "@/lib/medical-motion/contracts/organ-module";
import type { RenderMedia, SceneDefinition } from "@/lib/medical-motion/contracts/scene";
import { getOrganModule } from "@/lib/medical-motion/organ-modules";
import { anatomyRenderIdentity } from "@/lib/medical-motion/anatomy-foundation";
import { checkAssetReadiness, checkExplanationPlanReadiness, type RenderMode } from "@/lib/symptom-explanation/asset-readiness";
import { readExplanationAuthorization } from "@/lib/symptom-explanation/explanation-authorization";
import { canonicalExplanationJson } from "@/lib/symptom-explanation/compile-explanation-scene";
import { buildHeartVisualizationScene, type HeartVisualizationFocus } from "@/lib/medical-motion/organs/heart/heart-visualization-resolver";

// Invokes the real headless Blender pipeline (render/blender/render_scene.py)
// as a child process -- this is the actual "Phase 4" wiring the architecture
// brief asked for: config JSON in, real rendered file out, explicit error
// handling. Never runs inside a Next.js API route directly; a route enqueues
// a render request and a separate worker process calls this (Phase 8, not
// built yet) -- this module is deliberately usable on its own so that
// worker can import it without pulling in any Next.js/Vercel code.

const DEFAULT_RENDER_TIMEOUT_MS = 120_000;
// A video renders every frame through Cycles: a 5-second clip is 120 frames.
const DEFAULT_VIDEO_RENDER_TIMEOUT_MS = 20 * 60_000;

function isSupportedOutputMedia(media: unknown): media is RenderMedia {
  return media === "still" || media === "video";
}

function getBlenderExecutablePath(): string {
  return (
    process.env.BLENDER_EXECUTABLE_PATH?.trim() ||
    "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe"
  );
}

function getRenderScriptPath(): string {
  return process.env.MEDICAL_MOTION_RENDER_SCRIPT?.trim() || path.join(process.cwd(), "render", "blender", "render_scene.py");
}

// render_scene.py raises SystemExit with a message prefixed by one of these
// exact codes (see RENDER_ERROR_CODE) -- classify by matching that prefix
// rather than guessing, so a real Blender failure always maps to a real,
// inspectable reason instead of a generic "something went wrong".
function classifyError(combinedOutput: string): RenderErrorCode {
  for (const code of Object.values(RENDER_ERROR_CODE)) {
    if (combinedOutput.includes(code)) return code;
  }
  return RENDER_ERROR_CODE.BLENDER_FAILED;
}

export type RenderOptions = {
  /** Required, never defaulted: "production" refuses placeholder anatomy
   * (REAL_ANATOMICAL_ASSET_REQUIRED), "development" allows it for internal
   * review renders only. */
  mode: RenderMode;
  timeoutMs?: number;
  /** Required context for a symptom explanation render. Untrusted/stored
   * plans are validated again here, before readiness and any Blender I/O. */
  explanationPlan?: unknown;
  /** Clinical context requires server runtime authorization, never plain metadata. */
  clinicalAuthorization?: unknown;
};

/** A camera shot resolved to the objects the Blender build creates. */
export type BlenderCameraShot = {
  lookAt: readonly string[];
  scaleReference: readonly [string, string];
  viewDirection: AnatomicalDirection;
  distance: number;
};

/**
 * Resolves a camera preset through the organ module: its landmarks become
 * the empties the build places at them. Null when the module has no such
 * shot, or the shot names a landmark the module doesn't have.
 */
export function resolveCameraShot(organModule: OrganModule, preset: string): BlenderCameraShot | null {
  const target = organModule.cameraTargets.find((candidate) => candidate.id === preset);
  const objectFor = (id: LandmarkId) => organModule.landmarks.find((landmark) => landmark.id === id)?.blenderObject;

  if (!target) {
    return null;
  }

  const lookAt = target.lookAt.map(objectFor);
  const [from, to] = organModule.scaleReference.map(objectFor);

  if (lookAt.length === 0 || lookAt.some((name) => !name) || !from || !to) {
    return null;
  }

  return {
    lookAt: lookAt as string[],
    scaleReference: [from, to],
    viewDirection: target.viewDirection,
    distance: target.distance,
  };
}

/**
 * The scene as the Blender script reads it: identical, except highlight
 * structures are the registry's Blender object names instead of anatomy ids,
 * and the camera carries its resolved shot. This is the one place ids
 * become object names.
 */
export function toBlenderSceneConfig(
  scene: SceneDefinition,
  blenderObjects: readonly string[],
  shot: BlenderCameraShot,
  fromShot: BlenderCameraShot | null = null
) {
  if (!isSupportedOutputMedia(scene.output.media)) throw new Error("Unsupported output.media.");
  const duration = validateRenderDuration(scene.durationSeconds, scene.output.media);
  if (!duration.ok) throw new Error(duration.message);
  const dimensions = resolveOutputDimensions(scene.output.aspectRatio, scene.output.resolution);
  if (!dimensions.ok) throw new Error(dimensions.message);
  return {
    ...scene,
    outputDimensions: dimensions.dimensions,
    ...(duration.videoTiming ? { videoTiming: duration.videoTiming } : {}),
    camera: { ...scene.camera, shot, ...(fromShot ? { fromShot } : {}) },
    highlight: { ...scene.highlight, structures: blenderObjects },
  };
}

function invalidScene(message: string): RenderResult {
  return { status: "failed", errorCode: RENDER_ERROR_CODE.INVALID_SCENE, message };
}

export async function renderHeartScene(
  scene: SceneDefinition,
  outputPath: string, // Safe filename; the server allocates the actual destination.
  options: RenderOptions,
  control: { signal?: AbortSignal } = {},
): Promise<RenderResult> {
  const {
    mode,
    explanationPlan,
    clinicalAuthorization,
    timeoutMs = scene.output.media === "video" ? DEFAULT_VIDEO_RENDER_TIMEOUT_MS : DEFAULT_RENDER_TIMEOUT_MS,
  } = options;
  // Generic scenes are internal non-clinical review. Clinical metadata cannot
  // select that path or supply its own authorization.
  if (Object.keys(options).some((key) => !["mode", "timeoutMs", "explanationPlan", "clinicalAuthorization"].includes(key)) ||
      Object.keys(scene).some((key) => !["organ", "sceneVersion", "durationSeconds", "focus", "camera", "motion", "highlight", "anatomyRequirements", "anatomyIdentity", "output"].includes(key))) {
    return invalidScene("Unsupported render metadata; clinical requests must use the authorized boundary.");
  }
  if ("explanationPlan" in options || "clinicalAuthorization" in options) {
    const authorized = readExplanationAuthorization(clinicalAuthorization);
    if (!authorized) return invalidScene("UNSAFE_FOR_VIDEO_FIRST: server-issued clinical authorization is required.");
    try {
      if (canonicalExplanationJson(scene) !== canonicalExplanationJson(authorized.request.scene) ||
          canonicalExplanationJson(explanationPlan) !== canonicalExplanationJson(authorized.request.explanationPlan) ||
          mode !== authorized.options.mode || outputPath !== authorized.options.outputPath || options.timeoutMs !== authorized.options.timeoutMs) {
        return invalidScene("Clinical authorization does not match this render request.");
      }
    } catch { return invalidScene("Invalid clinical render metadata."); }
  }
  if (scene.organ !== "heart") {
    return {
      status: "failed",
      errorCode: RENDER_ERROR_CODE.INVALID_ORGAN,
      message: `renderHeartScene only renders "heart" scenes, got "${scene.organ}".`,
    };
  }

  // Checked here, right before Blender, even if the plan was checked when it
  // was built: a stored plan can outlive the asset it was checked against.
  if (explanationPlan !== undefined) {
    const planReadiness = checkExplanationPlanReadiness(explanationPlan, mode);
    if (!planReadiness.ok) {
      if ("issues" in planReadiness) {
        return invalidScene(`${planReadiness.errorCode}: ${planReadiness.issues.join(" ")}`);
      }
      return { status: "failed", errorCode: planReadiness.errorCode, message: planReadiness.details.join(" ") };
    }
    if (planReadiness.plan.organ !== scene.organ || scene.highlight.structures.some((id) => !planReadiness.plan.anatomy.structures.includes(id))) {
      return invalidScene("The scene organ and highlights must belong to the validated explanation plan.");
    }
    // A valid capability may be used at this lower boundary too. Retain the
    // same independent presentation requirements checked by the clinical gateway.
    const preset = buildHeartVisualizationScene(scene.focus as HeartVisualizationFocus);
    const presetReadiness = checkAssetReadiness(scene.organ, scene.highlight.structures, mode, undefined, preset.anatomyRequirements);
    if (!presetReadiness.ok) return { status: "failed", errorCode: presetReadiness.errorCode, message: presetReadiness.details.join(" ") };
  }
  const readiness = checkAssetReadiness(scene.organ, scene.highlight.structures, mode, undefined, scene.anatomyRequirements);

  if (!readiness.ok) {
    return { status: "failed", errorCode: readiness.errorCode, message: readiness.details.join(" ") };
  }

  const organModule = getOrganModule(scene.organ);

  if (!organModule) {
    return invalidScene(`No organ module exists for "${scene.organ}".`);
  }

  // Source/semantic revisions must match the asset actually about to render.
  // Legacy internal scenes may omit identity; patient-facing scenes may not.
  try {
    if ((mode === "production" && !scene.anatomyIdentity) ||
        (scene.anatomyIdentity && canonicalExplanationJson(scene.anatomyIdentity) !== canonicalExplanationJson(anatomyRenderIdentity(organModule)))) {
      return invalidScene("Anatomy identity is missing or does not match the current organ asset.");
    }
  } catch { return invalidScene("Invalid anatomy identity."); }

  const shot = resolveCameraShot(organModule, scene.camera.preset);
  const fromShot = scene.camera.from ? resolveCameraShot(organModule, scene.camera.from) : null;

  if (!shot) {
    return invalidScene(`The ${scene.organ} module has no usable camera shot "${scene.camera.preset}".`);
  }

  if (scene.camera.from && !fromShot) {
    return invalidScene(`The ${scene.organ} module has no usable camera shot "${scene.camera.from}".`);
  }

  if (scene.output.media === "video" && !organModule.motionControllers.includes(scene.motion.preset)) {
    return invalidScene(`The ${scene.organ} module has no motion controller "${scene.motion.preset}".`);
  }

  // Keep clinical/anatomy gates first; reject duration before config I/O/spawn.
  if (!isSupportedOutputMedia(scene.output.media)) return invalidScene("Unsupported output.media.");
  const duration = validateRenderDuration(scene.durationSeconds, scene.output.media);
  if (!duration.ok) return invalidScene(duration.message);
  const dimensions = resolveOutputDimensions(scene.output.aspectRatio, scene.output.resolution);
  if (!dimensions.ok) return invalidScene(dimensions.message);
  if (!validArtifactName(outputPath, scene.output.media)) return invalidScene("Output must be a safe filename with the expected media extension.");
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
    return invalidScene("timeoutMs must be a positive integer within Node's timer range.");
  }
  const cancelled = (terminationConfirmed = true): RenderResult => ({
    status: "failed", errorCode: RENDER_ERROR_CODE.RENDER_CANCELLED,
    message: terminationConfirmed ? "Render execution was cancelled."
      : "Render execution was cancelled; termination could not be confirmed. Invocation files were retained; operator intervention is required.",
  });
  if (control.signal?.aborted) return cancelled();
  let ownership: ArtifactOwnership | undefined;
  let tempDir: string | undefined;
  let completed = false;
  let safeToClean = true;
  let finalResult: RenderResult | undefined;
  const tracked = (result: RenderResult) => { finalResult = result; return result; };

  try {
    ownership = await createArtifactOwnership(outputPath, scene.output.media);
    tempDir = await mkdtemp(path.join(tmpdir(), "medical-motion-"));
    const configPath = path.join(tempDir, "scene.json");
    await writeFile(
      configPath,
      JSON.stringify(toBlenderSceneConfig(scene, readiness.blenderObjects, shot, fromShot)),
      "utf-8"
    );

    safeToClean = false;
    const result = await runBlenderProcess(getBlenderExecutablePath(), [
      "--background", "--python", getRenderScriptPath(), "--", configPath, ownership.outputPath,
    ], timeoutMs, control.signal);
    safeToClean = result.terminationConfirmed;
    if (result.outcome === "cancelled") return tracked(cancelled(result.terminationConfirmed));

    if (result.outcome === "timeout") {
      return tracked({
        status: "failed",
        errorCode: RENDER_ERROR_CODE.RENDER_TIMEOUT,
        message: result.terminationConfirmed
          ? `Render exceeded ${timeoutMs}ms; Blender termination was confirmed.`
          : `Render exceeded ${timeoutMs}ms; Blender termination could not be confirmed. Invocation files were retained; operator intervention is required.`,
      });
    }

    if (result.outcome === "process-error") {
      return tracked({ status: "failed", errorCode: RENDER_ERROR_CODE.BLENDER_FAILED,
        message: result.terminationConfirmed ? "Blender process failed or did not complete its lifecycle."
          : "Blender process failed; termination could not be confirmed. Invocation files were retained; operator intervention is required." });
    }

    if (control.signal?.aborted) return tracked(cancelled(result.terminationConfirmed));
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    if (result.exitCode !== 0) {
      return tracked({
        status: "failed",
        errorCode: classifyError(combinedOutput),
        message: (result.stderr.trim() || result.stdout.trim() || "Blender exited with a non-zero status.")
          .replaceAll(ownership.outputPath, "[render output]").replaceAll(configPath, "[render config]")
          .replaceAll(ownership.directory, "[artifact location]").replaceAll(tempDir, "[render workspace]"),
      });
    }

    if (!result.reportedRenderOk) {
      return tracked({
        status: "failed",
        errorCode: RENDER_ERROR_CODE.OUTPUT_VALIDATION_FAILED,
        message: "Blender exited successfully but never reported RENDER_OK.",
      });
    }

    const artifact = await validateArtifact(ownership, dimensions.dimensions);
    if (control.signal?.aborted) return tracked(cancelled());
    if (!artifact.ok) return tracked({ status: "failed", errorCode: RENDER_ERROR_CODE.OUTPUT_VALIDATION_FAILED, message: artifact.message });
    completed = true;
    return tracked({ status: "completed", outputPath: ownership.outputPath, durationSeconds: result.durationSeconds });
  } catch {
    return tracked({ status: "failed", errorCode: RENDER_ERROR_CODE.OUTPUT_VALIDATION_FAILED, message: "Render output could not be prepared or validated." });
  } finally {
    // Clean configs and failed artifacts after confirmed direct-child exit.
    // Unconfirmed termination is quarantined, never deleted beneath a writer.
    let cleanupConfirmed = safeToClean;
    if (tempDir && safeToClean) {
      try { await rm(tempDir, { recursive: true, force: true }); } catch { cleanupConfirmed = false; }
    }
    if (ownership && !completed && safeToClean) cleanupConfirmed = await discardArtifact(ownership) && cleanupConfirmed;
    if (finalResult) recordExecutionResources(finalResult, {
      cleanupConfirmed: completed ? false : cleanupConfirmed,
      ...(completed && ownership ? { artifact: ownership, dimensions: dimensions.dimensions } : {}),
    });
  }
}

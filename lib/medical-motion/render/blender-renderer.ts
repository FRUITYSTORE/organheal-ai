import "server-only";

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { RENDER_ERROR_CODE, type RenderErrorCode, type RenderResult } from "@/lib/medical-motion/contracts/render";
import type { AnatomicalDirection, LandmarkId, OrganModule } from "@/lib/medical-motion/contracts/organ-module";
import type { SceneDefinition } from "@/lib/medical-motion/contracts/scene";
import { getOrganModule } from "@/lib/medical-motion/organ-modules";
import { checkAssetReadiness, type RenderMode } from "@/lib/symptom-explanation/asset-readiness";

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

function getBlenderExecutablePath(): string {
  return (
    process.env.BLENDER_EXECUTABLE_PATH?.trim() ||
    "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe"
  );
}

function getRenderScriptPath(): string {
  return process.env.MEDICAL_MOTION_RENDER_SCRIPT?.trim() || path.join(process.cwd(), "render", "blender", "render_scene.py");
}

type BlenderProcessResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationSeconds: number;
};

function runBlenderProcess(configPath: string, outputPath: string, timeoutMs: number): Promise<BlenderProcessResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(getBlenderExecutablePath(), [
      "--background",
      "--python",
      getRenderScriptPath(),
      "--",
      configPath,
      outputPath,
    ]);

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        exitCode: null,
        stdout,
        stderr: stderr || error.message,
        timedOut: false,
        durationSeconds: (Date.now() - startedAt) / 1000,
      });
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stdout, stderr, timedOut, durationSeconds: (Date.now() - startedAt) / 1000 });
    });
  });
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
  return {
    ...scene,
    camera: { ...scene.camera, shot, ...(fromShot ? { fromShot } : {}) },
    highlight: { ...scene.highlight, structures: blenderObjects },
  };
}

function invalidScene(message: string): RenderResult {
  return { status: "failed", errorCode: RENDER_ERROR_CODE.INVALID_SCENE, message };
}

export async function renderHeartScene(
  scene: SceneDefinition,
  outputPath: string,
  {
    mode,
    timeoutMs = scene.output.media === "video" ? DEFAULT_VIDEO_RENDER_TIMEOUT_MS : DEFAULT_RENDER_TIMEOUT_MS,
  }: RenderOptions
): Promise<RenderResult> {
  if (scene.organ !== "heart") {
    return {
      status: "failed",
      errorCode: RENDER_ERROR_CODE.INVALID_ORGAN,
      message: `renderHeartScene only renders "heart" scenes, got "${scene.organ}".`,
    };
  }

  // Checked here, right before Blender, even if the plan was checked when it
  // was built: a stored plan can outlive the asset it was checked against.
  const readiness = checkAssetReadiness(scene.organ, scene.highlight.structures, mode);

  if (!readiness.ok) {
    return { status: "failed", errorCode: readiness.errorCode, message: readiness.details.join(" ") };
  }

  const organModule = getOrganModule(scene.organ);

  if (!organModule) {
    return invalidScene(`No organ module exists for "${scene.organ}".`);
  }

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

  const tempDir = await mkdtemp(path.join(tmpdir(), "medical-motion-"));
  const configPath = path.join(tempDir, "scene.json");

  try {
    await writeFile(
      configPath,
      JSON.stringify(toBlenderSceneConfig(scene, readiness.blenderObjects, shot, fromShot)),
      "utf-8"
    );

    const result = await runBlenderProcess(configPath, outputPath, timeoutMs);

    if (result.timedOut) {
      return {
        status: "failed",
        errorCode: RENDER_ERROR_CODE.RENDER_TIMEOUT,
        message: `Render exceeded ${timeoutMs}ms and was killed.`,
      };
    }

    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    if (result.exitCode !== 0) {
      return {
        status: "failed",
        errorCode: classifyError(combinedOutput),
        message: result.stderr.trim() || result.stdout.trim() || "Blender exited with a non-zero status.",
      };
    }

    if (!combinedOutput.includes("RENDER_OK")) {
      return {
        status: "failed",
        errorCode: RENDER_ERROR_CODE.OUTPUT_VALIDATION_FAILED,
        message: "Blender exited successfully but never reported RENDER_OK.",
      };
    }

    return { status: "completed", outputPath, durationSeconds: result.durationSeconds };
  } finally {
    // Never leave temp render-config files behind, success or failure —
    // architecture brief section 23 ("temporary frames must be deleted").
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

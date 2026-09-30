import "server-only";

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { RENDER_ERROR_CODE, type RenderErrorCode, type RenderResult } from "@/lib/medical-motion/contracts/render";
import type { SceneDefinition } from "@/lib/medical-motion/contracts/scene";

// Invokes the real headless Blender pipeline (render/blender/render_scene.py)
// as a child process -- this is the actual "Phase 4" wiring the architecture
// brief asked for: config JSON in, real rendered file out, explicit error
// handling. Never runs inside a Next.js API route directly; a route enqueues
// a render request and a separate worker process calls this (Phase 8, not
// built yet) -- this module is deliberately usable on its own so that
// worker can import it without pulling in any Next.js/Vercel code.

const DEFAULT_RENDER_TIMEOUT_MS = 120_000;

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

export async function renderHeartScene(
  scene: SceneDefinition,
  outputPath: string,
  timeoutMs: number = DEFAULT_RENDER_TIMEOUT_MS
): Promise<RenderResult> {
  if (scene.organ !== "heart") {
    return {
      status: "failed",
      errorCode: RENDER_ERROR_CODE.INVALID_ORGAN,
      message: `renderHeartScene only renders "heart" scenes, got "${scene.organ}".`,
    };
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "medical-motion-"));
  const configPath = path.join(tempDir, "scene.json");

  try {
    await writeFile(configPath, JSON.stringify(scene), "utf-8");

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

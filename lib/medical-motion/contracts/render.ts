import type { SceneDefinition } from "@/lib/medical-motion/contracts/scene";
import type { PlanScene, VideoExplanationPlan } from "@/lib/symptom-explanation/contracts";

/** Clinical requests always retain the complete validated explanation context. */
export type ExplanationRenderRequest = RenderRequest & {
  compilerVersion: "1";
  assetVersion: string;
  sceneIndex: number;
  sceneIntent: PlanScene;
  explanationPlan: VideoExplanationPlan;
  planSignature: string;
  requestId: string;
};

// Explicit output states (architecture brief section 26) — the UI/API
// should only ever see one of these, never an internal implementation
// detail like "blender process exit code".
export const RENDER_STATUS = {
  QUEUED: "queued",
  PREPARING: "preparing",
  RENDERING: "rendering",
  COMPOSING: "composing",
  UPLOADING: "uploading",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type RenderStatus = (typeof RENDER_STATUS)[keyof typeof RENDER_STATUS];

// Explicit, inspectable failure reasons (brief section 27) — never a bare
// "something went wrong". Kept as a closed union so a caller can switch on
// it exhaustively.
export const RENDER_ERROR_CODE = {
  ASSET_NOT_FOUND: "ASSET_NOT_FOUND",
  // The asset-readiness gate's own codes (lib/symptom-explanation/
  // asset-readiness.ts), refused before Blender starts; the render script
  // also raises ANATOMY_STRUCTURE_NOT_FOUND if the built scene lacks an
  // object the registry promised.
  ORGAN_MODULE_NOT_FOUND: "ORGAN_MODULE_NOT_FOUND",
  ANATOMY_STRUCTURE_NOT_FOUND: "ANATOMY_STRUCTURE_NOT_FOUND",
  REAL_ANATOMICAL_ASSET_REQUIRED: "REAL_ANATOMICAL_ASSET_REQUIRED",
  INVALID_SCENE: "INVALID_SCENE",
  INVALID_ORGAN: "INVALID_ORGAN",
  BLENDER_FAILED: "BLENDER_FAILED",
  RENDER_TIMEOUT: "RENDER_TIMEOUT",
  FFMPEG_FAILED: "FFMPEG_FAILED",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  OUTPUT_VALIDATION_FAILED: "OUTPUT_VALIDATION_FAILED",
} as const;

export type RenderErrorCode = (typeof RENDER_ERROR_CODE)[keyof typeof RENDER_ERROR_CODE];

export type RenderRequest = {
  scene: SceneDefinition;
  /** Deterministic hash of the scene config — see render-signature.ts.
   * Lets the render worker (and the cache) recognize "we already rendered
   * exactly this anatomy shot" without re-deriving it itself. */
  renderSignature: string;
};

export type RenderResult =
  // outputPath is the invocation-owned validated artifact, not the input filename.
  // durationSeconds remains process execution time, not encoded media duration.
  | { status: "completed"; outputPath: string; durationSeconds: number }
  | { status: "failed"; errorCode: RenderErrorCode; message: string }
  | { status: Exclude<RenderStatus, "completed" | "failed"> };

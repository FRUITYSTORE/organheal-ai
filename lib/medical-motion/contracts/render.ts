import type { SceneDefinition } from "@/lib/medical-motion/contracts/scene";

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
  | { status: "completed"; outputPath: string; durationSeconds: number }
  | { status: "failed"; errorCode: RenderErrorCode; message: string }
  | { status: Exclude<RenderStatus, "completed" | "failed"> };

import type { AspectRatio, RenderResolution } from "../contracts/scene";

export type OutputDimensions = { width: number; height: number };

// Resolution tiers preserve existing landscape sizes; portrait swaps axes,
// and square uses the tier's named edge. No fallback for unknown contract values.
const DIMENSIONS: Record<RenderResolution, Record<AspectRatio, OutputDimensions>> = {
  "720p": { "16:9": { width: 1280, height: 720 }, "9:16": { width: 720, height: 1280 }, "1:1": { width: 720, height: 720 } },
  "1080p": { "16:9": { width: 1920, height: 1080 }, "9:16": { width: 1080, height: 1920 }, "1:1": { width: 1080, height: 1080 } },
};

export function resolveOutputDimensions(aspectRatio: unknown, resolution: unknown):
  { ok: true; dimensions: OutputDimensions } | { ok: false; message: string } {
  if (aspectRatio !== "16:9" && aspectRatio !== "9:16" && aspectRatio !== "1:1") {
    return { ok: false, message: "Unsupported output.aspectRatio." };
  }
  if (resolution !== "720p" && resolution !== "1080p") {
    return { ok: false, message: "Unsupported output.resolution." };
  }
  const dimensions = { ...DIMENSIONS[resolution][aspectRatio] };
  if (!Number.isSafeInteger(dimensions.width) || dimensions.width <= 0 ||
      !Number.isSafeInteger(dimensions.height) || dimensions.height <= 0) {
    return { ok: false, message: "Invalid resolved output dimensions." };
  }
  return { ok: true, dimensions };
}

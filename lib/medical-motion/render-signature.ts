import { createHash } from "node:crypto";

import type { SceneDefinition } from "@/lib/medical-motion/contracts/scene";

// A deterministic hash of everything that affects the RENDERED ANATOMY
// (organ, asset version, scene shape, focus, camera/motion/highlight
// presets, output format) — architecture brief section 21. Patient-specific
// text (heart age number, name, narration) is deliberately NOT part of this
// signature: two members with the same risk focus and the same organ asset
// version should be able to reuse the identical rendered clip, with only the
// text overlay differing at composition time.
//
// Pure, no I/O — the caller decides what to do with the signature (check a
// cache, tag a storage path, etc.).
export function computeRenderSignature(scene: SceneDefinition, assetVersion: string): string {
  const canonical = JSON.stringify({
    organ: scene.organ,
    assetVersion,
    sceneVersion: scene.sceneVersion,
    focus: scene.focus,
    camera: scene.camera.preset,
    cameraFrom: scene.camera.from ?? null,
    motion: scene.motion.preset,
    highlight: {
      structures: [...scene.highlight.structures].sort(),
      intensity: scene.highlight.intensity,
    },
    output: scene.output,
  });

  return createHash("sha256").update(canonical).digest("hex");
}

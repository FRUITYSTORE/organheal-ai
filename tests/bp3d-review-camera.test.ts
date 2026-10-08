import { expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BP3D_HEART_CANDIDATE as candidate } from "../lib/medical-motion/organs/heart/bp3d-heart-candidate";
it("all review targets depend solely on documented BP3D geometry landmarks", () => {
  const ids = new Set(candidate.landmarks.map(l => l.id));
  for (const target of candidate.cameraTargets) {
    expect(target.viewDirection).toEqual([0,-1,0]);
    for (const id of target.lookAt) expect(ids.has(id)).toBe(true);
    for (const id of target.frames) expect(candidate.anatomyRegistry.some(e => e.id === id && e.availability !== "missing")).toBe(true);
  }
  for (const landmark of candidate.landmarks) expect(landmark.description).toMatch(/AABB|minimum|maximum/);
  const target = candidate.cameraTargets[0];
  const name = (id: string) => candidate.landmarks.find(l => l.id === id)!.blenderObject;
  const shot = { ...target, lookAt: target.lookAt.map(name), scaleReference: candidate.scaleReference.map(name) };
  writeFileSync(path.join(tmpdir(), "organheal-bp3d-review-shot.json"), JSON.stringify(shot));
  expect(candidate.assetStatus).toBe("development-placeholder");
});

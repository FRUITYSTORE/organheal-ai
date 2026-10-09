import { createHash } from "node:crypto";
import configuration from "../../render/blender/heart_hero_master.json";
import lock from "../../render/blender/heart_master_visual_v1.lock.json";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
/** Owner visual approval only. No source, clinical, render or patient-delivery authority. */
export function getHeartMasterVisual(id: string) {
  if (id !== lock.id || id !== "HEART_MASTER_VISUAL_V1" ||
    createHash("sha256").update(JSON.stringify(configuration)).digest("hex") !== lock.configurationSha256) {
    throw new Error("HEART_MASTER_VISUAL_UNAVAILABLE");
  }
  return approvedVisual;
}
const approvedVisual = freeze({ lock, configuration });

import { createHash } from "node:crypto";
import preset from "../../render/blender/heartbeat_motion_master.json";
import lock from "../../render/blender/heartbeat_motion_master_v1.lock.json";
import { getHeartMasterVisual } from "./heart-master-visual";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
/** Internal-review planning identity, never clinical approval or execution authority. */
export function getHeartbeatMotionMaster(id: string) {
  const visual = getHeartMasterVisual(preset.visualMasterRef);
  if (id !== "HEARTBEAT_MOTION_MASTER_V1" || id !== lock.id ||
    createHash("sha256").update(JSON.stringify(preset)).digest("hex") !== lock.configurationSha256 ||
    preset.visualConfigurationSha256 !== visual.lock.configurationSha256) throw new Error("HEARTBEAT_MOTION_MASTER_UNAVAILABLE");
  return freeze({ preset, lock, visual });
}

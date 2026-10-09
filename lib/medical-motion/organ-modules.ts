import type { OrganModule } from "./contracts/organ-module";
import type { OrganId } from "./contracts/organ";
import { HEART_ORGAN_MODULE } from "./organs/heart/heart-organ-module";
import { BP3D_HEART_CANDIDATE } from "./organs/heart/bp3d-heart-candidate";
import { SSM_HEART_CANDIDATE } from "./organs/heart/ssm-heart-candidate";
import { APIL_LOCAL_HEART_CANDIDATE } from "./organs/heart/apil-local-heart-candidate";

/** Trusted server configuration only; registrations are detached immutable snapshots. */
export function createOrganModuleRegistry(definitions: readonly OrganModule[]) {
  const modules = new Map<string, OrganModule>();
  const freeze = (value: unknown): void => {
    if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  };
  for (const input of definitions) {
    if (!input || typeof input.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(input.id) ||
        typeof input.assetVersion !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(input.assetVersion) ||
        input.anatomyRegistry.some(entry => !entry.id.startsWith(`${input.id}.`))) throw Error("ORGAN_MODULE_INVALID");
    const key = JSON.stringify([input.id, input.assetVersion]);
    if (modules.has(key)) throw Error("ORGAN_MODULE_DUPLICATE");
    const module = structuredClone(input); freeze(module); modules.set(key, module);
  }
  return Object.freeze({ resolve(organ: OrganId, assetVersion: string): OrganModule | null {
    return modules.get(JSON.stringify([organ, assetVersion])) ?? null;
  } });
}
const ASSET_MODULES = createOrganModuleRegistry([HEART_ORGAN_MODULE, BP3D_HEART_CANDIDATE, SSM_HEART_CANDIDATE, APIL_LOCAL_HEART_CANDIDATE]);
export function getOrganModuleForAsset(organ: OrganId, assetVersion: string): OrganModule | null {
  return ASSET_MODULES.resolve(organ, assetVersion);
}
/** Legacy callers retain the same default module and identity. */
export function getOrganModule(organ: OrganId): OrganModule | null {
  return organ === "heart" ? HEART_ORGAN_MODULE : null;
}

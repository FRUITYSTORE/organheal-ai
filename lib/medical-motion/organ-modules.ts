import type { OrganModule } from "./contracts/organ-module";
import type { OrganId } from "./contracts/organ";
import { HEART_ORGAN_MODULE } from "./organs/heart/heart-organ-module";

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
const ASSET_MODULES = createOrganModuleRegistry([HEART_ORGAN_MODULE]);
export function getOrganModuleForAsset(organ: OrganId, assetVersion: string): OrganModule | null {
  return ASSET_MODULES.resolve(organ, assetVersion);
}
/** Legacy callers retain the same default module and identity. */
export function getOrganModule(organ: OrganId): OrganModule | null {
  return organ === "heart" ? HEART_ORGAN_MODULE : null;
}

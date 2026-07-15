import type {
  RegisteredHealthEngine,
} from "./health-engine-registry";

export type HealthEngineManifestMetadata = {
  name: string;
  description: string;

  version: string;

  category:
    | "core"
    | "clinical"
    | "timeline"
    | "planning"
    | "knowledge"
    | "experimental";

  dependsOn: string[];

  enabledByDefault: boolean;
};

export type HealthEngineManifest<TData> = {
  engine: RegisteredHealthEngine<TData>;

  metadata: HealthEngineManifestMetadata;
};

export type AnyHealthEngineManifest =
  HealthEngineManifest<unknown>;

export function defineHealthEngineManifest<TData>(
  manifest: HealthEngineManifest<TData>
): HealthEngineManifest<TData> {
  if (!manifest.engine.id.trim()) {
    throw new Error(
      "Health engine manifest requires a non-empty engine id."
    );
  }

  if (!manifest.metadata.name.trim()) {
    throw new Error(
      `Health engine "${manifest.engine.id}" requires a manifest name.`
    );
  }

  if (!manifest.metadata.version.trim()) {
    throw new Error(
      `Health engine "${manifest.engine.id}" requires a version.`
    );
  }

  if (
    manifest.metadata.dependsOn.includes(
      manifest.engine.id
    )
  ) {
    throw new Error(
      `Health engine "${manifest.engine.id}" cannot depend on itself.`
    );
  }

  return manifest;
}
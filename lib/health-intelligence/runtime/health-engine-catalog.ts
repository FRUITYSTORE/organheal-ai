import type {
  AnyHealthEngineManifest,
} from "./health-engine-manifest";
import type {
  RegisteredHealthEngine,
} from "./health-engine-registry";

export type HealthEngineCatalogValidationResult = {
  valid: boolean;
  errors: string[];
};

export class HealthEngineCatalog {
  private readonly manifests = new Map<
    string,
    AnyHealthEngineManifest
  >();

  constructor(
    manifests: AnyHealthEngineManifest[] = []
  ) {
    for (const manifest of manifests) {
      this.add(manifest);
    }

    this.assertValid();
  }

  add(
    manifest: AnyHealthEngineManifest
  ): this {
    const engineId =
      manifest.engine.id.trim();

    if (!engineId) {
      throw new Error(
        "Health engine catalog cannot add an engine with an empty id."
      );
    }

    if (this.manifests.has(engineId)) {
      throw new Error(
        `Health engine "${engineId}" is already present in the catalog.`
      );
    }

    this.manifests.set(
      engineId,
      manifest
    );

    return this;
  }

  has(engineId: string): boolean {
    return this.manifests.has(engineId);
  }

  get(
    engineId: string
  ): AnyHealthEngineManifest | null {
    return (
      this.manifests.get(engineId) ??
      null
    );
  }

  list(): AnyHealthEngineManifest[] {
    return [
      ...this.manifests.values(),
    ].sort(
      (first, second) =>
        first.engine.order -
        second.engine.order
    );
  }

  listEnabledByDefault():
    AnyHealthEngineManifest[] {
    return this.list().filter(
      (manifest) =>
        manifest.metadata
          .enabledByDefault
    );
  }

  getEngineIds(): string[] {
    return this.list().map(
      (manifest) =>
        manifest.engine.id
    );
  }
  toRegisteredEngines(
    options: {
      includeDisabled?: boolean;
      enabledEngineIds?: string[];
      disabledEngineIds?: string[];
    } = {}
  ): RegisteredHealthEngine<unknown>[] {
    const enabledIds =
      options.enabledEngineIds ?? [];

    const disabledIds =
      options.disabledEngineIds ?? [];

    return this.list()
      .filter((manifest) => {
        const engineId =
          manifest.engine.id;

        if (
          disabledIds.includes(
            engineId
          )
        ) {
          return false;
        }

        if (
          enabledIds.length > 0
        ) {
          return enabledIds.includes(
            engineId
          );
        }

        if (
          options.includeDisabled === true
        ) {
          return true;
        }

        return manifest.metadata
          .enabledByDefault;
      })
      .map(
        (manifest) =>
          manifest.engine
      );
  }
  validate():
    HealthEngineCatalogValidationResult {
    const errors: string[] = [];

    for (const manifest of this.list()) {
      const engineId =
        manifest.engine.id;

      const dependencies =
        manifest.metadata.dependsOn;

      if (
        dependencies.includes(engineId)
      ) {
        errors.push(
          `Health engine "${engineId}" cannot depend on itself.`
        );
      }

      for (
        const dependencyId
        of dependencies
      ) {
        if (
          !this.manifests.has(
            dependencyId
          )
        ) {
          errors.push(
            `Health engine "${engineId}" depends on missing engine "${dependencyId}".`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  assertValid(): void {
    const validation =
      this.validate();

    if (validation.valid) {
      return;
    }

    throw new Error(
      [
        "Health engine catalog validation failed:",
        ...validation.errors.map(
          (error) => `- ${error}`
        ),
      ].join("\n")
    );
  }
}
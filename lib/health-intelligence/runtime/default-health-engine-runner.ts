import type {
  HealthEngineExecutionResult,
  HealthEngineRuntimeDependencies,
  RegisteredHealthEngine,
} from "./health-engine-registry";

import type {
  HealthEngineExecutor,
  HealthEngineRunner,
  HealthEngineRunnerOptions,
  HealthEngineRunResult,
} from "./health-engine-runner";

import {
  DefaultHealthEngineExecutor,
} from "./default-health-engine-executor";

function shouldRunEngine(
  engineId: string,
  options: HealthEngineRunnerOptions
): boolean {
  const enabledIds =
    options.enabledEngineIds ?? [];

  const disabledIds =
    options.disabledEngineIds ?? [];

  if (
    enabledIds.length > 0 &&
    !enabledIds.includes(engineId)
  ) {
    return false;
  }

  if (disabledIds.includes(engineId)) {
    return false;
  }

  return true;
}

export class DefaultHealthEngineRunner
  implements HealthEngineRunner
{
  constructor(
    private readonly executor: HealthEngineExecutor =
      new DefaultHealthEngineExecutor()
  ) {}

  async run(
    engines: RegisteredHealthEngine<unknown>[],
    dependencies: HealthEngineRuntimeDependencies,
    options: HealthEngineRunnerOptions = {}
  ): Promise<HealthEngineRunResult> {
    const startedAt =
      new Date().toISOString();

    const results = new Map<
      string,
      HealthEngineExecutionResult<unknown>
    >();

    const completedEngineIds: string[] = [];
    const skippedEngineIds: string[] = [];
    const failedEngineIds: string[] = [];

    const orderedEngines = [
      ...engines,
    ].sort(
      (first, second) =>
        first.order - second.order
    );

    for (const engine of orderedEngines) {
      if (
        !shouldRunEngine(
          engine.id,
          options
        )
      ) {
        skippedEngineIds.push(
          engine.id
        );

        continue;
      }

      const runtimeDependencies: HealthEngineRuntimeDependencies = {
        context:
          dependencies.context,

        results,
      };

      const result =
        await this.executor.execute({
          engine,
          dependencies:
            runtimeDependencies,
        });

      results.set(
        engine.id,
        result
      );

      if (
        result.status === "error"
      ) {
        failedEngineIds.push(
          engine.id
        );

        if (
          options.stopOnError === true
        ) {
          break;
        }

        continue;
      }

      if (
        result.status ===
        "unavailable"
      ) {
        skippedEngineIds.push(
          engine.id
        );

        continue;
      }

      completedEngineIds.push(
        engine.id
      );
    }

    const resultList = [
      ...results.values(),
    ];

    const readyEngineCount =
      resultList.filter(
        (result) =>
          result.status === "ready"
      ).length;

    const unavailableEngineCount =
      resultList.filter(
        (result) =>
          result.status ===
          "unavailable"
      ).length;

    const errorEngineCount =
      resultList.filter(
        (result) =>
          result.status === "error"
      ).length;

    return {
      results,

      readyEngineCount,
      unavailableEngineCount,
      errorEngineCount,

      generatedAt:
        new Date().toISOString(),

      context: {
        startedAt,
        completedEngineIds,
        skippedEngineIds,
        failedEngineIds,
      },
    };
  }
}
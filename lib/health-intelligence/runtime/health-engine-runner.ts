import type {
  HealthEngineExecutionResult,
  HealthEngineRegistryResult,
  HealthEngineRuntimeDependencies,
  RegisteredHealthEngine,
} from "./health-engine-registry";

export type HealthEngineRunnerOptions = {
  stopOnError?: boolean;

  enabledEngineIds?: string[];

  disabledEngineIds?: string[];
};

export type HealthEngineRunContext = {
  startedAt: string;

  completedEngineIds: string[];
  skippedEngineIds: string[];
  failedEngineIds: string[];
};

export type HealthEngineRunResult =
  HealthEngineRegistryResult & {
    context: HealthEngineRunContext;
  };

export type ExecuteHealthEngineInput = {
  engine: RegisteredHealthEngine<unknown>;

  dependencies: HealthEngineRuntimeDependencies;
};

export interface HealthEngineExecutor {
  execute(
    input: ExecuteHealthEngineInput
  ): Promise<
    HealthEngineExecutionResult<unknown>
  >;
}

export interface HealthEngineRunner {
  run(
    engines: RegisteredHealthEngine<unknown>[],
    dependencies: HealthEngineRuntimeDependencies,
    options?: HealthEngineRunnerOptions
  ): Promise<HealthEngineRunResult>;
}
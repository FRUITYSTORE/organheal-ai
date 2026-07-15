import type {
  HealthIntelligenceContext,
} from "../context/health-intelligence-context";

export type HealthEngineExecutionStatus =
  | "ready"
  | "unavailable"
  | "error";

export type HealthEngineExecutionResult<TData> = {
  status: HealthEngineExecutionStatus;
  data: TData | null;
  error: string | null;
  generatedAt: string;
};

export type HealthEngineRuntimeDependencies = {
  context: HealthIntelligenceContext;

  results: ReadonlyMap<
    string,
    HealthEngineExecutionResult<unknown>
  >;
};

export type RegisteredHealthEngine<TData> = {
  id: string;
  order: number;

  isAvailable?: (
    dependencies: HealthEngineRuntimeDependencies
  ) => boolean;

  execute: (
    dependencies: HealthEngineRuntimeDependencies
  ) =>
    | HealthEngineExecutionResult<TData>
    | Promise<
        HealthEngineExecutionResult<TData>
      >;
};

export type HealthEngineRegistryResult = {
  results: Map<
    string,
    HealthEngineExecutionResult<unknown>
  >;

  readyEngineCount: number;
  unavailableEngineCount: number;
  errorEngineCount: number;

  generatedAt: string;
};

export class HealthEngineRegistry {
  private readonly engines = new Map<
    string,
    RegisteredHealthEngine<unknown>
  >();

  register<TData>(
    engine: RegisteredHealthEngine<TData>
  ): this {
    if (this.engines.has(engine.id)) {
      throw new Error(
        `Health engine "${engine.id}" is already registered.`
      );
    }

    this.engines.set(
      engine.id,
      engine as RegisteredHealthEngine<unknown>
    );

    return this;
  }

  has(engineId: string): boolean {
    return this.engines.has(engineId);
  }

  list(): RegisteredHealthEngine<unknown>[] {
    return [...this.engines.values()].sort(
      (first, second) =>
        first.order - second.order
    );
  }
}
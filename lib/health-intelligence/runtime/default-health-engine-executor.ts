import type {
  HealthEngineExecutionResult,
} from "./health-engine-registry";

import type {
  ExecuteHealthEngineInput,
  HealthEngineExecutor,
} from "./health-engine-runner";

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown health engine execution error.";
}

export class DefaultHealthEngineExecutor
  implements HealthEngineExecutor
{
  async execute({
    engine,
    dependencies,
  }: ExecuteHealthEngineInput): Promise<
    HealthEngineExecutionResult<unknown>
  > {
    const generatedAt =
      new Date().toISOString();

    try {
      const available =
        engine.isAvailable?.(
          dependencies
        ) ?? true;

      if (!available) {
        return {
          status: "unavailable",
          data: null,
          error: null,
          generatedAt,
        };
      }

      const result =
        await engine.execute(
          dependencies
        );

      return {
        status: result.status,
        data: result.data,
        error: result.error,
        generatedAt:
          result.generatedAt ??
          generatedAt,
      };
    } catch (error) {
      return {
        status: "error",
        data: null,
        error: getErrorMessage(error),
        generatedAt,
      };
    }
  }
}
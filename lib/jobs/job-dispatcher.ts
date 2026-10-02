import type {
  BackgroundJob,
  JobType,
} from "./job-types";

import type {
  JobHandler,
  JobHandlerRegistry,
  JobHandlerResult,
} from "./job-handler";

export class JobDispatcher {
  private readonly registry:
    JobHandlerRegistry =
      new Map();

  register(
    type: JobType,
    handler: JobHandler
  ): void {
    this.registry.set(
      type,
      handler
    );
  }

  async dispatch(
    job: BackgroundJob
  ): Promise<void | JobHandlerResult> {
    const handler =
      this.registry.get(
        job.type
      );

    if (!handler) {
      throw new Error(
        `No handler registered for "${job.type}".`
      );
    }

    return handler(
      job
    );
  }
}

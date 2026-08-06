import {
  JobWorker,
} from "./job-worker";

export class JobRunner {
  constructor(
    private readonly worker:
      JobWorker
  ) {}

  async runUntilEmpty(): Promise<number> {
    let processedJobs = 0;

    while (
      await this.worker.processNext()
    ) {
      processedJobs++;
    }

    return processedJobs;
  }
}
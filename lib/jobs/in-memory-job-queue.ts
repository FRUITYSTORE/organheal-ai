import {
  BackgroundJobQueue,
} from "./job-queue";

export class InMemoryJobQueue
  implements BackgroundJobQueue {

  private readonly jobs:
    unknown[] = [];

  async enqueue<T>(
    job: T
  ): Promise<void> {
    this.jobs.push(job);
  }

  async dequeue<T>(): Promise<T | null> {
    if (
      this.jobs.length === 0
    ) {
      return null;
    }

    return this.jobs.shift() as T;
  }

  async peek<T>(): Promise<T |null> {
    if (
      this.jobs.length === 0
    ) {
      return null;
    }

    return this.jobs[0] as T;
  }

  async size(): Promise<number> {
    return this.jobs.length;
  }

  async clear(): Promise<void> {
    this.jobs.length = 0;
  }
}
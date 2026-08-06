import type {
  BackgroundJob,
  JobType,
} from "./job-types";

export type JobHandler<
  TPayload = unknown,
> = (
  job: BackgroundJob<TPayload>
) => Promise<void>;

export type JobHandlerRegistry =
  Map<
    JobType,
    JobHandler
  >;
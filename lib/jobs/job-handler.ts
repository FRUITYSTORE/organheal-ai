import type {
  BackgroundJob,
  JobType,
} from "./job-types";

/** Internal dispositions carry fixed operational codes, never diagnostics.
 * Deferred execution is fenced before callbacks; callbacks are server-owned
 * cleanup/handoff closures and are never serialized into job state. */
export type JobHandlerResult =
  | { disposition: "complete" }
  | { disposition: "fail" | "retry"; errorCode: string }
  | { disposition: "ownership-lost" }
  | { disposition: "already-finalized" }
  | { disposition: "defer-completion"; settle(accepted: boolean): Promise<void> };

export type JobHandler<
  TPayload = unknown,
> = (
  job: BackgroundJob<TPayload>
) => Promise<void | JobHandlerResult>;

export type JobHandlerRegistry =
  Map<
    JobType,
    JobHandler
  >;

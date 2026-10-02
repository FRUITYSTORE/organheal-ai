import type { BackgroundJobAttempt, AttemptMutationResult } from "./background-job-worker.repository";
import type { PublicationManifest, PublicationResult } from "./background-job-result.repository";

export const OWNERSHIP_POLICY = Object.freeze({
  intervalMs: 5 * 60_000, retryMs: 5_000, requestTimeoutMs: 10_000, shutdownMs: 5_000,
});
type Dependencies = {
  renewLease(attempt: BackgroundJobAttempt): Promise<AttemptMutationResult>;
  publish(request: BackgroundJobAttempt & { manifest: PublicationManifest }): Promise<PublicationResult>;
};
export type OwnedOperation<T> = { status: "succeeded"; value: T } | { status: "failed" };
export type OwnedExecution<T> =
  | { execution: "succeeded"; value: T; publicationAllowed: boolean }
  | { execution: "failed" | "cancelled" | "not-started"; publicationAllowed: false };

/** Single-use ownership boundary. No queue, renderer, clinical or storage logic.
 * The operation owns its cleanup; abort does not prove its writer has stopped.
 * Local eligibility is advisory; publish always reconfirms and uses fenced RPC.
 * The existing RPC grants the 30-minute lease using the database clock. Local
 * timers schedule checks only; they never extend or resurrect lease authority.
 * Transport cannot be aborted by this repository contract. A timed-out request
 * is consumed without retry/overlap and its response cannot undo cancellation.
 */
export class ExecutionOwnership {
  private readonly controller = new AbortController();
  private readonly attempt: BackgroundJobAttempt;
  private phase: "idle" | "running" | "succeeded" | "failed" | "published" = "idle";
  private confirmed = false;
  private failures = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private renewal?: Promise<boolean>;
  private active?: Promise<unknown>;
  private publishing = false;
  private publication?: Promise<PublicationResult>;
  private publicationRequest?: PublicationManifest;
  private publicationUnknown = false;

  constructor(attempt: BackgroundJobAttempt, private readonly dependencies: Dependencies) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(attempt.jobId) || !uuid.test(attempt.attemptToken)) throw new Error("Invalid execution ownership.");
    this.attempt = Object.freeze({ jobId: attempt.jobId, attemptToken: attempt.attemptToken });
  }
  get signal(): AbortSignal { return this.controller.signal; }
  get publicationAllowed(): boolean {
    return this.phase === "succeeded" && this.confirmed && !this.signal.aborted && !this.publishing && !this.publicationUnknown;
  }
  cancel(): void {
    this.confirmed = false;
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.signal.aborted) this.controller.abort();
  }

  private delay(ms: number): Promise<void> {
    if (this.signal.aborted) return Promise.resolve();
    return new Promise(resolve => {
      const finish = () => { clearTimeout(timer); this.signal.removeEventListener("abort", finish); resolve(); };
      const timer = setTimeout(finish, ms);
      this.signal.addEventListener("abort", finish, { once: true });
    });
  }
  private renew(): Promise<boolean> {
    if (this.signal.aborted) return Promise.resolve(false);
    if (this.renewal) return this.renewal;
    this.confirmed = false;
    const request = Promise.resolve().then(() => {
      if (this.signal.aborted) throw new Error("Execution is cancelled.");
      return this.dependencies.renewLease(this.attempt);
    });
    this.renewal = new Promise<boolean>(resolve => {
      let settled = false;
      const finish = (valid: boolean) => {
        if (settled) return;
        settled = true; clearTimeout(deadline); this.signal.removeEventListener("abort", onAbort);
        resolve(valid);
      };
      const onAbort = () => finish(false);
      // A hung RPC cannot overlap a replacement request. Cancel permanently;
      // its late response is consumed but cannot restore eligibility.
      const deadline = setTimeout(() => { this.cancel(); finish(false); }, OWNERSHIP_POLICY.requestTimeoutMs);
      this.signal.addEventListener("abort", onAbort, { once: true });
      request.then(result => {
        if (settled || this.signal.aborted) return;
        if (result.outcome === "ownership-lost") { this.cancel(); finish(false); return; }
        if (result.outcome !== "applied" || result.status !== "running" ||
          typeof result.leaseExpiresAt !== "string" || !Number.isFinite(Date.parse(result.leaseExpiresAt))) {
          this.failures++; if (this.failures >= 2) this.cancel(); finish(false); return;
        }
        this.confirmed = true; this.failures = 0; finish(true);
      }, () => {
        if (settled || this.signal.aborted) return;
        this.failures++; if (this.failures >= 2) this.cancel(); finish(false);
      });
    }).finally(() => { this.renewal = undefined; });
    return this.renewal;
  }
  private async confirm(): Promise<boolean> {
    if (await this.renew()) return true;
    if (this.signal.aborted) return false;
    await this.delay(OWNERSHIP_POLICY.retryMs);
    return this.renew();
  }
  private schedule(ms = OWNERSHIP_POLICY.intervalMs): void {
    if (this.phase !== "running" || this.signal.aborted) return;
    this.timer = setTimeout(async () => {
      this.timer = undefined;
      const valid = await this.renew();
      if (this.phase === "running" && !this.signal.aborted) {
        this.schedule(valid ? OWNERSHIP_POLICY.intervalMs : OWNERSHIP_POLICY.retryMs);
      }
    }, ms);
  }
  async run<T>(operation: (signal: AbortSignal) => Promise<OwnedOperation<T>>): Promise<OwnedExecution<T>> {
    if (this.phase !== "idle" || this.signal.aborted) return { execution: "not-started", publicationAllowed: false };
    this.phase = "running"; // reserves single-use before awaiting ownership
    const task = this.execute(operation);
    this.active = task;
    try { return await task; } finally { this.active = undefined; }
  }
  private async execute<T>(operation: (signal: AbortSignal) => Promise<OwnedOperation<T>>): Promise<OwnedExecution<T>> {
    try {
      if (!await this.confirm() || this.signal.aborted) return { execution: "not-started", publicationAllowed: false };
      this.schedule();
      const result = await operation(this.signal);
      if (this.signal.aborted) return { execution: "cancelled", publicationAllowed: false };
      if (result.status !== "succeeded") {
        this.phase = "failed"; this.confirmed = false;
        return { execution: "failed", publicationAllowed: false };
      }
      this.phase = "succeeded";
      clearTimeout(this.timer); this.timer = undefined;
      await this.renewal;
      if (this.signal.aborted) return { execution: "cancelled", publicationAllowed: false };
      return { execution: "succeeded", value: result.value, publicationAllowed: this.publicationAllowed };
    } catch {
      this.phase = "failed"; this.confirmed = false;
      return { execution: this.signal.aborted ? "cancelled" : "failed", publicationAllowed: false };
    } finally {
      clearTimeout(this.timer); this.timer = undefined;
      // Join a bounded renewal already in flight; no new request is launched.
      await this.renewal;
    }
  }
  async publish(manifest: PublicationManifest): Promise<PublicationResult> {
    if (this.phase !== "succeeded" || this.signal.aborted || this.publishing) throw new Error("Execution is not eligible for publication.");
    this.publishing = true;
    try {
      if (this.publicationRequest && (manifest.kind !== this.publicationRequest.kind ||
        manifest.referenceId !== this.publicationRequest.referenceId)) throw new Error("Publication replay must be identical.");
      // An unknown commit may already have finalized the job, so renewal would
      // reject a legitimate identical replay. Only the fenced RPC can reconcile it.
      if (!this.publicationUnknown && (!await this.confirm() || this.signal.aborted)) throw new Error("Execution ownership could not be confirmed.");
      this.publicationRequest ??= Object.freeze({ kind: manifest.kind, referenceId: manifest.referenceId });
      this.publication = Promise.resolve().then(() => {
        if (this.signal.aborted) throw new Error("Execution is cancelled.");
        this.publicationUnknown = true;
        return this.dependencies.publish({ ...this.attempt, manifest: this.publicationRequest! });
      });
      let result: PublicationResult;
      try { result = await this.publication; }
      catch { throw new Error("Publication failed; commit state is unknown."); }
      this.publicationUnknown = false;
      if (result.outcome === "ownership-lost") this.cancel();
      if (result.outcome === "applied" || result.outcome === "already-finalized") this.phase = "published";
      if (result.outcome === "conflict") { this.phase = "failed"; this.confirmed = false; }
      return result; // RPC submission may commit before a concurrent shutdown.
    } finally { this.publishing = false; this.publication = undefined; }
  }
  /** Fresh advisory confirmation before an internal handoff. Durable state
   * changes still require their own fenced RPC; this never publishes. */
  async confirmHandoff(): Promise<boolean> {
    if (this.phase !== "succeeded" || this.signal.aborted) return false;
    return await this.confirm() && this.publicationAllowed;
  }
  async shutdown(): Promise<{ settled: boolean }> {
    this.cancel();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        Promise.allSettled([this.active, this.renewal, this.publication]).then(() => ({ settled: true })),
        new Promise<{ settled: boolean }>(resolve => { timeout = setTimeout(() => resolve({ settled: false }), OWNERSHIP_POLICY.shutdownMs); }),
      ]);
    } finally { clearTimeout(timeout); }
  }
}

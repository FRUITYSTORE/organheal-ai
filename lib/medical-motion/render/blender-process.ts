import { spawn } from "node:child_process";

// Internal execution boundary, not a render/clinical API. Node's kill() only
// targets the direct child; on Windows SIGTERM is already a forceful stop.
export const PROCESS_GRACE_MS = 2_000;
export const PROCESS_CONFIRMATION_MS = 2_000;
export const PROCESS_OUTPUT_BYTES = 64 * 1024;
export const OUTPUT_TRUNCATION_MARKER = "[earlier process output truncated]\n";

// Each stream retains at most 64 KiB of bytes. Decoded diagnostics are bounded
// by 65,536 UTF-16 code units plus the fixed truncation marker, including invalid
// UTF-8 input. No output is logged or written to diagnostic files here.
class DiagnosticTail {
  private bytes = Buffer.alloc(0);
  private truncated = false;
  append(chunk: Buffer) {
    if (chunk.length >= PROCESS_OUTPUT_BYTES) {
      this.truncated ||= this.bytes.length > 0 || chunk.length > PROCESS_OUTPUT_BYTES;
      // Copy: a small slice must not retain an arbitrarily large input buffer.
      this.bytes = Buffer.from(chunk.subarray(-PROCESS_OUTPUT_BYTES));
    } else {
      const overflow = Math.max(0, this.bytes.length + chunk.length - PROCESS_OUTPUT_BYTES);
      this.truncated ||= overflow > 0;
      this.bytes = Buffer.concat([this.bytes.subarray(overflow), chunk]);
    }
  }
  text() {
    // A byte-tail may begin inside a UTF-8 codepoint. Skip continuation bytes.
    let start = 0;
    while (start < this.bytes.length && (this.bytes[start] & 0xc0) === 0x80) start++;
    return (this.truncated ? OUTPUT_TRUNCATION_MARKER : "") + this.bytes.subarray(start).toString("utf8");
  }
}

type Outcome = "closed" | "timeout" | "process-error" | "cancelled";
export type BlenderProcessResult = {
  outcome: Outcome;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  reportedRenderOk: boolean;
  terminationConfirmed: boolean;
  durationSeconds: number;
};

// Deliberately contains no per-invocation closure. Retained on a settled child
// to consume late OS kill errors; it cannot change results or retain diagnostics.
const ignoreLateError = () => {};

export function runBlenderProcess(executable: string, args: string[], timeoutMs: number, signal?: AbortSignal): Promise<BlenderProcessResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now(); // Immediately before spawn; excludes config I/O.
    const stdout = new DiagnosticTail(), stderr = new DiagnosticTail();
    let child: ReturnType<typeof spawn>;
    let phase: "running" | "termination-requested" | "terminated" | "unconfirmed" = "running";
    let outcome: Outcome | undefined;
    let settled = false, exited = false, reportedRenderOk = false;
    const markerTails = { stdout: "", stderr: "" };
    let exitCode: number | null = null;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let grace: ReturnType<typeof setTimeout> | undefined;
    let confirmation: ReturnType<typeof setTimeout> | undefined;

    const finish = (terminationConfirmed: boolean) => {
      if (settled) return;
      settled = true;
      phase = terminationConfirmed ? "terminated" : "unconfirmed";
      clearTimeout(deadline); clearTimeout(grace); clearTimeout(confirmation);
      signal?.removeEventListener("abort", onAbort);
      child?.stdout?.off("data", onStdout);
      child?.stderr?.off("data", onStderr);
      child?.off("error", onError);
      child?.off("exit", onExit);
      child?.off("close", onClose);
      if (child) {
        child.on("error", ignoreLateError);
        // A descendant can hold inherited pipes open after the direct child
        // exits. Do not wait forever or claim process-tree termination.
        child.stdout?.destroy(); child.stderr?.destroy();
        child.unref();
      }
      resolve({ outcome: outcome!, exitCode, stdout: stdout.text(), stderr: stderr.text(),
        reportedRenderOk, terminationConfirmed, durationSeconds: (Date.now() - startedAt) / 1000 });
    };
    const capture = (chunk: Buffer, tail: DiagnosticTail, stream: "stdout" | "stderr") => {
      if (settled) return;
      tail.append(chunk);
      // Preserve protocol evidence independently of diagnostic eviction, with
      // constant memory, even if the marker crosses two stream chunks.
      if (!reportedRenderOk) {
        const prefix = chunk.subarray(0, 8).toString("ascii");
        reportedRenderOk = (markerTails[stream] + prefix).includes("RENDER_OK") || chunk.includes("RENDER_OK");
        markerTails[stream] = (markerTails[stream] + chunk.subarray(-8).toString("ascii")).slice(-8);
      }
    };
    const onStdout = (chunk: Buffer) => capture(chunk, stdout, "stdout");
    const onStderr = (chunk: Buffer) => capture(chunk, stderr, "stderr");
    const requestSignal = (signal: "SIGTERM" | "SIGKILL") => {
      if (settled || exited) return;
      try { child.kill(signal); } catch { /* No exit evidence: confirmation deadline still applies. */ }
    };
    const waitForConfirmation = () => {
      if (settled || confirmation) return;
      confirmation = setTimeout(() => {
        outcome ??= "process-error"; // Missing close cannot earn success.
        finish(exited);
      }, PROCESS_CONFIRMATION_MS);
    };
    const terminate = (reason: "timeout" | "process-error" | "cancelled") => {
      if (settled || outcome) return;
      outcome = reason; // Irreversible; subsequent errors/close cannot replace it.
      clearTimeout(deadline);
      phase = "termination-requested";
      if (exited) { waitForConfirmation(); return; }
      grace = setTimeout(() => {
        if (settled || exited) return;
        // Arm before kill(): synchronous errors/close must not orphan a timer.
        waitForConfirmation();
        requestSignal("SIGKILL");
      }, PROCESS_GRACE_MS);
      requestSignal("SIGTERM");
    };
    const onAbort = () => terminate("cancelled");
    const onError = () => {
      if (settled || outcome) return;
      // No PID means spawn failed; no Blender can be writing. Runtime errors
      // on a spawned child instead require confirmed termination before cleanup.
      if (child.pid === undefined) { outcome = "process-error"; finish(true); }
      else terminate("process-error");
    };
    const onExit = (code: number | null) => {
      if (settled) return;
      exited = true; exitCode = code; phase = "terminated";
      clearTimeout(deadline); clearTimeout(grace);
      waitForConfirmation(); // Bound stdio drain if close never follows exit.
    };
    const onClose = (code: number | null) => {
      if (settled) return;
      exited = true; exitCode = code;
      outcome ??= "closed";
      finish(true);
    };

    // Node timers clamp invalid/oversized intervals. Reject rather than silently
    // turning an operator's timeout into 1ms; renderer validates before I/O too.
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
      outcome = "process-error"; finish(true); return;
    }
    if (signal?.aborted) { outcome = "cancelled"; finish(true); return; }
    try { child = spawn(executable, args, { shell: false, windowsHide: true }); }
    catch { outcome = "process-error"; finish(true); return; }
    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", onStderr);
    child.on("error", onError); child.on("exit", onExit); child.on("close", onClose);
    deadline = setTimeout(() => { if (phase === "running") terminate("timeout"); }, timeoutMs);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: spawnMock }));
import { runBlenderProcess, PROCESS_GRACE_MS, PROCESS_CONFIRMATION_MS,
  PROCESS_OUTPUT_BYTES, OUTPUT_TRUNCATION_MARKER } from "../lib/medical-motion/render/blender-process";

class Stream extends EventEmitter { destroy = vi.fn(); }
class Child extends EventEmitter {
  pid: number | undefined = 123;
  stdout = new Stream();
  stderr = new Stream();
  kill = vi.fn((_signal: string) => true);
  unref = vi.fn();
}
let child: Child;
const start = (timeout = 100) => runBlenderProcess("blender.exe", ["--background"], timeout);
const noActiveLifecycle = () => {
  expect(vi.getTimerCount()).toBe(0);
  expect(child.listenerCount("exit")).toBe(0);
  expect(child.listenerCount("close")).toBe(0);
  expect(child.stdout.listenerCount("data")).toBe(0);
  expect(child.stderr.listenerCount("data")).toBe(0);
  expect(child.listenerCount("error")).toBe(1); // Stateless late-error sink.
};
beforeEach(() => {
  vi.useFakeTimers(); spawnMock.mockReset(); child = new Child(); spawnMock.mockReturnValue(child);
});
afterEach(() => { vi.useRealTimers(); });

describe("Blender process lifecycle", () => {
  it("pre-cancelled invocation never spawns", async () => {
    const controller = new AbortController(); controller.abort();
    expect(await runBlenderProcess("blender.exe", [], 100, controller.signal)).toMatchObject({ outcome: "cancelled", terminationConfirmed: true });
    expect(spawnMock).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("cancellation escalates once and late successful close cannot earn success", async () => {
    const controller = new AbortController(), remove = vi.spyOn(controller.signal, "removeEventListener");
    const promise = runBlenderProcess("blender.exe", [], 100, controller.signal); controller.abort(); controller.abort();
    expect(child.kill.mock.calls).toEqual([["SIGTERM"]]);
    await vi.advanceTimersByTimeAsync(PROCESS_GRACE_MS); expect(child.kill.mock.calls).toEqual([["SIGTERM"], ["SIGKILL"]]);
    child.emit("close", 0); expect(await promise).toMatchObject({ outcome: "cancelled", terminationConfirmed: true });
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function)); noActiveLifecycle();
  });
  it.each(["cancel-first", "timeout-first"])("one terminal outcome in %s race", async order => {
    const controller = new AbortController(), promise = runBlenderProcess("blender.exe", [], 100, controller.signal);
    if (order === "cancel-first") controller.abort();
    await vi.advanceTimersByTimeAsync(100); controller.abort(); child.emit("close", 0);
    expect(await promise).toMatchObject({ outcome: order === "cancel-first" ? "cancelled" : "timeout" }); noActiveLifecycle();
  });
  it.each(["cancel-first", "close-first"])("one terminal outcome in %s close race", async order => {
    const controller = new AbortController(), promise = runBlenderProcess("blender.exe", [], 100, controller.signal);
    if (order === "cancel-first") controller.abort(); child.emit("close", 0); controller.abort();
    expect(await promise).toMatchObject({ outcome: order === "cancel-first" ? "cancelled" : "closed" }); noActiveLifecycle();
  });
  it("cancel after exit while pipes drain remains cancelled without killing an exited child", async () => {
    const controller = new AbortController(), promise = runBlenderProcess("blender.exe", [], 100, controller.signal);
    child.emit("exit", 0); controller.abort(); await vi.advanceTimersByTimeAsync(PROCESS_CONFIRMATION_MS);
    expect(await promise).toMatchObject({ outcome: "cancelled", terminationConfirmed: true }); expect(child.kill).not.toHaveBeenCalled(); noActiveLifecycle();
  });
  it("unconfirmed cancellation releases lifecycle without falsely confirming termination", async () => {
    const controller = new AbortController(), promise = runBlenderProcess("blender.exe", [], 100, controller.signal); controller.abort();
    await vi.advanceTimersByTimeAsync(PROCESS_GRACE_MS + PROCESS_CONFIRMATION_MS);
    expect(await promise).toMatchObject({ outcome: "cancelled", terminationConfirmed: false }); noActiveLifecycle();
    child.emit("close", 0); expect(await promise).toMatchObject({ outcome: "cancelled", terminationConfirmed: false });
  });
  it.each([0, 1])("accepts normal close %s and releases lifecycle resources", async (code) => {
    const promise = start(); child.emit("exit", code); child.emit("close", code);
    expect(await promise).toMatchObject({ outcome: "closed", exitCode: code, terminationConfirmed: true });
    expect(child.kill).not.toHaveBeenCalled(); noActiveLifecycle();
    expect(spawnMock).toHaveBeenCalledWith("blender.exe", ["--background"], { shell: false, windowsHide: true });
  });
  it("handles synchronous spawn failure without scheduling timers", async () => {
    spawnMock.mockImplementation(() => { throw new Error("private path"); });
    expect(await start()).toMatchObject({ outcome: "process-error", terminationConfirmed: true, stderr: "" });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("handles asynchronous spawn failure without killing a nonexistent child", async () => {
    child.pid = undefined;
    const promise = start(); child.emit("error", new Error("private path")); child.emit("close", -1);
    expect(await promise).toMatchObject({ outcome: "process-error", terminationConfirmed: true });
    expect(child.kill).not.toHaveBeenCalled(); noActiveLifecycle();
  });
  it.each([0, 1])("timeout remains terminal after late close %s", async (code) => {
    const promise = start(); await vi.advanceTimersByTimeAsync(100);
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    child.stdout.emit("data", Buffer.from("RENDER_OK")); child.emit("close", code);
    expect(await promise).toMatchObject({ outcome: "timeout", exitCode: code, terminationConfirmed: true });
    noActiveLifecycle();
  });
  it("process error stays terminal after successful close and waits for termination", async () => {
    let returned = false;
    const promise = start().then((result) => { returned = true; return result; });
    child.emit("error", new Error("EIO")); await Promise.resolve();
    expect(returned).toBe(false); expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    child.emit("close", 0);
    expect(await promise).toMatchObject({ outcome: "process-error", terminationConfirmed: true });
    noActiveLifecycle();
  });
  it("late error, repeated close and stale callbacks cannot replace a closed outcome", async () => {
    const promise = start();
    const error = child.listeners("error")[0], close = child.listeners("close")[0];
    const data = child.stdout.listeners("data")[0];
    child.emit("close", 0);
    child.emit("error", new Error("late")); child.emit("close", 1);
    error(new Error("stale")); close(1); data(Buffer.from("late output"));
    expect(await promise).toMatchObject({ outcome: "closed", exitCode: 0, stdout: "" });
    noActiveLifecycle();
  });
  it("escalates once after grace, then waits for confirmed close", async () => {
    const promise = start(); await vi.advanceTimersByTimeAsync(100 + PROCESS_GRACE_MS - 1);
    expect(child.kill.mock.calls).toEqual([["SIGTERM"]]);
    await vi.advanceTimersByTimeAsync(1);
    expect(child.kill.mock.calls).toEqual([["SIGTERM"], ["SIGKILL"]]);
    child.emit("exit", null); child.emit("close", null);
    expect(await promise).toMatchObject({ outcome: "timeout", terminationConfirmed: true });
    noActiveLifecycle();
  });
  it("does not escalate after graceful exit while pipes drain", async () => {
    const promise = start(); await vi.advanceTimersByTimeAsync(100);
    child.emit("exit", null);
    await vi.advanceTimersByTimeAsync(PROCESS_GRACE_MS - 1); child.emit("close", null);
    expect(await promise).toMatchObject({ outcome: "timeout", terminationConfirmed: true });
    expect(child.kill.mock.calls).toEqual([["SIGTERM"]]); noActiveLifecycle();
  });
  it("handles synchronous close inside kill without orphan timers", async () => {
    child.kill.mockImplementation(() => { child.emit("close", null); return true; });
    const promise = start(); await vi.advanceTimersByTimeAsync(100);
    expect(await promise).toMatchObject({ outcome: "timeout", terminationConfirmed: true });
    noActiveLifecycle();
  });
  it.each(["false", "throw", "error"])("bounds an unconfirmed termination when kill returns/emits %s", async (failure) => {
    child.kill.mockImplementation(() => {
      if (failure === "throw") throw new Error("EPERM");
      if (failure === "error") child.emit("error", new Error("EPERM"));
      return false;
    });
    const promise = start();
    await vi.advanceTimersByTimeAsync(100 + PROCESS_GRACE_MS + PROCESS_CONFIRMATION_MS);
    const result = await promise;
    expect(result).toMatchObject({ outcome: "timeout", terminationConfirmed: false });
    expect(child.kill).toHaveBeenCalledTimes(2); expect(child.unref).toHaveBeenCalledOnce();
    child.emit("close", 0); child.emit("error", new Error("late"));
    expect(result.terminationConfirmed).toBe(false); noActiveLifecycle();
  });
  it("bounds a process error that never terminates", async () => {
    const promise = start(); child.emit("error", new Error("EIO"));
    await vi.advanceTimersByTimeAsync(PROCESS_GRACE_MS + PROCESS_CONFIRMATION_MS);
    expect(await promise).toMatchObject({ outcome: "process-error", terminationConfirmed: false });
    noActiveLifecycle();
  });
  it("exit without close bounds pipe draining and cannot become success", async () => {
    const promise = start(); child.stdout.emit("data", Buffer.from("RENDER_OK")); child.emit("exit", 0);
    await vi.advanceTimersByTimeAsync(PROCESS_CONFIRMATION_MS);
    expect(await promise).toMatchObject({ outcome: "process-error", terminationConfirmed: true });
    expect(child.kill).not.toHaveBeenCalled(); noActiveLifecycle();
  });
  it.each(["stdout", "stderr"] as const)("keeps %s as a bounded diagnostic tail with truncation", async (stream) => {
    const promise = start();
    child[stream].emit("data", Buffer.alloc(PROCESS_OUTPUT_BYTES * 20, "x"));
    for (let i = 0; i < 20; i++) child[stream].emit("data", Buffer.alloc(PROCESS_OUTPUT_BYTES / 2, "y"));
    child[stream].emit("data", Buffer.from("useful final diagnostic")); child.emit("close", 1);
    const output = (await promise)[stream];
    expect(output).toContain(OUTPUT_TRUNCATION_MARKER);
    expect(output.endsWith("useful final diagnostic")).toBe(true);
    expect(Buffer.byteLength(output)).toBeLessThanOrEqual(PROCESS_OUTPUT_BYTES + Buffer.byteLength(OUTPUT_TRUNCATION_MARKER));
    noActiveLifecycle();
  });
  it("does not corrupt a UTF-8 tail at the retained start", async () => {
    const promise = start(); child.stdout.emit("data", Buffer.from("€".repeat(PROCESS_OUTPUT_BYTES)));
    child.emit("close", 1); const output = (await promise).stdout;
    expect(output).not.toContain("�");
    expect(Buffer.byteLength(output)).toBeLessThanOrEqual(PROCESS_OUTPUT_BYTES + Buffer.byteLength(OUTPUT_TRUNCATION_MARKER));
  });
  it("bounds decoded diagnostics even for invalid UTF-8 bytes", async () => {
    const promise = start(); child.stderr.emit("data", Buffer.alloc(PROCESS_OUTPUT_BYTES * 2, 0xff));
    child.emit("close", 1);
    expect((await promise).stderr.length).toBeLessThanOrEqual(PROCESS_OUTPUT_BYTES + OUTPUT_TRUNCATION_MARKER.length);
  });
  it("preserves split RENDER_OK independently of eviction", async () => {
    const promise = start(); child.stdout.emit("data", Buffer.from("RENDER_"));
    child.stdout.emit("data", Buffer.from("OK"));
    child.stdout.emit("data", Buffer.alloc(PROCESS_OUTPUT_BYTES * 2, "x")); child.emit("close", 0);
    expect(await promise).toMatchObject({ reportedRenderOk: true });
  });
  it("does not combine separate streams into a marker", async () => {
    const promise = start(); child.stdout.emit("data", Buffer.from("RENDER_"));
    child.stderr.emit("data", Buffer.from("OK")); child.emit("close", 0);
    expect(await promise).toMatchObject({ reportedRenderOk: false });
  });
  it.each([0, -1, NaN, Infinity, 0.5, 2_147_483_648])("rejects invalid timeout %s without spawn", async (timeout) => {
    expect(await start(timeout)).toMatchObject({ outcome: "process-error", terminationConfirmed: true });
    expect(spawnMock).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
});

import { EventEmitter } from "node:events";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { mp4Fixture } from "./fixtures/medical-motion-artifact";
import { validateRenderDuration } from "../lib/medical-motion/render/duration-policy";
import { PROCESS_GRACE_MS, PROCESS_CONFIRMATION_MS } from "../lib/medical-motion/render/blender-process";
import * as artifactOutput from "../lib/medical-motion/render/artifact-output";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: spawnMock }));

import { renderHeartScene, resolveCameraShot, toBlenderSceneConfig } from "../lib/medical-motion/render/blender-renderer";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { buildHeartScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";
import { prepareExplanationAuthorization, readExplanationAuthorization } from "../lib/symptom-explanation/explanation-authorization";

function renderClinical(plan: unknown) {
  const prepared = prepareExplanationAuthorization({ clinical: { message: "I feel tired.", language: "en" }, plan, sceneIndex: 0 },
    { clinicalContextId: "server-test", assetVersion: HEART_ORGAN_MODULE.assetVersion, mode: "development", outputPath: "out.mp4" });
  if (!("ok" in prepared)) throw new Error(prepared.message);
  const authorized = readExplanationAuthorization(prepared.authorization)!;
  return renderHeartScene(authorized.request.scene, "out.mp4", { mode: "development",
    explanationPlan: authorized.request.explanationPlan, clinicalAuthorization: prepared.authorization });
}

// A fake child process good enough to drive the renderer's event handling
// (stdout/stderr/close) without ever spawning a real Blender binary — a
// real render takes real minutes and needs a real GPU/install, neither of
// which any CI box or contributor's machine is guaranteed to have.
class FakeChildProcess extends EventEmitter {
  produceArtifact = true;
  artifactData = mp4Fixture();
  override emit(event: string | symbol, ...args: unknown[]): boolean {
    if (event === "close" && this.produceArtifact) {
      const index = spawnMock.mock.results.findIndex((result) => result.value === this);
      const invocationArgs = spawnMock.mock.calls[index]?.[1] as string[] | undefined;
      if (invocationArgs) writeFileSync(invocationArgs.at(-1)!, this.artifactData);
    }
    return super.emit(event, ...args);
  }
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  constructor() {
    super();
    Object.assign(this.stdout, { destroy: vi.fn() });
    Object.assign(this.stderr, { destroy: vi.fn() });
  }
  pid: number | undefined = 123;
  unref = vi.fn();
  // A real killed process still eventually emits "close" (with a null exit
  // code) -- simulate that instead of leaving kill() a no-op, or the
  // renderer's promise (which only resolves via "close"/"error") never
  // settles and the test hangs forever waiting on a truly-stuck fake.
  kill = vi.fn(() => this.emit("close", null));
}

function queueFakeProcess(): FakeChildProcess {
  const child = new FakeChildProcess();
  spawnMock.mockReturnValueOnce(child);
  return child;
}

// renderHeartScene() awaits a real (if tiny) mkdtemp/writeFile before it
// ever calls spawn() -- emitting on the fake child immediately after
// calling renderHeartScene() races that and the events are lost with no
// listener yet attached. Wait for spawn() to actually have been invoked
// first.
async function waitForSpawn(): Promise<void> {
  await vi.waitFor(() => {
    if (spawnMock.mock.calls.length === 0) throw new Error("spawn() not called yet");
  });
}

const scene = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false });
const DEV = { mode: "development" } as const;
let outputRoot: string;
let previousOutputRoot: string | undefined;
beforeEach(async () => {
  spawnMock.mockReset();
  previousOutputRoot = process.env.MEDICAL_MOTION_OUTPUT_ROOT;
  outputRoot = await mkdtemp(path.join(tmpdir(), "organheal-renderer-test-"));
  process.env.MEDICAL_MOTION_OUTPUT_ROOT = outputRoot;
});
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (previousOutputRoot === undefined) delete process.env.MEDICAL_MOTION_OUTPUT_ROOT;
  else process.env.MEDICAL_MOTION_OUTPUT_ROOT = previousOutputRoot;
  await rm(outputRoot, { recursive: true, force: true });
});

function coronaryExplanation() {
  return {
    planVersion: "1", organ: "heart", topic: "oxygen demand", safety: { level: "none" },
    mechanism: { id: "myocardialOxygenDemandSupply", evidence: "possible" },
    anatomy: { primaryFocus: "heart.coronary", structures: ["heart.myocardium", ...scene.highlight.structures] },
    documentedFindings: [], scenes: [{ type: "mechanismExplanation" }, { type: "limitationsAndNextSteps" }],
  };
}

async function startClockedRender(timeoutMs = 10_000) {
  const child = new FakeChildProcess();
  child.kill.mockImplementation(() => true);
  let spawned!: () => void;
  const spawnReady = new Promise<void>((resolve) => { spawned = resolve; });
  spawnMock.mockImplementationOnce(() => { vi.useFakeTimers(); spawned(); return child; });
  const promise = renderHeartScene(scene, "out.mp4", { mode: "development", timeoutMs });
  await spawnReady;
  const args = spawnMock.mock.calls[0][1] as string[];
  return { child, promise, ownedPath: args.at(-1)!, configPath: args[args.indexOf("--") + 1] };
}

describe("renderHeartScene", () => {
  it.each(["../escape.mp4", "C:/out/out.mp4", "out.png", "out.mp4:stream"])("rejects destination escape/wrong extension %s before spawn", async (name) => {
    expect(await renderHeartScene(scene, name, DEV)).toMatchObject({ errorCode: "INVALID_SCENE" });
    expect(spawnMock).not.toHaveBeenCalled();
  });
  it.each(["missing", "empty", "wrong-media", "truncated"])("RENDER_OK cannot hide %s artifact and cleanup removes only this invocation", async (kind) => {
    const child = queueFakeProcess();
    child.produceArtifact = kind !== "missing";
    child.artifactData = kind === "empty" ? Buffer.alloc(0) : kind === "truncated" ? mp4Fixture().subarray(0, 30) : Buffer.from("not mp4");
    const promise = renderHeartScene(scene, "out.mp4", DEV);
    await waitForSpawn();
    const ownedPath = (spawnMock.mock.calls[0][1] as string[]).at(-1)!;
    child.stdout.emit("data", Buffer.from("RENDER_OK\n")); child.emit("close", 0);
    expect(await promise).toMatchObject({ status: "failed", errorCode: "OUTPUT_VALIDATION_FAILED" });
    expect(existsSync(path.dirname(ownedPath))).toBe(false);
  });
  it("isolates simultaneous identical scenes and preserves the successful invocation when another fails", async () => {
    const first = queueFakeProcess(), second = queueFakeProcess();
    const a = renderHeartScene(scene, "same.mp4", DEV), b = renderHeartScene(scene, "same.mp4", DEV);
    await vi.waitFor(() => expect(spawnMock).toHaveBeenCalledTimes(2));
    const paths = spawnMock.mock.calls.map((call) => (call[1] as string[]).at(-1)!);
    expect(paths[0]).not.toBe(paths[1]);
    first.stdout.emit("data", Buffer.from("RENDER_OK\n")); first.emit("close", 0);
    second.stderr.emit("data", Buffer.from("BLENDER_FAILED: test failure")); second.emit("close", 1);
    const results = await Promise.all([a, b]);
    expect(results.filter((result) => result.status === "completed")).toHaveLength(1);
    expect(existsSync(paths[0])).toBe(true);
    expect(existsSync(path.dirname(paths[1]))).toBe(false);
  });
  it("rejects synchronous spawn failure and cleans its ownership", async () => {
    let ownedPath = "";
    spawnMock.mockImplementationOnce((_exe, args: string[]) => { ownedPath = args.at(-1)!; throw new Error("spawn failed"); });
    expect(await renderHeartScene(scene, "out.mp4", DEV)).toMatchObject({ status: "failed", errorCode: "BLENDER_FAILED" });
    expect(existsSync(path.dirname(ownedPath))).toBe(false);
  });
  it("rejects asynchronous spawn failure and cleans a partial artifact", async () => {
    const child = queueFakeProcess();
    const promise = renderHeartScene(scene, "out.mp4", DEV);
    await waitForSpawn();
    const ownedPath = (spawnMock.mock.calls[0][1] as string[]).at(-1)!;
    writeFileSync(ownedPath, "partial");
    child.pid = undefined;
    child.emit("error", new Error("spawn failed"));
    expect(await promise).toMatchObject({ status: "failed", errorCode: "BLENDER_FAILED" });
    expect(existsSync(path.dirname(ownedPath))).toBe(false);
  });
  it.each(["jpeg", "animation", "", undefined, null, 1])("rejects output mode %s before spawning", async (media) => {
    const result = await renderHeartScene({ ...scene, output: { ...scene.output, media: media as typeof scene.output.media } }, "out.mp4", DEV);
    expect(result).toMatchObject({ errorCode: "INVALID_SCENE", message: "Unsupported output.media." });
    expect(spawnMock).not.toHaveBeenCalled();
  });
  it.each([
    ["aspectRatio", "4:3"], ["aspectRatio", undefined], ["aspectRatio", null],
    ["resolution", "4k"], ["resolution", undefined], ["resolution", null],
  ])("rejects invalid %s=%s before spawn", async (key, value) => {
    for (const media of ["still", "video"] as const) {
      const result = await renderHeartScene({ ...scene, output: { ...scene.output, media, [key as string]: value } }, "out.mp4", DEV);
      expect(result).toMatchObject({ status: "failed", errorCode: "INVALID_SCENE", message: expect.stringContaining(`output.${key}`) });
    }
    expect(spawnMock).not.toHaveBeenCalled();
  });
  it.each([
    ["16:9", "720p", 1280, 720], ["9:16", "720p", 720, 1280], ["1:1", "720p", 720, 720],
    ["16:9", "1080p", 1920, 1080], ["9:16", "1080p", 1080, 1920], ["1:1", "1080p", 1080, 1080],
  ] as const)("transports %s %s as exact dimensions", async (aspectRatio, resolution, width, height) => {
    const child = queueFakeProcess();
    const promise = renderHeartScene({ ...scene, output: { ...scene.output, aspectRatio, resolution } }, "out.mp4", DEV);
    await waitForSpawn();
    const args = spawnMock.mock.calls[0][1] as string[];
    const written = JSON.parse(readFileSync(args[args.indexOf("--") + 1], "utf-8"));
    child.stdout.emit("data", Buffer.from("RENDER_OK\n"));
    child.emit("close", 0);
    expect((await promise).status).toBe("completed");
    expect(written.outputDimensions).toEqual({ width, height });
    expect(written.output).toEqual({ ...scene.output, aspectRatio, resolution });
  });
  it("refuses caller-supplied dimensions instead of accepting an override", async () => {
    expect(await renderHeartScene({ ...scene, outputDimensions: { width: 0, height: 0 } } as typeof scene, "out.mp4", DEV))
      .toMatchObject({ errorCode: "INVALID_SCENE" });
    expect(spawnMock).not.toHaveBeenCalled();
  });
  it.each([0, -1, NaN, Infinity, -Infinity, "5", null, undefined])("rejects duration %s before spawning", async (duration) => {
    for (const media of ["still", "video"] as const) {
      const result = await renderHeartScene({ ...scene, durationSeconds: duration as number, output: { ...scene.output, media } }, "out.mp4", DEV);
      expect(result).toMatchObject({ status: "failed", errorCode: "INVALID_SCENE", message: expect.stringContaining("durationSeconds") });
    }
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("rejects unrepresentable video frame counts before spawning", async () => {
    expect(await renderHeartScene({ ...scene, durationSeconds: Number.MAX_VALUE }, "out.mp4", DEV))
      .toMatchObject({ status: "failed", errorCode: "INVALID_SCENE", message: expect.stringContaining("frame limit") });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it.each([5, 6.5, 5.001])("preserves requested %s seconds and transports explicit timing", async (durationSeconds) => {
    const child = queueFakeProcess();
    const promise = renderHeartScene({ ...scene, durationSeconds }, "out.mp4", DEV);
    await waitForSpawn();
    const args = spawnMock.mock.calls[0][1] as string[];
    const written = JSON.parse(readFileSync(args[args.indexOf("--") + 1], "utf-8"));
    child.stdout.emit("data", Buffer.from("RENDER_OK\n"));
    child.emit("close", 0);
    expect((await promise).status).toBe("completed");
    expect(written.durationSeconds).toBe(durationSeconds);
    const policy = validateRenderDuration(durationSeconds, "video");
    expect(written.videoTiming).toEqual(policy.ok ? policy.videoTiming : null);
  });

  it("preserves clinical and anatomy rejection ordering ahead of invalid duration", async () => {
    const invalid = { ...scene, durationSeconds: NaN };
    expect(await renderHeartScene(invalid, "out.mp4", { ...DEV, explanationPlan: coronaryExplanation() }))
      .toMatchObject({ errorCode: "INVALID_SCENE", message: expect.stringContaining("UNSAFE_FOR_VIDEO_FIRST") });
    expect(await renderHeartScene(invalid, "out.mp4", { mode: "production" }))
      .toMatchObject({ errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
    expect(spawnMock).not.toHaveBeenCalled();
  });
  it("rejects plain clinical context without runtime authorization before Blender", async () => {
    const result = await renderHeartScene(scene, "out.mp4", { ...DEV, explanationPlan: coronaryExplanation() });
    expect(result).toMatchObject({ errorCode: "INVALID_SCENE", message: expect.stringContaining("UNSAFE_FOR_VIDEO_FIRST") });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it.each(["triagePassed", "safeToRender", "explanationPlan", "requestId"])("generic review rejects clinical metadata %s", async (key) => {
    const result = await renderHeartScene({ ...scene, [key]: true }, "out.mp4", DEV);
    expect(result).toMatchObject({ errorCode: "INVALID_SCENE" }); expect(spawnMock).not.toHaveBeenCalled();
  });

  it("generic renderer rejects a changed scene despite a valid capability", async () => {
    const prepared = prepareExplanationAuthorization({ clinical: { message: "I feel tired.", language: "en" }, sceneIndex: 0,
      plan: { ...coronaryExplanation(), mechanism: { id: "leftVentricularPressureLoad", evidence: "possible" },
        anatomy: { primaryFocus: "heart.leftVentricle", structures: ["heart.leftVentricle", "heart.aorta"] } } },
      { clinicalContextId: "server-test", assetVersion: HEART_ORGAN_MODULE.assetVersion, mode: "development", outputPath: "out.mp4" });
    if (!("ok" in prepared)) throw new Error(prepared.message);
    const authorized = readExplanationAuthorization(prepared.authorization)!;
    const result = await renderHeartScene({ ...authorized.request.scene, highlight: { structures: ["heart.rightAtrium"], intensity: 0.8 } },
      "out.mp4", { ...DEV, explanationPlan: authorized.request.explanationPlan, clinicalAuthorization: prepared.authorization });
    expect(result).toMatchObject({ errorCode: "INVALID_SCENE" }); expect(spawnMock).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("rejects a non-heart scene before ever touching Blender", async () => {
    const result = await renderHeartScene({ ...scene, organ: "lungs" }, "out.mp4", DEV);

    expect(result).toEqual({
      status: "failed",
      errorCode: "INVALID_ORGAN",
      message: 'renderHeartScene only renders "heart" scenes, got "lungs".',
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("reports completed with the output path once Blender prints RENDER_OK and exits 0", async () => {
    const child = queueFakeProcess();
    const promise = renderHeartScene(scene, "heart.mp4", DEV);

    await waitForSpawn();
    child.stdout.emit("data", Buffer.from("RENDER_OK backend=OPTIX output=C:/out/heart.png\n"));
    child.emit("close", 0);

    const result = await promise;

    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      const args = spawnMock.mock.calls[0][1] as string[];
      expect(result.outputPath).toBe(args.at(-1));
      expect(result.outputPath).not.toBe("heart.mp4");
      expect(existsSync(result.outputPath)).toBe(true);
      expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
    }
  });

  it("classifies a real BLENDER_FAILED error from the script's own SystemExit message", async () => {
    const child = queueFakeProcess();
    const promise = renderHeartScene(scene, "out.mp4", DEV);

    await waitForSpawn();
    child.stderr.emit("data", Buffer.from("SystemExit: BLENDER_FAILED: render.render() raised: out of memory\n"));
    child.emit("close", 1);

    const result = await promise;

    expect(result).toEqual({
      status: "failed",
      errorCode: "BLENDER_FAILED",
      message: "SystemExit: BLENDER_FAILED: render.render() raised: out of memory",
    });
  });

  it("classifies ASSET_NOT_FOUND when the heart builder itself throws", async () => {
    const child = queueFakeProcess();
    const promise = renderHeartScene(scene, "out.mp4", DEV);

    await waitForSpawn();
    child.stderr.emit("data", Buffer.from("SystemExit: ASSET_NOT_FOUND: heart_builder.build_heart() failed: boom\n"));
    child.emit("close", 1);

    const result = await promise;

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.errorCode).toBe("ASSET_NOT_FOUND");
    }
  });

  it("reports OUTPUT_VALIDATION_FAILED when Blender exits 0 but never prints RENDER_OK", async () => {
    const child = queueFakeProcess();
    const promise = renderHeartScene(scene, "out.mp4", DEV);

    await waitForSpawn();
    child.stdout.emit("data", Buffer.from("Blender quit\n"));
    child.emit("close", 0);

    const result = await promise;

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.errorCode).toBe("OUTPUT_VALIDATION_FAILED");
    }
  });

  it("reports RENDER_TIMEOUT and kills the process when it runs past the timeout", async () => {
    const child = queueFakeProcess();

    // Enable the fake clock at spawn, after the asynchronous filesystem work.
    spawnMock.mockReset();
    let spawned!: () => void;
    const spawnReady = new Promise<void>((resolve) => { spawned = resolve; });
    spawnMock.mockImplementationOnce(() => { vi.useFakeTimers(); spawned(); return child; });
    const promise = renderHeartScene(scene, "out.mp4", { mode: "development", timeoutMs: 30 });
    await spawnReady;
    await vi.advanceTimersByTimeAsync(30);
    const result = await promise;

    expect(result).toEqual({
      status: "failed",
      errorCode: "RENDER_TIMEOUT",
      message: "Render exceeded 30ms; Blender termination was confirmed.",
    });
    expect(child.kill).toHaveBeenCalledOnce();
    const ownedPath = (spawnMock.mock.calls[0][1] as string[]).at(-1)!;
    expect(existsSync(path.dirname(ownedPath))).toBe(false);
  });

  it.each([0, 1])("timeout cannot validate late close %s and cleans only after termination", async (code) => {
    const validate = vi.spyOn(artifactOutput, "validateArtifact");
    const { child, promise, ownedPath, configPath } = await startClockedRender();
    let returned = false; void promise.then(() => { returned = true; });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(returned).toBe(false);
    expect(existsSync(path.dirname(ownedPath))).toBe(true);
    expect(existsSync(configPath)).toBe(true);
    // A still-running writer may produce data here; do not clean beneath it.
    writeFileSync(ownedPath, "still writing");
    child.stdout.emit("data", Buffer.from("RENDER_OK")); child.emit("close", code);
    expect(await promise).toMatchObject({ errorCode: "RENDER_TIMEOUT" });
    expect(validate).not.toHaveBeenCalled();
    expect(existsSync(path.dirname(ownedPath))).toBe(false);
    expect(existsSync(configPath)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("process error waits for close, cannot validate success and cleans after termination", async () => {
    const validate = vi.spyOn(artifactOutput, "validateArtifact");
    const { child, promise, ownedPath, configPath } = await startClockedRender();
    let returned = false; void promise.then(() => { returned = true; });
    child.emit("error", new Error("EIO")); await Promise.resolve();
    expect(returned).toBe(false); expect(existsSync(configPath)).toBe(true);
    expect(existsSync(path.dirname(ownedPath))).toBe(true);
    child.stdout.emit("data", Buffer.from("RENDER_OK")); child.emit("close", 0);
    expect(await promise).toMatchObject({ errorCode: "BLENDER_FAILED" });
    expect(validate).not.toHaveBeenCalled(); expect(existsSync(configPath)).toBe(false);
    expect(existsSync(path.dirname(ownedPath))).toBe(false);
  });

  it.each(["timeout", "process-error"])("unconfirmed %s returns a bounded explicit failure and retains invocation files", async (reason) => {
    const validate = vi.spyOn(artifactOutput, "validateArtifact");
    const { child, promise, ownedPath, configPath } = await startClockedRender();
    child.kill.mockImplementation(() => false);
    if (reason === "process-error") child.emit("error", new Error("EIO"));
    await vi.advanceTimersByTimeAsync((reason === "timeout" ? 10_000 : 0) + PROCESS_GRACE_MS + PROCESS_CONFIRMATION_MS);
    expect(await promise).toMatchObject({ errorCode: reason === "timeout" ? "RENDER_TIMEOUT" : "BLENDER_FAILED",
      message: expect.stringContaining("operator intervention") });
    expect(child.kill.mock.calls).toEqual([["SIGTERM"], ["SIGKILL"]]);
    expect(validate).not.toHaveBeenCalled(); expect(existsSync(configPath)).toBe(true);
    expect(existsSync(path.dirname(ownedPath))).toBe(true);
    child.produceArtifact = false; child.emit("close", 0);
    expect(existsSync(configPath)).toBe(true); // Late callbacks cannot delete it.
    const configDirectory = path.dirname(configPath);
    expect(path.dirname(configDirectory)).toBe(tmpdir());
    expect(path.basename(configDirectory).startsWith("medical-motion-")).toBe(true);
    await rm(configDirectory, { recursive: true, force: true }); // This test's owned config only.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports bounded trailing failure diagnostics with truncation", async () => {
    const { child, promise } = await startClockedRender();
    child.stderr.emit("data", Buffer.alloc(1024 * 1024, "x"));
    child.stderr.emit("data", Buffer.from("BLENDER_FAILED: trailing diagnostic")); child.emit("close", 1);
    expect(await promise).toMatchObject({ errorCode: "BLENDER_FAILED", message: expect.stringContaining("[earlier process output truncated]") });
    expect(await promise).toMatchObject({ message: expect.stringContaining("trailing diagnostic") });
  });

  it.each([0, -1, NaN, Infinity, 0.5, 2_147_483_648])("rejects invalid process timeout %s before spawn", async (timeoutMs) => {
    expect(await renderHeartScene(scene, "out.mp4", { ...DEV, timeoutMs })).toMatchObject({ errorCode: "INVALID_SCENE" });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("never invokes Blender directly for anything other than the heart organ", async () => {
    await renderHeartScene({ ...scene, organ: "kidneys" }, "out.mp4", DEV);
    await renderHeartScene({ ...scene, organ: "liver" }, "out.mp4", DEV);

    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("refuses the placeholder heart in production before Blender starts", async () => {
    const result = await renderHeartScene(scene, "out.mp4", { mode: "production" });

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.errorCode).toBe("REAL_ANATOMICAL_ASSET_REQUIRED");
    }
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("refuses missing non-highlighted scene dependencies before Blender starts", async () => {
    const result = await renderHeartScene({ ...scene, anatomyRequirements: {
      ...scene.anatomyRequirements, "heart.myocardium": { representations: ["tissue"], requireVerified: true },
    } }, "out.mp4", DEV);
    expect(result).toEqual({ status: "failed", errorCode: "ANATOMY_STRUCTURE_NOT_FOUND", message: "heart.myocardium" });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("propagates all explanation dependencies while leaving coronary highlights unchanged", async () => {
    const result = await renderClinical(coronaryExplanation());
    expect(result).toEqual({ status: "failed", errorCode: "ANATOMY_STRUCTURE_NOT_FOUND", message: "heart.myocardium" });
    expect(scene.highlight.structures).not.toContain("heart.myocardium");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("rejects unsafe explanation plans before missing-anatomy errors", async () => {
    const result = await renderHeartScene(scene, "out.mp4", { ...DEV, explanationPlan: {
      ...coronaryExplanation(), safety: { level: "emergency" },
    } });
    expect(result).toMatchObject({ status: "failed", errorCode: "INVALID_SCENE", message: expect.stringContaining("UNSAFE_FOR_VIDEO_FIRST") });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("refuses an unsuitable non-highlighted chamber representation", async () => {
    const result = await renderHeartScene({ ...scene, anatomyRequirements: {
      ...scene.anatomyRequirements, "heart.rightAtrium": { representations: ["tissue"] },
    } }, "out.mp4", DEV);
    expect(result).toMatchObject({ status: "failed", errorCode: "REAL_ANATOMICAL_ASSET_REQUIRED" });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("renders a valid LV educational plan without highlighting its required aorta", async () => {
    const child = queueFakeProcess();
    const promise = renderClinical({
        ...coronaryExplanation(), mechanism: { id: "leftVentricularPressureLoad", evidence: "possible" },
        anatomy: { primaryFocus: "heart.leftVentricle", structures: ["heart.leftVentricle", "heart.aorta"] },
    });
    await waitForSpawn();
    const args = spawnMock.mock.calls[0][1] as string[];
    const written = JSON.parse(readFileSync(args[args.indexOf("--") + 1], "utf-8"));
    child.stdout.emit("data", Buffer.from("RENDER_OK\n"));
    child.emit("close", 0);
    expect((await promise).status).toBe("completed");
    expect(written.highlight.structures).toEqual(["HEART_LEFT_VENTRICLE"]);
  });

  it("refuses a scene highlighting anatomy outside its explanation plan", async () => {
    const result = await renderHeartScene(scene, "out.mp4", { ...DEV, explanationPlan: {
      ...coronaryExplanation(), mechanism: { id: "leftVentricularPressureLoad", evidence: "possible" },
      anatomy: { primaryFocus: "heart.leftVentricle", structures: ["heart.leftVentricle", "heart.aorta"] },
    } });
    expect(result).toMatchObject({ status: "failed", errorCode: "INVALID_SCENE" });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("refuses a structure the heart's registry does not have, with no fallback", async () => {
    const withValve = {
      ...scene,
      highlight: { ...scene.highlight, structures: [...scene.highlight.structures, "heart.valve.aortic" as const] },
    };
    const result = await renderHeartScene(withValve, "out.mp4", DEV);

    expect(result).toEqual({ status: "failed", errorCode: "ANATOMY_STRUCTURE_NOT_FOUND", message: "heart.valve.aortic" });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("hands Blender the registry's object names, never anatomy ids", async () => {
    let written: unknown;
    spawnMock.mockImplementationOnce((_exe: string, args: string[]) => {
      written = JSON.parse(readFileSync(args[args.indexOf("--") + 1], "utf-8"));
      const child = new FakeChildProcess();
      queueMicrotask(() => {
        child.stdout.emit("data", Buffer.from("RENDER_OK\n"));
        child.emit("close", 0);
      });
      return child;
    });

    await renderHeartScene(scene, "out.mp4", DEV);

    expect(written).toMatchObject({
      highlight: { structures: ["CORONARY_LAD", "CORONARY_RCA", "CORONARY_LCX"] },
      camera: {
        preset: "CAM_CORONARY_APPROACH",
        from: "CAM_HEART_OVERVIEW",
        shot: { lookAt: ["LM_heart.lvCenter", "LM_heart.rvCenter"], scaleReference: ["LM_heart.base", "LM_heart.apex"] },
        fromShot: { lookAt: ["LM_heart.raCenter", "LM_heart.rvCenter", "LM_heart.laCenter", "LM_heart.lvCenter"] },
      },
    });
  });

  it("classifies the script's own ANATOMY_STRUCTURE_NOT_FOUND when the built heart lacks an object", async () => {
    const child = queueFakeProcess();
    const promise = renderHeartScene(scene, "out.mp4", DEV);

    await waitForSpawn();
    child.stderr.emit("data", Buffer.from("SystemExit: ANATOMY_STRUCTURE_NOT_FOUND: the built heart has no object named ['X']\n"));
    child.emit("close", 1);

    const result = await promise;

    expect(result.status === "failed" && result.errorCode).toBe("ANATOMY_STRUCTURE_NOT_FOUND");
  });
});

describe("toBlenderSceneConfig", () => {
  it("leaves still configs without video timing", () => {
    const shot = resolveCameraShot(HEART_ORGAN_MODULE, scene.camera.preset)!;
    expect(toBlenderSceneConfig({ ...scene, output: { ...scene.output, media: "still" } }, [], shot))
      .not.toHaveProperty("videoTiming");
  });
  it("resolves highlights and shot and adds explicit video timing", () => {
    const shot = resolveCameraShot(HEART_ORGAN_MODULE, scene.camera.preset);
    if (!shot) throw new Error("expected a shot");
    const config = toBlenderSceneConfig(scene, ["CORONARY_LAD"], shot);

    expect(config).toEqual({
      ...scene,
      outputDimensions: { width: 1920, height: 1080 },
      videoTiming: { fps: 24, fpsBase: 1, frameStep: 1, frameStart: 1, frameEnd: 120, frameCount: 120 },
      camera: { ...scene.camera, shot },
      highlight: { ...scene.highlight, structures: ["CORONARY_LAD"] },
    });
  });
});

describe("resolveCameraShot", () => {
  it("resolves every heart shot to landmark empties the build creates", () => {
    const landmarkObjects = HEART_ORGAN_MODULE.landmarks.map((landmark) => landmark.blenderObject);

    for (const target of HEART_ORGAN_MODULE.cameraTargets) {
      const shot = resolveCameraShot(HEART_ORGAN_MODULE, target.id);

      expect(shot, target.id).not.toBeNull();
      for (const name of [...(shot?.lookAt ?? []), ...(shot?.scaleReference ?? [])]) {
        expect(landmarkObjects).toContain(name);
      }
    }
  });

  it("refuses an unknown shot, or one naming a landmark the module lacks", () => {
    expect(resolveCameraShot(HEART_ORGAN_MODULE, "CAM_NOPE")).toBeNull();

    const broken = {
      ...HEART_ORGAN_MODULE,
      cameraTargets: [{ id: "CAM_X", frames: [], lookAt: ["heart.nowhere" as const], viewDirection: [0, -1, 0] as const, distance: 2 }],
    };
    expect(resolveCameraShot(broken, "CAM_X")).toBeNull();
  });

  it("stops an unknown starting shot or motion controller before Blender starts", async () => {
    const fromNowhere = await renderHeartScene({ ...scene, camera: { preset: "CAM_CORONARY_APPROACH", from: "CAM_NOPE" } }, "out.mp4", DEV);
    const noMotion = await renderHeartScene({ ...scene, motion: { preset: "cardiac-dance" } }, "out.mp4", DEV);

    expect(fromNowhere.status === "failed" && fromNowhere.errorCode).toBe("INVALID_SCENE");
    expect(noMotion.status === "failed" && noMotion.errorCode).toBe("INVALID_SCENE");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("stops an unknown shot before Blender starts", async () => {
    const result = await renderHeartScene({ ...scene, camera: { preset: "CAM_NOPE" } }, "out.mp4", DEV);

    expect(result.status === "failed" && result.errorCode).toBe("INVALID_SCENE");
    expect(spawnMock).not.toHaveBeenCalled();
  });
});

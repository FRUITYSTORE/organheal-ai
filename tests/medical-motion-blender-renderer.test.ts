import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: spawnMock }));

import { renderHeartScene } from "../lib/medical-motion/render/blender-renderer";
import { buildHeartScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";

// A fake child process good enough to drive the renderer's event handling
// (stdout/stderr/close) without ever spawning a real Blender binary — a
// real render takes real minutes and needs a real GPU/install, neither of
// which any CI box or contributor's machine is guaranteed to have.
class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
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

describe("renderHeartScene", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("rejects a non-heart scene before ever touching Blender", async () => {
    const result = await renderHeartScene({ ...scene, organ: "lungs" }, "out.png");

    expect(result).toEqual({
      status: "failed",
      errorCode: "INVALID_ORGAN",
      message: 'renderHeartScene only renders "heart" scenes, got "lungs".',
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("reports completed with the output path once Blender prints RENDER_OK and exits 0", async () => {
    const child = queueFakeProcess();
    const promise = renderHeartScene(scene, "C:/out/heart.png");

    await waitForSpawn();
    child.stdout.emit("data", Buffer.from("RENDER_OK backend=OPTIX output=C:/out/heart.png\n"));
    child.emit("close", 0);

    const result = await promise;

    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.outputPath).toBe("C:/out/heart.png");
      expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
    }
  });

  it("classifies a real BLENDER_FAILED error from the script's own SystemExit message", async () => {
    const child = queueFakeProcess();
    const promise = renderHeartScene(scene, "out.png");

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
    const promise = renderHeartScene(scene, "out.png");

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
    const promise = renderHeartScene(scene, "out.png");

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

    // A real (short) timeout rather than faked timers: the timer that
    // matters here races against a real mkdtemp/writeFile, and never
    // emitting "close" on the fake child is exactly what "the process
    // hung" looks like -- letting the real 30ms elapse is simpler and no
    // less reliable than juggling fake-timer/real-fs interaction.
    const result = await renderHeartScene(scene, "out.png", 30);

    expect(result).toEqual({
      status: "failed",
      errorCode: "RENDER_TIMEOUT",
      message: "Render exceeded 30ms and was killed.",
    });
    expect(child.kill).toHaveBeenCalledOnce();
  });

  it("never invokes Blender directly for anything other than the heart organ", async () => {
    await renderHeartScene({ ...scene, organ: "kidneys" }, "out.png");
    await renderHeartScene({ ...scene, organ: "liver" }, "out.png");

    expect(spawnMock).not.toHaveBeenCalled();
  });
});

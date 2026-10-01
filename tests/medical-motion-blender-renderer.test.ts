import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

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
const DEV = { mode: "development" } as const;

function coronaryExplanation() {
  return {
    planVersion: "1", organ: "heart", topic: "oxygen demand", safety: { level: "none" },
    mechanism: { id: "myocardialOxygenDemandSupply", evidence: "possible" },
    anatomy: { primaryFocus: "heart.coronary", structures: ["heart.myocardium", ...scene.highlight.structures] },
    documentedFindings: [], scenes: [{ type: "mechanismExplanation" }, { type: "limitationsAndNextSteps" }],
  };
}

describe("renderHeartScene", () => {
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
    const result = await renderHeartScene({ ...scene, organ: "lungs" }, "out.png", DEV);

    expect(result).toEqual({
      status: "failed",
      errorCode: "INVALID_ORGAN",
      message: 'renderHeartScene only renders "heart" scenes, got "lungs".',
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("reports completed with the output path once Blender prints RENDER_OK and exits 0", async () => {
    const child = queueFakeProcess();
    const promise = renderHeartScene(scene, "C:/out/heart.png", DEV);

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
    const promise = renderHeartScene(scene, "out.png", DEV);

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
    const promise = renderHeartScene(scene, "out.png", DEV);

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
    const promise = renderHeartScene(scene, "out.png", DEV);

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
    const result = await renderHeartScene(scene, "out.png", { mode: "development", timeoutMs: 30 });

    expect(result).toEqual({
      status: "failed",
      errorCode: "RENDER_TIMEOUT",
      message: "Render exceeded 30ms and was killed.",
    });
    expect(child.kill).toHaveBeenCalledOnce();
  });

  it("never invokes Blender directly for anything other than the heart organ", async () => {
    await renderHeartScene({ ...scene, organ: "kidneys" }, "out.png", DEV);
    await renderHeartScene({ ...scene, organ: "liver" }, "out.png", DEV);

    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("refuses the placeholder heart in production before Blender starts", async () => {
    const result = await renderHeartScene(scene, "out.png", { mode: "production" });

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
    const result = await renderHeartScene(withValve, "out.png", DEV);

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

    await renderHeartScene(scene, "out.png", DEV);

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
    const promise = renderHeartScene(scene, "out.png", DEV);

    await waitForSpawn();
    child.stderr.emit("data", Buffer.from("SystemExit: ANATOMY_STRUCTURE_NOT_FOUND: the built heart has no object named ['X']\n"));
    child.emit("close", 1);

    const result = await promise;

    expect(result.status === "failed" && result.errorCode).toBe("ANATOMY_STRUCTURE_NOT_FOUND");
  });
});

describe("toBlenderSceneConfig", () => {
  it("swaps only the highlight structures and adds the resolved shot", () => {
    const shot = resolveCameraShot(HEART_ORGAN_MODULE, scene.camera.preset);
    if (!shot) throw new Error("expected a shot");
    const config = toBlenderSceneConfig(scene, ["CORONARY_LAD"], shot);

    expect(config).toEqual({
      ...scene,
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
    const result = await renderHeartScene({ ...scene, camera: { preset: "CAM_NOPE" } }, "out.png", DEV);

    expect(result.status === "failed" && result.errorCode).toBe("INVALID_SCENE");
    expect(spawnMock).not.toHaveBeenCalled();
  });
});

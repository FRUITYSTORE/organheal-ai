import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lstat, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createArtifactOwnership, discardArtifact, validArtifactName, validateArtifact, type ArtifactOwnership } from "../lib/medical-motion/render/artifact-output";
import { mp4Fixture } from "./fixtures/medical-motion-artifact";

describe("artifact ownership and validation", () => {
  let root: string;
  let previous: string | undefined;
  const dimensions = { width: 720, height: 720 };
  beforeEach(async () => {
    previous = process.env.MEDICAL_MOTION_OUTPUT_ROOT;
    root = await mkdtemp(path.join(tmpdir(), "organheal-ownership-test-"));
    process.env.MEDICAL_MOTION_OUTPUT_ROOT = root;
  });
  afterEach(async () => {
    if (previous === undefined) delete process.env.MEDICAL_MOTION_OUTPUT_ROOT;
    else process.env.MEDICAL_MOTION_OUTPUT_ROOT = previous;
    await rm(root, { recursive: true, force: true });
  });
  it("allocates identical concurrent requests and image/video in distinct writable locations", async () => {
    const [a, b, image] = await Promise.all([
      createArtifactOwnership("same.mp4", "video"), createArtifactOwnership("same.mp4", "video"), createArtifactOwnership("same.png", "still"),
    ]);
    expect(new Set([a.directory, b.directory, image.directory]).size).toBe(3);
    for (const owner of [a, b, image]) {
      expect(path.dirname(owner.directory)).toBe(owner.root);
      await expect(lstat(owner.outputPath)).rejects.toThrow();
    }
  });
  it.each(["../out.mp4", "..\\out.mp4", "/out.mp4", "C:\\out.mp4", "C:out.mp4", "\\\\server\\out.mp4", "out.mp4:stream", "CON.mp4", "out.png", "", "a..b.mp4"])(
    "rejects unsafe or wrong-mode filename %s", async (name) => {
      expect(validArtifactName(name, "video")).toBe(false);
      await expect(createArtifactOwnership(name, "video")).rejects.toThrow();
    });
  it("does not accept stale output from another invocation", async () => {
    const old = await createArtifactOwnership("same.mp4", "video");
    await writeFile(old.outputPath, mp4Fixture());
    const fresh = await createArtifactOwnership("same.mp4", "video");
    expect((await validateArtifact(fresh, dimensions)).ok).toBe(false);
    await discardArtifact(fresh);
    expect((await readFile(old.outputPath)).equals(mp4Fixture())).toBe(true);
  });
  it("requires a nonempty regular file", async () => {
    const owner = await createArtifactOwnership("out.mp4", "video");
    expect((await validateArtifact(owner, dimensions)).ok).toBe(false);
    await writeFile(owner.outputPath, "");
    expect((await validateArtifact(owner, dimensions)).ok).toBe(false);
  });
  it.each([Buffer.from("not mp4"), mp4Fixture().subarray(0, 30), Buffer.from("\0\0\0\x08ftyp", "binary")])("rejects unrecognized/truncated MP4", async (data) => {
    const owner = await createArtifactOwnership("out.mp4", "video");
    await writeFile(owner.outputPath, data);
    expect((await validateArtifact(owner, dimensions)).ok).toBe(false);
  });
  it("accepts structurally recognized video-only MP4 without claiming codec or dimensions", async () => {
    const owner = await createArtifactOwnership("out.mp4", "video");
    const data = mp4Fixture(); await writeFile(owner.outputPath, data);
    expect(await validateArtifact(owner, dimensions)).toEqual({ ok: true, byteSize: data.length });
  });
  it("validates full PNG decoding and requested dimensions", async () => {
    const owner = await createArtifactOwnership("out.png", "still");
    const png = await sharp({ create: { ...dimensions, channels: 4, background: "red" } }).png().toBuffer();
    await writeFile(owner.outputPath, png);
    expect((await validateArtifact(owner, dimensions)).ok).toBe(true);
    expect((await validateArtifact(owner, { width: 1280, height: 720 })).ok).toBe(false);
    await writeFile(owner.outputPath, png.subarray(0, 33));
    expect((await validateArtifact(owner, dimensions)).ok).toBe(false);
    await writeFile(owner.outputPath, png.subarray(0, png.length - 12));
    expect((await validateArtifact(owner, dimensions)).ok).toBe(false);
    await writeFile(owner.outputPath, "wrong media");
    expect((await validateArtifact(owner, dimensions)).ok).toBe(false);
  });
  it("rejects a junction replacing the invocation directory without deleting its target", async () => {
    const owner = await createArtifactOwnership("out.mp4", "video");
    const other = await createArtifactOwnership("out.mp4", "video");
    await writeFile(other.outputPath, mp4Fixture());
    await rm(owner.directory, { recursive: true });
    await symlink(other.directory, owner.directory, "junction");
    expect((await validateArtifact(owner, dimensions)).ok).toBe(false);
    await discardArtifact(owner);
    expect((await readFile(other.outputPath)).length).toBeGreaterThan(0);
  });
  it("rejects forged locations outside the owned directory", async () => {
    const owner = await createArtifactOwnership("out.mp4", "video");
    const forged: ArtifactOwnership = { ...owner, outputPath: path.join(root, "outside.mp4") };
    await writeFile(forged.outputPath, mp4Fixture());
    expect((await validateArtifact(forged, dimensions)).ok).toBe(false);
    await discardArtifact(forged);
    expect((await readFile(forged.outputPath)).length).toBeGreaterThan(0);
  });
});

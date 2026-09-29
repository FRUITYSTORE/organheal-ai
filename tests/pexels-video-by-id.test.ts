import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getStockFootageById } from "../lib/video-studio/pexels-video.client";

const ORIGINAL_ENV = process.env;

describe("getStockFootageById", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV, PEXELS_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.unstubAllGlobals();
  });

  it("returns null when no API key is configured", async () => {
    delete process.env.PEXELS_API_KEY;

    const result = await getStockFootageById(8115432);

    expect(result).toBeNull();
  });

  it("fetches the video by id and picks the best landscape file", async () => {
    const fetchMock = vi.fn(async (_url: string, _options?: RequestInit) =>
      new Response(
        JSON.stringify({
          duration: 42,
          video_files: [
            { link: "https://videos.pexels.com/portrait.mp4", width: 360, height: 640 },
            { link: "https://videos.pexels.com/landscape-hd.mp4", width: 1280, height: 720 },
          ],
        }),
        { status: 200 }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await getStockFootageById(8115432);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.pexels.com/videos/videos/8115432");

    if (!options) {
      throw new Error("Expected fetch options.");
    }

    expect(options.headers).toEqual({ Authorization: "test-key" });

    expect(result).toEqual({
      url: "https://videos.pexels.com/landscape-hd.mp4",
      durationSeconds: 42,
    });
  });

  it("returns null when the API response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 }))
    );

    const result = await getStockFootageById(999999999);

    expect(result).toBeNull();
  });

  it("returns null when the video has no usable file link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ duration: 10, video_files: [] }), {
            status: 200,
          })
      )
    );

    const result = await getStockFootageById(8115432);

    expect(result).toBeNull();
  });

  it("falls back to a default duration when the API omits it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              video_files: [{ link: "https://videos.pexels.com/clip.mp4", width: 1280, height: 720 }],
            }),
            { status: 200 }
          )
      )
    );

    const result = await getStockFootageById(8115432);

    expect(result?.durationSeconds).toBe(8);
  });
});

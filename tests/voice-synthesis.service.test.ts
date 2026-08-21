import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  synthesizeVoice,
} from "@/lib/voice/voice-synthesis.service";

const ORIGINAL_ENV =
  process.env;

describe(
  "voice-synthesis.service",
  () => {
    beforeEach(() => {
      vi.restoreAllMocks();

      process.env = {
        ...ORIGINAL_ENV,

        OPENAI_API_KEY:
          "test-api-key",
      };
    });

    afterEach(() => {
      process.env =
        ORIGINAL_ENV;

      vi.unstubAllGlobals();
    });

    it(
      "rejects empty text",
      async () => {
        await expect(
          synthesizeVoice({
            text: "   ",

            language: "en",
          })
        ).rejects.toThrow(
          "Text is required for voice synthesis."
        );
      }
    );

    it(
      "rejects text longer than the supported limit",
      async () => {
        await expect(
          synthesizeVoice({
            text:
              "a".repeat(
                4001
              ),

            language: "en",
          })
        ).rejects.toThrow(
          "Voice synthesis text must not exceed 4000 characters."
        );
      }
    );

    it(
      "requires an OpenAI API key",
      async () => {
        delete process.env
          .OPENAI_API_KEY;

        await expect(
          synthesizeVoice({
            text:
              "Hello",

            language:
              "en",
          })
        ).rejects.toThrow(
          "OPENAI_API_KEY is not configured."
        );
      }
    );

    it(
      "sends the expected request and returns synthesized audio",
      async () => {
        const audioBytes =
          new Uint8Array([
            1,
            2,
            3,
            4,
          ]);

        const fetchMock =
  vi.fn(
    async (
      _url: string,
      _options?: RequestInit
    ) =>
      new Response(
                audioBytes,
                {
                  status:
                    200,

                  headers: {
                    "Content-Type":
                      "audio/mpeg",
                  },
                }
              )
          );

        vi.stubGlobal(
          "fetch",
          fetchMock
        );

        const result =
          await synthesizeVoice({
            text:
              " Your health summary is ready. ",

            language:
              "en",
          });

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(
          1
        );

        const [
          url,
          options,
        ] =
          fetchMock.mock
            .calls[0];

        if (!options) {
  throw new Error(
    "Expected fetch options."
  );
}
        expect(url).toBe(
          "https://api.openai.com/v1/audio/speech"
        );

        expect(
          options.method
        ).toBe("POST");

        expect(
          options.headers
        ).toEqual({
          Authorization:
            "Bearer test-api-key",

          "Content-Type":
            "application/json",
        });

        const requestBody =
          JSON.parse(
            String(
              options.body
            )
          );

        expect(
          requestBody
        ).toMatchObject({
          model:
            "gpt-4o-mini-tts",

          voice:
            "alloy",

          input:
            "Your health summary is ready.",

          response_format:
            "mp3",
        });

        expect(
          requestBody
            .instructions
        ).toContain(
          "clear natural English"
        );

        expect(
          result
        ).toEqual({
          audio:
            expect.any(
              ArrayBuffer
            ),

          model:
            "gpt-4o-mini-tts",

          voice:
            "alloy",

          contentType:
            "audio/mpeg",
        });

        expect(
          result.audio
            .byteLength
        ).toBe(4);
      }
    );

    it(
      "uses configured model and voice overrides",
      async () => {
        process.env
          .OPENAI_TTS_MODEL =
          "custom-model";

        process.env
          .OPENAI_TTS_VOICE =
          "custom-voice";

        const fetchMock =
  vi.fn(
    async (
      _url: string,
      _options?: RequestInit
    ) =>
      new Response(
                new Uint8Array([
                  1,
                ]),
                {
                  status:
                    200,
                }
              )
          );

        vi.stubGlobal(
          "fetch",
          fetchMock
        );

        const result =
          await synthesizeVoice({
            text:
              "مرحبا",

            language:
              "ar",
          });

       const fetchCall =
  fetchMock.mock.calls[0];

if (!fetchCall) {
  throw new Error(
    "Expected fetch to be called."
  );
}

const options =
  fetchCall[1];

if (!options) {
  throw new Error(
    "Expected fetch options."
  );
}

const requestBody =
  JSON.parse(
    String(
      options.body
    )
  );

        expect(
          requestBody.model
        ).toBe(
          "custom-model"
        );

        expect(
          requestBody.voice
        ).toBe(
          "custom-voice"
        );

        expect(
          requestBody
            .instructions
        ).toContain(
          "Modern Standard Arabic"
        );

        expect(
          result.model
        ).toBe(
          "custom-model"
        );

        expect(
          result.voice
        ).toBe(
          "custom-voice"
        );
      }
    );

    it(
      "rejects provider failures",
      async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(
            async () =>
              new Response(
                "",
                {
                  status:
                    500,
                }
              )
          )
        );

        await expect(
          synthesizeVoice({
            text:
              "Hello",

            language:
              "en",
          })
        ).rejects.toThrow(
          "Voice synthesis provider returned status 500."
        );
      }
    );

    it(
      "rejects an empty audio response",
      async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(
            async () =>
              new Response(
                new Uint8Array(
                  []
                ),
                {
                  status:
                    200,
                }
              )
          )
        );

        await expect(
          synthesizeVoice({
            text:
              "Hello",

            language:
              "en",
          })
        ).rejects.toThrow(
          "Voice synthesis provider returned empty audio."
        );
      }
    );
  }
);
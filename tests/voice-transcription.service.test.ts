import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  transcribeVoice,
} from "@/lib/voice/voice-transcription.service";

describe(
  "voice transcription service",
  () => {
    const originalApiKey =
      process.env
        .OPENAI_API_KEY;

    const originalModel =
      process.env
        .OPENAI_TRANSCRIPTION_MODEL;

    beforeEach(
      () => {
        vi.restoreAllMocks();

        process.env
          .OPENAI_API_KEY =
          "test-openai-key";

        delete process.env
          .OPENAI_TRANSCRIPTION_MODEL;
      }
    );

    afterEach(
      () => {
        if (
          originalApiKey ===
          undefined
        ) {
          delete process.env
            .OPENAI_API_KEY;
        } else {
          process.env
            .OPENAI_API_KEY =
            originalApiKey;
        }

        if (
          originalModel ===
          undefined
        ) {
          delete process.env
            .OPENAI_TRANSCRIPTION_MODEL;
        } else {
          process.env
            .OPENAI_TRANSCRIPTION_MODEL =
            originalModel;
        }

        vi.unstubAllGlobals();
      }
    );

    it(
      "transcribes an audio file",
      async () => {
        const fetchMock =
          vi.fn()
            .mockResolvedValue(
              new Response(
                JSON.stringify({
                  text:
                    "I have a health question.",
                }),
                {
                  status:
                    200,

                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                }
              )
            );

        vi.stubGlobal(
          "fetch",
          fetchMock
        );

        const audio =
          new File(
            [
              new Uint8Array([
                1,
                2,
                3,
              ]),
            ],
            "voice.webm",
            {
              type:
                "audio/webm",
            }
          );

        const result =
          await transcribeVoice({
            audio,

            language:
              "en",
          });

        expect(
          result
        ).toEqual({
          transcript:
            "I have a health question.",

          model:
            "gpt-4o-transcribe",
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

        expect(
          url
        ).toBe(
          "https://api.openai.com/v1/audio/transcriptions"
        );

        expect(
          options
        ).toEqual(
          expect.objectContaining({
            method:
              "POST",

            headers:
              expect.objectContaining({
                Authorization:
                  "Bearer test-openai-key",
              }),
          })
        );

        const body =
          (
            options as
              RequestInit
          ).body;

        expect(
          body
        ).toBeInstanceOf(
          FormData
        );

        const formData =
          body as
            FormData;

        expect(
          formData.get(
            "model"
          )
        ).toBe(
          "gpt-4o-transcribe"
        );

       expect(
  formData.get(
    "language"
  )
).toBeNull();
      }
    );

    it(
      "uses the configured transcription model",
      async () => {
        process.env
          .OPENAI_TRANSCRIPTION_MODEL =
          "gpt-4o-mini-transcribe";

        vi.stubGlobal(
          "fetch",
          vi.fn()
            .mockResolvedValue(
              new Response(
                JSON.stringify({
                  text:
                    "مرحبا",
                }),
                {
                  status:
                    200,

                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                }
              )
            )
        );

        const result =
          await transcribeVoice({
            audio:
              new File(
                [
                  new Uint8Array([
                    1,
                  ]),
                ],
                "voice.webm",
                {
                  type:
                    "audio/webm",
                }
              ),

            language:
              "ar",
          });

        expect(
          result.model
        ).toBe(
          "gpt-4o-mini-transcribe"
        );

        expect(
          result.transcript
        ).toBe(
          "مرحبا"
        );
      }
    );

    it(
      "rejects an empty provider transcript",
      async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn()
            .mockResolvedValue(
              new Response(
                JSON.stringify({
                  text:
                    "",
                }),
                {
                  status:
                    200,

                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                }
              )
            )
        );

        await expect(
          transcribeVoice({
            audio:
              new File(
                [
                  new Uint8Array([
                    1,
                  ]),
                ],
                "voice.webm",
                {
                  type:
                    "audio/webm",
                }
              ),

            language:
              "en",
          })
        ).rejects.toThrow(
          "Voice transcription provider returned an empty transcript."
        );
      }
    );

    it(
      "does not expose provider error bodies",
      async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn()
            .mockResolvedValue(
              new Response(
                JSON.stringify({
                  error: {
                    message:
                      "Sensitive upstream message",
                  },
                }),
                {
                  status:
                    429,

                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                }
              )
            )
        );

        await expect(
          transcribeVoice({
            audio:
              new File(
                [
                  new Uint8Array([
                    1,
                  ]),
                ],
                "voice.webm",
                {
                  type:
                    "audio/webm",
                }
              ),

            language:
              "en",
          })
        ).rejects.toThrow(
          "Voice transcription provider returned status 429."
        );
      }
    );
  }
);
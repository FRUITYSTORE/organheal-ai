import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

describe(
  "Vitest OpenAI network guard",
  () => {
    it(
      "blocks real OpenAI requests for string, URL, and Request inputs",
      async () => {
        const inputs = [
          "https://api.openai.com/v1/responses",

          new URL(
            "https://api.openai.com/v1/audio/speech"
          ),

          new Request(
            "https://api.openai.com/v1/realtime/calls",
            {
              method:
                "POST",
            }
          ),
        ];

        for (
          const input of
          inputs
        ) {
          await expect(
            globalThis.fetch(
              input
            )
          ).rejects.toThrow(
            "[TEST NETWORK GUARD]"
          );
        }
      }
    );

    it(
      "allows an explicitly mocked OpenAI fetch",
      async () => {
        const fetchMock =
          vi.spyOn(
            globalThis,
            "fetch"
          ).mockResolvedValue(
            new Response(
              JSON.stringify({
                ok:
                  true,
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

        const response =
          await globalThis.fetch(
            "https://api.openai.com/v1/responses"
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          fetchMock
        ).toHaveBeenCalledOnce();
      }
    );
  }
);
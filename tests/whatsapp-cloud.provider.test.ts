import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  sendWhatsAppTemplate,
} from "@/lib/communication/whatsapp-cloud.provider";

type FetchMock =
  ReturnType<
    typeof vi.fn<
      typeof fetch
    >
  >;

describe(
  "WhatsApp Cloud provider",
  () => {
    let fetchMock:
      FetchMock;

    beforeEach(
      () => {
        vi.stubEnv(
          "WHATSAPP_ACCESS_TOKEN",
          "test-access-token"
        );

        vi.stubEnv(
          "WHATSAPP_PHONE_NUMBER_ID",
          "123456789"
        );

        vi.stubEnv(
          "WHATSAPP_GRAPH_API_VERSION",
          "v23.0"
        );

        fetchMock =
          vi.fn<
            typeof fetch
          >();

        vi.stubGlobal(
          "fetch",
          fetchMock
        );
      }
    );

    afterEach(
      () => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
      }
    );

    it(
      "sends an English template request and returns the provider message ID",
      async () => {
        fetchMock.mockResolvedValue(
          new Response(
            JSON.stringify({
              messages: [
                {
                  id:
                    "wamid.test-message",
                },
              ],
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

        const result =
          await sendWhatsAppTemplate({
            to:
              "+971501234567",

            templateName:
              "organheal_follow_up",

            language:
              "en",

            parameters: [
              {
                text:
                  "Hussam",
              },
              {
                text:
                  "Complete your check-in",
              },
            ],
          });

        expect(
          result
        ).toEqual({
          messageId:
            "wamid.test-message",

          recipient:
            "971501234567",

          templateName:
            "organheal_follow_up",

          graphApiVersion:
            "v23.0",
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
          "https://graph.facebook.com/v23.0/123456789/messages"
        );

        expect(
          options?.method
        ).toBe(
          "POST"
        );

        expect(
          options?.headers
        ).toEqual({
          Authorization:
            "Bearer test-access-token",

          "Content-Type":
            "application/json",
        });

        const body =
          JSON.parse(
            String(
              options?.body
            )
          );

        expect(
          body
        ).toEqual({
          messaging_product:
            "whatsapp",

          recipient_type:
            "individual",

          to:
            "971501234567",

          type:
            "template",

          template: {
            name:
              "organheal_follow_up",

            language: {
              code:
                "en_US",
            },

            components: [
              {
                type:
                  "body",

                parameters: [
                  {
                    type:
                      "text",

                    text:
                      "Hussam",
                  },
                  {
                    type:
                      "text",

                    text:
                      "Complete your check-in",
                  },
                ],
              },
            ],
          },
        });
      }
    );

    it(
      "uses the Arabic template language code",
      async () => {
        fetchMock.mockResolvedValue(
          new Response(
            JSON.stringify({
              messages: [
                {
                  id:
                    "wamid.arabic",
                },
              ],
            }),
            {
              status:
                200,
            }
          )
        );

        await sendWhatsAppTemplate({
          to:
            "+971501234567",

          templateName:
            "organheal_follow_up_ar",

          language:
            "ar",
        });

        const options =
          fetchMock.mock
            .calls[0]?.[1];

        const body =
          JSON.parse(
            String(
              options?.body
            )
          );

        expect(
          body.template.language.code
        ).toBe(
          "ar"
        );

        expect(
          body.template.components
        ).toBeUndefined();
      }
    );

    it(
      "rejects an invalid E.164 phone number before calling the provider",
      async () => {
        await expect(
          sendWhatsAppTemplate({
            to:
              "0501234567",

            templateName:
              "organheal_follow_up",

            language:
              "en",
          })
        ).rejects.toThrow(
          "E.164"
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an empty template parameter",
      async () => {
        await expect(
          sendWhatsAppTemplate({
            to:
              "+971501234567",

            templateName:
              "organheal_follow_up",

            language:
              "en",

            parameters: [
              {
                text:
                  "   ",
              },
            ],
          })
        ).rejects.toThrow(
          "parameter 1 is empty"
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "reports a non-success provider status",
      async () => {
        fetchMock.mockResolvedValue(
          new Response(
            JSON.stringify({
              error: {
                message:
                  "Invalid request",
              },
            }),
            {
              status:
                400,
            }
          )
        );

        await expect(
          sendWhatsAppTemplate({
            to:
              "+971501234567",

            templateName:
              "organheal_follow_up",

            language:
              "en",
          })
        ).rejects.toThrow(
          "returned status 400"
        );
      }
    );

    it(
      "rejects a successful response without a message ID",
      async () => {
        fetchMock.mockResolvedValue(
          new Response(
            JSON.stringify({
              messages: [],
            }),
            {
              status:
                200,
            }
          )
        );

        await expect(
          sendWhatsAppTemplate({
            to:
              "+971501234567",

            templateName:
              "organheal_follow_up",

            language:
              "en",
          })
        ).rejects.toThrow(
          "returned no message ID"
        );
      }
    );

    it(
      "requires the access token configuration",
      async () => {
        vi.stubEnv(
          "WHATSAPP_ACCESS_TOKEN",
          ""
        );

        await expect(
          sendWhatsAppTemplate({
            to:
              "+971501234567",

            templateName:
              "organheal_follow_up",

            language:
              "en",
          })
        ).rejects.toThrow(
          "WHATSAPP_ACCESS_TOKEN is not configured"
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires the phone number ID configuration",
      async () => {
        vi.stubEnv(
          "WHATSAPP_PHONE_NUMBER_ID",
          ""
        );

        await expect(
          sendWhatsAppTemplate({
            to:
              "+971501234567",

            templateName:
              "organheal_follow_up",

            language:
              "en",
          })
        ).rejects.toThrow(
          "WHATSAPP_PHONE_NUMBER_ID is not configured"
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );
  }
);
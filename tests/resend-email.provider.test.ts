import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  sendEmailWithResend,
} from "@/lib/communication/resend-email.provider";

describe(
  "resend-email.provider",
  () => {
    const originalFetch =
      global.fetch;

    beforeEach(
      () => {
        vi.restoreAllMocks();

        process.env.RESEND_API_KEY =
          "test-api-key";

        process.env.ORGANHEAL_EMAIL_FROM =
          "OrganHeal AI <followup@organheal.com>";
      }
    );

    afterEach(
      () => {
        global.fetch =
          originalFetch;

        delete process.env
          .RESEND_API_KEY;

        delete process.env
          .ORGANHEAL_EMAIL_FROM;
      }
    );

    it(
      "sends a normalized email payload to Resend",
      async () => {
        const fetchMock =
          vi.fn()
            .mockResolvedValue(
              new Response(
                JSON.stringify({
                  id:
                    "email-123",
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

        global.fetch =
          fetchMock;

        const result =
          await sendEmailWithResend({
            to:
              " USER@EXAMPLE.COM ",

            subject:
              " Follow-up ready ",

            text:
              " Your OrganHeal follow-up is ready. ",

            html:
              " <p>Your OrganHeal follow-up is ready.</p> ",

            replyTo:
              " SUPPORT@ORGANHEAL.COM ",
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
          "https://api.resend.com/emails"
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
                  "Bearer test-api-key",

                "Content-Type":
                  "application/json",
              }),
          })
        );

        const body =
          JSON.parse(
            String(
              options.body
            )
          );

        expect(
          body
        ).toEqual({
          from:
            "OrganHeal AI <followup@organheal.com>",

          to: [
            "user@example.com",
          ],

          subject:
            "Follow-up ready",

          text:
            "Your OrganHeal follow-up is ready.",

          html:
            "<p>Your OrganHeal follow-up is ready.</p>",

          reply_to:
            "support@organheal.com",
        });

        expect(
          result
        ).toEqual({
          messageId:
            "email-123",

          recipient:
            "user@example.com",

          from:
            "OrganHeal AI <followup@organheal.com>",
        });
      }
    );

    it(
      "adds an idempotency key when provided",
      async () => {
        const fetchMock =
          vi.fn()
            .mockResolvedValue(
              new Response(
                JSON.stringify({
                  id:
                    "email-456",
                }),
                {
                  status:
                    200,
                }
              )
            );

        global.fetch =
          fetchMock;

        await sendEmailWithResend({
          to:
            "user@example.com",

          subject:
            "Follow-up",

          text:
            "Follow-up ready.",

          idempotencyKey:
            "follow-up-job-123",
        });

        const options =
          fetchMock.mock
            .calls[0][1];

        expect(
          options.headers
        ).toEqual(
          expect.objectContaining({
            "Idempotency-Key":
              "follow-up-job-123",
          })
        );
      }
    );

    it(
      "does not send optional fields when they are absent",
      async () => {
        const fetchMock =
          vi.fn()
            .mockResolvedValue(
              new Response(
                JSON.stringify({
                  id:
                    "email-789",
                }),
                {
                  status:
                    200,
                }
              )
            );

        global.fetch =
          fetchMock;

        await sendEmailWithResend({
          to:
            "user@example.com",

          subject:
            "Follow-up",

          text:
            "Follow-up ready.",
        });

        const options =
          fetchMock.mock
            .calls[0][1];

        const body =
          JSON.parse(
            String(
              options.body
            )
          );

        expect(
          body.html
        ).toBeUndefined();

        expect(
          body.reply_to
        ).toBeUndefined();
      }
    );

    it(
      "rejects an invalid recipient before calling the provider",
      async () => {
        const fetchMock =
          vi.fn();

        global.fetch =
          fetchMock;

        await expect(
          sendEmailWithResend({
            to:
              "not-an-email",

            subject:
              "Follow-up",

            text:
              "Follow-up ready.",
          })
        ).rejects.toThrow(
          "A valid recipient email address is required."
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an empty subject",
      async () => {
        const fetchMock =
          vi.fn();

        global.fetch =
          fetchMock;

        await expect(
          sendEmailWithResend({
            to:
              "user@example.com",

            subject:
              "   ",

            text:
              "Follow-up ready.",
          })
        ).rejects.toThrow(
          "An email subject is required."
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects empty text content",
      async () => {
        const fetchMock =
          vi.fn();

        global.fetch =
          fetchMock;

        await expect(
          sendEmailWithResend({
            to:
              "user@example.com",

            subject:
              "Follow-up",

            text:
              "   ",
          })
        ).rejects.toThrow(
          "Email text content is required."
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires the Resend API key",
      async () => {
        delete process.env
          .RESEND_API_KEY;

        await expect(
          sendEmailWithResend({
            to:
              "user@example.com",

            subject:
              "Follow-up",

            text:
              "Follow-up ready.",
          })
        ).rejects.toThrow(
          "RESEND_API_KEY is not configured."
        );
      }
    );

    it(
      "requires the OrganHeal sender",
      async () => {
        delete process.env
          .ORGANHEAL_EMAIL_FROM;

        await expect(
          sendEmailWithResend({
            to:
              "user@example.com",

            subject:
              "Follow-up",

            text:
              "Follow-up ready.",
          })
        ).rejects.toThrow(
          "ORGANHEAL_EMAIL_FROM is not configured."
        );
      }
    );

    it(
      "rejects provider failures without exposing the response body",
      async () => {
        global.fetch =
          vi.fn()
            .mockResolvedValue(
              new Response(
                JSON.stringify({
                  message:
                    "sensitive provider response",
                }),
                {
                  status:
                    403,
                }
              )
            );

        await expect(
          sendEmailWithResend({
            to:
              "user@example.com",

            subject:
              "Follow-up",

            text:
              "Follow-up ready.",
          })
        ).rejects.toThrow(
          "Resend email provider returned status 403."
        );
      }
    );

    it(
      "rejects a successful provider response without a message ID",
      async () => {
        global.fetch =
          vi.fn()
            .mockResolvedValue(
              new Response(
                JSON.stringify({}),
                {
                  status:
                    200,
                }
              )
            );

        await expect(
          sendEmailWithResend({
            to:
              "user@example.com",

            subject:
              "Follow-up",

            text:
              "Follow-up ready.",
          })
        ).rejects.toThrow(
          "Resend email provider returned no message ID."
        );
      }
    );
  }
);
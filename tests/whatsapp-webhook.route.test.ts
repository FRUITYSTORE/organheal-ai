import {
  createHmac,
} from "node:crypto";

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  NextRequest,
} from "next/server";

import {
  GET,
  POST,
} from "@/app/api/whatsapp/webhook/route";

vi.mock(
  "@/lib/api/api-logger",
  () => ({
    createApiRequestId:
      vi.fn(
        () =>
          "req_whatsapp_test"
      ),

    logApiInfo:
      vi.fn(),
  })
);

function createSignature(
  rawBody:
    string,
  secret:
    string
): string {
  const digest =
    createHmac(
      "sha256",
      secret
    )
      .update(
        rawBody,
        "utf8"
      )
      .digest(
        "hex"
      );

  return `sha256=${digest}`;
}

describe(
  "WhatsApp webhook route",
  () => {
    afterEach(
      () => {
        vi.unstubAllEnvs();
      }
    );

    it(
      "returns the Meta challenge when the verification token matches",
      async () => {
        vi.stubEnv(
          "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
          "test-verify-token"
        );

        const request =
          new NextRequest(
            "http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=123456"
          );

        const response =
          await GET(
            request
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          await response.text()
        ).toBe(
          "123456"
        );
      }
    );

    it(
      "rejects an incorrect verification token",
      async () => {
        vi.stubEnv(
          "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
          "expected-token"
        );

        const request =
          new NextRequest(
            "http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=123456"
          );

        const response =
          await GET(
            request
          );

        expect(
          response.status
        ).toBe(
          403
        );
      }
    );

    it(
      "rejects an incomplete verification request",
      async () => {
        vi.stubEnv(
          "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
          "test-verify-token"
        );

        const request =
          new NextRequest(
            "http://localhost/api/whatsapp/webhook?hub.mode=subscribe"
          );

        const response =
          await GET(
            request
          );

        expect(
          response.status
        ).toBe(
          400
        );
      }
    );

    it(
      "accepts a valid signed JSON webhook payload",
      async () => {
        const appSecret =
          "test-app-secret";

        vi.stubEnv(
          "WHATSAPP_APP_SECRET",
          appSecret
        );

        const rawBody =
          JSON.stringify({
            object:
              "whatsapp_business_account",
          });

        const request =
          new NextRequest(
            "http://localhost/api/whatsapp/webhook",
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",

                "x-hub-signature-256":
                  createSignature(
                    rawBody,
                    appSecret
                  ),
              },

              body:
                rawBody,
            }
          );

        const response =
          await POST(
            request
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          response.headers.get(
          "x-request-id"
        )
        ).toBe(
          "req_whatsapp_test"
        );

        expect(
          await response.json()
        ).toEqual({
          success:
            true,
        });
      }
    );

    it(
      "rejects a webhook payload with an invalid signature",
      async () => {
        vi.stubEnv(
          "WHATSAPP_APP_SECRET",
          "test-app-secret"
        );

        const rawBody =
          JSON.stringify({
            object:
              "whatsapp_business_account",
          });

        const request =
          new NextRequest(
            "http://localhost/api/whatsapp/webhook",
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",

                "x-hub-signature-256":
                  "sha256=invalid",
              },

              body:
                rawBody,
            }
          );

        const response =
          await POST(
            request
          );

        expect(
          response.status
        ).toBe(
          401
        );
      }
    );

    it(
      "rejects a webhook payload without a signature",
      async () => {
        vi.stubEnv(
          "WHATSAPP_APP_SECRET",
          "test-app-secret"
        );

        const rawBody =
          JSON.stringify({
            object:
              "whatsapp_business_account",
          });

        const request =
          new NextRequest(
            "http://localhost/api/whatsapp/webhook",
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                rawBody,
            }
          );

        const response =
          await POST(
            request
          );

        expect(
          response.status
        ).toBe(
          401
        );
      }
    );

    it(
      "rejects webhook processing when the app secret is not configured",
      async () => {
        vi.stubEnv(
          "WHATSAPP_APP_SECRET",
          ""
        );

        const rawBody =
          JSON.stringify({
            object:
              "whatsapp_business_account",
          });

        const request =
          new NextRequest(
            "http://localhost/api/whatsapp/webhook",
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",

                "x-hub-signature-256":
                  "sha256=test",
              },

              body:
                rawBody,
            }
          );

        const response =
          await POST(
            request
          );

        expect(
          response.status
        ).toBe(
          503
        );
      }
    );

    it(
      "rejects invalid JSON even when the signature is valid",
      async () => {
        const appSecret =
          "test-app-secret";

        vi.stubEnv(
          "WHATSAPP_APP_SECRET",
          appSecret
        );

        const rawBody =
          "{invalid-json";

        const request =
          new NextRequest(
            "http://localhost/api/whatsapp/webhook",
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",

                "x-hub-signature-256":
                  createSignature(
                    rawBody,
                    appSecret
                  ),
              },

              body:
                rawBody,
            }
          );

        const response =
          await POST(
            request
          );

        expect(
          response.status
        ).toBe(
          400
        );
      }
    );
  }
);
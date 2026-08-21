import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

vi.mock(
  "@/lib/api/api-auth",
  () => ({
    authenticateApiRequest:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/repositories/communication-preferences.repository",
  () => ({
    getOrCreateCommunicationPreferences:
      vi.fn(),

    updateCommunicationPreferences:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/api/api-logger",
  () => ({
    createApiRequestId:
      vi.fn(
        () =>
          "req-test"
      ),

    startApiTimer:
      vi.fn(
        () => ({
          elapsedMs:
            () => 12,
        })
      ),

    logApiInfo:
      vi.fn(),

    logApiError:
      vi.fn(),
  })
);

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  getOrCreateCommunicationPreferences,
  updateCommunicationPreferences,
  type CommunicationPreferences,
} from "@/lib/repositories/communication-preferences.repository";

import {
  GET,
  PUT,
} from "@/app/api/communication-preferences/route";

const mockedAuthenticateApiRequest =
  vi.mocked(
    authenticateApiRequest
  );

const mockedGetOrCreate =
  vi.mocked(
    getOrCreateCommunicationPreferences
  );

const mockedUpdate =
  vi.mocked(
    updateCommunicationPreferences
  );

function createClient():
  SupabaseClient {
  return {} as
    SupabaseClient;
}

function createPreferences(
  overrides:
    Partial<
      CommunicationPreferences
    > = {}
):
  CommunicationPreferences {
  return {
    user_id:
      "user-123",

    preferred_language:
      "en",

    timezone:
      "Asia/Dubai",

    dashboard_enabled:
      true,

    email_enabled:
      false,

    whatsapp_enabled:
      false,

    push_enabled:
      false,

    whatsapp_phone_e164:
      null,

    whatsapp_phone_verified_at:
      null,

    email_consent_granted_at:
      null,

    email_consent_revoked_at:
      null,

    whatsapp_consent_granted_at:
      null,

    whatsapp_consent_revoked_at:
      null,

    push_consent_granted_at:
      null,

    push_consent_revoked_at:
      null,

    consent_source:
      null,

    consent_version:
      null,

    created_at:
      "2026-08-22T00:00:00.000Z",

    updated_at:
      "2026-08-22T00:00:00.000Z",

    ...overrides,
  };
}

function createGetRequest():
  Request {
  return new Request(
    "http://localhost/api/communication-preferences",
    {
      method:
        "GET",

      headers: {
        Authorization:
          "Bearer test-token",
      },
    }
  );
}

function createPutRequest(
  body:
    unknown
):
  Request {
  return new Request(
    "http://localhost/api/communication-preferences",
    {
      method:
        "PUT",

      headers: {
        Authorization:
          "Bearer test-token",

        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(
          body
        ),
    }
  );
}

describe(
  "/api/communication-preferences",
  () => {
    const client =
      createClient();

    beforeEach(
      () => {
        vi.clearAllMocks();

        vi.useFakeTimers();

        vi.setSystemTime(
          new Date(
            "2026-08-22T01:00:00.000Z"
          )
        );

        mockedAuthenticateApiRequest
          .mockResolvedValue({
            success:
              true,

            token:
              "test-token",

            user: {
              id:
                "user-123",
            },

            client,
          } as Awaited<
            ReturnType<
              typeof authenticateApiRequest
            >
          >);

        mockedGetOrCreate
          .mockResolvedValue(
            createPreferences()
          );

        mockedUpdate
          .mockResolvedValue(
            createPreferences()
          );
      }
    );

    afterEach(
      () => {
        vi.useRealTimers();
      }
    );

    it(
      "loads communication preferences for the authenticated user",
      async () => {
        const response =
          await GET(
            createGetRequest()
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedGetOrCreate
        ).toHaveBeenCalledWith(
          {
            userId:
              "user-123",
          },
          client
        );

        const payload =
          await response.json();

        expect(
          payload
        ).toEqual({
          success:
            true,

          preferences:
            createPreferences(),

          requestId:
            "req-test",
        });
      }
    );

    it(
      "rejects unauthenticated requests",
      async () => {
        mockedAuthenticateApiRequest
          .mockResolvedValue({
            success:
              false,

            status:
              401,

            error:
              "Authentication is required.",
          });

        const response =
          await GET(
            createGetRequest()
          );

        expect(
          response.status
        ).toBe(
          401
        );

        expect(
          mockedGetOrCreate
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "updates valid communication preferences for the authenticated user",
      async () => {
        mockedUpdate
          .mockResolvedValue(
            createPreferences({
              preferred_language:
                "ar",

              timezone:
                "Asia/Dubai",

              email_enabled:
                true,

              email_consent_granted_at:
                "2026-08-22T01:00:00.000Z",

              consent_source:
                "communication-settings",

              consent_version:
                "v1",
            })
          );

        const response =
          await PUT(
            createPutRequest({
              preferredLanguage:
                "ar",

              timezone:
                "Asia/Dubai",

              emailEnabled:
                true,

              emailConsent:
                true,
            })
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedUpdate
        ).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            preferredLanguage:
              "ar",

            timezone:
              "Asia/Dubai",

            emailEnabled:
              true,

            emailConsentGrantedAt:
              "2026-08-22T01:00:00.000Z",

            emailConsentRevokedAt:
              null,

            consentSource:
              "communication-settings",

            consentVersion:
              "v1",
          }),
          client
        );
      }
    );

    it(
      "rejects an unsupported preferred language",
      async () => {
        const response =
          await PUT(
            createPutRequest({
              preferredLanguage:
                "fr",
            })
          );

        expect(
          response.status
        ).toBe(
          400
        );

        const payload =
          await response.json();

        expect(
          payload.error
        ).toContain(
          "Preferred language"
        );

        expect(
          mockedUpdate
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an invalid WhatsApp E.164 number",
      async () => {
        const response =
          await PUT(
            createPutRequest({
              whatsappPhoneE164:
                "0501234567",
            })
          );

        expect(
          response.status
        ).toBe(
          400
        );

        const payload =
          await response.json();

        expect(
          payload.error
        ).toContain(
          "E.164"
        );

        expect(
          mockedUpdate
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "clears WhatsApp verification when the stored phone number changes",
      async () => {
        mockedGetOrCreate
          .mockResolvedValue(
            createPreferences({
              whatsapp_phone_e164:
                "+971501111111",

              whatsapp_phone_verified_at:
                "2026-08-20T10:00:00.000Z",
            })
          );

        await PUT(
          createPutRequest({
            whatsappPhoneE164:
              "+971502222222",
          })
        );

        expect(
          mockedUpdate
        ).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            whatsappPhoneE164:
              "+971502222222",

            whatsappPhoneVerifiedAt:
              null,
          }),
          client
        );
      }
    );

    it(
      "records WhatsApp consent when the user grants it",
      async () => {
        await PUT(
          createPutRequest({
            whatsappEnabled:
              true,

            whatsappConsent:
              true,
          })
        );

        expect(
          mockedUpdate
        ).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            whatsappEnabled:
              true,

            whatsappConsentGrantedAt:
              "2026-08-22T01:00:00.000Z",

            whatsappConsentRevokedAt:
              null,
          }),
          client
        );
      }
    );

    it(
      "records consent revocation when a channel is disabled by consent",
      async () => {
        await PUT(
          createPutRequest({
            pushConsent:
              false,
          })
        );

        expect(
          mockedUpdate
        ).toHaveBeenCalledWith(
          "user-123",
          expect.objectContaining({
            pushConsentGrantedAt:
              null,

            pushConsentRevokedAt:
              "2026-08-22T01:00:00.000Z",
          }),
          client
        );
      }
    );

    it(
      "rejects malformed JSON",
      async () => {
        const request =
          new Request(
            "http://localhost/api/communication-preferences",
            {
              method:
                "PUT",

              headers: {
                Authorization:
                  "Bearer test-token",

                "Content-Type":
                  "application/json",
              },

              body:
                "{invalid-json",
            }
          );

        const response =
          await PUT(
            request
          );

        expect(
          response.status
        ).toBe(
          400
        );

        expect(
          mockedUpdate
        ).not.toHaveBeenCalled();
      }
    );
  }
);
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  logApiInfo,
} from "@/lib/api/api-logger";

import {
  executeFollowUpDelivery,
} from "@/lib/jobs/handlers/follow-up-delivery.service";

import type {
  FollowUpDeliveryJobPayload,
} from "@/lib/jobs/background-job.service";

import type {
  CommunicationPreferences,
} from "@/lib/repositories/communication-preferences.repository";

vi.mock(
  "@/lib/api/api-logger",
  () => ({
    logApiInfo:
      vi.fn(),
  })
);

const mockedLogApiInfo =
  vi.mocked(
    logApiInfo
  );

function createPayload(
  overrides:
    Partial<
      FollowUpDeliveryJobPayload
    > = {}
): FollowUpDeliveryJobPayload {
  return {
    delivery: {
      userId:
        "user-123",

      channel:
        "email",

      language:
        "en",

      priority:
        "medium",

      purpose:
        "repeat-checkin",

      title:
        "Add a new health check-in",

      body:
        "Complete a new health check-in.",

      actionLabel:
        "Open Check-In",

      actionHref:
        "/checkin",

      safetyNote:
        null,

      requiresImmediateDelivery:
        false,
    },

    idempotencyKey:
      "follow-up:user-123:email:repeat-checkin:2026-08-09",

    retryDelaysMinutes: [
      30,
      180,
    ],

    auditMetadata: {
      source:
        "follow-up-dispatch-adapter",

      dispatchStatus:
        "ready",

      purpose:
        "repeat-checkin",

      language:
        "en",

      messageGeneratedAt:
        "2026-08-06T17:45:00.000Z",

      dispatchPlanGeneratedAt:
        "2026-08-06T18:00:00.000Z",

      envelopeGeneratedAt:
        "2026-08-06T18:15:00.000Z",
    },

    ...overrides,
  };
}

function createCommunicationPreferences(
  overrides:
    Partial<
      CommunicationPreferences
    > = {}
): CommunicationPreferences {
  return {
    user_id:
      "user-123",

    preferred_language:
      "en",

    timezone:
      "UTC",

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
      "2026-08-06T18:00:00.000Z",

    updated_at:
      "2026-08-06T18:00:00.000Z",

    ...overrides,
  };
}

describe(
  "Follow-up delivery service",
  () => {
    beforeEach(
      () => {
        mockedLogApiInfo
          .mockReset();

        vi.stubEnv(
          "WHATSAPP_DELIVERY_ENABLED",
          "false"
        );
        vi.stubEnv(
  "EMAIL_DELIVERY_ENABLED",
  "false"
);
      }
    );

    afterEach(
      () => {
        vi.unstubAllEnvs();
      }
    );

    it(
      "validates and audits a delivery without sending it",
      async () => {
        const result =
          await executeFollowUpDelivery({
            jobId:
              "job-follow-up",

            requestId:
              "req-follow-up",

            userId:
              "user-123",

            payload:
              createPayload(),

            referenceTime:
              "2026-08-06T19:00:00.000Z",
          });

        expect(
          result
        ).toEqual({
          delivered:
            false,

          dryRun:
            true,

          providerMessageId:
            null,
          channel:
            "email",

          userId:
            "user-123",

          idempotencyKey:
            "follow-up:user-123:email:repeat-checkin:2026-08-09",

          reason:
            expect.stringContaining(
              "External channel delivery remains disabled"
            ),

          executedAt:
            "2026-08-06T19:00:00.000Z",
        });

        expect(
          mockedLogApiInfo
        ).toHaveBeenCalledWith(
          "follow_up_delivery.dry_run_completed",
          expect.objectContaining({
            jobId:
              "job-follow-up",

            userId:
              "user-123",

            channel:
              "email",

            purpose:
              "repeat-checkin",

            hasAction:
              true,

            hasSafetyNote:
              false,
          })
        );
      }
    );

    it(
      "blocks delivery when communication preferences are unavailable",
      async () => {
        const result =
          await executeFollowUpDelivery({
            jobId:
              "job-follow-up",

            requestId:
              "req-follow-up",

            userId:
              "user-123",

            payload:
              createPayload(),

            loadCommunicationPreferences:
              vi.fn(
                async () =>
                  null
              ),

            referenceTime:
              "2026-08-06T19:00:00.000Z",
          });

        expect(
          result.delivered
        ).toBe(false);

        expect(
          result.reason
        ).toContain(
          "communication preferences are unavailable"
        );

        expect(
          mockedLogApiInfo
        ).toHaveBeenCalledWith(
          "follow_up_delivery.channel_blocked",
          expect.objectContaining({
            userId:
              "user-123",

            channel:
              "email",

            reason:
              "communication-preferences-unavailable",
          })
        );
      }
    );

    it(
      "blocks email when consent is not active",
      async () => {
        const result =
          await executeFollowUpDelivery({
            jobId:
              "job-follow-up",

            requestId:
              "req-follow-up",

            userId:
              "user-123",

            payload:
              createPayload(),

            loadCommunicationPreferences:
              vi.fn(
                async () =>
                  createCommunicationPreferences({
                    email_enabled:
                      true,

                    email_consent_granted_at:
                      null,

                    email_consent_revoked_at:
                      null,
                  })
              ),

            referenceTime:
              "2026-08-06T19:00:00.000Z",
          });

        expect(
          result.delivered
        ).toBe(false);

        expect(
          mockedLogApiInfo
        ).toHaveBeenCalledWith(
          "follow_up_delivery.channel_blocked",
          expect.objectContaining({
            userId:
              "user-123",

            channel:
              "email",
          })
        );
      }
    );

    it(
      "blocks whatsapp when the number is not verified",
      async () => {
        const whatsappPayload =
          createPayload({
            delivery: {
              ...createPayload()
                .delivery,

              channel:
                "whatsapp",
            },
          });

        const result =
          await executeFollowUpDelivery({
            jobId:
              "job-whatsapp",

            requestId:
              "req-whatsapp",

            userId:
              "user-123",

            payload:
              whatsappPayload,

            loadCommunicationPreferences:
              vi.fn(
                async () =>
                  createCommunicationPreferences({
                    whatsapp_enabled:
                      true,

                    whatsapp_phone_e164:
                      "+971501234567",

                    whatsapp_phone_verified_at:
                      null,

                    whatsapp_consent_granted_at:
                      "2026-08-06T18:00:00.000Z",

                    consent_source:
                      "profile-settings",

                    consent_version:
                      "v1",
                  })
              ),

            referenceTime:
              "2026-08-06T19:00:00.000Z",
          });

        expect(
          result.delivered
        ).toBe(false);

        expect(
          mockedLogApiInfo
        ).toHaveBeenCalledWith(
          "follow_up_delivery.channel_blocked",
          expect.objectContaining({
            userId:
              "user-123",

            channel:
              "whatsapp",
          })
        );
      }
    );

    it(
      "allows an authorized whatsapp channel to reach dry-run execution",
      async () => {
        const whatsappPayload =
          createPayload({
            delivery: {
              ...createPayload()
                .delivery,

              channel:
                "whatsapp",
            },
          });

        const result =
          await executeFollowUpDelivery({
            jobId:
              "job-whatsapp",

            requestId:
              "req-whatsapp",

            userId:
              "user-123",

            payload:
              whatsappPayload,

            loadCommunicationPreferences:
              vi.fn(
                async () =>
                  createCommunicationPreferences({
                    whatsapp_enabled:
                      true,

                    whatsapp_phone_e164:
                      "+971501234567",

                    whatsapp_phone_verified_at:
                      "2026-08-06T18:05:00.000Z",

                    whatsapp_consent_granted_at:
                      "2026-08-06T18:00:00.000Z",

                    consent_source:
                      "profile-settings",

                    consent_version:
                      "v1",

                    updated_at:
                      "2026-08-06T18:05:00.000Z",
                  })
              ),

            referenceTime:
              "2026-08-06T19:00:00.000Z",
          });

        expect(
          result.delivered
        ).toBe(false);

        expect(
          result.dryRun
        ).toBe(true);

        expect(
          result.channel
        ).toBe(
          "whatsapp"
        );

        expect(
          mockedLogApiInfo
        ).toHaveBeenCalledWith(
          "follow_up_delivery.dry_run_completed",
          expect.objectContaining({
            userId:
              "user-123",

            channel:
              "whatsapp",
          })
        );
      }
    );

    it(
  "does not call the whatsapp provider while delivery is disabled",
  async () => {
    const sendWhatsApp =
      vi.fn();

    const whatsappPayload =
      createPayload({
        delivery: {
          ...createPayload()
            .delivery,

          channel:
            "whatsapp",
        },
      });

    const result =
      await executeFollowUpDelivery({
        jobId:
          "job-whatsapp",

        requestId:
          "req-whatsapp",

        userId:
          "user-123",

        payload:
          whatsappPayload,

        loadCommunicationPreferences:
          vi.fn(
            async () =>
              createCommunicationPreferences({
                whatsapp_enabled:
                  true,

                whatsapp_phone_e164:
                  "+971501234567",

                whatsapp_phone_verified_at:
                  "2026-08-06T18:05:00.000Z",

                whatsapp_consent_granted_at:
                  "2026-08-06T18:00:00.000Z",
              })
          ),

        sendWhatsApp,

        referenceTime:
          "2026-08-06T19:00:00.000Z",
      });

    expect(
      result.delivered
    ).toBe(false);

    expect(
      result.dryRun
    ).toBe(true);

    expect(
      result.providerMessageId
    ).toBeNull();

    expect(
      sendWhatsApp
    ).not.toHaveBeenCalled();
  }
);

it(
  "sends an authorized whatsapp follow-up when delivery is enabled",
  async () => {
    vi.stubEnv(
      "WHATSAPP_DELIVERY_ENABLED",
      "true"
    );

    const sendWhatsApp =
      vi.fn(
        async () => ({
          messageId:
            "wamid.follow-up-test",

          recipient:
            "971501234567",

          templateName:
            "organheal_repeat_checkin",

          graphApiVersion:
            "v23.0",
        })
      );

    const whatsappPayload =
      createPayload({
        delivery: {
          ...createPayload()
            .delivery,

          channel:
            "whatsapp",
        },
      });

    const result =
      await executeFollowUpDelivery({
        jobId:
          "job-whatsapp",

        requestId:
          "req-whatsapp",

        userId:
          "user-123",

        payload:
          whatsappPayload,

        loadCommunicationPreferences:
          vi.fn(
            async () =>
              createCommunicationPreferences({
                whatsapp_enabled:
                  true,

                whatsapp_phone_e164:
                  "+971501234567",

                whatsapp_phone_verified_at:
                  "2026-08-06T18:05:00.000Z",

                whatsapp_consent_granted_at:
                  "2026-08-06T18:00:00.000Z",
              })
          ),

        sendWhatsApp,

        referenceTime:
          "2026-08-06T19:00:00.000Z",
      });

    expect(
      sendWhatsApp
    ).toHaveBeenCalledWith({
      to:
        "+971501234567",

      templateName:
        "organheal_repeat_checkin",

      language:
        "en",

      parameters: [
        {
          text:
            "Add a new health check-in",
        },
        {
          text:
            "Complete a new health check-in.",
        },
        {
          text:
            "Open Check-In",
        },
      ],
    });

    expect(
      result
    ).toEqual({
      delivered:
        true,

      dryRun:
        false,

      providerMessageId:
        "wamid.follow-up-test",

      channel:
        "whatsapp",

      userId:
        "user-123",

      idempotencyKey:
        "follow-up:user-123:email:repeat-checkin:2026-08-09",

      reason:
        "The WhatsApp follow-up message was accepted by the configured provider.",

      executedAt:
        "2026-08-06T19:00:00.000Z",
    });

    expect(
      mockedLogApiInfo
    ).toHaveBeenCalledWith(
      "follow_up_delivery.whatsapp_completed",
      expect.objectContaining({
        channel:
          "whatsapp",

        providerMessageId:
          "wamid.follow-up-test",

        templateName:
          "organheal_repeat_checkin",
      })
    );
  }
);

it(
  "propagates whatsapp provider failures so the background job can retry",
  async () => {
    vi.stubEnv(
      "WHATSAPP_DELIVERY_ENABLED",
      "true"
    );

    const providerError =
      new Error(
        "WhatsApp provider unavailable"
      );

    const sendWhatsApp =
      vi.fn(
        async () => {
          throw providerError;
        }
      );

    const whatsappPayload =
      createPayload({
        delivery: {
          ...createPayload()
            .delivery,

          channel:
            "whatsapp",
        },
      });

    await expect(
      executeFollowUpDelivery({
        jobId:
          "job-whatsapp",

        requestId:
          "req-whatsapp",

        userId:
          "user-123",

        payload:
          whatsappPayload,

        loadCommunicationPreferences:
          vi.fn(
            async () =>
              createCommunicationPreferences({
                whatsapp_enabled:
                  true,

                whatsapp_phone_e164:
                  "+971501234567",

                whatsapp_phone_verified_at:
                  "2026-08-06T18:05:00.000Z",

                whatsapp_consent_granted_at:
                  "2026-08-06T18:00:00.000Z",
              })
          ),

        sendWhatsApp,
      })
    ).rejects.toThrow(
      "WhatsApp provider unavailable"
    );

    expect(
      sendWhatsApp
    ).toHaveBeenCalledTimes(
      1
    );
  }
);

it(
  "does not call the email provider while delivery is disabled",
  async () => {
    const sendEmail =
      vi.fn();

    const emailPayload =
      createPayload({
        delivery: {
          ...createPayload()
            .delivery,

          channel:
            "email",
        },
      });

    const result =
      await executeFollowUpDelivery({
        jobId:
          "job-email",

        requestId:
          "req-email",

        userId:
          "user-123",

        payload:
          emailPayload,

        loadCommunicationPreferences:
          vi.fn(
            async () =>
              createCommunicationPreferences({
                email_enabled:
                  true,

                email_consent_granted_at:
                  "2026-08-06T18:00:00.000Z",
              })
          ),

        loadUserProfile:
          vi.fn(
            async () => ({
              username:
                "test-user",

              email:
                "user@example.com",
            })
          ),

        sendEmail,

        referenceTime:
          "2026-08-06T19:00:00.000Z",
      });

    expect(
      result.delivered
    ).toBe(false);

    expect(
      result.dryRun
    ).toBe(true);

    expect(
      result.providerMessageId
    ).toBeNull();

    expect(
      sendEmail
    ).not.toHaveBeenCalled();
  }
);

it(
  "sends an authorized email follow-up when delivery is enabled",
  async () => {
    vi.stubEnv(
      "EMAIL_DELIVERY_ENABLED",
      "true"
    );

    const sendEmail =
      vi.fn(
        async () => ({
          messageId:
            "email-follow-up-test",

          recipient:
            "user@example.com",

          from:
            "OrganHeal AI <followup@organheal.com>",
        })
      );

    const emailPayload =
      createPayload({
        delivery: {
          ...createPayload()
            .delivery,

          channel:
            "email",
        },
      });

    const result =
      await executeFollowUpDelivery({
        jobId:
          "job-email",

        requestId:
          "req-email",

        userId:
          "user-123",

        payload:
          emailPayload,

        loadCommunicationPreferences:
          vi.fn(
            async () =>
              createCommunicationPreferences({
                email_enabled:
                  true,

                email_consent_granted_at:
                  "2026-08-06T18:00:00.000Z",
              })
          ),

        loadUserProfile:
          vi.fn(
            async () => ({
              username:
                "test-user",

              email:
                "user@example.com",
            })
          ),

        sendEmail,

        referenceTime:
          "2026-08-06T19:00:00.000Z",
      });

    expect(
      sendEmail
    ).toHaveBeenCalledWith({
      to:
        "user@example.com",

      subject:
        "Add a new health check-in",

      text:
        "Complete a new health check-in.",

      idempotencyKey:
        "follow-up:user-123:email:repeat-checkin:2026-08-09",
    });

    expect(
      result
    ).toEqual({
      delivered:
        true,

      dryRun:
        false,

      providerMessageId:
        "email-follow-up-test",

      channel:
        "email",

      userId:
        "user-123",

      idempotencyKey:
        "follow-up:user-123:email:repeat-checkin:2026-08-09",

      reason:
        "The email follow-up message was accepted by the configured provider.",

      executedAt:
        "2026-08-06T19:00:00.000Z",
    });

    expect(
      mockedLogApiInfo
    ).toHaveBeenCalledWith(
      "follow_up_delivery.email_completed",
      expect.objectContaining({
        channel:
          "email",

        providerMessageId:
          "email-follow-up-test",

        purpose:
          "repeat-checkin",
      })
    );
  }
);

it(
  "rejects email delivery when the trusted profile has no email address",
  async () => {
    vi.stubEnv(
      "EMAIL_DELIVERY_ENABLED",
      "true"
    );

    const sendEmail =
      vi.fn();

    const emailPayload =
      createPayload({
        delivery: {
          ...createPayload()
            .delivery,

          channel:
            "email",
        },
      });

    await expect(
      executeFollowUpDelivery({
        jobId:
          "job-email",

        requestId:
          "req-email",

        userId:
          "user-123",

        payload:
          emailPayload,

        loadCommunicationPreferences:
          vi.fn(
            async () =>
              createCommunicationPreferences({
                email_enabled:
                  true,

                email_consent_granted_at:
                  "2026-08-06T18:00:00.000Z",
              })
          ),

        loadUserProfile:
          vi.fn(
            async () => ({
              username:
                "test-user",

              email:
                null,
            })
          ),

        sendEmail,
      })
    ).rejects.toThrow(
      "missing a trusted destination email address"
    );

    expect(
      sendEmail
    ).not.toHaveBeenCalled();
  }
);

it(
  "propagates email provider failures so the background job can retry",
  async () => {
    vi.stubEnv(
      "EMAIL_DELIVERY_ENABLED",
      "true"
    );

    const providerError =
      new Error(
        "Email provider unavailable"
      );

    const sendEmail =
      vi.fn(
        async () => {
          throw providerError;
        }
      );

    const emailPayload =
      createPayload({
        delivery: {
          ...createPayload()
            .delivery,

          channel:
            "email",
        },
      });

    await expect(
      executeFollowUpDelivery({
        jobId:
          "job-email",

        requestId:
          "req-email",

        userId:
          "user-123",

        payload:
          emailPayload,

        loadCommunicationPreferences:
          vi.fn(
            async () =>
              createCommunicationPreferences({
                email_enabled:
                  true,

                email_consent_granted_at:
                  "2026-08-06T18:00:00.000Z",
              })
          ),

        loadUserProfile:
          vi.fn(
            async () => ({
              username:
                "test-user",

              email:
                "user@example.com",
            })
          ),

        sendEmail,
      })
    ).rejects.toThrow(
      "Email provider unavailable"
    );

    expect(
      sendEmail
    ).toHaveBeenCalledTimes(
      1
    );
  }
);

    it(
      "rejects a delivery user that differs from the job user",
      async () => {
        await expect(
          executeFollowUpDelivery({
            jobId:
              "job-follow-up",

            requestId:
              null,

            userId:
              "user-123",

            payload:
              createPayload({
                delivery: {
                  ...createPayload()
                    .delivery,

                  userId:
                    "different-user",
                },
              }),
          })
        ).rejects.toThrow(
          "does not match the background job user ID"
        );

        expect(
          mockedLogApiInfo
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an empty delivery body",
      async () => {
        await expect(
          executeFollowUpDelivery({
            jobId:
              "job-follow-up",

            requestId:
              null,

            userId:
              "user-123",

            payload:
              createPayload({
                delivery: {
                  ...createPayload()
                    .delivery,

                  body:
                    "   ",
                },
              }),
          })
        ).rejects.toThrow(
          "Delivery body is required"
        );
      }
    );

    it(
      "preserves urgent safety metadata in the audit",
      async () => {
        await executeFollowUpDelivery({
          jobId:
            "job-critical",

          requestId:
            "req-critical",

          userId:
            "user-123",

          payload:
            createPayload({
              delivery: {
                ...createPayload()
                  .delivery,

                channel:
                  "push",

                priority:
                  "critical",

                purpose:
                  "urgent-review",

                safetyNote:
                  "Seek urgent medical care for severe or worsening symptoms.",

                requiresImmediateDelivery:
                  true,
              },
            }),
        });

        expect(
          mockedLogApiInfo
        ).toHaveBeenCalledWith(
          "follow_up_delivery.dry_run_completed",
          expect.objectContaining({
            channel:
              "push",

            priority:
              "critical",

            purpose:
              "urgent-review",

            requiresImmediateDelivery:
              true,

            hasSafetyNote:
              true,
          })
        );
      }
    );
  }
);
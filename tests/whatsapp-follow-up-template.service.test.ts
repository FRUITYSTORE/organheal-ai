import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildWhatsAppFollowUpTemplate,
} from "@/lib/communication/whatsapp-follow-up-template.service";

import type {
  FollowUpDeliveryJobPayload,
} from "@/lib/jobs/background-job.service";

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
        "whatsapp",

      language:
        "en",

      priority:
        "medium",

      purpose:
        "repeat-checkin",

      title:
        "Add a new health check-in",

      body:
        "Complete a new check-in so OrganHeal can compare your recent wellness signals.",

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
      "follow-up:user-123:whatsapp:repeat-checkin:2026-08-21",

    retryDelaysMinutes: [
      15,
      60,
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
        "2026-08-21T10:00:00.000Z",

      dispatchPlanGeneratedAt:
        "2026-08-21T10:05:00.000Z",

      envelopeGeneratedAt:
        "2026-08-21T10:10:00.000Z",
    },

    ...overrides,
  };
}

describe(
  "WhatsApp follow-up template service",
  () => {
    it(
      "maps repeat-checkin to the expected template contract",
      () => {
        const result =
          buildWhatsAppFollowUpTemplate(
            createPayload()
          );

        expect(
          result
        ).toEqual({
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
                "Complete a new check-in so OrganHeal can compare your recent wellness signals.",
            },
            {
              text:
                "Open Check-In",
            },
          ],
        });
      }
    );

    it(
      "maps Arabic language without changing the follow-up purpose",
      () => {
        const payload =
          createPayload({
            delivery: {
              ...createPayload()
                .delivery,

              language:
                "ar",

              title:
                "أضف تحديثًا صحيًا جديدًا",

              body:
                "أكمل تحديثًا صحيًا جديدًا لمتابعة التغيرات المهمة.",

              actionLabel:
                "افتح التحديث الصحي",
            },
          });

        const result =
          buildWhatsAppFollowUpTemplate(
            payload
          );

        expect(
          result.templateName
        ).toBe(
          "organheal_repeat_checkin"
        );

        expect(
          result.language
        ).toBe(
          "ar"
        );

        expect(
          result.parameters
        ).toEqual([
          {
            text:
              "أضف تحديثًا صحيًا جديدًا",
          },
          {
            text:
              "أكمل تحديثًا صحيًا جديدًا لمتابعة التغيرات المهمة.",
          },
          {
            text:
              "افتح التحديث الصحي",
          },
        ]);
      }
    );

    it(
      "includes the safety note for urgent review",
      () => {
        const payload =
          createPayload({
            delivery: {
              ...createPayload()
                .delivery,

              priority:
                "critical",

              purpose:
                "urgent-review",

              title:
                "Urgent health review recommended",

              body:
                "Your current information requires urgent clinical review.",

              actionLabel:
                "Prepare Doctor Brief",

              actionHref:
                "/doctor-portal",

              safetyNote:
                "Seek urgent medical care immediately if you have severe or worsening symptoms.",

              requiresImmediateDelivery:
                true,
            },
          });

        const result =
          buildWhatsAppFollowUpTemplate(
            payload
          );

        expect(
          result.templateName
        ).toBe(
          "organheal_urgent_review"
        );

        expect(
          result.parameters
        ).toEqual([
          {
            text:
              "Urgent health review recommended",
          },
          {
            text:
              "Your current information requires urgent clinical review.",
          },
          {
            text:
              "Prepare Doctor Brief",
          },
          {
            text:
              "Seek urgent medical care immediately if you have severe or worsening symptoms.",
          },
        ]);
      }
    );

    it(
      "omits the optional action label when unavailable",
      () => {
        const payload =
          createPayload({
            delivery: {
              ...createPayload()
                .delivery,

              actionLabel:
                null,

              actionHref:
                null,
            },
          });

        const result =
          buildWhatsAppFollowUpTemplate(
            payload
          );

        expect(
          result.parameters
        ).toEqual([
          {
            text:
              "Add a new health check-in",
          },
          {
            text:
              "Complete a new check-in so OrganHeal can compare your recent wellness signals.",
          },
        ]);
      }
    );

    it(
      "maps every supported follow-up purpose to a deterministic template name",
      () => {
        const mappings = [
          [
            "routine-continuity",
            "organheal_routine_continuity",
          ],
          [
            "complete-health-data",
            "organheal_complete_health_data",
          ],
          [
            "complete-report-analysis",
            "organheal_complete_report_analysis",
          ],
          [
            "repeat-checkin",
            "organheal_repeat_checkin",
          ],
          [
            "review-health-plan",
            "organheal_review_health_plan",
          ],
          [
            "professional-review",
            "organheal_professional_review",
          ],
          [
            "urgent-review",
            "organheal_urgent_review",
          ],
        ] as const;

        for (
          const [
            purpose,
            templateName,
          ] of mappings
        ) {
          const payload =
            createPayload({
              delivery: {
                ...createPayload()
                  .delivery,

                purpose,
              },
            });

          expect(
            buildWhatsAppFollowUpTemplate(
              payload
            ).templateName
          ).toBe(
            templateName
          );
        }
      }
    );

    it(
      "rejects an empty title",
      () => {
        const payload =
          createPayload({
            delivery: {
              ...createPayload()
                .delivery,

              title:
                "   ",
            },
          });

        expect(
          () =>
            buildWhatsAppFollowUpTemplate(
              payload
            )
        ).toThrow(
          "Follow-up title is required"
        );
      }
    );

    it(
      "rejects an empty body",
      () => {
        const payload =
          createPayload({
            delivery: {
              ...createPayload()
                .delivery,

              body:
                "   ",
            },
          });

        expect(
          () =>
            buildWhatsAppFollowUpTemplate(
              payload
            )
        ).toThrow(
          "Follow-up body is required"
        );
      }
    );
  }
);
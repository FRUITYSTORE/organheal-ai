import {
  describe,
  expect,
  it,
} from "vitest";

import {
  presentHistoryModuleName,
  presentHistoryTimelineEvent,
} from "@/lib/services/history/history-presentation";

import type {
  HealthTimelineEvent,
} from "@/lib/health-intelligence/engines/health-timeline.engine";

function buildEvent(
  overrides:
    Partial<HealthTimelineEvent>
): HealthTimelineEvent {
  return {
    id:
      "event-1",

    type:
      "assessment",

    severity:
      "information",

    title:
      "English title",

    description:
      "English description",

    date:
      "2026-09-12T10:00:00.000Z",

    organ:
      null,

    score:
      null,

    href:
      "/history",

    metadata:
      {},

    ...overrides,
  };
}

describe(
  "history presentation localization",
  () => {
    it(
      "preserves English timeline presentation",
      () => {
        const event =
          buildEvent({
            title:
              "Medical report uploaded",

            description:
              "A medical report was added to your health record.",

            type:
              "report",
          });

        expect(
          presentHistoryTimelineEvent(
            event,
            "en"
          )
        ).toEqual({
          title:
            "Medical report uploaded",

          subtitle:
            "A medical report was added to your health record.",
        });
      }
    );

    it(
      "localizes supported module names",
      () => {
        expect(
          presentHistoryModuleName(
            "Heart",
            "ar"
          )
        ).toBe(
          "القلب"
        );

        expect(
          presentHistoryModuleName(
            "Kidney",
            "ar"
          )
        ).toBe(
          "الكلى"
        );

        expect(
          presentHistoryModuleName(
            "Brain",
            "ar"
          )
        ).toBe(
          "الدماغ"
        );
      }
    );

    it(
      "uses a safe Arabic fallback for unknown module names",
      () => {
        expect(
          presentHistoryModuleName(
            "Unknown Module",
            "ar"
          )
        ).toBe(
          "مجال صحي"
        );
      }
    );

    it(
      "localizes assessment events using structured values",
      () => {
        const event =
          buildEvent({
            type:
              "assessment",

            organ:
              "Heart",

            score:
              72,

            metadata: {
              status:
                "Moderate Risk",
            },
          });

        expect(
          presentHistoryTimelineEvent(
            event,
            "ar"
          )
        ).toEqual({
          title:
            "تقييم القلب",

          subtitle:
            "تم حفظ مؤشر صحة القلب بقيمة 72/100.",
        });
      }
    );

    it(
      "localizes check-in events",
      () => {
        const event =
          buildEvent({
            type:
              "checkin",

            score:
              68,
          });

        expect(
          presentHistoryTimelineEvent(
            event,
            "ar"
          )
        ).toEqual({
          title:
            "تم إكمال التحديث الصحي اليومي",

          subtitle:
            "كان مؤشر العافية 68/100.",
        });
      }
    );

    it(
      "localizes follow-up events from structured metadata",
      () => {
        const event =
          buildEvent({
            type:
              "followup",

            metadata: {
              followUpWindowDays:
                7,
            },
          });

        expect(
          presentHistoryTimelineEvent(
            event,
            "ar"
          )
        ).toEqual({
          title:
            "حان موعد المتابعة الصحية",

          subtitle:
            "مرّ أكثر من 7 أيام منذ آخر تحديث صحي يومي. أكمل تحديثًا جديدًا لتحديث مسار صحتك الحالي.",
        });
      }
    );

    it(
      "localizes report events while preserving the filename",
      () => {
        const event =
          buildEvent({
            type:
              "report",

            metadata: {
              fileName:
                "lab-results.pdf",
            },
          });

        expect(
          presentHistoryTimelineEvent(
            event,
            "ar"
          )
        ).toEqual({
          title:
            "تم رفع تقرير طبي",

          subtitle:
            "lab-results.pdf أُضيف إلى سجلك الصحي.",
        });
      }
    );

    it(
      "localizes analysis events",
      () => {
        const event =
          buildEvent({
            type:
              "analysis",
          });

        expect(
          presentHistoryTimelineEvent(
            event,
            "ar"
          )
        ).toEqual({
          title:
            "تم حفظ التحليل الصحي",

          subtitle:
            "تم إنشاء نتيجة تحليل صحي منظمة وحفظها في سجلك.",
        });
      }
    );

    it(
      "localizes improving trend events using structured direction",
      () => {
        const event =
          buildEvent({
            type:
              "trend",

            description:
              "English trend summary that should not be exposed.",

            metadata: {
              direction:
                "improving",
            },
          });

        const result =
          presentHistoryTimelineEvent(
            event,
            "ar"
          );

        expect(
          result
        ).toEqual({
          title:
            "تم تحديث الاتجاه الصحي",

          subtitle:
            "تشير أحدث البيانات المتاحة إلى اتجاه صحي متحسن.",
        });

        expect(
          result.subtitle
        ).not.toContain(
          "English trend summary"
        );
      }
    );

    it(
      "localizes worsening trend events",
      () => {
        const event =
          buildEvent({
            type:
              "trend",

            metadata: {
              direction:
                "worsening",
            },
          });

        expect(
          presentHistoryTimelineEvent(
            event,
            "ar"
          )
        ).toEqual({
          title:
            "تم تحديث الاتجاه الصحي",

          subtitle:
            "تشير أحدث البيانات المتاحة إلى اتجاه صحي يحتاج إلى الانتباه والمتابعة.",
        });
      }
    );
  }
);
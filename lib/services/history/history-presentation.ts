import type {
  HealthTimelineEvent,
} from "@/lib/health-intelligence/engines/health-timeline.engine";

export type HistoryPresentationLanguage =
  | "en"
  | "ar";

export type HistoryTimelinePresentation = {
  title: string;
  subtitle: string;
};

function cleanValue(
  value:
    | string
    | null
    | undefined
): string {
  return value?.trim() ?? "";
}

function hasArabicText(
  value: string
): boolean {
  return /[\u0600-\u06FF]/.test(
    value
  );
}

function getMetadataString(
  event: HealthTimelineEvent,
  key: string
): string {
  const value =
    event.metadata[key];

  return typeof value === "string"
    ? value.trim()
    : "";
}

function getMetadataNumber(
  event: HealthTimelineEvent,
  key: string
): number | null {
  const value =
    event.metadata[key];

  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

export function presentHistoryModuleName(
  value:
    | string
    | null
    | undefined,
  language:
    HistoryPresentationLanguage
): string {
  const clean =
    cleanValue(value);

  if (language !== "ar") {
    return clean || "Health";
  }

  if (!clean) {
    return "الصحة العامة";
  }

  if (hasArabicText(clean)) {
    return clean;
  }

  const normalized =
    clean.toLowerCase();

  if (
    normalized.includes("heart")
  ) {
    return "القلب";
  }

  if (
    normalized.includes("lung")
  ) {
    return "الرئة";
  }

  if (
    normalized.includes("kidney")
  ) {
    return "الكلى";
  }

  if (
    normalized.includes("liver")
  ) {
    return "الكبد";
  }

  if (
    normalized.includes("brain")
  ) {
    return "الدماغ";
  }

  if (
    normalized.includes("metabolic")
  ) {
    return "الأيض";
  }

  return "مجال صحي";
}

export function presentHistoryTimelineEvent(
  event:
    HealthTimelineEvent,
  language:
    HistoryPresentationLanguage
): HistoryTimelinePresentation {
  if (language !== "ar") {
    return {
      title:
        event.title,

      subtitle:
        event.description,
    };
  }

  switch (event.type) {
    case "assessment": {
      const moduleName =
        presentHistoryModuleName(
          event.organ,
          language
        );

      return {
        title:
          `تقييم ${moduleName}`,

        subtitle:
          typeof event.score ===
            "number"
            ? `تم حفظ مؤشر صحة ${moduleName} بقيمة ${event.score}/100.`
            : `تم حفظ تقييم جديد لـ${moduleName}.`,
      };
    }

    case "checkin":
      return {
        title:
          "تم إكمال التحديث الصحي اليومي",

        subtitle:
          typeof event.score ===
            "number"
            ? `كان مؤشر العافية ${event.score}/100.`
            : "تم حفظ تحديث جديد عن حالتك الصحية اليومية.",
      };

    case "followup": {
      const followUpWindowDays =
        getMetadataNumber(
          event,
          "followUpWindowDays"
        ) ?? 7;

      return {
        title:
          "حان موعد المتابعة الصحية",

        subtitle:
          `مرّ أكثر من ${followUpWindowDays} أيام منذ آخر تحديث صحي يومي. أكمل تحديثًا جديدًا لتحديث مسار صحتك الحالي.`,
      };
    }

    case "report": {
      const fileName =
        getMetadataString(
          event,
          "fileName"
        );

      return {
        title:
          "تم رفع تقرير طبي",

        subtitle:
          fileName
            ? `${fileName} أُضيف إلى سجلك الصحي.`
            : "أُضيف تقرير طبي إلى سجلك الصحي.",
      };
    }

    case "analysis":
      return {
        title:
          "تم حفظ التحليل الصحي",

        subtitle:
          "تم إنشاء نتيجة تحليل صحي منظمة وحفظها في سجلك.",
      };

    case "trend": {
      const direction =
        getMetadataString(
          event,
          "direction"
        ).toLowerCase();

      if (
        direction ===
        "improving"
      ) {
        return {
          title:
            "تم تحديث الاتجاه الصحي",

          subtitle:
            "تشير أحدث البيانات المتاحة إلى اتجاه صحي متحسن.",
        };
      }

      if (
        direction ===
        "worsening"
      ) {
        return {
          title:
            "تم تحديث الاتجاه الصحي",

          subtitle:
            "تشير أحدث البيانات المتاحة إلى اتجاه صحي يحتاج إلى الانتباه والمتابعة.",
        };
      }

      if (
        direction === "stable" ||
        direction === "unchanged"
      ) {
        return {
          title:
            "تم تحديث الاتجاه الصحي",

          subtitle:
            "تشير أحدث البيانات المتاحة إلى اتجاه صحي مستقر.",
        };
      }

      return {
        title:
          "تم تحديث الاتجاه الصحي",

        subtitle:
          "تم تحديث اتجاه صحتك استنادًا إلى أحدث البيانات المتاحة.",
      };
    }

    default:
      return {
        title:
          "حدث صحي",

        subtitle:
          "تمت إضافة معلومة جديدة إلى مسار صحتك.",
      };
  }
}
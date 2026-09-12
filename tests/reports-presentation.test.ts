import {
  describe,
  expect,
  it,
} from "vitest";

import {
  formatReportDate,
  presentReportRiskLevel,
  presentReportStatus,
  presentReportSummary,
  presentReportType,
} from "@/lib/services/reports/reports-presentation";

describe(
  "reports presentation localization",
  () => {
    it(
      "preserves English report presentation",
      () => {
        expect(
          presentReportStatus(
            "Generated",
            "en"
          )
        ).toBe("Generated");

        expect(
          presentReportType(
            "Laboratory Report",
            "en"
          )
        ).toBe(
          "Laboratory Report"
        );

        expect(
          presentReportRiskLevel(
            "High",
            "en"
          )
        ).toBe("High");

        expect(
          presentReportSummary(
            "Saved clinical summary.",
            "en"
          )
        ).toBe(
          "Saved clinical summary."
        );
      }
    );

    it(
      "localizes deterministic report statuses into Arabic",
      () => {
        expect(
          presentReportStatus(
            "Pending",
            "ar"
          )
        ).toBe(
          "قيد الانتظار"
        );

        expect(
          presentReportStatus(
            "Processing",
            "ar"
          )
        ).toBe(
          "قيد المعالجة"
        );

        expect(
          presentReportStatus(
            "Generated",
            "ar"
          )
        ).toBe(
          "مكتمل"
        );

        expect(
          presentReportStatus(
            "Failed",
            "ar"
          )
        ).toBe(
          "تعذر التنفيذ"
        );
      }
    );

    it(
      "localizes report types into Arabic",
      () => {
        expect(
          presentReportType(
            "Laboratory Report",
            "ar"
          )
        ).toBe(
          "تقرير مختبر"
        );

        expect(
          presentReportType(
            "Radiology Report",
            "ar"
          )
        ).toBe(
          "تقرير أشعة"
        );

        expect(
          presentReportType(
            "Cardiology Report",
            "ar"
          )
        ).toBe(
          "تقرير قلب"
        );

        expect(
          presentReportType(
            "Clinical Summary",
            "ar"
          )
        ).toBe(
          "ملخص سريري"
        );
      }
    );

    it(
      "localizes report risk levels into Arabic",
      () => {
        expect(
          presentReportRiskLevel(
            "Low",
            "ar"
          )
        ).toBe(
          "منخفض"
        );

        expect(
          presentReportRiskLevel(
            "Moderate",
            "ar"
          )
        ).toBe(
          "متوسط"
        );

        expect(
          presentReportRiskLevel(
            "High",
            "ar"
          )
        ).toBe(
          "مرتفع"
        );

        expect(
          presentReportRiskLevel(
            "Critical",
            "ar"
          )
        ).toBe(
          "حرج"
        );

        expect(
          presentReportRiskLevel(
            "review",
            "ar"
          )
        ).toBe(
          "يحتاج مراجعة"
        );
      }
    );

    it(
      "preserves an already Arabic summary",
      () => {
        expect(
          presentReportSummary(
            "ملخص التقرير الصحي محفوظ.",
            "ar"
          )
        ).toBe(
          "ملخص التقرير الصحي محفوظ."
        );
      }
    );

    it(
      "does not expose an English clinical summary in Arabic presentation",
      () => {
        const result =
          presentReportSummary(
            "The patient's LDL is elevated and requires follow-up.",
            "ar"
          );

        expect(
          result
        ).toBe(
          "يوجد تحليل محفوظ لهذا التقرير. افتح التحليل لمراجعة التفاصيل الصحية باللغة المناسبة."
        );

        expect(
          result
        ).not.toContain(
          "LDL is elevated"
        );
      }
    );

    it(
      "formats dates according to the selected presentation language",
      () => {
        const value =
          "2026-09-12T08:30:00.000Z";

        const english =
          formatReportDate(
            value,
            "en"
          );

        const arabic =
          formatReportDate(
            value,
            "ar"
          );

        expect(
          english
        ).not.toBe("—");

        expect(
          arabic
        ).not.toBe("—");

        expect(
          english.length
        ).toBeGreaterThan(0);

        expect(
          arabic.length
        ).toBeGreaterThan(0);
      }
    );

    it(
      "uses safe fallbacks for missing values",
      () => {
        expect(
          presentReportStatus(
            null,
            "ar"
          )
        ).toBe(
          "قيد الانتظار"
        );

        expect(
          presentReportType(
            null,
            "ar"
          )
        ).toBe(
          "تقرير طبي"
        );

        expect(
          presentReportRiskLevel(
            null,
            "ar"
          )
        ).toBe(
          "غير محدد"
        );

        expect(
          presentReportSummary(
            null,
            "ar"
          )
        ).toBe("");
      }
    );
  }
);
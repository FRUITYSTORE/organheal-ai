import {
  describe,
  expect,
  it,
} from "vitest";

import {
  presentDoctorPortalClinicalText,
} from "@/lib/services/doctor-portal/doctor-portal-presentation";

describe(
  "doctor portal presentation localization",
  () => {
    it(
      "preserves English clinical text when language is English",
      () => {
        expect(
          presentDoctorPortalClinicalText(
            "Saved report summary.",
            "en",
            "report-summary"
          )
        ).toBe(
          "Saved report summary."
        );

        expect(
          presentDoctorPortalClinicalText(
            "Saved recommendations.",
            "en",
            "recommendations"
          )
        ).toBe(
          "Saved recommendations."
        );

        expect(
          presentDoctorPortalClinicalText(
            "Saved doctor brief.",
            "en",
            "doctor-brief"
          )
        ).toBe(
          "Saved doctor brief."
        );
      }
    );

    it(
      "preserves already Arabic clinical text",
      () => {
        expect(
          presentDoctorPortalClinicalText(
            "ملخص التقرير محفوظ.",
            "ar",
            "report-summary"
          )
        ).toBe(
          "ملخص التقرير محفوظ."
        );

        expect(
          presentDoctorPortalClinicalText(
            "توصيات صحية محفوظة.",
            "ar",
            "recommendations"
          )
        ).toBe(
          "توصيات صحية محفوظة."
        );
      }
    );

    it(
      "does not expose English report summaries in Arabic presentation",
      () => {
        const result =
          presentDoctorPortalClinicalText(
            "The patient's LDL is elevated and follow-up is recommended.",
            "ar",
            "report-summary"
          );

        expect(
          result
        ).toBe(
          "يوجد ملخص محفوظ لهذا التقرير. افتح تحليل التقرير لمراجعة التفاصيل الصحية باللغة المناسبة."
        );

        expect(
          result
        ).not.toContain(
          "LDL is elevated"
        );
      }
    );

    it(
      "does not expose English recommendations in Arabic presentation",
      () => {
        const result =
          presentDoctorPortalClinicalText(
            "Review this finding with your healthcare professional.",
            "ar",
            "recommendations"
          );

        expect(
          result
        ).toBe(
          "توجد توصيات محفوظة لهذا التقرير. افتح تحليل التقرير لمراجعة التوصيات الصحية باللغة المناسبة."
        );

        expect(
          result
        ).not.toContain(
          "healthcare professional"
        );
      }
    );

    it(
      "does not expose an English legacy doctor brief in Arabic presentation",
      () => {
        const result =
          presentDoctorPortalClinicalText(
            "Doctor-ready summary based on the available health information.",
            "ar",
            "doctor-brief"
          );

        expect(
          result
        ).toBe(
          "يوجد ملخص طبي محفوظ. راجع التحليل أو ملخص الطبيب لعرض المحتوى باللغة المناسبة."
        );

        expect(
          result
        ).not.toContain(
          "Doctor-ready"
        );
      }
    );

    it(
      "uses localized fallbacks for missing Arabic content",
      () => {
        expect(
          presentDoctorPortalClinicalText(
            null,
            "ar",
            "report-summary"
          )
        ).toBe(
          "يوجد ملخص محفوظ لهذا التقرير. افتح تحليل التقرير لمراجعة التفاصيل الصحية باللغة المناسبة."
        );

        expect(
          presentDoctorPortalClinicalText(
            "",
            "ar",
            "recommendations"
          )
        ).toBe(
          "توجد توصيات محفوظة لهذا التقرير. افتح تحليل التقرير لمراجعة التوصيات الصحية باللغة المناسبة."
        );

        expect(
          presentDoctorPortalClinicalText(
            undefined,
            "ar",
            "doctor-brief"
          )
        ).toBe(
          "يوجد ملخص طبي محفوظ. راجع التحليل أو ملخص الطبيب لعرض المحتوى باللغة المناسبة."
        );
      }
    );

    it(
      "uses English fallbacks when content is missing in English presentation",
      () => {
        expect(
          presentDoctorPortalClinicalText(
            null,
            "en",
            "report-summary"
          )
        ).toBe(
          "No generated report summary is available yet."
        );

        expect(
          presentDoctorPortalClinicalText(
            null,
            "en",
            "recommendations"
          )
        ).toBe(
          "No saved report-specific recommendations are available yet."
        );

        expect(
          presentDoctorPortalClinicalText(
            null,
            "en",
            "doctor-brief"
          )
        ).toBe(
          "No saved report-specific doctor brief is available yet."
        );
      }
    );
  }
);
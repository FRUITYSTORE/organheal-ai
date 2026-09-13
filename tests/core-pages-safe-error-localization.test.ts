import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

function readPage(
  path: string
) {
  return readFileSync(
    resolve(
      process.cwd(),
      path
    ),
    "utf8"
  );
}

const dashboard =
  readPage(
    "app/dashboard/page.tsx"
  );

const healthPlan =
  readPage(
    "app/health-plan/page.tsx"
  );

const doctorPortal =
  readPage(
    "app/doctor-portal/page.tsx"
  );

const reports =
  readPage(
    "app/reports/page.tsx"
  );

const intelligence =
  readPage(
    "app/intelligence/page.tsx"
  );

describe(
  "core pages safe localized errors",
  () => {
    it(
      "does not expose dashboard database errors",
      () => {
        expect(
          dashboard
        ).not.toContain(
          '"Database error: " + error.message'
        );

        expect(
          dashboard
        ).toContain(
          "تعذر تحميل بيانات لوحة التحكم"
        );
      }
    );

    it(
      "does not expose health plan database errors",
      () => {
        expect(
          healthPlan
        ).not.toContain(
          '"Database error: " + error.message'
        );

        expect(
          healthPlan
        ).toContain(
          "تعذر تحميل الخطة الصحية"
        );
      }
    );

    it(
      "does not expose doctor portal backend errors",
      () => {
        expect(
          doctorPortal
        ).not.toContain(
          "error.message"
        );

        expect(
          doctorPortal
        ).not.toContain(
          "Database error:"
        );

        expect(
          doctorPortal
        ).toContain(
          "تعذر تحميل بيانات التحضير للطبيب"
        );
      }
    );

    it(
      "does not expose report-loading backend errors",
      () => {
        expect(
          reports
        ).not.toContain(
          "? error.message"
        );

        expect(
          reports
        ).toContain(
          "Could not load reports right now"
        );

        expect(
          reports
        ).toContain(
          "تعذر تحميل التقارير حاليًا"
        );
      }
    );

    it(
      "does not expose raw intelligence runtime errors",
      () => {
        expect(
          intelligence
        ).not.toContain(
          "alert(sessionResult.errorMessage)"
        );

        expect(
          intelligence
        ).not.toContain(
          "savedResultRuntime.errorMessage"
        );

        expect(
          intelligence
        ).not.toContain(
          "generationResult.errorMessage"
        );

        expect(
          intelligence
        ).not.toContain(
          "error instanceof Error ? error.message"
        );
      }
    );

    it(
      "provides localized safe intelligence failures",
      () => {
        expect(
          intelligence
        ).toContain(
          "تعذر فتح التقرير حاليًا"
        );

        expect(
          intelligence
        ).toContain(
          "تعذر التحقق من جلسة المستخدم"
        );

        expect(
          intelligence
        ).toContain(
          "تعذر تحميل نتيجة التحليل الصحي المحفوظة"
        );

        expect(
          intelligence
        ).toContain(
          "تعذر إنشاء التحليل الصحي للتقرير"
        );

        expect(
          intelligence
        ).toContain(
          "تعذر حفظ نتيجة التحليل الصحي"
        );
      }
    );
  }
);
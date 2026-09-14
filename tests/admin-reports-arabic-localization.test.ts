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

const source =
  readFileSync(
    resolve(
      process.cwd(),
      "app/admin/reports/page.tsx"
    ),
    "utf8"
  );

describe(
  "admin reports Arabic localization",
  () => {
    it(
      "does not expose raw database errors",
      () => {
        expect(
          source
        ).not.toContain(
          "error.message"
        );

        expect(
          source
        ).not.toContain(
          "console.error(error)"
        );

        expect(
          source
        ).toMatch(
          /setErrorMessage\(\s*"load_failed"\s*\)/
        );
      }
    );

    it(
      "keeps authentication and authorization failures as safe presentation states",
      () => {
        expect(
          source
        ).toMatch(
          /setErrorMessage\(\s*"authentication_required"\s*\)/
        );

        expect(
          source
        ).toMatch(
          /setErrorMessage\(\s*"admin_required"\s*\)/
        );

        expect(
          source
        ).toContain(
          "تسجيل الدخول مطلوب"
        );

        expect(
          source
        ).toContain(
          "صلاحية المشرف مطلوبة"
        );

        expect(
          source
        ).toContain(
          "لا يملك حسابك صلاحية الوصول إلى لوحة إدارة التقارير."
        );
      }
    );

    it(
      "localizes report statuses for Arabic presentation",
      () => {
        expect(
          source
        ).toContain(
          "localizeAdminStatus("
        );

        expect(
          source
        ).toContain(
          '"بانتظار"'
        );

        expect(
          source
        ).toContain(
          '"مكتمل"'
        );

        expect(
          source
        ).toContain(
          '"فشل"'
        );

        expect(
          source
        ).toContain(
          '"قيد الاستخراج"'
        );
      }
    );

    it(
      "does not directly render raw status values",
      () => {
        expect(
          source
        ).not.toContain(
          'report.extraction_status || text("Pending", "بانتظار")'
        );

        expect(
          source
        ).not.toContain(
          'report.analysis_status || text("Pending", "بانتظار")'
        );
      }
    );

    it(
      "protects English extracted clinical text in Arabic UI",
      () => {
        expect(
          source
        ).toContain(
          "presentAdminExtractedText("
        );

        expect(
          source
        ).toContain(
          "النص المستخرج متاح ويمكن مراجعته عند استخدام الواجهة الإنجليزية."
        );

        expect(
          source
        ).not.toContain(
          "{report.extracted_text ||"
        );
      }
    );

    it(
      "localizes report type date and text length presentation",
      () => {
        expect(
          source
        ).toContain(
          "presentAdminReportType("
        );

        expect(
          source
        ).toContain(
          "formatAdminDate("
        );

        expect(
          source
        ).toContain(
          "حرفًا"
        );
      }
    );

    it(
      "presents the protected admin security state in Arabic",
      () => {
        expect(
          source
        ).not.toContain(
          "صلاحيات Admin"
        );

        expect(
          source
        ).not.toContain(
          "صلاحيات كاملة للمشرف"
        );

        expect(
          source
        ).toContain(
          "وصول إداري محمي"
        );

        expect(
          source
        ).toContain(
          "يتم تحميل بيانات التقارير من خلال نقطة وصول إدارية محمية ومتحقق منها على الخادم."
        );
      }
    );

    it(
      "does not show the empty reports state after an authorization failure",
      () => {
        expect(
          source
        ).toMatch(
          /errorMessage\s*\?\s*null\s*:\s*reports\.length\s*===\s*0/
        );
      }
    );
  }
);
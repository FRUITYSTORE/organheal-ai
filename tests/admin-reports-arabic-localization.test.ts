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
        ).toContain(
          'setErrorMessage("load_failed")'
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
      "removes English Admin wording from the Arabic security note",
      () => {
        expect(
          source
        ).not.toContain(
          "صلاحيات Admin"
        );

        expect(
          source
        ).toContain(
          "صلاحيات كاملة للمشرف"
        );
      }
    );
  }
);
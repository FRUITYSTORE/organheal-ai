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

const reportsLearningPage =
  readFileSync(
    resolve(
      process.cwd(),
      "app/library/reports/page.tsx"
    ),
    "utf8"
  );

describe(
  "report learning localization",
  () => {
    it(
      "supports the shared language preference",
      () => {
        expect(
          reportsLearningPage
        ).toContain(
          '"organheal-language"'
        );

        expect(
          reportsLearningPage
        ).toContain(
          '"organheal-language-change"'
        );

        expect(
          reportsLearningPage
        ).toContain(
          'language === "ar"'
        );
      }
    );

    it(
      "provides Arabic report-learning steps",
      () => {
        expect(
          reportsLearningPage
        ).toContain(
          "حدد النتيجة الأهم"
        );

        expect(
          reportsLearningPage
        ).toContain(
          "افهم ما تعنيه النتيجة"
        );

        expect(
          reportsLearningPage
        ).toContain(
          "اربط النتيجة بصحتك"
        );

        expect(
          reportsLearningPage
        ).toContain(
          "حضّر سؤالك التالي"
        );
      }
    );

    it(
      "localizes report actions",
      () => {
        expect(
          reportsLearningPage
        ).toContain(
          "فتح تقاريري"
        );

        expect(
          reportsLearningPage
        ).toContain(
          "رفع تقرير"
        );

        expect(
          reportsLearningPage
        ).toContain(
          'href: "/reports"'
        );

        expect(
          reportsLearningPage
        ).toContain(
          'href: "/lab-upload"'
        );
      }
    );

    it(
      "localizes page direction",
      () => {
        expect(
          reportsLearningPage
        ).toContain(
          'dir={isArabic ? "rtl" : "ltr"}'
        );

        expect(
          reportsLearningPage
        ).toContain(
          'lang={isArabic ? "ar" : "en"}'
        );
      }
    );

    it(
      "does not present the learning experience as a future-only feature",
      () => {
        expect(
          reportsLearningPage
        ).not.toContain(
          "Later, this page will recommend"
        );

        expect(
          reportsLearningPage
        ).toContain(
          "Connect report learning with your personal health context."
        );
      }
    );
  }
);
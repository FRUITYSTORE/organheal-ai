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
      "app/checkin/page.tsx"
    ),
    "utf8"
  );

describe(
  "check-in Arabic localization",
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
          "Database error:"
        );

        expect(
          source
        ).not.toContain(
          "خطأ في قاعدة البيانات:"
        );
      }
    );

    it(
      "keeps mood presentation localized",
      () => {
        expect(
          source
        ).toContain(
          "localizeMood(item.mood, isArabic)"
        );

        expect(
          source
        ).toContain(
          'ar: "ممتاز"'
        );

        expect(
          source
        ).toContain(
          'ar: "جيد"'
        );

        expect(
          source
        ).toContain(
          'ar: "متوسط"'
        );

        expect(
          source
        ).toContain(
          'ar: "ضعيف"'
        );
      }
    );

    it(
      "uses Arabic daily-update terminology",
      () => {
        expect(
          source
        ).toContain(
          "التحديث اليومي"
        );

        expect(
          source
        ).toContain(
          "التحديثات اليومية"
        );
      }
    );

    it(
      "does not keep English Check-In wording inside Arabic strings",
      () => {
        const stringLiterals =
          source.match(
            /(["'`])(?:\\.|(?!\1)[\s\S])*\1/g
          ) ?? [];

        const suspiciousArabicStrings =
          stringLiterals.filter(
            (value) =>
              /[\u0600-\u06FF]/.test(
                value
              ) &&
              /Check-Ins?|Check-In/i.test(
                value
              )
          );

        expect(
          suspiciousArabicStrings
        ).toEqual(
          []
        );
      }
    );
  }
);
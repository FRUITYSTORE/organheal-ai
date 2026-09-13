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

const organsPage =
  readFileSync(
    resolve(
      process.cwd(),
      "app/library/organs/page.tsx"
    ),
    "utf8"
  );

describe(
  "organ learning localization",
  () => {
    it(
      "supports the shared Arabic language preference",
      () => {
        expect(
          organsPage
        ).toContain(
          '"organheal-language"'
        );

        expect(
          organsPage
        ).toContain(
          '"organheal-language-change"'
        );

        expect(
          organsPage
        ).toContain(
          'language === "ar"'
        );
      }
    );

    it(
      "provides Arabic organ labels",
      () => {
        expect(
          organsPage
        ).toContain("القلب");

        expect(
          organsPage
        ).toContain("الكلى");

        expect(
          organsPage
        ).toContain("الكبد");

        expect(
          organsPage
        ).toContain("الرئتان");

        expect(
          organsPage
        ).toContain("الدماغ");

        expect(
          organsPage
        ).toContain(
          "الصحة الأيضية"
        );
      }
    );

    it(
      "localizes the learning page presentation",
      () => {
        expect(
          organsPage
        ).toContain(
          "أجهزة الجسم والأعضاء"
        );

        expect(
          organsPage
        ).toContain(
          "العودة إلى مركز التعلّم"
        );

        expect(
          organsPage
        ).toContain(
          "التعلّم حسب العضو"
        );
      }
    );

    it(
      "preserves all current organ destinations",
      () => {
        expect(
          organsPage
        ).toContain(
          'href: "/library/organs/heart"'
        );

        expect(
          organsPage
        ).toContain(
          'href: "/kidney"'
        );

        expect(
          organsPage
        ).toContain(
          'href: "/liver"'
        );

        expect(
          organsPage
        ).toContain(
          'href: "/lung"'
        );

        expect(
          organsPage
        ).toContain(
          'href: "/brain"'
        );

        expect(
          organsPage
        ).toContain(
          'href: "/metabolic"'
        );
      }
    );

    it(
      "applies localized document direction",
      () => {
        expect(
          organsPage
        ).toContain(
          'dir={isArabic ? "rtl" : "ltr"}'
        );

        expect(
          organsPage
        ).toContain(
          'lang={isArabic ? "ar" : "en"}'
        );
      }
    );
  }
);
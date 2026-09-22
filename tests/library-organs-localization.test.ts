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
      "preserves all current organ destinations, and only sends Heart to a real learning page",
      () => {
        // Heart is the only organ with a written learning page. Every other
        // "Learn" link would silently open the risk-assessment form instead
        // — see the site-manager fix that replaced a single ambiguous
        // `href` with separate `learnHref`/`assessHref` fields.
        expect(
          organsPage
        ).toContain(
          'learnHref: "/library/organs/heart"'
        );

        expect(
          organsPage
        ).not.toContain(
          'learnHref: "/kidney"'
        );

        expect(
          organsPage
        ).not.toContain(
          'learnHref: "/liver"'
        );

        expect(
          organsPage
        ).not.toContain(
          'learnHref: "/lung"'
        );

        expect(
          organsPage
        ).not.toContain(
          'learnHref: "/brain"'
        );

        expect(
          organsPage
        ).not.toContain(
          'learnHref: "/metabolic"'
        );

        expect(
          organsPage
        ).toContain(
          'assessHref: "/heart"'
        );

        expect(
          organsPage
        ).toContain(
          'assessHref: "/kidney"'
        );

        expect(
          organsPage
        ).toContain(
          'assessHref: "/liver"'
        );

        expect(
          organsPage
        ).toContain(
          'assessHref: "/lung"'
        );

        expect(
          organsPage
        ).toContain(
          'assessHref: "/brain"'
        );

        expect(
          organsPage
        ).toContain(
          'assessHref: "/metabolic"'
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
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

const doctorPrepPage =
  readFileSync(
    resolve(
      process.cwd(),
      "app/library/doctor-prep/page.tsx"
    ),
    "utf8"
  );

describe(
  "doctor prep learning localization",
  () => {
    it(
      "supports the shared language preference",
      () => {
        expect(
          doctorPrepPage
        ).toContain(
          '"organheal-language"'
        );

        expect(
          doctorPrepPage
        ).toContain(
          '"organheal-language-change"'
        );

        expect(
          doctorPrepPage
        ).toContain(
          'language === "ar"'
        );
      }
    );

    it(
      "provides Arabic doctor-preparation steps",
      () => {
        expect(
          doctorPrepPage
        ).toContain(
          "حدد أهم ما يشغلك"
        );

        expect(
          doctorPrepPage
        ).toContain(
          "أحضر تقاريرك الحديثة"
        );

        expect(
          doctorPrepPage
        ).toContain(
          "اطرح أسئلة واضحة"
        );

        expect(
          doctorPrepPage
        ).toContain(
          "تأكد من خطة المتابعة"
        );
      }
    );

    it(
      "localizes the page presentation",
      () => {
        expect(
          doctorPrepPage
        ).toContain(
          "التحضير لزيارة الطبيب"
        );

        expect(
          doctorPrepPage
        ).toContain(
          "العودة إلى مركز التعلّم"
        );

        expect(
          doctorPrepPage
        ).toContain(
          "فتح التقارير"
        );
      }
    );

    it(
      "preserves the reports destination",
      () => {
        expect(
          doctorPrepPage
        ).toContain(
          'href="/reports"'
        );
      }
    );

    it(
      "uses localized page direction",
      () => {
        expect(
          doctorPrepPage
        ).toContain(
          'dir={isArabic ? "rtl" : "ltr"}'
        );

        expect(
          doctorPrepPage
        ).toContain(
          'lang={isArabic ? "ar" : "en"}'
        );
      }
    );

    it(
      "does not present doctor preparation as a future-only feature",
      () => {
        expect(
          doctorPrepPage
        ).not.toContain(
          "Later, OrganHeal will generate doctor questions"
        );

        expect(
          doctorPrepPage
        ).toContain(
          "Use your reports to prepare more useful questions."
        );
      }
    );
  }
);
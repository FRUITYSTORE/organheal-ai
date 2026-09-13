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

const libraryPage =
  readFileSync(
    resolve(
      process.cwd(),
      "app/library/page.tsx"
    ),
    "utf8"
  );

describe(
  "health learning hub architecture",
  () => {
    it(
      "uses broad health topics instead of organ-first learning",
      () => {
        expect(
          libraryPage
        ).toContain(
          "Symptoms & Conditions"
        );

        expect(
          libraryPage
        ).toContain(
          "Prevention & Lifestyle"
        );

        expect(
          libraryPage
        ).toContain(
          "Medications & Treatment Basics"
        );

        expect(
          libraryPage
        ).toContain(
          "Body Systems & Organs"
        );
      }
    );

    it(
      "keeps organ learning as one optional route",
      () => {
        expect(
          libraryPage
        ).toContain(
          'href: "/library/organs"'
        );

        expect(
          libraryPage
        ).toContain(
          "Explore health information by body system"
        );
      }
    );

    it(
      "makes the health-plan improvement action functional",
      () => {
        expect(
          libraryPage
        ).toContain(
          'href="/health-plan"'
        );

        expect(
          libraryPage
        ).toContain(
          "Improve My Health Plan"
        );

        expect(
          libraryPage
        ).toContain(
          "تحسين خطتي الصحية"
        );
      }
    );

    it(
      "uses explicit route destinations",
      () => {
        expect(
          libraryPage
        ).toContain(
          "href={route.href}"
        );

        expect(
          libraryPage
        ).not.toContain(
          'route.code === "ORG"'
        );
      }
    );

    it(
      "includes Arabic labels for the new topic-first experience",
      () => {
        expect(
          libraryPage
        ).toContain(
          "الأعراض والحالات الصحية"
        );

        expect(
          libraryPage
        ).toContain(
          "الوقاية ونمط الحياة"
        );

        expect(
          libraryPage
        ).toContain(
          "الأدوية"
        );

        expect(
          libraryPage
        ).toContain(
          "أجهزة الجسم والأعضاء"
        );
      }
    );
  }
);
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

const profileSource =
  readFileSync(
    resolve(
      process.cwd(),
      "app/profile/page.tsx"
    ),
    "utf8"
  );

const normalizedSource =
  profileSource.replace(
    /\s+/g,
    " "
  );

describe(
  "profile Arabic localization",
  () => {
    it(
      "does not contain corrupted Arabic mojibake",
      () => {
        expect(
          profileSource
        ).not.toMatch(
          /[ØÙ]/
        );
      }
    );

    it(
      "does not expose raw database errors to the user",
      () => {
        expect(
          profileSource
        ).not.toContain(
          "organError.message"
        );

        expect(
          profileSource
        ).not.toContain(
          "checkInError.message"
        );

        expect(
          profileSource
        ).not.toContain(
          "Database error:"
        );
      }
    );

    it(
      "uses a localized daily check-in label",
      () => {
        expect(
          normalizedSource
        ).toContain(
          'text("Check-In", "التحديث اليومي")'
        );
      }
    );

    it(
      "protects stored mood values before Arabic presentation",
      () => {
        const moodPresentations =
          normalizedSource.match(
            /localizeMood\(\s*dailyCheckIn\.mood\s*\)/g
          ) ?? [];

        expect(
          moodPresentations.length
        ).toBeGreaterThanOrEqual(
          2
        );
      }
    );

    it(
      "keeps known Arabic mood mappings",
      () => {
        expect(
          profileSource
        ).toContain(
          'Excellent: "ممتاز"'
        );

        expect(
          profileSource
        ).toContain(
          'Good: "جيد"'
        );

        expect(
          profileSource
        ).toContain(
          'Average: "متوسط"'
        );

        expect(
          profileSource
        ).toContain(
          'Poor: "ضعيف"'
        );
      }
    );

    it(
      "does not expose unknown English organ names in Arabic",
      () => {
        expect(
          profileSource
        ).toContain(
          'return "مجال صحي";'
        );
      }
    );

    it(
      "localizes the live health signal",
      () => {
        expect(
          profileSource
        ).toContain(
          "إشارة صحية مباشرة"
        );

        expect(
          profileSource
        ).toContain(
          "Live health signal"
        );
      }
    );
  }
);
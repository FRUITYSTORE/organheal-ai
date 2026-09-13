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

function readSource(
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

const learningHub =
  readSource(
    "app/library/page.tsx"
  );

const globalStyles =
  readSource(
    "app/globals.css"
  );

describe(
  "learning responsive layout",
  () => {
    it(
      "collapses the learning hero on tablet widths",
      () => {
        expect(
          learningHub
        ).toContain(
          "@media (max-width: 980px)"
        );

        expect(
          learningHub
        ).toContain(
          ".healthLearningHubPage .learningHero .ohHeroGrid"
        );

        expect(
          learningHub
        ).toContain(
          "grid-template-columns: 1fr;"
        );
      }
    );

    it(
      "reduces learning intent cards for tablet and mobile",
      () => {
        expect(
          learningHub
        ).toContain(
          "grid-template-columns: repeat(4, minmax(0, 1fr));"
        );

        expect(
          learningHub
        ).toContain(
          "grid-template-columns: repeat(2, minmax(0, 1fr));"
        );

        expect(
          learningHub
        ).toContain(
          "@media (max-width: 640px)"
        );
      }
    );

    it(
      "provides responsive shared grids for internal learning pages",
      () => {
        expect(
          globalStyles
        ).toContain(
          ".ohGrid.cols2"
        );

        expect(
          globalStyles
        ).toContain(
          ".ohGrid.cols3"
        );

        expect(
          globalStyles
        ).toContain(
          "@media (max-width: 980px)"
        );

        expect(
          globalStyles
        ).toContain(
          "@media (max-width: 680px)"
        );
      }
    );

    it(
      "uses a mobile-safe page container",
      () => {
        expect(
          globalStyles
        ).toContain(
          "width: min(100% - 22px, var(--oh-max-width));"
        );
      }
    );

    it(
      "expands button rows on mobile",
      () => {
        expect(
          globalStyles
        ).toContain(
          ".ohButtonRow > *"
        );

        expect(
          globalStyles
        ).toContain(
          "width: 100%;"
        );
      }
    );

    it(
      "supports right-to-left learning presentation",
      () => {
        expect(
          globalStyles
        ).toContain(
          '.ohPageShell[dir="rtl"]'
        );

        expect(
          learningHub
        ).toContain(
          '[dir="rtl"] .healthLearningHubPage'
        );
      }
    );
  }
);
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
      "app/lab-upload/page.tsx"
    ),
    "utf8"
  );

describe(
  "lab upload Arabic localization",
  () => {
    it(
      "does not expose raw Supabase errors",
      () => {
        expect(
          source
        ).not.toContain(
          "uploadError.message"
        );

        expect(
          source
        ).not.toContain(
          "signedUrlError.message"
        );

        expect(
          source
        ).not.toContain(
          "databaseError.message"
        );

        expect(
          source
        ).not.toContain(
          "Upload error:"
        );

        expect(
          source
        ).not.toContain(
          "Signed URL error:"
        );

        expect(
          source
        ).not.toContain(
          "Database error:"
        );
      }
    );

    it(
      "has Arabic unsupported-file presentation",
      () => {
        expect(
          source
        ).toContain(
          "صيغة الملف غير مدعومة"
        );
      }
    );

    it(
      "has Arabic oversized-file presentation",
      () => {
        expect(
          source
        ).toContain(
          "حجم الملف أكبر من"
        );
      }
    );

    it(
      "keeps the original filename visible in rejection messages",
      () => {
        expect(
          source
        ).toContain(
          "`${file.name} - صيغة الملف غير مدعومة`"
        );

        expect(
          source
        ).toContain(
          "`${file.name} - حجم الملف أكبر من ${MAX_FILE_SIZE_MB} MB`"
        );
      }
    );

    it(
      "preserves upload pipeline status values",
      () => {
        expect(
          source
        ).toContain(
          'analysis_status: "uploaded"'
        );

        expect(
          source
        ).toContain(
          'extraction_status: "Pending"'
        );

        expect(
          source
        ).toContain(
          'ai_status: "Pending"'
        );

        expect(
          source
        ).toContain(
          'risk_level: "pending"'
        );
      }
    );
  }
);
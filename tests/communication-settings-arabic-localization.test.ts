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
      "app/settings/communications/page.tsx"
    ),
    "utf8"
  );

describe(
  "communication settings Arabic localization",
  () => {
    it(
      "does not expose API payload errors to the user",
      () => {
        expect(
          source
        ).not.toContain(
          "payload.error ||"
        );

        expect(
          source
        ).toContain(
          '"load_failed"'
        );

        expect(
          source
        ).toContain(
          '"save_failed"'
        );

        expect(
          source
        ).toContain(
          "تعذر تحميل تفضيلات التواصل"
        );

        expect(
          source
        ).toContain(
          "تعذر حفظ تفضيلات التواصل"
        );
      }
    );

    it(
      "validates WhatsApp E.164 format before saving",
      () => {
        expect(
          source
        ).toContain(
          "/^\\+[1-9][0-9]{7,14}$/"
        );

        expect(
          source
        ).toContain(
          "أدخل رقم واتساب صحيحًا بصيغة E.164"
        );
      }
    );

    it(
      "localizes communication channel labels",
      () => {
        expect(
          source
        ).toContain(
          '"البريد الإلكتروني"'
        );

        expect(
          source
        ).toContain(
          '"واتساب"'
        );

        expect(
          source
        ).toContain(
          '"الإشعارات الفورية"'
        );
      }
    );

    it(
      "localizes switch accessibility labels",
      () => {
        expect(
          source
        ).toContain(
          '"إشعارات لوحة التحكم"'
        );

        expect(
          source
        ).toContain(
          '"إشعارات البريد الإلكتروني"'
        );

        expect(
          source
        ).toContain(
          '"إشعارات واتساب"'
        );
      }
    );

    it(
      "keeps WhatsApp verification and production status truthful",
      () => {
        expect(
          source
        ).toContain(
          '"الرقم موثق"'
        );

        expect(
          source
        ).toContain(
          '"التحقق غير مكتمل"'
        );

        expect(
          source
        ).toContain(
          '"الإرسال الإنتاجي غير مفعّل"'
        );
      }
    );

    it(
      "localizes the English language label in Arabic UI",
      () => {
        expect(
          source
        ).toContain(
          '"الإنجليزية"'
        );
      }
    );
  }
);
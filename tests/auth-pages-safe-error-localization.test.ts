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

function readPage(
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

const login =
  readPage(
    "app/login/page.tsx"
  );

const signup =
  readPage(
    "app/signup/page.tsx"
  );

const resetPassword =
  readPage(
    "app/reset-password/page.tsx"
  );

describe(
  "auth pages safe localized errors",
  () => {
    it(
      "does not expose raw login auth errors",
      () => {
        expect(
          login
        ).not.toContain(
          "showMessage(error.message"
        );

        expect(
          login
        ).toContain(
          "تعذر إعادة إرسال رسالة التأكيد"
        );

        expect(
          login
        ).toContain(
          "تعذر إرسال رابط إعادة تعيين كلمة المرور"
        );
      }
    );

    it(
      "does not expose raw signup lookup errors",
      () => {
        expect(
          signup
        ).not.toContain(
          "emailCheckError.message"
        );

        expect(
          signup
        ).not.toContain(
          "usernameCheckError.message"
        );

        expect(
          signup
        ).not.toContain(
          "showMessage(error.message"
        );
      }
    );

    it(
      "keeps signup failures localized",
      () => {
        expect(
          signup
        ).toContain(
          "تعذر التحقق من توفر البريد الإلكتروني"
        );

        expect(
          signup
        ).toContain(
          "تعذر التحقق من توفر اسم المستخدم"
        );

        expect(
          signup
        ).toContain(
          "تعذر إنشاء الحساب"
        );
      }
    );

    it(
      "does not expose reset-password backend messages",
      () => {
        expect(
          resetPassword
        ).not.toContain(
          "error.message ||"
        );

        expect(
          resetPassword
        ).toContain(
          "تعذر التحقق من رابط إعادة التعيين"
        );

        expect(
          resetPassword
        ).toContain(
          "تعذر تحديث كلمة المرور الآن"
        );
      }
    );
  }
);
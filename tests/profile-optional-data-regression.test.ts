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

const profilePage =
  readSource(
    "app/profile/page.tsx"
  );

describe(
  "profile optional data regression",
  () => {
    it(
      "tolerates a missing profile row without using strict single-row semantics",
      () => {
        expect(
          profilePage
        ).toMatch(
          /\.from\("profiles"\)[\s\S]*?\.maybeSingle\(\)/
        );

        expect(
          profilePage
        ).toContain(
          "if (profileError)"
        );
      }
    );

    it(
      "tolerates a missing latest daily check-in",
      () => {
        expect(
          profilePage
        ).toMatch(
          /\.from\("daily_checkins"\)[\s\S]*?\.limit\(1\)[\s\S]*?\.maybeSingle\(\)/
        );

        expect(
          profilePage
        ).toContain(
          "if (checkInError)"
        );

        expect(
          profilePage
        ).not.toContain(
          'checkInError.code !== "PGRST116"'
        );
      }
    );

    it(
      "keeps authenticated user data as the fallback when profile data is absent",
      () => {
        expect(
          profilePage
        ).toContain(
          'setEmail(profile?.email || user.email || "")'
        );

        expect(
          profilePage
        ).toContain(
          'setUsername(profile?.username || "")'
        );

        expect(
          profilePage
        ).toContain(
          "setMemberSince(profile?.created_at || null)"
        );
      }
    );
  }
);
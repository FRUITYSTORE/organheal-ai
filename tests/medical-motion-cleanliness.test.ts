import { expect, it } from "vitest";
import { cleanlinessTarget } from "./helpers/medical-motion-cleanliness";

it.each(["localhost", "127.0.0.1"])("accepts only the established isolated target on %s", host => {
  expect(cleanlinessTarget(`postgresql://test:test@${host}/organheal_ownership_test_step3c`).database)
    .toBe("organheal_ownership_test_step3c");
});
it.each([undefined, "invalid", "https://localhost/organheal_ownership_test_step3c",
  "postgresql://example.com/organheal_ownership_test_step3c", "postgresql://localhost/production",
  "postgresql://localhost/organheal_ownership_test_other", "postgresql://localhost/organheal_ownership_test_step3c?host=example.com",
  "postgresql://localhost/organheal_ownership_test_step3c#remote"])("rejects unsafe configuration case %#", value => {
  expect(() => cleanlinessTarget(value)).toThrow("ISOLATED_DATABASE_GUARD_FAILED");
});

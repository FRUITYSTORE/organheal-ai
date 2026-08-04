import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildUnifiedIntelligenceExperience,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.service";

describe(
  "OrganHeal test foundation",
  () => {
    it(
      "resolves the project alias and loads the unified intelligence service",
      () => {
        expect(
          buildUnifiedIntelligenceExperience
        ).toBeTypeOf(
          "function"
        );
      }
    );
  }
);
import path from "node:path";

import {
  defineConfig,
} from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@":
        path.resolve(
          import.meta.dirname,
          "."
        ),
    },
  },

  test: {
    environment:
      "node",

    include: [
      "tests/**/*.test.ts",
      "lib/**/*.test.ts",
    ],

    clearMocks:
      true,

    restoreMocks:
      true,

    mockReset:
      true,
  },
});
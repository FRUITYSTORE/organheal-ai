import {
  afterEach,
  beforeEach,
} from "vitest";

const originalFetch =
  globalThis.fetch.bind(
    globalThis
  );

type FetchInput =
  Parameters<
    typeof globalThis.fetch
  >[0];

function resolveRequestUrl(
  input:
    FetchInput
): string {
  if (
    typeof input ===
    "string"
  ) {
    return input;
  }

  if (
    input instanceof URL
  ) {
    return input.href;
  }

  return input.url;
}

function isOpenAIApiUrl(
  value:
    string
): boolean {
  try {
    const url =
      new URL(
        value
      );

    return (
      url.hostname ===
      "api.openai.com"
    );
  } catch {
    return false;
  }
}

const guardedFetch:
  typeof globalThis.fetch =
  async (
    input,
    init
  ) => {
    const requestUrl =
      resolveRequestUrl(
        input
      );

    if (
      isOpenAIApiUrl(
        requestUrl
      )
    ) {
      throw new Error(
        [
          "[TEST NETWORK GUARD]",
          "Real OpenAI network request blocked during Vitest.",
          `URL: ${requestUrl}`,
          "Mock globalThis.fetch explicitly in this test.",
        ].join(
          " "
        )
      );
    }

    return originalFetch(
      input,
      init
    );
  };

function installNetworkGuard():
  void {
  globalThis.fetch =
    guardedFetch;
}

installNetworkGuard();

beforeEach(
  () => {
    installNetworkGuard();
  }
);

afterEach(
  () => {
    installNetworkGuard();
  }
);
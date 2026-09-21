import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedConsumeUsage } = vi.hoisted(() => ({
  mockedConsumeUsage: vi.fn(),
}));

vi.mock("@/lib/billing/usage-quota", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing/usage-quota")>()),
  consumeUsage: mockedConsumeUsage,
}));

import { guardUsage } from "@/lib/billing/usage-guard";

function visitorRequest() {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    headers: { "x-forwarded-for": "198.51.100.4" },
  });
}

describe("guardUsage", () => {
  beforeEach(() => {
    mockedConsumeUsage.mockReset();
  });

  it("returns null when the use is allowed", async () => {
    mockedConsumeUsage.mockResolvedValue({
      allowed: true,
      tier: "free",
      remaining: 3,
    });

    await expect(
      guardUsage({
        client: {} as never,
        feature: "assistant",
        request: visitorRequest(),
        userId: "user-1",
        language: "en",
        requestId: "req-1",
      })
    ).resolves.toBeNull();

    expect(mockedConsumeUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { type: "user", userId: "user-1" },
      })
    );
  });

  it("identifies visitors by IP and answers 429 with retry-after when the quota is used up", async () => {
    mockedConsumeUsage.mockResolvedValue({
      allowed: false,
      tier: "visitor",
      reason: "quota_exceeded",
      retryAfterSeconds: 120,
    });

    const response = await guardUsage({
      client: {} as never,
      feature: "assistant",
      request: visitorRequest(),
      userId: null,
      language: "en",
      requestId: "req-2",
    });

    expect(mockedConsumeUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { type: "visitor", ip: "198.51.100.4" },
      })
    );
    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("120");

    const body = await response?.json();
    expect(body).toMatchObject({
      success: false,
      code: "quota_exceeded",
      requestId: "req-2",
      action: { href: "/signup" },
    });
  });

  it("answers 401 when the feature needs an account", async () => {
    mockedConsumeUsage.mockResolvedValue({
      allowed: false,
      tier: "visitor",
      reason: "login_required",
      retryAfterSeconds: 0,
    });

    const response = await guardUsage({
      client: {} as never,
      feature: "voice_dictation",
      request: visitorRequest(),
      userId: null,
      language: "both",
      requestId: "req-3",
    });

    expect(response?.status).toBe(401);
    expect(response?.headers.get("retry-after")).toBeNull();
  });
});

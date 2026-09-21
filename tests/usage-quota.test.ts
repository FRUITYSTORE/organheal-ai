import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedConsumePersistentApiRateLimit } = vi.hoisted(() => ({
  mockedConsumePersistentApiRateLimit: vi.fn(),
}));

vi.mock("@/lib/api/api-rate-limit", () => ({
  consumePersistentApiRateLimit: mockedConsumePersistentApiRateLimit,
}));

import {
  USAGE_POLICIES,
  buildUsageDeniedPayload,
  consumeUsage,
  resolveUserTier,
} from "@/lib/billing/usage-quota";

function clientWithPlan(result: {
  data: { plan?: string } | null;
  error: { message: string } | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  return { client: { from } as never, from, select, eq };
}

describe("usage quota", () => {
  beforeEach(() => {
    mockedConsumePersistentApiRateLimit.mockReset();
    mockedConsumePersistentApiRateLimit.mockResolvedValue({
      allowed: true,
      limit: 5,
      remaining: 4,
      resetAt: 0,
      retryAfterSeconds: 0,
    });
  });

  it("keeps voice features away from visitors and gives members a real allowance", () => {
    expect(USAGE_POLICIES.voice_dictation.visitor).toBeNull();
    expect(USAGE_POLICIES.voice_speech.visitor).toBeNull();
    expect(USAGE_POLICIES.voice_realtime.visitor).toBeNull();
    expect(USAGE_POLICIES.assistant.visitor?.limit).toBeLessThan(
      USAGE_POLICIES.assistant.free?.limit ?? 0
    );
    expect(USAGE_POLICIES.assistant.free?.limit).toBeLessThan(
      USAGE_POLICIES.assistant.plus?.limit ?? 0
    );
  });

  it("only selects the plan column and falls back to free on errors", async () => {
    const plus = clientWithPlan({ data: { plan: "plus" }, error: null });

    await expect(resolveUserTier(plus.client, "user-1")).resolves.toBe("plus");
    expect(plus.select).toHaveBeenCalledWith("plan");

    const failing = clientWithPlan({ data: null, error: { message: "boom" } });
    await expect(resolveUserTier(failing.client, "user-1")).resolves.toBe(
      "free"
    );

    const missing = clientWithPlan({ data: null, error: null });
    await expect(resolveUserTier(missing.client, "user-1")).resolves.toBe(
      "free"
    );
  });

  it("counts visitor questions per IP and stops at the daily limit", async () => {
    const { client } = clientWithPlan({ data: null, error: null });

    const allowed = await consumeUsage({
      client,
      feature: "assistant",
      actor: { type: "visitor", ip: "203.0.113.7" },
    });

    expect(allowed).toMatchObject({ allowed: true, tier: "visitor" });
    expect(mockedConsumePersistentApiRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "usage:assistant:ip:203.0.113.7",
        policy: USAGE_POLICIES.assistant.visitor,
      })
    );

    mockedConsumePersistentApiRateLimit.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      resetAt: 0,
      retryAfterSeconds: 600,
    });

    await expect(
      consumeUsage({
        client,
        feature: "assistant",
        actor: { type: "visitor", ip: "203.0.113.7" },
      })
    ).resolves.toMatchObject({
      allowed: false,
      reason: "quota_exceeded",
      retryAfterSeconds: 600,
    });
  });

  it("asks visitors to sign in for voice without touching the limiter", async () => {
    const { client } = clientWithPlan({ data: null, error: null });

    const decision = await consumeUsage({
      client,
      feature: "voice_realtime",
      actor: { type: "visitor", ip: "203.0.113.7" },
    });

    expect(decision).toMatchObject({
      allowed: false,
      reason: "login_required",
    });
    expect(mockedConsumePersistentApiRateLimit).not.toHaveBeenCalled();
  });

  it("gives Plus members the larger allowance", async () => {
    const { client } = clientWithPlan({ data: { plan: "plus" }, error: null });

    await consumeUsage({
      client,
      feature: "voice_realtime",
      actor: { type: "user", userId: "user-1" },
    });

    expect(mockedConsumePersistentApiRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "usage:voice_realtime:user:user-1",
        policy: USAGE_POLICIES.voice_realtime.plus,
      })
    );
  });

  it("points visitors to sign-up and free members to pricing", () => {
    const visitor = buildUsageDeniedPayload({
      decision: {
        allowed: false,
        tier: "visitor",
        reason: "quota_exceeded",
        retryAfterSeconds: 60,
      },
      language: "en",
    });
    const free = buildUsageDeniedPayload({
      decision: {
        allowed: false,
        tier: "free",
        reason: "quota_exceeded",
        retryAfterSeconds: 60,
      },
      language: "ar",
    });
    const plus = buildUsageDeniedPayload({
      decision: {
        allowed: false,
        tier: "plus",
        reason: "quota_exceeded",
        retryAfterSeconds: 60,
      },
      language: "en",
    });

    expect(visitor.action?.href).toBe("/signup");
    expect(free.action?.href).toBe("/pricing");
    expect(free.response).toMatch(/[؀-ۿ]/);
    expect(plus.action).toBeNull();
    expect(visitor.response).toBe(visitor.error);
  });
});

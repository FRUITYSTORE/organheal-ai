import { createHmac } from "node:crypto";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => {
  return {
    getSupabaseAdminClient: vi.fn(),
  };
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {},
}));

import { POST } from "@/app/api/billing/webhook/route";

const WEBHOOK_SECRET = "whsec_test_secret";

function signedRequest(body: unknown) {
  const payload = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return new Request("http://localhost/api/billing/webhook", {
    method: "POST",
    headers: {
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
    body: payload,
  });
}

describe("billing webhook API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a request with an invalid signature", async () => {
    const request = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
      body: JSON.stringify({ type: "customer.subscription.updated" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("acknowledges but ignores event types it does not handle", async () => {
    const request = signedRequest({ type: "invoice.paid", data: { object: {} } });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("grants Plus and syncs period end when a subscription becomes active", async () => {
    const update = vi.fn(() => ({
      eq: () => ({
        select: () =>
          Promise.resolve({ data: [{ id: "user-1" }], error: null }),
      }),
    }));

    mocks.getSupabaseAdminClient.mockReturnValue({ from: () => ({ update }) });

    const periodEndSeconds = 1_800_000_000;

    const request = signedRequest({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          current_period_end: periodEndSeconds,
          items: {
            data: [{ price: { recurring: { interval: "month" } } }],
          },
        },
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      plan: "plus",
      plan_status: "active",
      plan_interval: "month",
      plan_current_period_end: new Date(periodEndSeconds * 1000).toISOString(),
      stripe_subscription_id: "sub_123",
    });
  });

  it("revokes Plus when a subscription is canceled", async () => {
    const update = vi.fn(() => ({
      eq: () => ({
        select: () =>
          Promise.resolve({ data: [{ id: "user-1" }], error: null }),
      }),
    }));

    mocks.getSupabaseAdminClient.mockReturnValue({ from: () => ({ update }) });

    const request = signedRequest({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "canceled",
          current_period_end: 1_800_000_000,
        },
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "free", plan_status: "canceled" })
    );
  });

  it("does not grant Plus for a past_due subscription", async () => {
    const update = vi.fn(() => ({
      eq: () => ({
        select: () =>
          Promise.resolve({ data: [{ id: "user-1" }], error: null }),
      }),
    }));

    mocks.getSupabaseAdminClient.mockReturnValue({ from: () => ({ update }) });

    const request = signedRequest({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "past_due",
          current_period_end: 1_800_000_000,
        },
      },
    });

    await POST(request);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "free", plan_status: "past_due" })
    );
  });
});

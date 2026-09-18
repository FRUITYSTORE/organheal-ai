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
    authenticateApiRequest: vi.fn(),
    getSupabaseAdminClient: vi.fn(),
  };
});

vi.mock("@/lib/api/api-auth", () => ({
  authenticateApiRequest: mocks.authenticateApiRequest,
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {},
}));

import { POST } from "@/app/api/billing/checkout/route";

function createRequest(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/billing/checkout", {
    method: "POST",
    headers: {
      origin: "https://organheal.com",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function stubEnv() {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
  vi.stubEnv("STRIPE_PRICE_ID_PLUS_MONTHLY", "price_month_123");
  vi.stubEnv("STRIPE_PRICE_ID_PLUS_YEARLY", "price_year_123");
}

describe("billing checkout API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 503 when billing is not configured", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    expect(mocks.authenticateApiRequest).not.toHaveBeenCalled();
  });

  it("returns 401 when authentication fails", async () => {
    stubEnv();

    mocks.authenticateApiRequest.mockResolvedValue({
      success: false,
      status: 401,
      error: "Authentication is required.",
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(401);
  });

  it("creates a Stripe customer and checkout session for a first-time buyer", async () => {
    stubEnv();

    mocks.authenticateApiRequest.mockResolvedValue({
      success: true,
      token: "test-token",
      user: { id: "user-1", email: "user@example.com" },
      client: {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      },
    });

    const update = vi.fn(() => ({
      eq: () => Promise.resolve({ error: null }),
    }));

    mocks.getSupabaseAdminClient.mockReturnValue({
      from: () => ({ update }),
    });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "cus_new123" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "cs_test_123",
            url: "https://checkout.stripe.com/pay/cs_test_123",
          }),
          { status: 200 }
        )
      );

    const response = await POST(createRequest({ interval: "year" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.com/pay/cs_test_123");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith({ stripe_customer_id: "cus_new123" });

    const checkoutCallBody = fetchMock.mock.calls[1][1]?.body as URLSearchParams;
    expect(checkoutCallBody.get("customer")).toBe("cus_new123");
    expect(checkoutCallBody.get("line_items[0][price]")).toBe(
      "price_year_123"
    );
  });

  it("reuses an existing Stripe customer instead of creating a new one", async () => {
    stubEnv();

    mocks.authenticateApiRequest.mockResolvedValue({
      success: true,
      token: "test-token",
      user: { id: "user-1", email: "user@example.com" },
      client: {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { stripe_customer_id: "cus_existing" },
                  error: null,
                }),
            }),
          }),
        }),
      },
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "cs_test_456",
          url: "https://checkout.stripe.com/pay/cs_test_456",
        }),
        { status: 200 }
      )
    );

    const response = await POST(createRequest({ interval: "month" }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const checkoutCallBody = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(checkoutCallBody.get("customer")).toBe("cus_existing");
  });
});

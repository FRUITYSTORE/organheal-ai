import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyStripeWebhookSignature } from "@/lib/billing/stripe.service";

const SECRET = "whsec_test_secret";

function signPayload(payload: string, timestampSeconds: number): string {
  const signature = createHmac("sha256", SECRET)
    .update(`${timestampSeconds}.${payload}`)
    .digest("hex");

  return `t=${timestampSeconds},v1=${signature}`;
}

describe("verifyStripeWebhookSignature", () => {
  it("accepts a correctly signed, fresh payload", () => {
    const payload = JSON.stringify({ type: "customer.subscription.updated" });
    const nowSeconds = Math.floor(Date.now() / 1000);

    const result = verifyStripeWebhookSignature({
      payload,
      signatureHeader: signPayload(payload, nowSeconds),
      secret: SECRET,
    });

    expect(result).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const payload = JSON.stringify({ type: "customer.subscription.updated" });
    const nowSeconds = Math.floor(Date.now() / 1000);

    const badSignature = createHmac("sha256", "wrong_secret")
      .update(`${nowSeconds}.${payload}`)
      .digest("hex");

    const result = verifyStripeWebhookSignature({
      payload,
      signatureHeader: `t=${nowSeconds},v1=${badSignature}`,
      secret: SECRET,
    });

    expect(result).toBe(false);
  });

  it("rejects a tampered payload even with a valid-looking signature", () => {
    const originalPayload = JSON.stringify({ plan: "free" });
    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = signPayload(originalPayload, nowSeconds);

    const tamperedPayload = JSON.stringify({ plan: "plus" });

    const result = verifyStripeWebhookSignature({
      payload: tamperedPayload,
      signatureHeader: header,
      secret: SECRET,
    });

    expect(result).toBe(false);
  });

  it("rejects a stale timestamp outside the tolerance window", () => {
    const payload = JSON.stringify({ type: "customer.subscription.updated" });
    const staleTimestamp = Math.floor(Date.now() / 1000) - 60 * 60;

    const result = verifyStripeWebhookSignature({
      payload,
      signatureHeader: signPayload(payload, staleTimestamp),
      secret: SECRET,
    });

    expect(result).toBe(false);
  });

  it("rejects a missing signature header", () => {
    const result = verifyStripeWebhookSignature({
      payload: "{}",
      signatureHeader: null,
      secret: SECRET,
    });

    expect(result).toBe(false);
  });

  it("rejects a malformed signature header", () => {
    const result = verifyStripeWebhookSignature({
      payload: "{}",
      signatureHeader: "not-a-valid-header",
      secret: SECRET,
    });

    expect(result).toBe(false);
  });
});

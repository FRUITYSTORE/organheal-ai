import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createProductAnalyticsEvent,
} from "../lib/analytics/product-analytics";

import {
  ProductAnalyticsRepository,
} from "../lib/analytics/product-analytics.repository";

describe("product analytics", () => {
  it("preserves approved product analytics properties", () => {
    const event = createProductAnalyticsEvent({
      name: "homepage_viewed",
      properties: {
        language: "en",
        source: "homepage",
        authenticated: false,
      },
    });

    expect(event).toEqual({
      name: "homepage_viewed",
      properties: {
        language: "en",
        source: "homepage",
        authenticated: false,
      },
    });
  });

  it("persists only the approved analytics columns", async () => {
  const insert = vi.fn().mockResolvedValue({
    error: null,
  });

  const from = vi.fn().mockReturnValue({
    insert,
  });

  const repository =
    new ProductAnalyticsRepository({
      from,
    } as never);

  await repository.insertEvent({
    eventName: "report_upload_completed",
    userId: "user_123",
    anonymousSessionId: null,
    language: "en",
    source: "lab-upload",
    authenticated: true,
  });

  expect(from).toHaveBeenCalledWith(
    "product_analytics_events"
  );

  expect(insert).toHaveBeenCalledWith({
    event_name: "report_upload_completed",
    user_id: "user_123",
    anonymous_session_id: null,
    language: "en",
    source: "lab-upload",
    authenticated: true,
  });
});

  it("returns an event without properties when none are supplied", () => {
    const event = createProductAnalyticsEvent({
      name: "return_session",
    });

    expect(event).toEqual({
      name: "return_session",
      properties: undefined,
    });
  });

  it("does not expose arbitrary properties at runtime", () => {
    const event = createProductAnalyticsEvent({
      name: "assistant_used",
      properties: {
        language: "ar",
        source: "assistant",
        prompt: "private health question",
        reportId: "report_123",
        transcript: "private voice transcript",
      },
    } as never);

    expect(event.properties).toEqual({
      language: "ar",
      source: "assistant",
    });

    expect(event.properties).not.toHaveProperty("prompt");
    expect(event.properties).not.toHaveProperty("reportId");
    expect(event.properties).not.toHaveProperty("transcript");
  });
});
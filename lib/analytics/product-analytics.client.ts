"use client";

import {
  supabase,
} from "@/lib/supabase";

import type {
  ProductAnalyticsEventName,
  ProductAnalyticsLanguage,
  ProductAnalyticsSource,
} from "./product-analytics.types";

const ANALYTICS_SESSION_KEY =
  "organheal-analytics-session";

function getAnonymousSessionId():
  string | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const existing =
      sessionStorage.getItem(
        ANALYTICS_SESSION_KEY
      );

    if (existing) {
      return existing;
    }

    const sessionId =
      crypto.randomUUID();

    sessionStorage.setItem(
      ANALYTICS_SESSION_KEY,
      sessionId
    );

    return sessionId;
  } catch {
    return null;
  }
}

export type SendProductAnalyticsEventInput = {
  name:
    ProductAnalyticsEventName;

  language?:
    ProductAnalyticsLanguage;

  source?:
    ProductAnalyticsSource;
};

export async function sendProductAnalyticsEvent(
  event:
    SendProductAnalyticsEventInput
): Promise<void> {
  try {
    const {
      data,
    } =
      await supabase.auth
        .getSession();

    const accessToken =
      data.session
        ?.access_token ??
      null;

    const headers:
      Record<string, string> = {
        "content-type":
          "application/json",
      };

    if (accessToken) {
      headers.authorization =
        `Bearer ${accessToken}`;
    }

    const anonymousSessionId =
      accessToken
        ? undefined
        : getAnonymousSessionId();

    await fetch(
      "/api/analytics",
      {
        method:
          "POST",

        headers,

        body:
          JSON.stringify({
            name:
              event.name,

            language:
              event.language,

            source:
              event.source,

            ...(anonymousSessionId
              ? {
                  anonymousSessionId,
                }
              : {}),
          }),

        keepalive:
          true,
      }
    );
  } catch {
    // Product analytics must never block
    // or break the primary user experience.
  }
}
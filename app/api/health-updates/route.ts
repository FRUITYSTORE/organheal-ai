import { NextResponse } from "next/server";

import { fetchWhoUpdates } from "@/lib/health-updates/who-feed";

// Public, token-free endpoint: it only relays headlines from the WHO feed.
// The feed is cached for an hour, so traffic never reaches WHO more often
// than that.
export async function GET(request: Request) {
  const language =
    new URL(request.url).searchParams.get("lang") === "ar" ? "ar" : "en";

  try {
    const items = await fetchWhoUpdates(language);

    return NextResponse.json(
      { items },
      {
        headers: {
          "cache-control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch {
    // The page falls back to its built-in source links.
    return NextResponse.json(
      { items: [] },
      { headers: { "cache-control": "public, s-maxage=300" } }
    );
  }
}

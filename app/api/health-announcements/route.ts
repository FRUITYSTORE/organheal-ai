import { NextResponse } from "next/server";

import { toPublicAnnouncement } from "@/lib/health-updates/announcement";
import { listActiveAnnouncements } from "@/lib/repositories/health-announcement.repository";

// Public and token-free: only active, unexpired owner announcements. Cached
// briefly so edits appear within a minute without hammering the database.
export async function GET(request: Request) {
  const language =
    new URL(request.url).searchParams.get("lang") === "ar" ? "ar" : "en";

  try {
    const rows = await listActiveAnnouncements();

    return NextResponse.json(
      { items: rows.map((row) => toPublicAnnouncement(row, language)) },
      {
        headers: {
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    // The strip simply shows the WHO news on its own.
    return NextResponse.json(
      { items: [] },
      { headers: { "cache-control": "public, s-maxage=30" } }
    );
  }
}

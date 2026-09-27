import { NextResponse } from "next/server";

import { toPublicVideo } from "@/lib/health-videos/custom";
import { listActiveVideos } from "@/lib/repositories/health-video.repository";

// Public: only videos the owner has switched on. Cached briefly so a new
// video shows up within a minute. If the table is missing or the database is
// unreachable the homepage simply keeps the built-in catalog.
export async function GET() {
  try {
    const rows = await listActiveVideos();

    return NextResponse.json(
      { videos: rows.map(toPublicVideo) },
      {
        headers: {
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { videos: [] },
      { headers: { "cache-control": "public, s-maxage=30" } }
    );
  }
}

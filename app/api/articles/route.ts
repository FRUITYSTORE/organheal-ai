import { NextResponse } from "next/server";

import { toBlogPost } from "@/lib/articles/article";
import { listPublishedArticles } from "@/lib/repositories/article.repository";

// Public: published articles only, in the same shape as the built-in posts.
// If the table is missing or the database is unreachable the blog keeps
// showing its built-in posts.
export async function GET() {
  try {
    const rows = await listPublishedArticles();

    return NextResponse.json(
      { posts: rows.map(toBlogPost) },
      {
        headers: {
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { posts: [] },
      { headers: { "cache-control": "public, s-maxage=30" } }
    );
  }
}

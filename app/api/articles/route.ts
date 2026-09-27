import { NextResponse } from "next/server";

import { toBlogPost } from "@/lib/articles/article";
import { listPublishedArticles } from "@/lib/repositories/article.repository";

const CACHE = "public, s-maxage=60, stale-while-revalidate=300";
const BRIEF_LIMIT = 3;

// Public: published articles only. Full posts (same shape as the built-in
// ones) for the blog list, or `?brief=1` for the newest few as short cards
// for the top bar. If the table is missing or the database is unreachable
// the site keeps showing its built-in content.
export async function GET(request: Request) {
  const brief = new URL(request.url).searchParams.get("brief") === "1";

  try {
    const posts = (await listPublishedArticles()).map(toBlogPost);

    if (brief) {
      return NextResponse.json(
        {
          articles: posts.slice(0, BRIEF_LIMIT).map((post) => ({
            slug: post.slug,
            title: post.title,
            titleAr: post.titleAr,
            excerpt: post.excerpt,
            excerptAr: post.excerptAr,
          })),
        },
        { headers: { "cache-control": CACHE } }
      );
    }

    return NextResponse.json({ posts }, { headers: { "cache-control": CACHE } });
  } catch {
    return NextResponse.json(
      brief ? { articles: [] } : { posts: [] },
      { headers: { "cache-control": "public, s-maxage=30" } }
    );
  }
}

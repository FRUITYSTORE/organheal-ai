import type { MetadataRoute } from "next";

import { blogPosts } from "../lib/blogData";
import { listPublishedArticles } from "@/lib/repositories/article.repository";
import {
  getPublishedRegisteredKnowledgeItems,
  getPublishedRegisteredKnowledgePacks,
} from "@/lib/services/knowledge/content-registry.service";

// An item's `body` still reads the catalog's own placeholder text while its
// full write-up is pending medical review. Submitting that to Google as an
// article would be thin/placeholder content, so it waits out of the
// sitemap until the real body replaces it.
const PLACEHOLDER_ITEM_BODY = "Coming soon.";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.organheal.com";

  // High-priority pages: the ones a new visitor or search engine should
  // reach first.
  const primaryRoutes = ["", "/pricing", "/features", "/library", "/demo"];

  // The rest of the public, unauthenticated site. Keep this in sync with
  // RouteAccessGuard's protectedPrefixes and robots.ts — a route only
  // belongs here if it is crawlable and not gated behind login.
  const secondaryRoutes = [
    "/about",
    "/contact",
    "/assistant",
    "/library/organs",
    "/library/organs/heart",
    "/library/doctor-prep",
    "/knowledge",
    "/heart",
    "/kidney",
    "/liver",
    "/lung",
    "/brain",
    "/metabolic",
    "/blog",
  ];

  const legalRoutes = ["/privacy", "/terms", "/medical-disclaimer"];

  const staticRoutes = [
    ...primaryRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.9,
    })),
    ...secondaryRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    ...legalRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  const blogRoutes = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Articles published from the admin screen. A database problem must never
  // break the sitemap, so it simply lists the built-in content.
  const publishedArticleRoutes = await listPublishedArticles()
    .then((rows) =>
      rows
        .filter((row) => !blogPosts.some((post) => post.slug === row.slug))
        .map((row) => ({
          url: `${baseUrl}/blog/${row.slug}`,
          lastModified: new Date(row.updated_at),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        }))
    )
    .catch(() => []);

  const knowledgePackRoutes = getPublishedRegisteredKnowledgePacks().map(
    (pack) => ({
      url: `${baseUrl}/knowledge/${pack.slug}`,
      lastModified: new Date(pack.review.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })
  );

  const knowledgeItemRoutes = getPublishedRegisteredKnowledgeItems()
    .filter((item) => (item.body ?? "").trim() !== PLACEHOLDER_ITEM_BODY)
    .map((item) => ({
      url: `${baseUrl}/knowledge/item/${item.slug}`,
      lastModified: new Date(item.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [
    ...staticRoutes,
    ...blogRoutes,
    ...publishedArticleRoutes,
    ...knowledgePackRoutes,
    ...knowledgeItemRoutes,
  ];
}

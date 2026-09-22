import type { MetadataRoute } from "next";
import { blogPosts } from "../lib/blogData";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.organheal.com";

  // High-priority pages: the ones a new visitor or search engine should
  // reach first.
  const primaryRoutes = ["", "/pricing", "/features", "/library"];

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

  return [...staticRoutes, ...blogRoutes];
}

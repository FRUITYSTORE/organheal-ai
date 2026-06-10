import type { MetadataRoute } from "next";
import { blogPosts } from "../lib/blogData";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://organheal.com";

  const routes = [
    "",
    "/about",
    "/blog",
    "/assessment",
    "/lab-analyzer",
    "/organ-report",
  ];

  const staticRoutes = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const blogRoutes = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...blogRoutes];
}
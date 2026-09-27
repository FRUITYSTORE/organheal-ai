"use client";

import { useEffect, useState } from "react";

import { blogPosts as builtInPosts, type BlogPost } from "@/lib/blogData";

// Built-in posts plus any articles published from the admin screen. The
// published list is fetched once per page load and shared; if the request
// fails only the built-in posts are shown.
let publishedPromise: Promise<BlogPost[]> | null = null;

function loadPublished(): Promise<BlogPost[]> {
  publishedPromise ??= fetch("/api/articles")
    .then((response) => (response.ok ? response.json() : { posts: [] }))
    .then((body: { posts?: BlogPost[] }) => (Array.isArray(body.posts) ? body.posts : []))
    .catch(() => []);

  return publishedPromise;
}

export function useAllPosts(): BlogPost[] {
  const [posts, setPosts] = useState<BlogPost[]>(builtInPosts);

  useEffect(() => {
    let cancelled = false;

    void loadPublished().then((published) => {
      if (cancelled || published.length === 0) return;

      const known = new Set(builtInPosts.map((post) => post.slug));

      setPosts([...published.filter((post) => !known.has(post.slug)), ...builtInPosts]);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return posts;
}

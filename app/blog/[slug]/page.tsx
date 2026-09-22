import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SITE_URL } from "@/lib/seo/organization";
import { blogPosts } from "../../../lib/blogData";
import BlogPostClient from "./BlogPostClient";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    return {
      title: "Article Not Found",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.labMarkers,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;

  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  // BlogPostClient already renders this article's Article JSON-LD
  // (locale-aware, with a proper mainEntityOfPage WebPage object) — do not
  // duplicate it here.
  return <BlogPostClient post={post} />;
}

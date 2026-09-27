import "server-only";

import { blogPosts } from "@/lib/blogData";
import { validateArticleInput, type ArticleRow } from "@/lib/articles/article";
import {
  createArticle,
  listAllArticles,
  listGeneratedTopicKeys,
} from "@/lib/repositories/article.repository";
import { pickNextTopic } from "@/lib/content/knowledge-topics";
import { generateArticleDraft } from "@/lib/content/article-generation.client";
import { findCoverImage } from "@/lib/content/article-image.client";

export type ArticleGenerationResult =
  | { generated: true; article: ArticleRow }
  | { generated: false; reason: string };

// Runs once per cron tick (see the daily background-jobs cron route): picks
// the next uncovered curated topic, asks the model to write it in both
// languages, and saves it as a DRAFT — never published automatically. A
// human still has to press "Publish" in /admin/articles, same as any
// staff-written article.
export async function runArticleGenerationOnce(): Promise<ArticleGenerationResult> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { generated: false, reason: "OPENAI_API_KEY is not configured." };
  }

  const [usedTopicKeys, existingArticles] = await Promise.all([
    listGeneratedTopicKeys(),
    listAllArticles(),
  ]);

  const topic = pickNextTopic(usedTopicKeys);
  const draft = await generateArticleDraft(topic);

  // Optional and best-effort — a missing PEXELS_API_KEY or a failed lookup
  // simply means the article publishes without a cover image.
  const coverImage = await findCoverImage(topic.imageQuery, draft.title).catch(() => null);

  const validation = validateArticleInput({
    title: draft.title,
    titleAr: draft.titleAr,
    excerpt: draft.excerpt,
    excerptAr: draft.excerptAr,
    category: topic.category,
    categoryAr: topic.categoryAr,
    labMarkers: topic.labMarkers,
    content: draft.content,
    contentAr: draft.contentAr,
    status: "draft",
    sources: draft.sources.join("\n"),
    source: "ai",
    topicKey: topic.key,
    coverImageUrl: coverImage?.url ?? null,
    coverImageAlt: coverImage?.alt ?? null,
    coverImageAltAr: coverImage?.alt ?? null,
  });

  if (!validation.ok) {
    return { generated: false, reason: `Generated article failed validation: ${validation.error}` };
  }

  const reservedSlugs = new Set([
    ...blogPosts.map((post) => post.slug),
    ...existingArticles.map((article) => article.slug),
  ]);

  const article = await createArticle(validation.value, null, reservedSlugs);

  return { generated: true, article };
}

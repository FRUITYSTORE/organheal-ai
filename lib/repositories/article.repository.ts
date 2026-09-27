import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { slugify, type ArticleInput, type ArticleRow } from "@/lib/articles/article";

const TABLE = "articles";

function toPayload(input: ArticleInput) {
  return {
    title: input.title,
    title_ar: input.titleAr,
    excerpt: input.excerpt,
    excerpt_ar: input.excerptAr,
    category: input.category,
    category_ar: input.categoryAr,
    lab_markers: input.labMarkers,
    content: input.content,
    content_ar: input.contentAr,
    status: input.status,
  };
}

export async function listAllArticles(): Promise<ArticleRow[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(300);

  if (error) {
    throw new Error("Unable to load articles.");
  }

  return (data ?? []) as ArticleRow[];
}

export async function listPublishedArticles(): Promise<ArticleRow[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error("Unable to load articles.");
  }

  return (data ?? []) as ArticleRow[];
}

export async function getPublishedArticleBySlug(slug: string): Promise<ArticleRow | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load the article.");
  }

  return (data as ArticleRow | null) ?? null;
}

// The slug is fixed at creation so links never break when a title is edited.
// If it is already taken (or clashes with a built-in post) a number is added.
async function pickSlug(title: string, reserved: Set<string>): Promise<string> {
  const base = slugify(title);
  const { data } = await getSupabaseAdminClient()
    .from(TABLE)
    .select("slug")
    .like("slug", `${base}%`);
  const taken = new Set([...reserved, ...((data ?? []) as { slug: string }[]).map((row) => row.slug)]);

  if (!taken.has(base)) {
    return base;
  }

  for (let suffix = 2; suffix < 200; suffix += 1) {
    const candidate = `${base}-${suffix}`;

    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `${base}-${Date.now().toString(36)}`;
}

export async function createArticle(
  input: ArticleInput,
  createdBy: string,
  reservedSlugs: Set<string>
): Promise<ArticleRow> {
  const slug = await pickSlug(input.title, reservedSlugs);
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .insert({
      ...toPayload(input),
      slug,
      created_by: createdBy,
      published_at: input.status === "published" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Unable to save the article.");
  }

  return data as ArticleRow;
}

export async function updateArticle(
  id: string,
  input: ArticleInput
): Promise<ArticleRow | null> {
  const client = getSupabaseAdminClient();
  const { data: existing, error: lookupError } = await client
    .from(TABLE)
    .select("status, published_at")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    throw new Error("Unable to save the article.");
  }

  if (!existing) {
    return null;
  }

  // The publish date is set the first time an article goes live and then kept.
  const publishedAt =
    input.status === "published"
      ? (existing as { published_at: string | null }).published_at ?? new Date().toISOString()
      : (existing as { published_at: string | null }).published_at;

  const { data, error } = await client
    .from(TABLE)
    .update({
      ...toPayload(input),
      published_at: publishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to save the article.");
  }

  return (data as ArticleRow | null) ?? null;
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await getSupabaseAdminClient().from(TABLE).delete().eq("id", id);

  if (error) {
    throw new Error("Unable to delete the article.");
  }
}

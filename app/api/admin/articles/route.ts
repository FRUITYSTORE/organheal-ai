import { NextResponse } from "next/server";

import { authorizeStaffApiRequest } from "@/lib/api/api-admin-auth";
import { validateArticleInput } from "@/lib/articles/article";
import { blogPosts } from "@/lib/blogData";
import {
  createArticle,
  deleteArticle,
  listAllArticles,
  updateArticle,
} from "@/lib/repositories/article.repository";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const authorization = await authorizeStaffApiRequest(request, "articles");

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  try {
    return NextResponse.json({ articles: await listAllArticles() }, { headers: NO_STORE });
  } catch {
    return fail("Unable to load articles. Has the articles migration been applied?", 500);
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeStaffApiRequest(request, "articles");

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const validation = validateArticleInput(await readJson(request));

  if (!validation.ok) {
    return fail(validation.error, 400);
  }

  try {
    const article = await createArticle(
      validation.value,
      authorization.user.id,
      new Set(blogPosts.map((post) => post.slug))
    );

    return NextResponse.json({ article }, { status: 201, headers: NO_STORE });
  } catch {
    return fail("Unable to save the article.", 500);
  }
}

export async function PUT(request: Request) {
  const authorization = await authorizeStaffApiRequest(request, "articles");

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const body = await readJson(request);
  const id = (body as { id?: unknown } | null)?.id;

  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    return fail("A valid article id is required.", 400);
  }

  const validation = validateArticleInput(body);

  if (!validation.ok) {
    return fail(validation.error, 400);
  }

  try {
    const article = await updateArticle(id, validation.value);

    return article
      ? NextResponse.json({ article }, { headers: NO_STORE })
      : fail("Article not found.", 404);
  } catch {
    return fail("Unable to save the article.", 500);
  }
}

export async function DELETE(request: Request) {
  const authorization = await authorizeStaffApiRequest(request, "articles");

  if (!authorization.success) {
    return fail(authorization.error, authorization.status);
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id || !UUID_PATTERN.test(id)) {
    return fail("A valid article id is required.", 400);
  }

  try {
    await deleteArticle(id);

    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch {
    return fail("Unable to delete the article.", 500);
  }
}

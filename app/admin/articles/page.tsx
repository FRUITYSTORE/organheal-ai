"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { blogPosts } from "@/lib/blogData";
import { ARTICLE_LIMITS, type ArticleRow, type ArticleStatus } from "@/lib/articles/article";

import { useAdminLanguage } from "../use-admin-language";

import "../videos/admin-videos.css";

type FormState = {
  id: string | null;
  title: string;
  titleAr: string;
  excerpt: string;
  excerptAr: string;
  category: string;
  categoryAr: string;
  labMarkers: string;
  content: string;
  contentAr: string;
  status: ArticleStatus;
  reviewedBy: string;
  reviewedAt: string;
  sources: string;
  coverImageUrl: string;
  coverImageAlt: string;
  coverImageAltAr: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  titleAr: "",
  excerpt: "",
  excerptAr: "",
  category: "",
  categoryAr: "",
  labMarkers: "",
  content: "",
  contentAr: "",
  status: "draft",
  reviewedBy: "",
  reviewedAt: "",
  sources: "",
  coverImageUrl: "",
  coverImageAlt: "",
  coverImageAltAr: "",
};

// Existing categories, so new articles line up with the built-in ones.
const KNOWN_CATEGORIES = Array.from(
  new Map(blogPosts.map((post) => [post.category, post.categoryAr])).entries()
);

function toForm(row: ArticleRow): FormState {
  return {
    id: row.id,
    title: row.title,
    titleAr: row.title_ar ?? "",
    excerpt: row.excerpt,
    excerptAr: row.excerpt_ar ?? "",
    category: row.category,
    categoryAr: row.category_ar ?? "",
    labMarkers: row.lab_markers.join(", "),
    content: row.content,
    contentAr: row.content_ar ?? "",
    status: row.status,
    reviewedBy: row.reviewed_by ?? "",
    reviewedAt: row.reviewed_at ?? "",
    sources: row.sources ?? "",
    coverImageUrl: row.cover_image_url ?? "",
    coverImageAlt: row.cover_image_alt ?? "",
    coverImageAltAr: row.cover_image_alt_ar ?? "",
  };
}

export default function AdminArticlesPage() {
  const { isArabic, language, text } = useAdminLanguage();
  const [items, setItems] = useState<ArticleRow[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const authorizedFetch = useCallback(async (input: string, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("signin");
    }

    return fetch(input, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await authorizedFetch("/api/admin/articles");
      const body = await response.json();

      if (!response.ok) {
        setMessage({
          kind: "error",
          text:
            response.status === 403
              ? language === "ar"
                ? "ليست لديك صلاحية إدارة المقالات."
                : "You do not have permission to manage articles."
              : body.error || (language === "ar" ? "تعذر تحميل المقالات." : "Unable to load articles."),
        });
        return;
      }

      setItems(body.articles ?? []);
    } catch {
      setMessage({
        kind: "error",
        text:
          language === "ar"
            ? "يرجى تسجيل الدخول بحساب لديه الصلاحية."
            : "Please sign in with an account that has access.",
      });
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, language]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function submit(payload: FormState) {
    setSaving(true);
    setMessage(null);

    try {
      const response = await authorizedFetch("/api/admin/articles", {
        method: payload.id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) {
        setMessage({ kind: "error", text: body.error || text("Unable to save.", "تعذر الحفظ.") });
        return;
      }

      const article = body.article as ArticleRow;

      setMessage({
        kind: "ok",
        text:
          article.status === "published"
            ? text(
                "Saved and published. Find it in the blog and in the top bar within a minute.",
                "تم الحفظ والنشر. ستجده في المدونة وفي الشريط العلوي خلال دقيقة."
              )
            : text(
                "Saved as a DRAFT: nobody else can see it yet. Press Publish next to it in the list below to show it on the site.",
                "تم الحفظ كمسودة: لا يراها أحد غيرك بعد. اضغط نشر بجانبها في القائمة أدناه لتظهر في الموقع."
              ),
      });
      setForm(EMPTY_FORM);
      await load();
    } catch {
      setMessage({ kind: "error", text: text("Unable to save.", "تعذر الحفظ.") });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item: ArticleRow) {
    await submit({ ...toForm(item), status: item.status === "published" ? "draft" : "published" });
  }

  async function remove(item: ArticleRow) {
    if (!window.confirm(text(`Delete "${item.title}"?`, `حذف "${item.title}"؟`))) return;

    await authorizedFetch(`/api/admin/articles?id=${item.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <main className="ohPageShell adminVideos" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <header>
        <p className="ohEyebrow">{text("Administrator", "المسؤول")}</p>
        <h1>{text("Articles", "المقالات")}</h1>
        <p>
          {text(
            "Write health articles in English and Arabic. A draft is visible only to you; a published article appears in the blog and search results within a minute. Separate paragraphs with a blank line.",
            "اكتب المقالات الصحية بالعربية والإنجليزية. المسودة لا يراها غيرك، والمقال المنشور يظهر في المدونة ونتائج البحث خلال دقيقة. افصل بين الفقرات بسطر فارغ."
          )}
        </p>
        <Link href="/admin">{text("Back to site management", "العودة إلى إدارة الموقع")}</Link>
      </header>

      <form
        className="adminVideosForm"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(form);
        }}
      >
        <label>
          {text("Title (English)", "العنوان (بالإنجليزية)")}
          <input
            required
            maxLength={ARTICLE_LIMITS.title}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </label>

        <label>
          {text("Title (Arabic)", "العنوان (بالعربية)")}
          <input
            dir="rtl"
            maxLength={ARTICLE_LIMITS.title}
            value={form.titleAr}
            onChange={(event) => setForm({ ...form, titleAr: event.target.value })}
          />
        </label>

        <label>
          {text("Short summary (English)", "ملخص قصير (بالإنجليزية)")}
          <textarea
            required
            rows={2}
            maxLength={ARTICLE_LIMITS.excerpt}
            value={form.excerpt}
            onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
          />
        </label>

        <label>
          {text("Short summary (Arabic)", "ملخص قصير (بالعربية)")}
          <textarea
            dir="rtl"
            rows={2}
            maxLength={ARTICLE_LIMITS.excerpt}
            value={form.excerptAr}
            onChange={(event) => setForm({ ...form, excerptAr: event.target.value })}
          />
        </label>

        <label>
          {text("Category (English)", "التصنيف (بالإنجليزية)")}
          <input
            required
            list="adminArticleCategories"
            maxLength={ARTICLE_LIMITS.category}
            value={form.category}
            onChange={(event) => {
              const value = event.target.value;
              const match = KNOWN_CATEGORIES.find(([en]) => en === value);

              setForm({
                ...form,
                category: value,
                categoryAr: match && !form.categoryAr ? match[1] : form.categoryAr,
              });
            }}
          />
          <datalist id="adminArticleCategories">
            {KNOWN_CATEGORIES.map(([en]) => (
              <option key={en} value={en} />
            ))}
          </datalist>
        </label>

        <label>
          {text("Category (Arabic)", "التصنيف (بالعربية)")}
          <input
            dir="rtl"
            maxLength={ARTICLE_LIMITS.category}
            value={form.categoryAr}
            onChange={(event) => setForm({ ...form, categoryAr: event.target.value })}
          />
        </label>

        <label>
          {text("Related lab markers (comma separated)", "مؤشرات التحاليل المرتبطة (مفصولة بفواصل)")}
          <input
            dir="ltr"
            value={form.labMarkers}
            onChange={(event) => setForm({ ...form, labMarkers: event.target.value })}
            placeholder="LDL, HbA1c"
          />
        </label>

        <label>
          {text("Article (English)", "المقال (بالإنجليزية)")}
          <textarea
            required
            rows={12}
            maxLength={ARTICLE_LIMITS.content}
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
          />
        </label>

        <label>
          {text("Article (Arabic)", "المقال (بالعربية)")}
          <textarea
            dir="rtl"
            rows={12}
            maxLength={ARTICLE_LIMITS.content}
            value={form.contentAr}
            onChange={(event) => setForm({ ...form, contentAr: event.target.value })}
          />
        </label>

        <fieldset className="adminTeamAreas">
          <legend>{text("Cover image (optional)", "صورة الغلاف (اختيارية)")}</legend>

          <label>
            {text("Image URL (https only)", "رابط الصورة (https فقط)")}
            <input
              type="url"
              dir="ltr"
              maxLength={ARTICLE_LIMITS.coverImageUrl}
              value={form.coverImageUrl}
              onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })}
              placeholder="https://..."
            />
          </label>

          <label>
            {text("Image description (English, for accessibility)", "وصف الصورة (بالإنجليزية، لإمكانية الوصول)")}
            <input
              maxLength={ARTICLE_LIMITS.coverImageAlt}
              value={form.coverImageAlt}
              onChange={(event) => setForm({ ...form, coverImageAlt: event.target.value })}
            />
          </label>

          <label>
            {text("Image description (Arabic)", "وصف الصورة (بالعربية)")}
            <input
              dir="rtl"
              maxLength={ARTICLE_LIMITS.coverImageAlt}
              value={form.coverImageAltAr}
              onChange={(event) => setForm({ ...form, coverImageAltAr: event.target.value })}
            />
          </label>
        </fieldset>

        <fieldset className="adminTeamAreas">
          <legend>{text("Trust details (optional, shown on the article)", "تفاصيل الثقة (اختيارية، تظهر في المقال)")}</legend>

          <label>
            {text("Medically reviewed by (name and title)", "روجع طبياً بواسطة (الاسم والصفة)")}
            <input
              maxLength={ARTICLE_LIMITS.reviewedBy}
              value={form.reviewedBy}
              onChange={(event) => setForm({ ...form, reviewedBy: event.target.value })}
              placeholder={text("Only fill this in if a qualified person really reviewed it", "املأه فقط إن راجعه شخص مؤهل فعلاً")}
            />
          </label>

          <label>
            {text("Review date", "تاريخ المراجعة")}
            <input
              type="date"
              value={form.reviewedAt}
              onChange={(event) => setForm({ ...form, reviewedAt: event.target.value })}
            />
          </label>

          <label>
            {text("Sources (one per line, e.g. WHO fact sheet on diabetes)", "المصادر (مصدر في كل سطر، مثل: صحيفة وقائع منظمة الصحة العالمية عن السكري)")}
            <textarea
              rows={4}
              maxLength={ARTICLE_LIMITS.sources}
              value={form.sources}
              onChange={(event) => setForm({ ...form, sources: event.target.value })}
            />
          </label>
        </fieldset>

        <label>
          {text("Status", "الحالة")}
          <select
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value as ArticleStatus })}
          >
            <option value="draft">{text("Draft (only you can see it)", "مسودة (لا يراها غيرك)")}</option>
            <option value="published">{text("Published (visible to everyone)", "منشور (يراه الجميع)")}</option>
          </select>
        </label>

        <p className="adminArticleHint">
          {text(
            "Educational information only. Avoid diagnosing, and do not recommend specific medicines or doses. If the Arabic text is left empty, the English text is shown to Arabic readers.",
            "معلومات تثقيفية فقط. تجنب التشخيص، ولا توصِ بأدوية أو جرعات محددة. إن تركت النص العربي فارغاً فسيرى القارئ العربي النص الإنجليزي."
          )}
        </p>

        <div className="adminVideosActions">
          <button type="submit" disabled={saving}>
            {saving
              ? text("Saving…", "جارٍ الحفظ…")
              : form.id
                ? text("Save changes", "حفظ التعديلات")
                : text("Save article", "حفظ المقال")}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(EMPTY_FORM)}>
              {text("Cancel edit", "إلغاء التعديل")}
            </button>
          )}
        </div>

        {message && (
          <p className="adminVideosMessage" data-kind={message.kind} role="status">
            {message.text}
          </p>
        )}
      </form>

      <section className="adminVideosList" aria-label={text("Your articles", "مقالاتك")}>
        <h2>
          {text("Your articles", "مقالاتك")} ({items.length})
        </h2>
        {loading && <p>{text("Loading…", "جارٍ التحميل…")}</p>}
        {!loading && items.length === 0 && (
          <p>
            {text(
              "No articles yet. The blog already shows its built-in articles.",
              "لا توجد مقالات بعد. المدونة تعرض أصلاً مقالاتها المدمجة."
            )}
          </p>
        )}
        <ul>
          {items.map((item) => (
            <li key={item.id} data-active={item.status === "published"}>
              <div>
                <strong>{isArabic && item.title_ar ? item.title_ar : item.title}</strong>
                <span>
                  {item.status === "published" ? text("Published", "منشور") : text("Draft", "مسودة")} ·{" "}
                  {isArabic && item.category_ar ? item.category_ar : item.category}
                  {item.source === "ai" && (
                    <>
                      {" · "}
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(15, 118, 110, 0.12)",
                          color: "#0f766e",
                          fontWeight: 800,
                        }}
                      >
                        {text("🤖 AI-written — needs your review", "🤖 كتبها الذكاء الاصطناعي — بانتظار مراجعتك")}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <div className="adminVideosRowActions">
                <button
                  type="button"
                  onClick={() => {
                    setForm(toForm(item));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {text("Edit", "تعديل")}
                </button>
                <button type="button" onClick={() => void togglePublished(item)}>
                  {item.status === "published" ? text("Unpublish", "إلغاء النشر") : text("Publish", "نشر")}
                </button>
                {item.status === "published" && (
                  <Link href={`/blog/${item.slug}`} target="_blank">
                    {text("View", "عرض")}
                  </Link>
                )}
                <button type="button" onClick={() => void remove(item)}>
                  {text("Delete", "حذف")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

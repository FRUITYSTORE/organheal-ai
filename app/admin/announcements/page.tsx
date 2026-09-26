"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import {
  ANNOUNCEMENT_TONES,
  type AnnouncementRow,
  type AnnouncementTone,
} from "@/lib/health-updates/announcement";

import "@/app/components/home/health-updates-strip.css";

type Language = "en" | "ar";

type FormState = {
  id: string | null;
  title: string;
  body: string;
  titleAr: string;
  bodyAr: string;
  linkUrl: string;
  tone: AnnouncementTone;
  isActive: boolean;
  expiresAt: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  body: "",
  titleAr: "",
  bodyAr: "",
  linkUrl: "",
  tone: "teal",
  isActive: true,
  expiresAt: "",
};

const TONE_LABELS: Record<AnnouncementTone, { en: string; ar: string; hex: string }> = {
  teal: { en: "Teal", ar: "أخضر مزرق", hex: "#0f766e" },
  blue: { en: "Blue", ar: "أزرق", hex: "#2563eb" },
  amber: { en: "Amber", ar: "كهرماني", hex: "#b45309" },
  rose: { en: "Rose", ar: "وردي", hex: "#be123c" },
  violet: { en: "Violet", ar: "بنفسجي", hex: "#6d28d9" },
  slate: { en: "Slate", ar: "رمادي", hex: "#475569" },
};

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const saved =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return saved.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";

  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function AdminAnnouncementsPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const isArabic = language === "ar";
  const text = (en: string, ar: string) => (isArabic ? ar : en);

  const authorizedFetch = useCallback(
    async (input: string, init?: RequestInit) => {
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
    },
    []
  );

  const load = useCallback(async () => {
    try {
      const response = await authorizedFetch("/api/admin/announcements");
      const body = await response.json();

      if (!response.ok) {
        setMessage({
          kind: "error",
          text:
            response.status === 403
              ? getStoredLanguage() === "ar"
                ? "هذا الحساب ليس حساب مسؤول."
                : "This account does not have administrator access."
              : body.error || "Unable to load announcements.",
        });
        return;
      }

      setItems(body.announcements ?? []);
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          (error as Error).message === "signin"
            ? getStoredLanguage() === "ar"
              ? "سجّل الدخول أولاً."
              : "Please sign in first."
            : "Unable to load announcements.",
      });
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch]);

  useEffect(() => {
    function sync() {
      const selected = getStoredLanguage();

      setLanguage(selected);
      document.documentElement.lang = selected;
      document.documentElement.dir = selected === "ar" ? "rtl" : "ltr";
    }

    sync();
    const timer = window.setTimeout(() => void load(), 0);

    window.addEventListener("storage", sync);
    window.addEventListener("organheal-language-change", sync);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("organheal-language-change", sync);
    };
  }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function edit(row: AnnouncementRow) {
    setForm({
      id: row.id,
      title: row.title,
      body: row.body,
      titleAr: row.title_ar ?? "",
      bodyAr: row.body_ar ?? "",
      linkUrl: row.link_url ?? "",
      tone: row.tone,
      isActive: row.is_active,
      expiresAt: toLocalInput(row.expires_at),
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await authorizedFetch("/api/admin/announcements", {
        method: form.id ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : "",
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setMessage({ kind: "error", text: body.error || "Unable to save." });
        return;
      }

      setForm(EMPTY_FORM);
      setMessage({
        kind: "ok",
        text: text("Saved. It appears on the homepage within a minute.", "تم الحفظ. سيظهر في الصفحة الرئيسية خلال دقيقة."),
      });
      await load();
    } catch {
      setMessage({ kind: "error", text: text("Unable to save.", "تعذّر الحفظ.") });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: AnnouncementRow) {
    await authorizedFetch("/api/admin/announcements", {
      method: "PUT",
      body: JSON.stringify({
        id: row.id,
        title: row.title,
        body: row.body,
        titleAr: row.title_ar ?? "",
        bodyAr: row.body_ar ?? "",
        linkUrl: row.link_url ?? "",
        tone: row.tone,
        isActive: !row.is_active,
        expiresAt: row.expires_at ?? "",
      }),
    });
    await load();
  }

  async function remove(row: AnnouncementRow) {
    if (!window.confirm(text("Delete this announcement?", "حذف هذا الإعلان؟"))) return;

    await authorizedFetch(`/api/admin/announcements?id=${row.id}`, { method: "DELETE" });
    await load();
  }

  const previewTitle = (isArabic && form.titleAr) || form.title || text("Your title", "عنوانك");
  const previewBody =
    (isArabic && form.bodyAr) || form.body || text("Your text appears here.", "نصك يظهر هنا.");

  return (
    <main className="ohPageShell announcementsAdmin" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <style>{`
        .announcementsAdmin { padding: 24px; display: grid; gap: 20px; max-width: 980px; margin: 0 auto; }
        .announcementsAdmin h1 { margin: 0; color: var(--oh-text); font-size: 1.6rem; }
        .announcementsAdmin p { color: var(--oh-muted); margin: 4px 0 0; }
        .announcementsForm { display: grid; gap: 14px; padding: 20px; }
        .announcementsGrid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .announcementsField { display: grid; gap: 6px; }
        .announcementsField label { color: var(--oh-text); font-size: 0.85rem; font-weight: 700; }
        .announcementsField input, .announcementsField textarea {
          width: 100%; padding: 10px 12px; border: 1px solid var(--oh-border); border-radius: 12px;
          background: var(--oh-surface-soft); color: var(--oh-text); font: inherit;
        }
        .announcementsField textarea { min-height: 96px; resize: vertical; }
        .announcementsTones { display: flex; flex-wrap: wrap; gap: 10px; }
        .announcementsTone {
          display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px;
          border: 2px solid var(--oh-border); background: var(--oh-surface-soft); color: var(--oh-text);
          font: inherit; font-weight: 700; cursor: pointer;
        }
        .announcementsTone[aria-pressed="true"] { border-color: var(--oh-text); }
        .announcementsSwatch { width: 16px; height: 16px; border-radius: 999px; }
        .announcementsMessage { padding: 10px 14px; border-radius: 12px; font-weight: 700; }
        .announcementsMessage.ok { background: var(--oh-good-soft); color: var(--oh-good); }
        .announcementsMessage.error { background: var(--oh-risk-soft); color: var(--oh-risk); }
        .announcementsPreview { max-width: 360px; }
        .announcementsList { display: grid; gap: 12px; padding: 0; margin: 0; list-style: none; }
        .announcementsRow { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 14px 16px; }
        .announcementsRow strong { color: var(--oh-text); }
        .announcementsRowMeta { color: var(--oh-muted); font-size: 0.8rem; }
        @media (max-width: 720px) { .announcementsGrid { grid-template-columns: 1fr; } }
      `}</style>

      <div>
        <h1>{text("Homepage health notes", "ملاحظات صحية للصفحة الرئيسية")}</h1>
        <p>
          {text(
            "Write a title and text, pick a color, and it appears first in the homepage health updates strip.",
            "اكتب عنواناً ونصاً، اختر لوناً، فيظهر أولاً في شريط المعلومات الصحية بالصفحة الرئيسية."
          )}
        </p>
      </div>

      {message && (
        <div className={`announcementsMessage ${message.kind}`} role="status">
          {message.text}
        </div>
      )}

      <form className="ohCard announcementsForm" onSubmit={save}>
        <div className="announcementsGrid">
          <div className="announcementsField">
            <label htmlFor="ann-title">{text("Title (English)", "العنوان (إنجليزي)")}</label>
            <input id="ann-title" value={form.title} maxLength={120} required onChange={(e) => update("title", e.target.value)} />
          </div>
          <div className="announcementsField">
            <label htmlFor="ann-title-ar">{text("Title (Arabic, optional)", "العنوان (عربي، اختياري)")}</label>
            <input id="ann-title-ar" dir="rtl" value={form.titleAr} maxLength={120} onChange={(e) => update("titleAr", e.target.value)} />
          </div>
          <div className="announcementsField">
            <label htmlFor="ann-body">{text("Text (English)", "النص (إنجليزي)")}</label>
            <textarea id="ann-body" value={form.body} maxLength={600} required onChange={(e) => update("body", e.target.value)} />
          </div>
          <div className="announcementsField">
            <label htmlFor="ann-body-ar">{text("Text (Arabic, optional)", "النص (عربي، اختياري)")}</label>
            <textarea id="ann-body-ar" dir="rtl" value={form.bodyAr} maxLength={600} onChange={(e) => update("bodyAr", e.target.value)} />
          </div>
          <div className="announcementsField">
            <label htmlFor="ann-link">{text("Link (optional)", "رابط (اختياري)")}</label>
            <input id="ann-link" type="url" placeholder="https://" value={form.linkUrl} onChange={(e) => update("linkUrl", e.target.value)} />
          </div>
          <div className="announcementsField">
            <label htmlFor="ann-expires">{text("Hide after (optional)", "إخفاء بعد (اختياري)")}</label>
            <input id="ann-expires" type="datetime-local" value={form.expiresAt} onChange={(e) => update("expiresAt", e.target.value)} />
          </div>
        </div>

        <div className="announcementsField">
          <label>{text("Color", "اللون")}</label>
          <div className="announcementsTones">
            {ANNOUNCEMENT_TONES.map((tone) => (
              <button
                type="button"
                key={tone}
                className="announcementsTone"
                aria-pressed={form.tone === tone}
                onClick={() => update("tone", tone)}
              >
                <span className="announcementsSwatch" style={{ background: TONE_LABELS[tone].hex }} />
                {isArabic ? TONE_LABELS[tone].ar : TONE_LABELS[tone].en}
              </button>
            ))}
          </div>
        </div>

        <div className="announcementsField">
          <label>{text("Preview", "معاينة")}</label>
          <div className="announcementsPreview">
            <div className="ohUpdateCard ohUpdateFeatured" data-tone={form.tone}>
              <span className="ohUpdateMeta">
                <span className="ohUpdateSource">{text("OrganHeal note", "من OrganHeal")}</span>
              </span>
              <span className="ohUpdateHeadline ohUpdateFeaturedTitle" dir="auto">{previewTitle}</span>
              <span className="ohUpdateFeaturedBody" dir="auto">{previewBody}</span>
            </div>
          </div>
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--oh-text)", fontWeight: 700 }}>
          <input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} />
          {text("Show on the homepage", "إظهار في الصفحة الرئيسية")}
        </label>

        <div className="ohButtonRow">
          <button type="submit" className="primaryBtn" disabled={saving}>
            {saving ? text("Saving...", "جاري الحفظ...") : form.id ? text("Update", "تحديث") : text("Publish", "نشر")}
          </button>
          {form.id && (
            <button type="button" className="secondaryBtn" onClick={() => setForm(EMPTY_FORM)}>
              {text("Cancel editing", "إلغاء التعديل")}
            </button>
          )}
        </div>
      </form>

      <section>
        <h2 style={{ color: "var(--oh-text)" }}>{text("Published notes", "الملاحظات المنشورة")}</h2>

        {loading ? (
          <p>{text("Loading...", "جاري التحميل...")}</p>
        ) : items.length === 0 ? (
          <p>{text("No notes yet.", "لا توجد ملاحظات بعد.")}</p>
        ) : (
          <ul className="announcementsList">
            {items.map((row) => (
              <li key={row.id} className="ohCard announcementsRow">
                <div>
                  <strong dir="auto">{row.title}</strong>
                  <div className="announcementsRowMeta">
                    {row.is_active ? text("Visible", "ظاهر") : text("Hidden", "مخفي")}
                    {row.expires_at ? ` · ${text("until", "حتى")} ${new Date(row.expires_at).toLocaleString(isArabic ? "ar" : "en")}` : ""}
                  </div>
                </div>
                <div className="ohButtonRow">
                  <button type="button" className="secondaryBtn" onClick={() => edit(row)}>{text("Edit", "تعديل")}</button>
                  <button type="button" className="secondaryBtn" onClick={() => void toggleActive(row)}>
                    {row.is_active ? text("Hide", "إخفاء") : text("Show", "إظهار")}
                  </button>
                  <button type="button" className="secondaryBtn" onClick={() => void remove(row)}>{text("Delete", "حذف")}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/" className="secondaryBtn" style={{ justifySelf: "start" }}>
        {text("Back to homepage", "العودة للصفحة الرئيسية")}
      </Link>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { useAdminLanguage } from "../use-admin-language";
import { VIDEO_TOPICS, type VideoTopicKey } from "@/lib/health-videos/catalog";
import type { VideoRow } from "@/lib/health-videos/custom";

import "./admin-videos.css";

type FormState = {
  id: string | null;
  youtube: string;
  topic: VideoTopicKey;
  title: string;
  titleAr: string;
  source: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  youtube: "",
  topic: "diabetes",
  title: "",
  titleAr: "",
  source: "",
  isActive: true,
};

export default function AdminVideosPage() {
  const { isArabic, language, text } = useAdminLanguage();
  const [items, setItems] = useState<VideoRow[]>([]);
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
      const response = await authorizedFetch("/api/admin/videos");
      const body = await response.json();

      if (!response.ok) {
        setMessage({
          kind: "error",
          text:
            response.status === 403
              ? language === "ar" ? "هذا الحساب ليس لديه صلاحية المسؤول." : "This account does not have administrator access."
              : body.error || (language === "ar" ? "تعذر تحميل الفيديوهات." : "Unable to load videos."),
        });
        return;
      }

      setItems(body.videos ?? []);
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error && error.message === "signin"
            ? language === "ar" ? "يرجى تسجيل الدخول بحساب المسؤول." : "Please sign in with the administrator account."
            : language === "ar" ? "تعذر تحميل الفيديوهات." : "Unable to load videos.",
      });
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, language]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await authorizedFetch("/api/admin/videos", {
        method: form.id ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      const body = await response.json();

      if (!response.ok) {
        setMessage({ kind: "error", text: body.error || text("Unable to save.", "تعذر الحفظ.") });
        return;
      }

      setMessage({ kind: "ok", text: form.id ? text("Video updated.", "تم تحديث الفيديو.") : text("Video added.", "تمت إضافة الفيديو.") });
      setForm(EMPTY_FORM);
      await load();
    } catch {
      setMessage({ kind: "error", text: text("Unable to save.", "تعذر الحفظ.") });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: VideoRow) {
    await authorizedFetch("/api/admin/videos", {
      method: "PUT",
      body: JSON.stringify({
        id: item.id,
        youtube: item.youtube_id,
        topic: item.topic,
        title: item.title,
        titleAr: item.title_ar ?? "",
        source: item.source,
        isActive: !item.is_active,
      }),
    });
    await load();
  }

  async function remove(item: VideoRow) {
    if (!window.confirm(text(`Delete "${item.title}"?`, `حذف "${item.title}"؟`))) return;

    await authorizedFetch(`/api/admin/videos?id=${item.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <main className="ohPageShell adminVideos" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <header>
        <p className="ohEyebrow">{text("Administrator", "المسؤول")}</p>
        <h1>{text("Health videos", "الفيديوهات الصحية")}</h1>
        <p>
          {text(
            "Add videos to the homepage Watch & understand section and to chat suggestions. Only add videos published by health organisations that allow embedding, and name the publisher.",
            "أضف فيديوهات إلى قسم شاهد وافهم في الصفحة الرئيسية وإلى اقتراحات الدردشة. أضف فقط فيديوهات تنشرها جهات صحية تسمح بالتضمين، واذكر الجهة الناشرة."
          )}
        </p>
        <Link href="/admin">{text("Back to site management", "العودة إلى إدارة الموقع")}</Link>
      </header>

      <form className="adminVideosForm" onSubmit={save}>
        <label>
          {text("YouTube link or video id", "رابط يوتيوب أو معرّف الفيديو")}
          <input
            required
            dir="ltr"
            value={form.youtube}
            onChange={(event) => setForm({ ...form, youtube: event.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </label>

        <label>
          {text("Topic", "الموضوع")}
          <select
            value={form.topic}
            onChange={(event) => setForm({ ...form, topic: event.target.value as VideoTopicKey })}
          >
            {VIDEO_TOPICS.map((topic) => (
              <option key={topic.key} value={topic.key}>
                {isArabic ? topic.label.ar : topic.label.en}
              </option>
            ))}
          </select>
        </label>

        <label>
          {text("Title (English)", "العنوان (بالإنجليزية)")}
          <input
            required
            maxLength={140}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </label>

        <label>
          {text("Title (Arabic, optional)", "العنوان (بالعربية، اختياري)")}
          <input
            dir="rtl"
            maxLength={140}
            value={form.titleAr}
            onChange={(event) => setForm({ ...form, titleAr: event.target.value })}
          />
        </label>

        <label>
          {text("Published by", "الجهة الناشرة")}
          <input
            required
            maxLength={120}
            value={form.source}
            onChange={(event) => setForm({ ...form, source: event.target.value })}
            placeholder={text("e.g. World Health Organization (WHO)", "مثال: منظمة الصحة العالمية (WHO)")}
          />
        </label>

        <label className="adminVideosCheck">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          />
          {text("Show on the site", "إظهار في الموقع")}
        </label>

        <div className="adminVideosActions">
          <button type="submit" disabled={saving}>
            {saving ? text("Saving…", "جارٍ الحفظ…") : form.id ? text("Save changes", "حفظ التعديلات") : text("Add video", "إضافة فيديو")}
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

      <section className="adminVideosList" aria-label={text("Added videos", "الفيديوهات المضافة")}>
        <h2>
          {text("Added videos", "الفيديوهات المضافة")} ({items.length})
        </h2>
        {loading && <p>{text("Loading…", "جارٍ التحميل…")}</p>}
        {!loading && items.length === 0 && (
          <p>
            {text(
              "No videos added yet. The site already shows its built-in catalog of vetted videos.",
              "لم تُضف فيديوهات بعد. الموقع يعرض أصلاً مكتبته المدمجة من الفيديوهات الموثوقة."
            )}
          </p>
        )}
        <ul>
          {items.map((item) => (
            <li key={item.id} data-active={item.is_active}>
              <div>
                <strong>{item.title}</strong>
                <span>
                  {item.topic} · {item.source} · {item.youtube_id}
                </span>
              </div>
              <div className="adminVideosRowActions">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: item.id,
                      youtube: item.youtube_id,
                      topic: item.topic,
                      title: item.title,
                      titleAr: item.title_ar ?? "",
                      source: item.source,
                      isActive: item.is_active,
                    })
                  }
                >
                  {text("Edit", "تعديل")}
                </button>
                <button type="button" onClick={() => void toggle(item)}>
                  {item.is_active ? text("Hide", "إخفاء") : text("Show", "إظهار")}
                </button>
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

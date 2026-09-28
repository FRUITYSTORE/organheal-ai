"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import type { StudioVideoRow } from "@/lib/repositories/studio-video.repository";

import { useAdminLanguage } from "../use-admin-language";

import "../videos/admin-videos.css";

const STATUS_LABELS: Record<StudioVideoRow["status"], { en: string; ar: string }> = {
  queued: { en: "Queued", ar: "في الانتظار" },
  fetching: { en: "Fetching assets", ar: "جاري تجهيز العناصر" },
  rendering: { en: "Rendering", ar: "جاري التركيب" },
  saving: { en: "Saving", ar: "جاري الحفظ" },
  done: { en: "Done", ar: "منتهٍ" },
  failed: { en: "Failed", ar: "فشل" },
};

// Pilot-only screen (see the plan discussed with the owner): triggers one
// Shotstack render at a time from a topic, so the real cost/quality/time of
// a rendered video (not the free slideshow explainer) can be judged before
// this is wired to any member-facing flow.
export default function AdminStudioVideoPage() {
  const { isArabic, language, text } = useAdminLanguage();
  const [topic, setTopic] = useState("");
  const [videos, setVideos] = useState<StudioVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const authorizedFetch = useCallback(async (input: string, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("signin");
    }

    return fetch(input, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await authorizedFetch("/api/admin/studio-video");
      const body = await response.json();

      if (!response.ok) {
        setMessage({
          kind: "error",
          text:
            response.status === 403
              ? text("You do not have permission to use the video studio.", "ليست لديك صلاحية استخدام مصنع الفيديو.")
              : body.error || text("Unable to load videos.", "تعذر تحميل الفيديوهات."),
        });
        return;
      }

      setVideos(body.videos ?? []);
    } catch {
      setMessage({ kind: "error", text: text("Please sign in as an administrator.", "يرجى تسجيل الدخول كمسؤول.") });
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, text]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function startRender(event: React.FormEvent) {
    event.preventDefault();

    if (!topic.trim()) {
      return;
    }

    setStarting(true);
    setMessage(null);

    try {
      const response = await authorizedFetch("/api/admin/studio-video", {
        method: "POST",
        body: JSON.stringify({ topic }),
      });
      const body = await response.json();

      if (!response.ok) {
        setMessage({ kind: "error", text: body.error || text("Unable to start the render.", "تعذر بدء الرندرة.") });
        return;
      }

      setMessage({
        kind: "ok",
        text: text(
          "Render started. This can take a few minutes — refresh the list below to check progress.",
          "بدأت الرندرة. قد تستغرق بضع دقائق — حدّث القائمة أدناه لمتابعة التقدم."
        ),
      });
      setTopic("");
      await load();
    } catch {
      setMessage({ kind: "error", text: text("Unable to start the render.", "تعذر بدء الرندرة.") });
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="ohPageShell adminVideos" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <header>
        <p className="ohEyebrow">{text("Administrator — pilot", "المسؤول — تجريبي")}</p>
        <h1>{text("Video studio", "مصنع الفيديو")}</h1>
        <p>
          {text(
            "Generates ONE real rendered video (stock footage + narration audio + burned captions) from a health topic, via Shotstack. Every render has a real cost — use this to judge quality and timing before it is offered to members.",
            "يولّد فيديو واحدًا حقيقيًا (لقطات + تعليق صوتي + ترجمة محروقة) من موضوع صحي، عبر Shotstack. لكل رندرة تكلفة حقيقية — استخدم هذه الصفحة لتقييم الجودة والوقت قبل إتاحتها للأعضاء."
          )}
        </p>
        <Link href="/admin">{text("Back to site management", "العودة إلى إدارة الموقع")}</Link>
      </header>

      <form
        className="adminVideosForm"
        onSubmit={(event) => {
          void startRender(event);
        }}
      >
        <label>
          {text("Health topic", "الموضوع الصحي")}
          <input
            required
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder={text("e.g. Understanding LDL cholesterol", "مثال: فهم الكوليسترول الضار LDL")}
          />
        </label>

        <div className="adminVideosActions">
          <button type="submit" disabled={starting}>
            {starting ? text("Starting…", "جارٍ البدء…") : text("Generate trial video", "أنشئ فيديو تجريبيًا")}
          </button>
          <button type="button" onClick={() => void load()}>
            {text("Refresh list", "تحديث القائمة")}
          </button>
        </div>

        {message && (
          <p className="adminVideosMessage" data-kind={message.kind} role="status">
            {message.text}
          </p>
        )}
      </form>

      <section className="adminVideosList" aria-label={text("Recent renders", "الرندرات الأخيرة")}>
        <h2>
          {text("Recent renders", "الرندرات الأخيرة")} ({videos.length})
        </h2>
        {loading && <p>{text("Loading…", "جارٍ التحميل…")}</p>}
        {!loading && videos.length === 0 && (
          <p>{text("No renders yet.", "لا توجد رندرات بعد.")}</p>
        )}
        <ul>
          {videos.map((video) => (
            <li key={video.id} data-active={video.status === "done"}>
              <div>
                <strong>{video.title || video.topic}</strong>
                <span>
                  {isArabic ? STATUS_LABELS[video.status].ar : STATUS_LABELS[video.status].en}
                  {video.error_message ? ` · ${video.error_message}` : ""}
                </span>
              </div>
              {video.output_url && (
                <div className="adminVideosRowActions">
                  <a href={video.output_url} target="_blank" rel="noreferrer">
                    {text("View video", "مشاهدة الفيديو")}
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

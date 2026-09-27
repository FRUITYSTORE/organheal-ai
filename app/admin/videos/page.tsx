"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
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
              ? "This account does not have administrator access."
              : body.error || "Unable to load videos.",
        });
        return;
      }

      setItems(body.videos ?? []);
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error && error.message === "signin"
            ? "Please sign in with the administrator account."
            : "Unable to load videos.",
      });
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch]);

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
        setMessage({ kind: "error", text: body.error || "Unable to save." });
        return;
      }

      setMessage({ kind: "ok", text: form.id ? "Video updated." : "Video added." });
      setForm(EMPTY_FORM);
      await load();
    } catch {
      setMessage({ kind: "error", text: "Unable to save." });
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
    if (!window.confirm(`Delete "${item.title}"?`)) return;

    await authorizedFetch(`/api/admin/videos?id=${item.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <main className="ohPageShell adminVideos">
      <header>
        <p className="ohEyebrow">Administrator</p>
        <h1>Health videos</h1>
        <p>
          Add videos to the homepage &quot;Watch &amp; understand&quot; section and to chat
          suggestions. Only add videos published by health organisations that allow
          embedding, and name the publisher.
        </p>
        <Link href="/admin/announcements">Homepage health notes</Link>
      </header>

      <form className="adminVideosForm" onSubmit={save}>
        <label>
          YouTube link or video id
          <input
            required
            value={form.youtube}
            onChange={(event) => setForm({ ...form, youtube: event.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </label>

        <label>
          Topic
          <select
            value={form.topic}
            onChange={(event) => setForm({ ...form, topic: event.target.value as VideoTopicKey })}
          >
            {VIDEO_TOPICS.map((topic) => (
              <option key={topic.key} value={topic.key}>
                {topic.label.en} / {topic.label.ar}
              </option>
            ))}
          </select>
        </label>

        <label>
          Title (English)
          <input
            required
            maxLength={140}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </label>

        <label>
          Title (Arabic, optional)
          <input
            dir="rtl"
            maxLength={140}
            value={form.titleAr}
            onChange={(event) => setForm({ ...form, titleAr: event.target.value })}
          />
        </label>

        <label>
          Published by
          <input
            required
            maxLength={120}
            value={form.source}
            onChange={(event) => setForm({ ...form, source: event.target.value })}
            placeholder="e.g. World Health Organization (WHO)"
          />
        </label>

        <label className="adminVideosCheck">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          />
          Show on the site
        </label>

        <div className="adminVideosActions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : form.id ? "Save changes" : "Add video"}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(EMPTY_FORM)}>
              Cancel edit
            </button>
          )}
        </div>

        {message && (
          <p className="adminVideosMessage" data-kind={message.kind} role="status">
            {message.text}
          </p>
        )}
      </form>

      <section className="adminVideosList" aria-label="Added videos">
        <h2>Added videos ({items.length})</h2>
        {loading && <p>Loading…</p>}
        {!loading && items.length === 0 && (
          <p>
            No videos added yet. The site already shows its built-in catalog of vetted videos.
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
                  Edit
                </button>
                <button type="button" onClick={() => void toggle(item)}>
                  {item.is_active ? "Hide" : "Show"}
                </button>
                <button type="button" onClick={() => void remove(item)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

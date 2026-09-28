"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";

export type PersonalVideoPhase = "idle" | "starting" | "checking" | "queued" | "done" | "error";

// Shared by every place a member can ask for a real rendered video of their
// own report (the homepage's "Watch & understand" section and the chat
// offer) — one request/status flow against /api/studio-video/personal,
// instead of duplicating it per surface.
export function usePersonalVideoRequest(isArabic: boolean) {
  const text = (en: string, ar: string) => (isArabic ? ar : en);
  const [phase, setPhase] = useState<PersonalVideoPhase>("idle");
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  async function start() {
    if (phase === "starting" || phase === "checking") {
      return;
    }

    setPhase("starting");
    setMessage("");
    setVideoUrl(null);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setMessage(text("Sign in to make a real video from your report.", "سجّل الدخول لصنع فيديو حقيقي من تقريرك."));
        setPhase("error");
        return;
      }

      const response = await fetch("/api/studio-video/personal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ language: isArabic ? "ar" : "en" }),
      });
      const body = (await response.json()) as { error?: string; response?: string };

      if (!response.ok) {
        setMessage(body.response || body.error || text("We couldn't start the video just now.", "تعذّر بدء الفيديو الآن."));
        setPhase("error");
        return;
      }

      setPhase("queued");
      setMessage(
        text(
          'Started — this takes a few minutes. Press "Check status" below to see when it\'s ready.',
          'بدأ الإنشاء — يستغرق بضع دقائق. اضغط "تحقق من الحالة" أدناه لمعرفة متى يصبح جاهزًا.'
        )
      );
    } catch {
      setMessage(text("Connection problem. Please try again.", "مشكلة في الاتصال. حاول مرة أخرى."));
      setPhase("error");
    }
  }

  async function checkStatus() {
    setPhase("checking");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        return;
      }

      const response = await fetch("/api/studio-video/personal", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json()) as {
        videos?: Array<{ status: string; output_url: string | null; error_message: string | null }>;
      };
      const latest = body.videos?.[0];

      if (!latest) {
        setPhase("idle");
        return;
      }

      if (latest.status === "done" && latest.output_url) {
        setVideoUrl(latest.output_url);
        setMessage(text("Your video is ready.", "فيديوك جاهز."));
        setPhase("done");
      } else if (latest.status === "failed") {
        setMessage(latest.error_message || text("The video failed to render.", "فشل إنشاء الفيديو."));
        setPhase("error");
      } else {
        setMessage(text("Still rendering — check again shortly.", "لا يزال قيد الإنشاء — تحقق مرة أخرى بعد قليل."));
        setPhase("queued");
      }
    } catch {
      setPhase("queued");
    }
  }

  return { phase, message, videoUrl, start, checkStatus };
}

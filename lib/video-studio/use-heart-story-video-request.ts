"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";
import type { HeartAgeInput } from "@/lib/heart-age/heart-age.engine";

export type HeartStoryVideoPhase = "idle" | "starting" | "checking" | "queued" | "done" | "error";

// The request/status flow for the Heart Age calculator's "Layer 3" personal
// video (app/heart/page.tsx) — same shape as usePersonalVideoRequest, but
// posts the member's own heart-age inputs to /api/studio-video/heart-story
// instead of just a language, and picks the "Personal heart story" entry out
// of the shared studio-video list rather than assuming the newest video is
// always this one (a member could also have a personal-report video).
export function useHeartStoryVideoRequest(isArabic: boolean) {
  const text = (en: string, ar: string) => (isArabic ? ar : en);
  const [phase, setPhase] = useState<HeartStoryVideoPhase>("idle");
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  async function start(input: HeartAgeInput) {
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
        setMessage(
          text(
            "Sign in to make a real video about your heart.",
            "سجّل الدخول لصنع فيديو حقيقي عن قلبك."
          )
        );
        setPhase("error");
        return;
      }

      const response = await fetch("/api/studio-video/heart-story", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ language: isArabic ? "ar" : "en", ...input }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(body.error || text("We couldn't start the video just now.", "تعذّر بدء الفيديو الآن."));
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

      // Heart-story videos are stored in the same studio_videos table as the
      // personal-report videos, so this reuses that same listing endpoint —
      // finding this member's heart-story entry by topic rather than
      // assuming index 0, since they could have both kinds.
      const response = await fetch("/api/studio-video/personal", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json()) as {
        videos?: Array<{ topic: string; status: string; output_url: string | null; error_message: string | null }>;
      };
      const latest = body.videos?.find((video) => video.topic === "Personal heart story");

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

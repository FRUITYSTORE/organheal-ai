"use client";

import { useState } from "react";

import {
  HEALTH_VIDEOS,
  VIDEO_TOPICS,
  buildEmbedUrl,
  getVideosForTopic,
  type HealthVideo,
  type VideoTopicKey,
} from "@/lib/health-videos/catalog";
import { openHealthChat } from "@/lib/health-updates/chat-events";
import {
  EXPLAINER_LIMITS,
  type ExplainerScript,
} from "@/lib/health-videos/explainer";
import { supabase } from "@/lib/supabase";

import ExplainerPlayer from "./ExplainerPlayer";

import "./home-watch.css";

// Videos load only after the visitor presses play, so opening the homepage
// never contacts YouTube. Embeds use the privacy-enhanced youtube-nocookie
// domain, and nothing about the visitor or their reports is sent with them.
export default function HomeWatchSection({ isArabic }: { isArabic: boolean }) {
  const text = (en: string, ar: string) => (isArabic ? ar : en);
  const [topic, setTopic] = useState<VideoTopicKey>(VIDEO_TOPICS[0].key);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [script, setScript] = useState<ExplainerScript | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const videos = getVideosForTopic(topic);
  const active: HealthVideo | undefined =
    videos.find((video) => video.youtubeId === playingId) ?? undefined;
  const topicLabel = VIDEO_TOPICS.find((entry) => entry.key === topic)?.label;

  async function createExplainer(rawQuestion: string) {
    const topicText = rawQuestion.trim();

    if (topicText.length < EXPLAINER_LIMITS.minQuestionLength || phase === "loading") {
      return;
    }

    setPhase("loading");
    setErrorMessage("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/video-explainer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question: topicText,
          language: isArabic ? "ar" : "en",
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        script?: ExplainerScript;
        error?: string;
        response?: string;
      } | null;

      if (!response.ok || !payload?.script) {
        setErrorMessage(
          payload?.response ||
            payload?.error ||
            text("Something went wrong. Please try again.", "حدث خطأ. حاول مرة أخرى.")
        );
        setPhase("error");
        return;
      }

      setScript(payload.script);
      setPhase("ready");
    } catch {
      setErrorMessage(
        text("Connection problem. Please try again.", "مشكلة في الاتصال. حاول مرة أخرى.")
      );
      setPhase("error");
    }
  }

  function chooseTopic(next: VideoTopicKey) {
    setTopic(next);
    setPlayingId(null);
  }

  return (
    <section className="ohWatch" aria-labelledby="ohWatchTitle">
      <div className="ohWatchHeader">
        <div>
          <p className="ohEyebrow">{text("Watch & understand", "شاهد وافهم")}</p>
          <h2 id="ohWatchTitle" className="ohWatchTitle">
            {text(
              "Short videos from trusted health bodies",
              "فيديوهات قصيرة من جهات صحية موثوقة"
            )}
          </h2>
          <p className="ohWatchSubtitle">
            {text(
              `${HEALTH_VIDEOS.length} free videos on the topics people ask about most. Pick one, press play.`,
              `${HEALTH_VIDEOS.length} فيديو مجاني عن أكثر المواضيع سؤالاً. اختر موضوعاً واضغط تشغيل.`
            )}
          </p>
        </div>
      </div>

      <div className="ohWatchTopics" role="tablist" aria-label={text("Topics", "المواضيع")}>
        {VIDEO_TOPICS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={topic === entry.key}
            className="ohWatchTopic"
            data-active={topic === entry.key}
            onClick={() => chooseTopic(entry.key)}
          >
            {isArabic ? entry.label.ar : entry.label.en}
          </button>
        ))}
      </div>

      <div className="ohWatchBody">
        <div className="ohWatchStage">
          {active ? (
            <iframe
              key={active.youtubeId}
              className="ohWatchFrame"
              src={buildEmbedUrl(active.youtubeId, isArabic)}
              title={isArabic ? active.title.ar : active.title.en}
              allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="ohWatchIdle">
              <span className="ohWatchPlayIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
                  <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
                </svg>
              </span>
              <strong>{isArabic ? topicLabel?.ar : topicLabel?.en}</strong>
              <span>
                {text(
                  "Choose a video from the list to play it here.",
                  "اختر فيديو من القائمة لتشغيله هنا."
                )}
              </span>
            </div>
          )}
        </div>

        <ul className="ohWatchList">
          {videos.map((video) => {
            const selected = video.youtubeId === playingId;

            return (
              <li key={video.youtubeId}>
                <button
                  type="button"
                  className="ohWatchItem"
                  data-active={selected}
                  onClick={() => setPlayingId(video.youtubeId)}
                >
                  <span className="ohWatchItemPlay" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
                    </svg>
                  </span>
                  <span className="ohWatchItemText">
                    <strong>{isArabic ? video.title.ar : video.title.en}</strong>
                    <small>{video.source}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="ohWatchMake">
        <div>
          <strong>
            {text(
              "Need something specific? Get a video made for you",
              "تحتاج شيئاً محدداً؟ اصنع فيديو لك"
            )}
          </strong>
          <span>
            {text(
              "Type a condition, a lab result or a question. We build a short narrated explainer in seconds.",
              "اكتب مرضاً أو نتيجة تحليل أو سؤالاً، ونبني لك شرحاً قصيراً بالصوت خلال ثوانٍ."
            )}
          </span>
        </div>
        <form
          className="ohWatchMakeForm"
          onSubmit={(event) => {
            event.preventDefault();
            void createExplainer(question);
          }}
        >
          <input
            value={question}
            maxLength={EXPLAINER_LIMITS.maxQuestionLength}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={text("e.g. What is fatty liver?", "مثال: ما هو الكبد الدهني؟")}
            aria-label={text("What should the video explain?", "ماذا يشرح الفيديو؟")}
          />
          <button
            type="submit"
            disabled={
              phase === "loading" ||
              question.trim().length < EXPLAINER_LIMITS.minQuestionLength
            }
          >
            {phase === "loading"
              ? text("Creating…", "جارٍ الإنشاء…")
              : text("Create video", "أنشئ الفيديو")}
          </button>
        </form>
        {phase === "error" && (
          <p className="ohWatchError" role="alert">
            {errorMessage}
          </p>
        )}
        {phase === "ready" && script && (
          <ExplainerPlayer
            script={script}
            language={isArabic ? "ar" : "en"}
            onClose={() => {
              setScript(null);
              setPhase("idle");
            }}
          />
        )}
      </div>

      <div className="ohWatchFooter">
        <p className="ohWatchNote">
          {text(
            "Videos are in English (turn on captions for Arabic). Educational only; they do not replace your doctor. Each belongs to the organisation named beside it.",
            "الفيديوهات بالإنجليزية (فعّل الترجمة العربية من المشغّل). للتثقيف فقط ولا تغني عن الطبيب. وكل فيديو ملك للجهة المذكورة بجانبه."
          )}
        </p>
        <button
          type="button"
          className="ohWatchAsk"
          onClick={() =>
            openHealthChat(
              topicLabel
                ? isArabic
                  ? `اشرح لي ${topicLabel.ar} ببساطة`
                  : `Explain ${topicLabel.en} in simple words`
                : undefined
            )
          }
        >
          {text("Ask about this topic", "اسأل عن هذا الموضوع")}
        </button>
      </div>
    </section>
  );
}

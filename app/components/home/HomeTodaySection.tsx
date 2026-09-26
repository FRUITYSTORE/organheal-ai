"use client";

import { useEffect, useState } from "react";

import FeaturedNoteCard, { type Announcement } from "./FeaturedNoteCard";
import { openHealthChat } from "@/lib/health-updates/chat-events";
import {
  getDailyTips,
  TIP_CATEGORY_LABELS,
  type DailyTip,
} from "@/lib/health-updates/daily-tips";
import { POPULAR_QUESTIONS } from "@/lib/health-updates/popular-questions";

import "./health-updates-strip.css";
import "./home-today.css";

// The homepage's daily reading: the owner's featured notes, three fresh tips
// every day, and a way to turn any of them into a conversation.
export default function HomeTodaySection({ isArabic }: { isArabic: boolean }) {
  const [notes, setNotes] = useState<Announcement[]>([]);
  const [tips, setTips] = useState<DailyTip[]>([]);
  const [today, setToday] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const language = isArabic ? "ar" : "en";

  // Tips depend on the visitor's date, so they are chosen after mount and
  // never during server rendering.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = new Date();

      setTips(getDailyTips(now));
      setToday(
        new Intl.DateTimeFormat(isArabic ? "ar" : "en", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(now)
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isArabic]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/health-announcements?lang=${language}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { items?: Announcement[] } | null) => {
        setNotes((data?.items ?? []).slice(0, 3));
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [language]);

  async function share(tip: DailyTip) {
    const copy = isArabic ? tip.ar : tip.en;
    const message = `${copy.title}\n${copy.body}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: copy.title, text: message, url: window.location.origin });
        return;
      }

      await navigator.clipboard.writeText(`${message}\n${window.location.origin}`);
      setCopied(tip.id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // The visitor cancelled sharing, or the browser blocked it.
    }
  }

  if (tips.length === 0) {
    return null;
  }

  return (
    <section
      className="ohToday"
      aria-label={isArabic ? "قراءة اليوم الصحية" : "Today's health reading"}
    >
      <header className="ohTodayHeader">
        <div>
          <p className="ohEyebrow">
            {isArabic ? "قراءة اليوم" : "Today"} · {today}
          </p>
          <h2 className="ohTodayTitle">
            {isArabic ? "نصائح صحية ليومك" : "Health tips for your day"}
          </h2>
          <p className="ohTodaySubtitle">
            {isArabic
              ? "ثلاث نصائح جديدة كل يوم، بلغة بسيطة وقابلة للتطبيق."
              : "Three fresh tips every day — simple, practical, and easy to act on."}
          </p>
        </div>

        <button type="button" className="ohTodayChatBtn" onClick={() => openHealthChat()}>
          {isArabic ? "ابدأ دردشة صحية" : "Start a health chat"}
        </button>
      </header>

      {notes.length > 0 && (
        <div className="ohTodayNotes">
          <p className="ohTodayKicker">
            {isArabic ? "ملاحظة مميزة من فريق OrganHeal" : "Featured by the OrganHeal team"}
          </p>

          <ul className="ohFeaturedNotesGrid">
            {notes.map((note) => (
              <li key={note.id}>
                <FeaturedNoteCard item={note} isArabic={isArabic} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="ohTodayTips">
        {tips.map((tip, index) => {
          const copy = isArabic ? tip.ar : tip.en;

          return (
            <li key={tip.id} className="ohTodayTip" data-category={tip.category}>
              <span className="ohTodayTipNumber" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="ohTodayTipCategory">
                {TIP_CATEGORY_LABELS[tip.category][language]}
              </span>

              <h3 className="ohTodayTipTitle" dir="auto">{copy.title}</h3>
              <p className="ohTodayTipBody" dir="auto">{copy.body}</p>

              <div className="ohTodayTipActions">
                <button
                  type="button"
                  onClick={() =>
                    openHealthChat(
                      isArabic
                        ? `اشرح لي أكثر: ${copy.title}`
                        : `Tell me more about: ${copy.title}`
                    )
                  }
                >
                  {isArabic ? "اسأل عن هذه النصيحة" : "Ask about this"}
                </button>

                <button type="button" onClick={() => void share(tip)}>
                  {copied === tip.id
                    ? isArabic ? "تم النسخ" : "Copied"
                    : isArabic ? "شارك" : "Share"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="ohTodayQuestions">
        <p className="ohTodayKicker">
          {isArabic ? "أسئلة يسألها الناس كثيرًا" : "Questions people often ask"}
        </p>

        <div className="ohTodayQuestionList">
          {POPULAR_QUESTIONS.map((question) => (
            <button
              type="button"
              key={question.en}
              onClick={() => openHealthChat(isArabic ? question.ar : question.en)}
            >
              {isArabic ? question.ar : question.en}
            </button>
          ))}
        </div>
      </div>

      <p className="ohTodayDisclaimer">
        {isArabic
          ? "معلومات تثقيفية عامة وليست بديلًا عن استشارة الطبيب."
          : "General educational information — not a substitute for medical advice."}
      </p>
    </section>
  );
}

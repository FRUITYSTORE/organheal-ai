"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  EXPLAINER_DISCLAIMER,
  type ExplainerLanguage,
  type ExplainerScript,
  type ExplainerSlide,
} from "@/lib/health-videos/explainer";

// Plays a generated explainer as an animated slideshow. Narration uses the
// browser's built-in speech voices (free, nothing is uploaded); if a device has
// no voice for the language the slides advance on a reading-time timer instead.
export default function ExplainerPlayer({
  script,
  language,
  onClose,
}: {
  script: ExplainerScript;
  language: ExplainerLanguage;
  onClose: () => void;
}) {
  const isArabic = language === "ar";
  const text = (en: string, ar: string) => (isArabic ? ar : en);
  const slides: ExplainerSlide[] = useMemo(
    () => [...script.slides, EXPLAINER_DISCLAIMER[language]],
    [script, language]
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const advanceRef = useRef<() => void>(() => undefined);

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  useEffect(() => {
    advanceRef.current = () => {
      if (isLast) {
        setPlaying(false);
        return;
      }

      setIndex((current) => current + 1);
    };
  }, [isLast]);

  useEffect(() => {
    if (!playing) {
      return undefined;
    }

    const synth =
      typeof window !== "undefined" && "speechSynthesis" in window
        ? window.speechSynthesis
        : null;
    // Reading time fallback: roughly 65 ms per character, never under 4 s.
    const readingMs = Math.max(4000, slide.narration.length * 65);
    let finished = false;
    let timer: number | undefined;

    const finish = () => {
      if (finished) {
        return;
      }

      finished = true;
      window.clearTimeout(timer);
      advanceRef.current();
    };

    const voices = synth && !muted ? synth.getVoices() : [];
    const hasVoice =
      !muted &&
      synth &&
      (voices.length === 0 ||
        voices.some((voice) => voice.lang.toLowerCase().startsWith(language)));

    if (synth && hasVoice) {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(slide.narration);

      utterance.lang = isArabic ? "ar-SA" : "en-US";
      utterance.rate = 0.95;
      utterance.onend = finish;
      utterance.onerror = finish;
      synth.speak(utterance);
      // If the voice never reports back, do not stall the slideshow.
      timer = window.setTimeout(finish, readingMs * 2.5);
    } else {
      timer = window.setTimeout(finish, readingMs);
    }

    return () => {
      finished = true;
      window.clearTimeout(timer);
      synth?.cancel();
    };
  }, [index, playing, muted, slide.narration, language, isArabic]);

  function goTo(next: number) {
    setIndex(Math.min(Math.max(next, 0), slides.length - 1));
    setPlaying(true);
  }

  return (
    <div className="ohExplainer" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <div className="ohExplainerScreen" key={index}>
        <p className="ohExplainerKicker">{script.title}</p>
        <h3 className="ohExplainerHeading">{slide.heading}</h3>
        <ul className="ohExplainerBullets">
          {slide.bullets.map((bullet, position) => (
            <li key={bullet} style={{ animationDelay: `${0.25 + position * 0.3}s` }}>
              {bullet}
            </li>
          ))}
        </ul>
        <p className="ohExplainerCaption" aria-live="polite">
          {slide.narration}
        </p>
      </div>

      <div className="ohExplainerBar" aria-hidden="true">
        <span style={{ width: `${((index + 1) / slides.length) * 100}%` }} />
      </div>

      <div className="ohExplainerControls">
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0}>
          {text("Back", "السابق")}
        </button>
        <button
          type="button"
          className="ohExplainerPrimary"
          onClick={() => {
            if (!playing && isLast) {
              goTo(0);
              return;
            }

            setPlaying((value) => !value);
          }}
        >
          {playing
            ? text("Pause", "إيقاف مؤقت")
            : isLast
              ? text("Replay", "إعادة")
              : text("Play", "تشغيل")}
        </button>
        <button type="button" onClick={() => goTo(index + 1)} disabled={isLast}>
          {text("Next", "التالي")}
        </button>
        <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted}>
          {muted ? text("Voice off", "الصوت مغلق") : text("Voice on", "الصوت يعمل")}
        </button>
        <button type="button" onClick={onClose}>
          {text("Close", "إغلاق")}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { OPEN_HEALTH_CHAT_EVENT } from "@/lib/health-updates/chat-events";
import { POPULAR_QUESTIONS } from "@/lib/health-updates/popular-questions";

import "./health-chat.css";

type Language = "en" | "ar";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  action?: { label: string; href: string } | null;
};

const HIDDEN_PREFIXES = [
  "/login",
  "/signup",
  "/verify",
  "/onboarding",
  "/reset-password",
  "/admin",
  "/assistant",
];

const STORAGE_KEY = "organheal-health-chat";
const MAX_STORED = 16;

const STARTERS = POPULAR_QUESTIONS;

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

function renderInline(line: string): React.ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}

// Answers arrive as light markdown (bold text and "- " bullets). Rendering it
// as React nodes keeps it readable without ever injecting raw HTML.
function RichText({ content }: { content: string }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length === 0) return;

    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {bullets.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  content.split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);

    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }

    flush();

    if (line) {
      blocks.push(<p key={`p-${blocks.length}`}>{renderInline(line)}</p>);
    }
  });

  flush();

  return <div dir="auto">{blocks}</div>;
}

function readStoredMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : [];

    return Array.isArray(parsed) ? parsed.slice(-MAX_STORED) : [];
  } catch {
    return [];
  }
}

export default function HealthChatLauncher() {
  const pathname = usePathname() ?? "/";
  const [language, setLanguage] = useState<Language>("en");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMember, setIsMember] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const loadingRef = useRef(false);

  const isArabic = language === "ar";
  const text = (en: string, ar: string) => (isArabic ? ar : en);
  const hidden = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLanguage(getStoredLanguage());
      const stored = readStoredMessages();

      messagesRef.current = stored;
      setMessages(stored);
    }, 0);

    function sync() {
      setLanguage(getStoredLanguage());
    }

    window.addEventListener("storage", sync);
    window.addEventListener("organheal-language-change", sync);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("organheal-language-change", sync);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading, open]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setIsMember(Boolean(data.session));
      })
      .catch(() => undefined);

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsMember(Boolean(session));
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const persist = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-MAX_STORED)));
    } catch {
      // The conversation just won't survive a page change.
    }
  }, []);

  const send = useCallback(
    async (question: string) => {
      const message = question.trim();

      if (!message || loadingRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      setDraft("");

      const history = messagesRef.current;

      persist([...history, { role: "user", content: message }]);

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message,
            language: getStoredLanguage(),
            conversation: history.slice(-6).map(({ role, content }) => ({ role, content })),
          }),
        });

        const body = (await response.json().catch(() => ({}))) as {
          response?: string;
          error?: string;
          action?: { label: string; href: string } | null;
        };

        const answer =
          body.response ||
          (response.status === 429
            ? getStoredLanguage() === "ar"
              ? "الطلبات كثيرة الآن. حاول بعد قليل."
              : "Too many requests right now. Please try again shortly."
            : getStoredLanguage() === "ar"
              ? "لم أستطع إنشاء إجابة الآن. حاول مرة أخرى."
              : "I could not generate an answer right now. Please try again.");

        persist([
          ...messagesRef.current,
          { role: "assistant", content: answer, action: body.action ?? null },
        ]);
      } catch {
        persist([
          ...messagesRef.current,
          {
            role: "assistant",
            content:
              getStoredLanguage() === "ar"
                ? "تعذر الاتصال. تحقق من الإنترنت وحاول مجددًا."
                : "Could not connect. Check your connection and try again.",
          },
        ]);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [persist]
  );

  useEffect(() => {
    function onOpen(event: Event) {
      const question = (event as CustomEvent<{ question?: string }>).detail?.question;

      setOpen(true);

      if (question) {
        void send(question);
      } else {
        window.setTimeout(() => inputRef.current?.focus(), 50);
      }
    }

    window.addEventListener(OPEN_HEALTH_CHAT_EVENT, onOpen);

    return () => window.removeEventListener(OPEN_HEALTH_CHAT_EVENT, onOpen);
  }, [send]);

  if (hidden) return null;

  return (
    <div className="ohChat" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      {open && (
        <section
          className="ohChatPanel"
          role="dialog"
          aria-label={text("OrganHeal health chat", "دردشة OrganHeal الصحية")}
        >
          <header className="ohChatHeader">
            <div>
              <strong>{text("Health chat", "دردشة صحية")}</strong>
              <span>{text("Ask anything about your health", "اسأل عن أي شيء يخص صحتك")}</span>
            </div>

            <div className="ohChatHeaderActions">
              {messages.length > 0 && (
                <button
                  type="button"
                  className="ohChatIconBtn"
                  onClick={() => persist([])}
                  aria-label={text("Start a new chat", "بدء محادثة جديدة")}
                  title={text("New chat", "محادثة جديدة")}
                >
                  ↺
                </button>
              )}
              <button
                type="button"
                className="ohChatIconBtn"
                onClick={() => setOpen(false)}
                aria-label={text("Close chat", "إغلاق الدردشة")}
              >
                ×
              </button>
            </div>
          </header>

          <div className="ohChatBody" ref={listRef}>
            {messages.length === 0 ? (
              <div className="ohChatWelcome">
                <p>
                  {text(
                    "Hi! I can explain results, health terms and habits in plain language. Try one of these:",
                    "مرحبًا! أستطيع شرح النتائج والمصطلحات والعادات الصحية بلغة بسيطة. جرّب أحد هذه الأسئلة:"
                  )}
                </p>

                <div className="ohChatStarters">
                  {STARTERS.map((starter) => (
                    <button
                      type="button"
                      key={starter.en}
                      onClick={() => void send(isArabic ? starter.ar : starter.en)}
                    >
                      {isArabic ? starter.ar : starter.en}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={`ohChatMsg ${message.role}`}>
                  {message.role === "assistant" ? (
                    <RichText content={message.content} />
                  ) : (
                    <p dir="auto">{message.content}</p>
                  )}

                  {message.action && (
                    <Link href={message.action.href} className="ohChatAction">
                      {message.action.label}
                    </Link>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="ohChatMsg assistant ohChatTyping" aria-live="polite">
                <span /> <span /> <span />
              </div>
            )}
          </div>

          {!isMember && messages.filter((message) => message.role === "user").length >= 2 && (
            <div className="ohChatSave">
              <span>
                {text(
                  "Want to keep this conversation and your answers?",
                  "تريد الاحتفاظ بهذه المحادثة وإجاباتها؟"
                )}
              </span>
              <Link href="/signup">{text("Create a free account", "أنشئ حسابًا مجانيًا")}</Link>
            </div>
          )}

          <form
            className="ohChatComposer"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              rows={1}
              maxLength={1000}
              placeholder={text("Type your question...", "اكتب سؤالك...")}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
            />
            <button type="submit" disabled={loading || !draft.trim()}>
              {text("Send", "إرسال")}
            </button>
          </form>

          <p className="ohChatNote">
            {text(
              "Educational information only — not a diagnosis. In an emergency, call your local emergency number.",
              "معلومات تثقيفية فقط وليست تشخيصًا. في الطوارئ اتصل برقم الطوارئ المحلي."
            )}
          </p>
        </section>
      )}

      <button
        type="button"
        className="ohChatFab"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="ohChatFabIcon" aria-hidden="true">
          {open ? (
            "×"
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
              <path d="M9 11h6M9 14h4" />
            </svg>
          )}
        </span>
        <span className="ohChatFabLabel">{text("Health chat", "دردشة صحية")}</span>
      </button>
    </div>
  );
}

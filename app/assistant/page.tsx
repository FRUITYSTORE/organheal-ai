"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTranslations } from "../../lib/translations";

type Message = {
  sender: "user" | "ai";
  text: string;
};

type Language = "en" | "ar";

const suggestedQuestionsEn = [
  "What should I do after my health assessment?",
  "How can I improve my heart health score?",
  "What does high cholesterol mean?",
  "How can daily check-ins help my health plan?",
  "What should I discuss with my doctor?",
];

const suggestedQuestionsAr = [
  "ماذا أفعل بعد إكمال التقييم الصحي؟",
  "كيف يمكنني تحسين درجة صحة القلب؟",
  "ماذا يعني ارتفاع الكوليسترول؟",
  "كيف يساعد التسجيل اليومي في الخطة الصحية؟",
  "ماذا يجب أن أناقش مع الطبيب؟",
];

export default function AssistantPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";

      setLanguage(currentLanguage);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const t = getTranslations(language);
  const isArabic = language === "ar";
  const suggestedQuestions = isArabic ? suggestedQuestionsAr : suggestedQuestionsEn;

  useEffect(() => {
    setMessages([
      {
        sender: "ai",
        text: isArabic
          ? "مرحبًا. أنا OrganHeal AI، مساعدك التعليمي للذكاء الصحي. يمكنني مساعدتك في فهم صحة الأعضاء، مؤشرات المختبر، التسجيلات اليومية، الخطط الصحية، والأسئلة التي يمكن مناقشتها مع الطبيب."
          : "Hello. I am OrganHeal AI, your educational health intelligence assistant. I can help you understand organ health, lab markers, daily check-ins, health plans, and questions to discuss with your doctor.",
      },
    ]);
  }, [isArabic]);

  async function sendMessage(customQuestion?: string) {
    const userMessage = customQuestion || input;

    if (!userMessage.trim() || isSending) return;

    setIsSending(true);

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        sender: "user",
        text: userMessage,
      },
    ]);

    setInput("");

    try {
      const result = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          language,
        }),
      });

      const data = await result.json();

      const aiResponse =
        data.response ||
        (isArabic
          ? "OrganHeal AI غير متاح مؤقتًا."
          : "OrganHeal AI is temporarily unavailable.");

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          sender: "ai",
          text: aiResponse,
        },
      ]);
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          sender: "ai",
          text: isArabic
            ? "حدث خطأ مؤقت أثناء الاتصال بالمساعد."
            : "A temporary error occurred while connecting to the assistant.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">{t.assistant.badge}</p>
          <h1>{t.assistant.title}</h1>
          <p>{t.assistant.description}</p>
        </div>

        <div className="resultBox">
          <p className="sectionLabel">
            {isArabic ? "إرشاد صحي شخصي" : "Personalized Health Guidance"}
          </p>

          <h2>
            {isArabic ? "اسأل أسئلة صحية أذكى" : "Ask smarter health questions"}
          </h2>

          <p>
            {isArabic
              ? "هذا المساعد متصل الآن بواجهة API داخلية جاهزة للربط مع OpenAI لاحقًا. لا يشخص الأمراض ولا يستبدل الطبيب."
              : "This assistant is now connected to an internal API layer that is ready for OpenAI integration later. It does not diagnose disease or replace a doctor."}
          </p>

          <div className="assistantQuickActions">
            <Link href="/dashboard" className="secondaryBtn">
              {isArabic ? "افتح لوحة التحكم" : "Open Dashboard"}
            </Link>

            <Link href="/organ-report" className="secondaryBtn">
              {isArabic ? "عرض التقرير" : "View Report"}
            </Link>

            <Link href="/health-plan" className="secondaryBtn">
              {isArabic ? "الخطة الصحية" : "Health Plan"}
            </Link>
          </div>
        </div>

        <div className="suggestedQuestionsBox">
          <p className="sectionLabel">
            {isArabic ? "أسئلة مقترحة" : "Suggested Questions"}
          </p>

          <div className="suggestedQuestionsGrid">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                className="suggestedQuestionBtn"
                onClick={() => sendMessage(question)}
                disabled={isSending}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="chatWindow">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.sender === "ai" ? "ai" : "user"}`}
            >
              <strong>
                {message.sender === "ai"
                  ? "OrganHeal AI"
                  : isArabic
                  ? "أنت"
                  : "You"}
              </strong>
              <p>{message.text}</p>
            </div>
          ))}

          {isSending && (
            <div className="message ai">
              <strong>OrganHeal AI</strong>
              <p>{isArabic ? "جاري التفكير..." : "Thinking..."}</p>
            </div>
          )}
        </div>

        <div className="chatInput">
          <input
            type="text"
            placeholder={
              isArabic
                ? "اسأل عن صحة الأعضاء، المختبر، التسجيل اليومي، أو الخطة الصحية..."
                : "Ask about organ health, labs, check-ins, or your health plan..."
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                sendMessage();
              }
            }}
            disabled={isSending}
          />

          <button onClick={() => sendMessage()} disabled={isSending}>
            {isSending ? (isArabic ? "..." : "...") : isArabic ? "إرسال" : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}
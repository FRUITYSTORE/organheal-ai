"use client";
import { getHealthContext } from "../../lib/getHealthContext";
import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTranslations } from "../../lib/translations";

type Message = {
  sender: "user" | "ai";
  text: string;
};

type Language = "en" | "ar";

export default function AssistantPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [healthContext, setHealthContext] = useState<any>(null);

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);
    loadHealthContext();

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";

      setLanguage(currentLanguage);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const t = getTranslations(language);
  const isArabic = language === "ar";

  useEffect(() => {
    setMessages([
      {
        sender: "ai",
        text: isArabic
          ? "مرحبًا. أنا OrganHeal AI. يمكنني الآن استخدام ملخصك الصحي، منطقة الأولوية، نمط المخاطر، العمر الصحي، والتقرير الطبي المختصر لمساعدتك بشكل أذكى."
          : "Hello. I am OrganHeal AI. I can now use your health profile, priority area, risk pattern, health age, and doctor brief to give smarter guidance.",
      },
    ]);
  }, [isArabic]);

async function loadHealthContext() {
  const context = await getHealthContext(isArabic);
  setHealthContext(context);
}
  async function sendMessage(customQuestion?: string) {
    const userMessage = customQuestion || input;

    if (!userMessage.trim() || isSending) return;

    setIsSending(true);

    setMessages((current) => [...current, { sender: "user", text: userMessage }]);
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
          healthContext,
        }),
      });

      const data = await result.json();

      setMessages((current) => [
        ...current,
        {
          sender: "ai",
          text:
            data.response ||
            (isArabic
              ? "OrganHeal AI غير متاح مؤقتًا."
              : "OrganHeal AI is temporarily unavailable."),
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
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

  const suggestedQuestions = isArabic
    ? [
        "ما هي أهم خطوة صحية تالية لي؟",
        "اشرح لي نمط المخاطر الصحية عندي.",
        "ما معنى العمر الصحي في نتيجتي؟",
        "ماذا يجب أن أناقش مع الطبيب؟",
      ]
    : [
        "What is my next best health action?",
        "Explain my current risk pattern.",
        "What does my health age mean?",
        "What should I discuss with my doctor?",
      ];

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />
        <div className="assistantHeader">
          <p className="assistantBadge">{t.assistant.badge}</p>
          <h1>{t.assistant.title}</h1>
          <p>{t.assistant.description}</p>
        </div>

        <div className="resultBox">
          <p className="sectionLabel">
            {isArabic ? "مساعد متصل بالذكاء الصحي" : "Health Engine Connected"}
          </p>

          <h2>
            {healthContext
              ? isArabic
                ? "المساعد يستخدم بياناتك الصحية الآن"
                : "Assistant is using your health context"
              : isArabic
              ? "لا توجد بيانات صحية كافية بعد"
              : "No health context available yet"}
          </h2>

          <p>
            {healthContext
              ? isArabic
                ? `منطقة الأولوية: ${healthContext.priorityOrgan || "الصحة العامة"}`
                : `Priority area: ${healthContext.priorityOrgan || "General Health"}`
              : isArabic
              ? "أكمل تقييمًا صحيًا لفتح الإرشاد الشخصي."
              : "Complete an assessment to unlock personalized guidance."}
          </p>

          <div className="assistantQuickActions">
            <Link href="/dashboard" className="secondaryBtn">
              {isArabic ? "لوحة التحكم" : "Dashboard"}
            </Link>

            <Link href="/intelligence" className="secondaryBtn">
              {isArabic ? "مركز الذكاء" : "Intelligence Center"}
            </Link>

            <Link href="/organ-report" className="secondaryBtn">
              {isArabic ? "التقرير" : "Report"}
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
                ? "اسأل عن نتيجتك، نمط المخاطر، العمر الصحي، أو الطبيب..."
                : "Ask about your score, risk pattern, health age, or doctor brief..."
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") sendMessage();
            }}
            disabled={isSending}
          />

          <button onClick={() => sendMessage()} disabled={isSending}>
            {isSending ? "..." : isArabic ? "إرسال" : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}
"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { getHealthContext } from "@/lib/getHealthContext";
import { supabase } from "@/lib/supabase";
import PageBackActions from "../components/PageBackActions";
import VoiceInputButton from "../components/voice/VoiceInputButton";
import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

type Language = "en" | "ar";

type MessageAction = {
  label: string;
  href: string;
};

type Message = {
  sender: "user" | "ai";
  text: string;
  action?: MessageAction;
};

type AssistantResponse = {
  response?: string;
  error?: string;
};


function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export default function AssistantPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [healthContext, setHealthContext] =
  useState<AssistantResponseHealthContext | null>(
    null
  );

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  useEffect(() => {
    setMessages((current) => {
      if (current.length > 0) return current;

      return [
        {
          sender: "ai",
          text: isArabic
            ? "مرحبًا، أنا OrganHeal AI. أستطيع مساعدتك في فهم نتائجك، نمط المخاطر، التقارير، والخطوات الصحية التالية بطريقة تعليمية ومنظمة."
            : "Hello, I am OrganHeal AI. I can help you understand your results, risk pattern, reports, and next health steps in an educational and organized way.",
        },
      ];
    });
  }, [isArabic]);

  useEffect(() => {
    async function loadHealthContext() {
      setIsContextLoading(true);

      try {
        const context = await getHealthContext(isArabic);
        setHealthContext(context);
      } catch (error) {
        console.error(error);
        setHealthContext(null);
      } finally {
        setIsContextLoading(false);
      }
    }

    loadHealthContext();
  }, [isArabic]);

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

 const suggestedQuestions = useMemo(() => {
  if (!healthContext) {
    return isArabic
      ? [
          "كيف أبدأ ببناء ملفي الصحي في OrganHeal؟",
          "ما نوع التقرير الطبي الذي يمكنني رفعه؟",
          "كيف يساعدني التقييم الصحي؟",
          "ما أفضل خطوة أبدأ بها الآن؟",
        ]
      : [
          "How should I start building my health profile in OrganHeal?",
          "What type of medical report can I upload?",
          "How can a health assessment help me?",
          "What is the best step for me to start with?",
        ];
  }

  const priority =
    healthContext.priorityOrgan ||
    (isArabic ? "صحتي العامة" : "my overall health");

  return isArabic
    ? [
        `ما الذي يجب أن أركز عليه الآن بخصوص ${priority}؟`,
        "اشرح لي نمط المخاطر الصحي الحالي بطريقة مبسطة.",
        "ما هي أهم خطوة صحية تالية بناءً على بياناتي الحالية؟",
        "ما أهم الأسئلة التي يجب أن أناقشها مع الطبيب؟",
      ]
    : [
        `What should I focus on now regarding ${priority}?`,
        "Explain my current health risk pattern in simple terms.",
        "What is my most important next health action based on my current data?",
        "What are the most important questions I should discuss with my doctor?",
      ];
}, [healthContext, isArabic]);

  const contextStatus = healthContext
    ? text("Assistant is using your health context", "المساعد يستخدم بياناتك الصحية")
    : text("No health context available yet", "لا توجد بيانات صحية كافية بعد");

  const priorityArea =
    healthContext?.priorityOrgan ||
    text("General Health", "الصحة العامة");
function getAssistantAction(question: string): MessageAction | undefined {
  const normalizedQuestion = question.toLowerCase();

  if (
    normalizedQuestion.includes("doctor") ||
    normalizedQuestion.includes("brief") ||
    normalizedQuestion.includes("طبيب") ||
    normalizedQuestion.includes("دكتور")
  ) {
    return {
      label: text("Review Reports", "مراجعة التقارير"),
      href: "/reports",
    };
  }

  if (
    normalizedQuestion.includes("report") ||
    normalizedQuestion.includes("lab") ||
    normalizedQuestion.includes("تقرير") ||
    normalizedQuestion.includes("فحص") ||
    normalizedQuestion.includes("مختبر")
  ) {
    return {
      label: text("Open Reports", "فتح التقارير"),
      href: "/reports",
    };
  }

  if (
    normalizedQuestion.includes("next") ||
    normalizedQuestion.includes("action") ||
    normalizedQuestion.includes("improve") ||
    normalizedQuestion.includes("plan") ||
    normalizedQuestion.includes("الخطوة") ||
    normalizedQuestion.includes("تحسين") ||
    normalizedQuestion.includes("خطة")
  ) {
    return {
      label: text("Open Health Plan", "فتح الخطة الصحية"),
      href: "/health-plan",
    };
  }

  if (!healthContext) {
    return {
      label: text("Upload Report", "رفع تقرير"),
      href: "/lab-upload",
    };
  }

  return undefined;
}
  async function sendMessage(customQuestion?: string) {
    const userMessage = customQuestion || input;

    if (!userMessage.trim() || isSending) return;

    setIsSending(true);
    setMessages((current) => [...current, { sender: "user", text: userMessage }]);
    setInput("");

    try {
      const {
  data:
    sessionData,
  error:
    sessionError,
} =
  await supabase.auth
    .getSession();

if (sessionError) {
  throw new Error(
    isArabic
      ? "تعذر التحقق من جلسة المستخدم."
      : "Could not verify your session."
  );
}

const accessToken =
  sessionData.session
    ?.access_token;

const result =
  await fetch(
    "/api/assistant",
    {
      method:
        "POST",

      headers: {
        "Content-Type":
          "application/json",

        ...(accessToken
          ? {
              Authorization:
                `Bearer ${accessToken}`,
            }
          : {}),
      },

      body:
        JSON.stringify({
          message:
            userMessage,

          language,

          conversation:
            messages
              .slice(-6)
              .map(
                (message) => ({
                  role:
                    message.sender ===
                    "ai"
                      ? "assistant"
                      : "user",

                  content:
                    message.text,
                })
              ),
        }),
    }
  );

      const data = (await result.json()) as AssistantResponse;

      if (!result.ok) {
        throw new Error(data.error || "Assistant request failed.");
      }

      setMessages((current) => [
  ...current,
  {
    sender: "ai",
    text:
      data.response ||
      text(
        "OrganHeal AI is temporarily unavailable.",
        "OrganHeal AI غير متاح مؤقتًا."
      ),
    action: data.response
      ? getAssistantAction(userMessage)
      : undefined,
  },
]);
    } catch (error) {
      console.error(error);

      setMessages((current) => [
        ...current,
        {
          sender: "ai",
          text: text(
            "A temporary error occurred while connecting to the assistant.",
            "حدث خطأ مؤقت أثناء الاتصال بالمساعد."
          ),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <main
      className="ohPageShell assistantCommandPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .assistantCommandPage a {
          color: inherit;
          text-decoration: none;
        }

        .assistantCommandPage .assistantChatWindow {
          display: grid;
          gap: 14px;
        }

        .assistantCommandPage .assistantMessage {
          max-width: 86%;
          border-radius: 18px;
          padding: 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          line-height: 1.7;
        }

        .assistantCommandPage .assistantMessage.ai {
          justify-self: start;
          background: rgba(255, 255, 255, 0.92);
        }

        .assistantCommandPage .assistantMessage.user {
          justify-self: end;
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.14), rgba(59, 130, 246, 0.12));
          border-color: rgba(20, 184, 166, 0.26);
        }

        .assistantCommandPage .assistantMessage strong {
          display: block;
          margin-bottom: 6px;
          color: var(--oh-text);
        }

        .assistantCommandPage .assistantMessage p {
          margin: 0;
          color: var(--oh-muted);
        }

        .assistantCommandPage .assistantInputForm {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
}

        .assistantCommandPage .assistantInputForm input {
          width: 100%;
          min-height: 52px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.36);
          background: rgba(255, 255, 255, 0.94);
          color: var(--oh-text);
          padding: 12px 14px;
          font: inherit;
          outline: none;
        }

        .assistantCommandPage .assistantInputForm input:focus {
          border-color: rgba(20, 184, 166, 0.68);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
        }

        .assistantCommandPage .assistantInputForm button:disabled,
        .assistantCommandPage .suggestedQuestionBtn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .assistantCommandPage .suggestedQuestionsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .assistantCommandPage .suggestedQuestionBtn {
          text-align: start;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 16px;
          padding: 14px;
          cursor: pointer;
          font-weight: 800;
          color: var(--oh-text);
          line-height: 1.55;
        }

        .assistantCommandPage .suggestedQuestionBtn:hover:not(:disabled) {
          border-color: rgba(20, 184, 166, 0.5);
          color: #0f766e;
        }
        
        @media (max-width: 760px) {
          .assistantCommandPage .assistantInputForm {
            grid-template-columns: 1fr auto;
          }

          .assistantCommandPage .assistantInputForm input {
            grid-column: 1 / -1;
          }

          .assistantCommandPage .assistantMessage {
            max-width: 100%;
          }

          .assistantCommandPage .suggestedQuestionsGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <PageBackActions />

        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal AI Assistant", "مساعد OrganHeal AI")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Ask smarter questions about your health journey.",
                  "اسأل أسئلة أذكى عن رحلتك الصحية."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "Use the assistant to understand your assessments, reports, risk pattern, doctor brief, and next health steps in clear language.",
                  "استخدم المساعد لفهم التقييمات، التقارير، نمط المخاطر، ملخص الطبيب، والخطوات الصحية التالية بلغة واضحة."
                )}
              </p>

            <div className="ohButtonRow" style={{ marginTop: "24px" }}>
  <Link href="/dashboard" className="primaryBtn">
    {text("Dashboard", "لوحة التحكم")}
  </Link>

  <Link href="/reports" className="secondaryBtn">
    {text("Reports", "التقارير")}
  </Link>

  <Link href="/health-plan" className="secondaryBtn">
    {text("Health Plan", "الخطة الصحية")}
  </Link>
</div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Health context", "السياق الصحي")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {isContextLoading
                      ? text("Loading context...", "جاري تحميل السياق...")
                      : contextStatus}
                  </h2>
                </div>

                <span className={`ohStatusBadge ${healthContext ? "good" : "moderate"}`}>
                  {healthContext
                    ? text("Connected", "متصل")
                    : text("Limited", "محدود")}
                </span>
              </div>

              {healthContext ? (
  <div className="ohStack" style={{ gap: "10px" }}>
    <p className="ohCardText">
      {text(
        `Priority area: ${priorityArea}`,
        `منطقة الأولوية: ${priorityArea}`
      )}
    </p>

    {typeof healthContext.overallScore === "number" && (
      <p className="ohCardText">
        {text(
          `Overall score: ${healthContext.overallScore}/100`,
          `النتيجة العامة: ${healthContext.overallScore}/100`
        )}
      </p>
    )}

    {healthContext.riskPattern && (
      <p className="ohCardText">
        {text(
          `Risk pattern: ${healthContext.riskPattern}`,
          `نمط المخاطر: ${healthContext.riskPattern}`
        )}
      </p>
    )}
  </div>
) : (
  <p className="ohCardText">
    {text(
      "Complete an assessment or upload a report to unlock more personalized guidance.",
      "أكمل تقييمًا صحيًا أو ارفع تقريرًا للحصول على إرشاد أكثر تخصيصًا."
    )}
  </p>
)}

              <div className="ohDivider" />

              </div>
          </div>
        </section>

 <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Assistant conversation", "محادثة المساعد")}
              </p>

              <h2 className="ohCardTitle">
                {text("Ask your question", "اكتب سؤالك")}
              </h2>
            </div>

            <span className="ohStatusBadge neutral">
              {text("Educational", "تعليمي")}
            </span>
          </div>

          <div className="assistantChatWindow">
          {messages.map((message, index) => (
  <div
    key={`${message.sender}-${index}`}
    className={`assistantMessage ${
      message.sender === "ai" ? "ai" : "user"
    }`}
  >
    <strong>
      {message.sender === "ai"
        ? "OrganHeal AI"
        : text("You", "أنت")}
    </strong>

    <p>{message.text}</p>

    {message.sender === "ai" && message.action && (
      <div style={{ marginTop: "12px" }}>
        <Link
          href={message.action.href}
          className="secondaryBtn"
        >
          {message.action.label}
        </Link>
      </div>
    )}
  </div>
))}

            {isSending && (
              <div className="assistantMessage ai">
                <strong>OrganHeal AI</strong>
                <p>{text("Thinking...", "جاري التفكير...")}</p>
              </div>
            )}
          </div>

          <div className="ohDivider" />

          <form
            className="assistantInputForm"
            onSubmit={handleSubmit}
          >
            <input
              type="text"
              placeholder={text(
                "Ask about your score, risk pattern, report, or doctor brief...",
                "اسأل عن نتيجتك، نمط المخاطر، التقرير، أو ملخص الطبيب..."
              )}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              disabled={isSending}
            />

            <VoiceInputButton
              language={language}
              disabled={isSending}
              onTranscript={(transcript) => {
                setInput((current) => {
                  const existing = current.trim();
                  const normalizedTranscript = transcript.trim();

                  if (!normalizedTranscript) {
                    return current;
                  }

                  if (!existing) {
                    return normalizedTranscript;
                  }

                  return `${existing} ${normalizedTranscript}`;
                });
              }}
            />

            <button
              className="primaryBtn"
              type="submit"
              disabled={isSending || !input.trim()}
            >
              {isSending ? "..." : text("Send", "إرسال")}
            </button>
          </form>
        </section>

        <section className="ohGrid cols2">
          <article className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Suggested questions", "أسئلة مقترحة")}
                </p>

                <h2 className="ohCardTitle">
                  {text("Start with a useful prompt", "ابدأ بسؤال مفيد")}
                </h2>
              </div>
            </div>

            <div className="suggestedQuestionsGrid">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  className="suggestedQuestionBtn"
                  type="button"
                  onClick={() => sendMessage(question)}
                  disabled={isSending}
                >
                  {question}
                </button>
              ))}
            </div>
          </article>

          <article className="ohCard">
            <p className="ohMetricLabel">
              {text("Use assistant for", "استخدم المساعد من أجل")}
            </p>

            <div className="ohTimeline" style={{ marginTop: "18px" }}>
              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Explain health results", "شرح النتائج الصحية")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "Understand scores, reports, and risk patterns.",
                      "فهم الدرجات، التقارير، وأنماط المخاطر."
                    )}
                  </p>
                </div>
              </div>

              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Prepare doctor questions", "تحضير أسئلة للطبيب")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "Turn confusing results into focused discussion points.",
                      "حوّل النتائج المربكة إلى نقاط نقاش واضحة."
                    )}
                  </p>
                </div>
              </div>

              <div className="ohTimelineItem">
                <span className="ohTimelineDot" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Choose next steps", "اختيار الخطوات التالية")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text(
                      "Get educational guidance for your next practical action.",
                      "احصل على إرشاد تعليمي للخطوة العملية التالية."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

               <section className="ohTrustNotice">
          <span aria-hidden="true">🩺</span>
          <div>
            <strong>
              {text("Medical safety reminder", "تذكير السلامة الطبية")}
            </strong>
            <br />
            {text(
              "OrganHeal AI provides educational and organizational health analysis only and does not replace licensed medical care.",
              "OrganHeal AI يقدم ذكاء صحي تعليمي وتنظيمي فقط ولا يستبدل الرعاية الطبية المرخصة."
            )}
          </div>
        </section>
      </div>
    </main>
  );
}



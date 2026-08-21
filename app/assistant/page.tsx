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
  clinicalInterviewId?: string | null;

  action?: {
    label: string;
    href: string;
  } | null;
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
  const [clinicalInterviewId, setClinicalInterviewId] =
  useState<string | null>(null);
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
  if (isContextLoading) {
    return;
  }

  setMessages((current) => {
    if (current.length > 0) {
      return current;
    }

    if (healthContext) {
      const priority =
        healthContext.priorityOrgan ||
        text(
          "your overall health",
          "صحتك العامة"
        );

      return [
        {
          sender: "ai",
          text: text(
            `Hello, I’m OrganHeal AI. I have your current health context available, including your focus on ${priority}. Ask me naturally about your results, reports, health concerns, or what you should do next.`,
            `مرحبًا، أنا OrganHeal AI. لدي سياقك الصحي الحالي، بما في ذلك التركيز على ${priority}. اسألني بطريقتك الطبيعية عن نتائجك أو تقاريرك أو مخاوفك الصحية أو الخطوة التالية المناسبة لك.`
          ),
        },
      ];
    }

    return [
      {
        sender: "ai",
        text: text(
          "Hello, I’m OrganHeal AI. You can ask me a general health question now. If you later add an assessment or medical report, I can use that information to make the conversation more relevant to you.",
          "مرحبًا، أنا OrganHeal AI. يمكنك أن تسألني سؤالًا صحيًا عامًا الآن. وإذا أضفت لاحقًا تقييمًا صحيًا أو تقريرًا طبيًا، يمكنني استخدام هذه المعلومات لجعل المحادثة أكثر ارتباطًا بك."
        ),
      },
    ];
  });
}, [
  healthContext,
  isContextLoading,
  isArabic,
]);

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

  const questions: string[] = [];

  const latestReport =
    healthContext.latestReportContext;

  const priority =
    healthContext.priorityOrgan ||
    (isArabic
      ? "صحتي العامة"
      : "my overall health");

  if (latestReport) {
    questions.push(
      isArabic
        ? `اشرح لي أهم ما في تقريري الأخير ${latestReport.fileName}.`
        : `Explain the most important findings in my latest report, ${latestReport.fileName}.`
    );
  }

  if (
    latestReport?.nextBestAction ||
    healthContext.recommendation
  ) {
    questions.push(
      isArabic
        ? "ما أهم خطوة صحية تالية بالنسبة لي الآن؟"
        : "What is my most important next health action right now?"
    );
  }

  if (
    healthContext.riskPattern ||
    latestReport?.riskLevel
  ) {
    questions.push(
      isArabic
        ? "اشرح لي نمط المخاطر الحالي وما الذي يعنيه بالنسبة لي."
        : "Explain my current risk pattern and what it means for me."
    );
  }

  if (
    healthContext.doctorBrief ||
    latestReport?.doctorBrief
  ) {
    questions.push(
      isArabic
        ? "ما أهم النقاط التي يجب أن أناقشها مع طبيبي؟"
        : "What are the most important points I should discuss with my doctor?"
    );
  }

  const fallbackQuestions = isArabic
    ? [
        `ما الذي يجب أن أركز عليه الآن بخصوص ${priority}؟`,
        "هل توجد تغيّرات مهمة في بياناتي الصحية الحالية؟",
        "ما الذي يمكنني فعله لتحسين صحتي بناءً على بياناتي الحالية؟",
        "ما المعلومات الإضافية التي قد تساعدك على فهم حالتي بشكل أفضل؟",
      ]
    : [
        `What should I focus on now regarding ${priority}?`,
        "Are there any important changes in my current health data?",
        "What can I do to improve my health based on my current data?",
        "What additional information would help you understand my situation better?",
      ];

  for (const question of fallbackQuestions) {
    if (questions.length >= 4) {
      break;
    }

    if (!questions.includes(question)) {
      questions.push(question);
    }
  }

  return questions.slice(0, 4);
}, [healthContext, isArabic]);
  const priorityArea =
    healthContext?.priorityOrgan ||
    text("General Health", "الصحة العامة");

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
          clinicalInterviewId,
        }),
    }
  );

      const data = (await result.json()) as AssistantResponse;

      if (!result.ok) {
        throw new Error(data.error || "Assistant request failed.");
      }

              if (
        typeof data.clinicalInterviewId === "string" &&
        data.clinicalInterviewId.trim()
      ) {
        setClinicalInterviewId(
          data.clinicalInterviewId
        );
           } else if (
  data.clinicalInterviewId === null
) {
  setClinicalInterviewId(
    null
  );
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
    action:
  data.response && data.action
    ? data.action
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
                {text(
                  "OrganHeal AI Assistant",
                  "مساعد OrganHeal AI"
                )}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Ask smarter questions about your health journey.",
                  "اسأل أسئلة أذكى عن رحلتك الصحية."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "Ask naturally about your health, reports, results, or next steps. OrganHeal uses your available context and can ask focused follow-up questions when more information is needed.",
                  "اسأل بطريقتك الطبيعية عن صحتك أو تقاريرك أو نتائجك أو خطواتك التالية. يستخدم OrganHeal سياقك الصحي المتاح، ويمكنه طرح أسئلة متابعة محددة عند الحاجة إلى معلومات إضافية."
                )}
              </p>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text(
                      "Personalized context",
                      "السياق الصحي المخصص"
                    )}
                  </p>

                  <h2
                    className="ohCardTitle"
                    style={{ marginTop: "8px" }}
                  >
                    {isContextLoading
                      ? text(
                          "Preparing your health context...",
                          "جاري تجهيز سياقك الصحي..."
                        )
                      : healthContext
                        ? text(
                            "OrganHeal is ready with your current health context.",
                            "OrganHeal جاهز باستخدام سياقك الصحي الحالي."
                          )
                        : text(
                            "You can start even without saved health data.",
                            "يمكنك البدء حتى دون وجود بيانات صحية محفوظة."
                          )}
                  </h2>
                </div>

                <span
                  className={`ohStatusBadge ${
                    healthContext
                      ? "good"
                      : "moderate"
                  }`}
                >
                  {healthContext
                    ? text(
                        "Context ready",
                        "السياق جاهز"
                      )
                    : text(
                        "General mode",
                        "الوضع العام"
                      )}
                </span>
              </div>

              {healthContext ? (
                <div
                  className="ohStack"
                  style={{ gap: "10px" }}
                >
                  <p className="ohCardText">
                    {text(
                      `I’ll use your available health information to keep the conversation relevant to ${priorityArea}.`,
                      `سأستخدم معلوماتك الصحية المتاحة لجعل المحادثة أكثر ارتباطًا بـ ${priorityArea}.`
                    )}
                  </p>

                  <p className="ohCardText">
                    {text(
                      "Ask naturally. If more information is needed, I’ll ask a focused follow-up question before giving a more specific answer.",
                      "اسأل بطريقتك الطبيعية. وإذا احتجت إلى معلومات إضافية، فسأطرح سؤال متابعة محددًا قبل تقديم إجابة أكثر تخصيصًا."
                    )}
                  </p>
                </div>
              ) : (
                <p className="ohCardText">
                  {text(
                    "Ask a general health question now, or add an assessment or medical report later for more personalized guidance.",
                    "يمكنك طرح سؤال صحي عام الآن، أو إضافة تقييم صحي أو تقرير طبي لاحقًا للحصول على إرشاد أكثر تخصيصًا."
                  )}
                </p>
              )}
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

            <span
  className={`ohStatusBadge ${
    clinicalInterviewId
      ? "good"
      : "neutral"
  }`}
>
  {clinicalInterviewId
    ? text(
        "Conversation in progress",
        "محادثة مستمرة"
      )
    : text(
        "Educational",
        "تعليمي"
      )}
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

        <section>
  <article className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Suggested for you", "مقترح لك")}
                </p>

                <h2 className="ohCardTitle">
                  {text(
  "Continue with what matters most",
  "تابع بما هو الأكثر أهمية لك"
)}
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



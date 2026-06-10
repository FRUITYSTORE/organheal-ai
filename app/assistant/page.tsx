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

function generateDemoResponse(question: string, language: Language) {
  const lowerQuestion = question.toLowerCase();
  const isArabic = language === "ar";

  if (
    lowerQuestion.includes("cholesterol") ||
    lowerQuestion.includes("heart") ||
    question.includes("الكوليسترول") ||
    question.includes("القلب")
  ) {
    return isArabic
      ? "ترتبط صحة القلب والكوليسترول ارتباطًا وثيقًا. قد يؤدي ارتفاع LDL إلى زيادة مخاطر أمراض القلب، بينما يساعد HDL على إزالة الكوليسترول الزائد من الدم. ينصح OrganHeal بمتابعة ضغط الدم، الكوليسترول، النشاط البدني، الوزن، ومناقشة النتائج غير الطبيعية مع مختص صحي مرخص."
      : "Cholesterol and heart health are closely related. High LDL cholesterol may increase cardiovascular risk, while HDL cholesterol can help remove excess cholesterol from the bloodstream. OrganHeal recommends monitoring blood pressure, cholesterol, activity level, body weight, and discussing abnormal results with a licensed healthcare professional.";
  }

  if (
    lowerQuestion.includes("kidney") ||
    lowerQuestion.includes("creatinine") ||
    lowerQuestion.includes("egfr") ||
    question.includes("الكلى") ||
    question.includes("الكرياتينين")
  ) {
    return isArabic
      ? "يتم تقييم صحة الكلى غالبًا من خلال مؤشرات مثل الكرياتينين، eGFR، البروتين في البول، الترطيب، وضغط الدم. إذا كانت القيم المتعلقة بالكلى غير طبيعية أو متكررة، فإن الخطوة الآمنة هي مراجعة مختص صحي."
      : "Kidney health is commonly assessed using markers such as creatinine, eGFR, urine protein, hydration status, and blood pressure. If kidney-related values are abnormal, the safest next step is medical review, especially if changes are persistent or associated with symptoms.";
  }

  if (
    lowerQuestion.includes("liver") ||
    lowerQuestion.includes("alt") ||
    lowerQuestion.includes("ast") ||
    question.includes("الكبد")
  ) {
    return isArabic
      ? "تُقيّم صحة الكبد غالبًا باستخدام مؤشرات مثل ALT وAST وALP والبيليروبين مع السياق الصحي العام. قد تحدث تغيّرات بسيطة لأسباب متعددة، لكن الارتفاع المتكرر أو الكبير يحتاج إلى مراجعة طبية."
      : "Liver health is often evaluated using ALT, AST, ALP, bilirubin, and related clinical context. Mild changes may occur for many reasons, but repeated or significant abnormalities should be reviewed by a healthcare professional.";
  }

  if (
    lowerQuestion.includes("daily") ||
    lowerQuestion.includes("check") ||
    lowerQuestion.includes("check-in") ||
    question.includes("اليومي") ||
    question.includes("التسجيل")
  ) {
    return isArabic
      ? "يساعد التسجيل الصحي اليومي OrganHeal على تتبع أنماط العافية مثل المزاج، الطاقة، النوم، الأعراض، والدرجة العامة. مع الوقت، يساعد ذلك على فهم الاتجاهات ودعم خطة صحية أكثر تخصيصًا."
      : "Daily check-ins help OrganHeal track wellness patterns such as mood, energy, sleep, symptoms, and overall wellness score. Over time, this can support better trend detection and more personalized health planning.";
  }

  if (
    lowerQuestion.includes("doctor") ||
    lowerQuestion.includes("discuss") ||
    question.includes("الطبيب") ||
    question.includes("أنااقش") ||
    question.includes("أناقش")
  ) {
    return isArabic
      ? "عند مناقشة نتائجك مع الطبيب، ركز على أقل درجة عضو لديك، الأعراض الحديثة، القيم المخبرية غير الطبيعية، الأدوية، التاريخ العائلي، وأي تغيّر في الطاقة، النوم، الوزن، ضغط الدم، أو العافية اليومية."
      : "When discussing your results with a doctor, focus on your lowest organ score, recent symptoms, abnormal lab values, medication history, family history, and any changes in energy, sleep, weight, blood pressure, or daily wellness.";
  }

  if (
    lowerQuestion.includes("assessment") ||
    lowerQuestion.includes("score") ||
    lowerQuestion.includes("plan") ||
    question.includes("التقييم") ||
    question.includes("الدرجة") ||
    question.includes("الخطة")
  ) {
    return isArabic
      ? "بعد إكمال تقييم OrganHeal، راجع الدرجة العامة، عضو الأولوية، حالة التسجيل اليومي، والخطة الصحية. الهدف ليس التشخيص، بل بناء وعي صحي منظم وتحضير أفضل للنقاش مع المختصين."
      : "After completing an OrganHeal assessment, review your overall score, priority organ, daily check-in status, and health plan. The goal is not diagnosis, but structured health awareness and better preparation for informed health conversations.";
  }

  return isArabic
    ? "يقدم OrganHeal AI حاليًا إرشادات تعليمية عامة مبنية على مبادئ الذكاء الصحي. للحصول على نتائج أفضل، اسأل عن درجات الأعضاء، مؤشرات المختبر، التسجيل اليومي، الخطة الصحية، أو ما يجب مناقشته مع الطبيب. هذه المعلومات لا تستبدل التشخيص أو الرعاية الطبية."
    : "OrganHeal AI currently provides educational guidance based on general health intelligence principles. For best results, ask about organ scores, lab markers, daily check-ins, health plans, or what to discuss with your doctor. This information does not replace medical diagnosis or professional care.";
}

export default function AssistantPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

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

  function sendMessage(customQuestion?: string) {
    const userMessage = customQuestion || input;

    if (!userMessage.trim()) return;

    const aiResponse = generateDemoResponse(userMessage, language);

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        sender: "user",
        text: userMessage,
      },
      {
        sender: "ai",
        text: aiResponse,
      },
    ]);

    setInput("");
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
              ? "هذا المساعد يعمل حاليًا كمحرك إرشاد تعليمي. لا يشخص الأمراض، ولا يستبدل الطبيب، ولا يقدم نصائح طبية طارئة."
              : "This assistant is currently an educational guidance engine. It does not diagnose disease, replace a doctor, or provide emergency medical advice."}
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
          />

          <button onClick={() => sendMessage()}>
            {isArabic ? "إرسال" : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}
"use client";

import { useState } from "react";
import Link from "next/link";

type Message = {
  sender: "user" | "ai";
  text: string;
};

const suggestedQuestions = [
  "What should I do after my health assessment?",
  "How can I improve my heart health score?",
  "What does high cholesterol mean?",
  "How can daily check-ins help my health plan?",
  "What should I discuss with my doctor?",
];

function generateDemoResponse(question: string) {
  const lowerQuestion = question.toLowerCase();

  if (
    lowerQuestion.includes("cholesterol") ||
    lowerQuestion.includes("heart")
  ) {
    return "Cholesterol and heart health are closely related. High LDL cholesterol may increase cardiovascular risk, while HDL cholesterol can help remove excess cholesterol from the bloodstream. OrganHeal recommends monitoring blood pressure, cholesterol, activity level, body weight, and discussing abnormal results with a licensed healthcare professional.";
  }

  if (
    lowerQuestion.includes("kidney") ||
    lowerQuestion.includes("creatinine") ||
    lowerQuestion.includes("egfr")
  ) {
    return "Kidney health is commonly assessed using markers such as creatinine, eGFR, urine protein, hydration status, and blood pressure. If kidney-related values are abnormal, the safest next step is medical review, especially if changes are persistent or associated with symptoms.";
  }

  if (
    lowerQuestion.includes("liver") ||
    lowerQuestion.includes("alt") ||
    lowerQuestion.includes("ast")
  ) {
    return "Liver health is often evaluated using ALT, AST, ALP, bilirubin, and related clinical context. Mild changes may occur for many reasons, but repeated or significant abnormalities should be reviewed by a healthcare professional.";
  }

  if (
    lowerQuestion.includes("daily") ||
    lowerQuestion.includes("check") ||
    lowerQuestion.includes("check-in")
  ) {
    return "Daily check-ins help OrganHeal track wellness patterns such as mood, energy, sleep, symptoms, and overall wellness score. Over time, this can support better trend detection and more personalized health planning.";
  }

  if (
    lowerQuestion.includes("doctor") ||
    lowerQuestion.includes("discuss")
  ) {
    return "When discussing your results with a doctor, focus on your lowest organ score, recent symptoms, abnormal lab values, medication history, family history, and any changes in energy, sleep, weight, blood pressure, or daily wellness.";
  }

  if (
    lowerQuestion.includes("assessment") ||
    lowerQuestion.includes("score") ||
    lowerQuestion.includes("plan")
  ) {
    return "After completing an OrganHeal assessment, review your overall score, priority organ, daily check-in status, and health plan. The goal is not diagnosis, but structured health awareness and better preparation for informed health conversations.";
  }

  return "OrganHeal AI currently provides educational guidance based on general health intelligence principles. For best results, ask about organ scores, lab markers, daily check-ins, health plans, or what to discuss with your doctor. This information does not replace medical diagnosis or professional care.";
}

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Hello. I am OrganHeal AI, your educational health intelligence assistant. I can help you understand organ health, lab markers, daily check-ins, health plans, and questions to discuss with your doctor.",
    },
  ]);

  function sendMessage(customQuestion?: string) {
    const userMessage = customQuestion || input;

    if (!userMessage.trim()) return;

    const aiResponse = generateDemoResponse(userMessage);

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
          <p className="assistantBadge">ORGANHEAL AI ASSISTANT</p>

          <h1>Health Intelligence Assistant</h1>

          <p>
            Ask educational health questions, understand organ health signals,
            and prepare better conversations with healthcare professionals.
          </p>
        </div>

        <div className="resultBox">
          <p className="sectionLabel">Personalized Health Guidance</p>

          <h2>Ask smarter health questions</h2>

          <p>
            This assistant is currently an educational guidance engine. It does
            not diagnose disease, replace a doctor, or provide emergency medical
            advice.
          </p>

          <div className="assistantQuickActions">
            <Link href="/dashboard" className="secondaryBtn">
              Open Dashboard
            </Link>

            <Link href="/organ-report" className="secondaryBtn">
              View Report
            </Link>

            <Link href="/health-plan" className="secondaryBtn">
              Health Plan
            </Link>
          </div>
        </div>

        <div className="suggestedQuestionsBox">
          <p className="sectionLabel">Suggested Questions</p>

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
              <strong>{message.sender === "ai" ? "OrganHeal AI" : "You"}</strong>
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        <div className="chatInput">
          <input
            type="text"
            placeholder="Ask about organ health, labs, check-ins, or your health plan..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                sendMessage();
              }
            }}
          />

          <button onClick={() => sendMessage()}>Send</button>
        </div>
      </div>
    </main>
  );
}
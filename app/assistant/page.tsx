"use client";

import { useState } from "react";

type Message = {
  sender: "user" | "ai";
  text: string;
};

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Hello. How can I help you understand your health today?",
    },
    {
      sender: "user",
      text: "What does a high cholesterol level mean?",
    },
    {
      sender: "ai",
      text: "High cholesterol may increase the risk of cardiovascular disease. The interpretation depends on LDL, HDL, triglycerides, age, medical history, and other factors.",
    },
  ]);

  function sendMessage() {
    if (!input.trim()) return;

    const userMessage = input;

    setMessages([
      ...messages,
      {
        sender: "user",
        text: userMessage,
      },
      {
        sender: "ai",
        text: "This is a demo AI response. OpenAI integration will be connected next.",
      },
    ]);

    setInput("");
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <div>
            <p className="assistantBadge">AI MEDICAL ASSISTANT</p>
            <h1>Ask OrganHeal AI</h1>
            <p>
              Ask health-related questions and receive educational,
              evidence-based information.
            </p>
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
            placeholder="Ask a health question..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                sendMessage();
              }
            }}
          />

          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </main>
  );
}
import { NextResponse } from "next/server";
import {
  assessQuestionEvidence,
  assessReasoningReadiness,
  decideReasoningPath,
} from "@/lib/health-intelligence/application/assistant-decision.service";
import {
  buildConversationAwareMessage,
} from "@/lib/health-intelligence/application/assistant-conversation.service";
import {
  buildPersonalizedResponse,
  type AssistantResponseConversationMessage,
  type AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response.service";

export async function POST(req: Request) {
  try {
    const {
      message,
      language = "en",
      healthContext,
      conversation,
    } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        {
          error: "Message is required",
        },
        { status: 400 }
      );
    }

    const normalizedLanguage: "en" | "ar" =
      language === "ar" ? "ar" : "en";

    const conversationAwareMessage =
  buildConversationAwareMessage(
    message.trim(),
    Array.isArray(conversation)
      ? (conversation as AssistantResponseConversationMessage[])
      : []
  );

const normalizedHealthContext =
  healthContext as AssistantResponseHealthContext | null;

const reasoningReadiness =
  assessReasoningReadiness(
    normalizedHealthContext,
    normalizedLanguage
  );
  const questionEvidence =
  assessQuestionEvidence(
    conversationAwareMessage,
    normalizedHealthContext,
    normalizedLanguage
  );

const reasoningDecision =
  decideReasoningPath(
    questionEvidence,
    normalizedLanguage
  );

if (
  reasoningDecision.mode === "clarify" &&
  reasoningDecision.question
) {
  return NextResponse.json({
    success: true,
    response: reasoningDecision.question,
    reasoning: {
  mode: "clarify",

  status: reasoningReadiness.status,
  confidence: reasoningReadiness.confidence,

  availableEvidence:
    reasoningReadiness.availableEvidence,

  missingInformation:
    reasoningReadiness.missingInformation,

  questionIntent:
    questionEvidence.intent,

  questionEvidenceStatus:
    questionEvidence.status,

  questionEvidenceConfidence:
    questionEvidence.confidence,

  questionAvailableEvidence:
    questionEvidence.availableEvidence,

  questionMissingInformation:
    questionEvidence.missingInformation,

  clarifyingQuestion:
    reasoningDecision.question,

  reason:
    reasoningDecision.reason,
},
  });
}

const response = buildPersonalizedResponse(
  conversationAwareMessage,
  normalizedLanguage,
  normalizedHealthContext,
  Array.isArray(conversation)
    ? (conversation as AssistantResponseConversationMessage[])
    : []
);

return NextResponse.json({
  success: true,
  response,
 reasoning: {
  mode: "answer",

  status: reasoningReadiness.status,
  confidence: reasoningReadiness.confidence,

  availableEvidence:
    reasoningReadiness.availableEvidence,

  missingInformation:
    reasoningReadiness.missingInformation,

  questionIntent:
    questionEvidence.intent,

  questionEvidenceStatus:
    questionEvidence.status,

  questionEvidenceConfidence:
    questionEvidence.confidence,

  questionAvailableEvidence:
    questionEvidence.availableEvidence,

  questionMissingInformation:
    questionEvidence.missingInformation,

  clarifyingQuestion:
    questionEvidence.clarifyingQuestion,

  reason: null,
},
});
  } catch (error) {
    console.error("Assistant API error:", error);

    return NextResponse.json(
      {
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
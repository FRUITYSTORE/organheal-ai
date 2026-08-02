import { NextResponse } from "next/server";

import {
  runAssistantOrchestrator,
  type AssistantOrchestratorLanguage,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import type {
  AssistantResponseConversationMessage,
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response.service";

type AssistantRequestBody = {
  message?: unknown;
  language?: unknown;
  healthContext?: unknown;
  conversation?: unknown;
};

export async function POST(req: Request) {
  try {
    const body =
      (await req.json()) as AssistantRequestBody;

    const {
      message,
      language = "en",
      healthContext,
      conversation,
    } = body;

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return NextResponse.json(
        {
          error: "Message is required",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedLanguage:
      AssistantOrchestratorLanguage =
        language === "ar"
          ? "ar"
          : "en";

    const normalizedConversation =
      Array.isArray(conversation)
        ? (
            conversation as
              AssistantResponseConversationMessage[]
          )
        : [];

    const normalizedHealthContext =
      (
        healthContext ??
        null
      ) as
        | AssistantResponseHealthContext
        | null;

    const result =
      runAssistantOrchestrator({
        message,
        language:
          normalizedLanguage,
        healthContext:
          normalizedHealthContext,
        conversation:
          normalizedConversation,
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Assistant API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Server error",
      },
      {
        status: 500,
      }
    );
  }
}
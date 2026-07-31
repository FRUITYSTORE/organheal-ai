export type AssistantConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export function buildConversationAwareMessage(
  message: string,
  conversation?: AssistantConversationMessage[]
) {
  const trimmedMessage = message.trim();

  if (
    !conversation ||
    conversation.length === 0
  ) {
    return trimmedMessage;
  }

  const normalizedMessage =
    trimmedMessage.toLowerCase();

  const isExplicitFollowUp =
    normalizedMessage === "why?" ||
    normalizedMessage === "why" ||
    normalizedMessage === "explain that" ||
    normalizedMessage === "explain more" ||
    normalizedMessage === "tell me more" ||
    normalizedMessage === "what about this?" ||
    normalizedMessage === "what about that?" ||
    normalizedMessage === "لماذا؟" ||
    normalizedMessage === "لماذا" ||
    normalizedMessage === "اشرح أكثر" ||
    normalizedMessage === "اشرح ذلك" ||
    normalizedMessage === "ماذا عن هذا؟";

  const recentConversation =
    conversation.slice(-6);

  const lastAssistantMessage =
    [...recentConversation]
      .reverse()
      .find(
        (item) =>
          item.role === "assistant"
      );

  /*
   * Detect whether the latest OrganHeal response asked
   * for additional clinical evidence.
   *
   * This covers multiple clarification stages, not only
   * the first symptom question.
   */
  const previousAssistantAskedForClinicalEvidence =
    Boolean(
      lastAssistantMessage &&
        (() => {
          const assistantMessage =
            lastAssistantMessage.content.toLowerCase();

          return (
            assistantMessage.includes(
              "are you having symptoms"
            ) ||
            assistantMessage.includes(
              "what are they and when did they begin"
            ) ||
            assistantMessage.includes(
              "approximately when did these symptoms begin"
            ) ||
            assistantMessage.includes(
              "how would you describe the severity"
            ) ||
            assistantMessage.includes(
              "are you experiencing any other symptoms"
            ) ||
            assistantMessage.includes(
              "highest-value next question"
            ) ||
            assistantMessage.includes(
              "هل لديك أعراض"
            ) ||
            assistantMessage.includes(
              "ما هي ومتى بدأت"
            ) ||
            assistantMessage.includes(
              "متى بدأت هذه الأعراض"
            ) ||
            assistantMessage.includes(
              "كيف تصف شدة الأعراض"
            ) ||
            assistantMessage.includes(
              "هل توجد أعراض أخرى مصاحبة"
            ) ||
            assistantMessage.includes(
              "السؤال التالي الأكثر أهمية"
            )
          );
        })()
    );

  /*
   * Preserve the original causal reasoning intent across
   * multiple turns.
   *
   * Later messages may contain only symptom, onset,
   * severity, or another clarification answer.
   */
  const conversationHasCauseReasoning =
    recentConversation.some((item) => {
      if (item.role !== "user") {
        return false;
      }

      const userMessage =
        item.content.toLowerCase();

      return (
        userMessage.includes(
          "what could be causing"
        ) ||
        userMessage.includes(
          "what is causing"
        ) ||
        userMessage.includes(
          "what caused"
        ) ||
        userMessage.includes(
          "cause of"
        ) ||
        userMessage.includes(
          "why is this abnormal"
        ) ||
        userMessage.includes(
          "why are these abnormal"
        ) ||
        userMessage.includes(
          "diagnosis"
        ) ||
        userMessage.includes(
          "diagnose"
        ) ||
        userMessage.includes(
          "ما سبب"
        ) ||
        userMessage.includes(
          "ما الذي يسبب"
        ) ||
        userMessage.includes(
          "ليش"
        ) ||
        userMessage.includes(
          "شو السبب"
        ) ||
        userMessage.includes(
          "شو ممكن يكون"
        )
      );
    });

  const isClarificationAnswer =
    previousAssistantAskedForClinicalEvidence &&
    conversationHasCauseReasoning;

  if (
    !isExplicitFollowUp &&
    !isClarificationAnswer
  ) {
    return trimmedMessage;
  }

  const recentContext =
    recentConversation
      .map(
        (item) =>
          `${item.role}: ${item.content}`
      )
      .join("\n");

  if (isClarificationAnswer) {
    return `Original clinical reasoning intent: cause_reasoning

The user is answering a clarification question related to the previous causal reasoning request.

New user evidence:
${trimmedMessage}

Recent conversation context:
${recentContext}

Continue evaluating the original question using this new evidence.`;
  }

  return `${trimmedMessage}

Recent conversation context:
${recentContext}`;
}

export function extractClarificationEvidence(
  message: string
): string | null {
  const evidenceMarker =
    "New user evidence:";

  const contextMarker =
    "Recent conversation context:";

  const evidenceStart =
    message.indexOf(evidenceMarker);

  if (evidenceStart === -1) {
    return null;
  }

  const contentStart =
    evidenceStart +
    evidenceMarker.length;

  const contextStart =
    message.indexOf(
      contextMarker,
      contentStart
    );

  const evidence =
    message
      .slice(
        contentStart,
        contextStart === -1
          ? undefined
          : contextStart
      )
      .trim();

  return evidence || null;
}
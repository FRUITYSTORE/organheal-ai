export const OPEN_HEALTH_CHAT_EVENT = "organheal-open-chat";

// Lets any page section (daily tips, popular questions) open the floating
// health chat, optionally starting with a question.
export function openHealthChat(question?: string): void {
  window.dispatchEvent(
    new CustomEvent(OPEN_HEALTH_CHAT_EVENT, { detail: { question } })
  );
}

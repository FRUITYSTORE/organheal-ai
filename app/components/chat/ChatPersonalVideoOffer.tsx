"use client";

import { isPersonalVideoRequest } from "@/lib/video-studio/detect-personal-video-request";
import { usePersonalVideoRequest } from "@/lib/video-studio/use-personal-video-request";

// The chat counterpart to the homepage's "make a real video from my
// report" button (app/components/home/HomeWatchSection.tsx) — same
// request/status flow (usePersonalVideoRequest), just offered inline under
// an assistant reply when the member's own message reads like a request
// for a video about their own health/results, e.g. "generate a video about
// my health status" / "وّلد لي فيديو عن وضعي الصحي". Detection is a plain
// keyword check in the browser (lib/video-studio/detect-personal-video-
// request.ts) — no model call, and it never fires the render on its own;
// the member still has to press the button.
export default function ChatPersonalVideoOffer({
  question,
  isArabic,
}: {
  question: string;
  isArabic: boolean;
}) {
  const text = (en: string, ar: string) => (isArabic ? ar : en);
  const { phase, message, videoUrl, start, checkStatus } = usePersonalVideoRequest(isArabic);

  if (!isPersonalVideoRequest(question)) {
    return null;
  }

  return (
    <div className="ohChatVideos ohChatPersonalVideoOffer">
      <small>{text("Real video from your own report", "فيديو حقيقي من تقريرك")}</small>

      <button type="button" className="ohChatVideoCard" onClick={() => void start()} disabled={phase === "starting" || phase === "checking"}>
        <span aria-hidden="true">🎬</span>
        <span>
          <strong>
            {phase === "starting"
              ? text("Starting…", "جارٍ البدء…")
              : text("Make a real video from my report", "أنشئ فيديو حقيقيًا من تقريري")}
          </strong>
          <em>
            {text(
              "Real footage, narration and captions — limited per month.",
              "لقطات وصوت وترجمة حقيقية — محدود شهريًا."
            )}
          </em>
        </span>
      </button>

      {message && <p role="status">{message}</p>}

      {(phase === "queued" || phase === "checking") && (
        <button type="button" onClick={() => void checkStatus()} disabled={phase === "checking"}>
          {phase === "checking" ? text("Checking…", "جارٍ التحقق…") : text("Check status", "تحقق من الحالة")}
        </button>
      )}

      {phase === "done" && videoUrl && (
        <a href={videoUrl} target="_blank" rel="noreferrer">
          {text("Watch my video", "شاهد فيديوي")}
        </a>
      )}
    </div>
  );
}

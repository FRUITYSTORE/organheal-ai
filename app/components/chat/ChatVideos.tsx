"use client";

import { useState } from "react";

import {
  buildEmbedUrl,
  getVideosForText,
  type HealthVideo,
} from "@/lib/health-videos/catalog";
import { useAllVideos } from "@/lib/health-videos/use-videos";

// Related videos under an assistant answer. Matching happens here, in the
// browser, from the question and answer text; nothing is sent anywhere, and
// YouTube is contacted only when the reader presses a video.
export default function ChatVideos({
  question,
  answer,
  isArabic,
  label,
}: {
  question: string;
  answer: string;
  isArabic: boolean;
  label?: { en: string; ar: string };
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const all = useAllVideos();
  const videos: HealthVideo[] = getVideosForText(`${question} ${answer}`, 2, all);

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="ohChatVideos">
      <small>
        {label ? (isArabic ? label.ar : label.en) : isArabic ? "فيديوهات ذات صلة" : "Related videos"}
      </small>

      {videos.map((video) => {
        const title = isArabic ? video.title.ar : video.title.en;

        return playing === video.youtubeId ? (
          <iframe
            key={video.youtubeId}
            className="ohChatVideoFrame"
            src={buildEmbedUrl(video.youtubeId, isArabic)}
            title={title}
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            key={video.youtubeId}
            type="button"
            className="ohChatVideoCard"
            onClick={() => setPlaying(video.youtubeId)}
          >
            <span aria-hidden="true">▶</span>
            <span>
              <strong>{title}</strong>
              <em>{video.source}</em>
            </span>
          </button>
        );
      })}
    </div>
  );
}

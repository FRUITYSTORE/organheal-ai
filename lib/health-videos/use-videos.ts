"use client";

import { useEffect, useState } from "react";

import { HEALTH_VIDEOS, type HealthVideo } from "./catalog";

// The built-in catalog plus any videos the owner added in the admin page.
// The extra list is fetched once per page load and shared; if the request
// fails the built-in catalog is used on its own.
let customPromise: Promise<HealthVideo[]> | null = null;

function loadCustomVideos(): Promise<HealthVideo[]> {
  customPromise ??= fetch("/api/health-videos")
    .then((response) => (response.ok ? response.json() : { videos: [] }))
    .then((body: { videos?: HealthVideo[] }) =>
      Array.isArray(body.videos) ? body.videos : []
    )
    .catch(() => []);

  return customPromise;
}

export function useAllVideos(): HealthVideo[] {
  const [videos, setVideos] = useState<HealthVideo[]>(HEALTH_VIDEOS);

  useEffect(() => {
    let cancelled = false;

    void loadCustomVideos().then((custom) => {
      if (cancelled || custom.length === 0) return;

      const known = new Set(HEALTH_VIDEOS.map((video) => video.youtubeId));

      setVideos([
        ...custom.filter((video) => !known.has(video.youtubeId)),
        ...HEALTH_VIDEOS,
      ]);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return videos;
}

"use client";

import { useEffect, useState } from "react";

import FeaturedNoteCard, { type Announcement } from "./FeaturedNoteCard";

import "./health-updates-strip.css";

// A dedicated, prominent place on the homepage for the owner's health notes.
// Renders nothing until at least one active note exists.
export default function HomeFeaturedNotes({ isArabic }: { isArabic: boolean }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const language = isArabic ? "ar" : "en";

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/health-announcements?lang=${language}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { items?: Announcement[] } | null) => {
        setItems((data?.items ?? []).slice(0, 3));
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [language]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className="ohFeaturedNotes"
      aria-label={isArabic ? "ملاحظات صحية مميزة" : "Featured health notes"}
    >
      <header className="ohFeaturedNotesHeader">
        <p className="ohEyebrow">
          {isArabic ? "ملاحظة صحية مميزة" : "Featured health note"}
        </p>
        <h2 className="ohFeaturedNotesTitle">
          {isArabic ? "من فريق OrganHeal" : "From the OrganHeal team"}
        </h2>
      </header>

      <ul className="ohFeaturedNotesGrid">
        {items.map((item) => (
          <li key={item.id}>
            <FeaturedNoteCard item={item} isArabic={isArabic} />
          </li>
        ))}
      </ul>
    </section>
  );
}

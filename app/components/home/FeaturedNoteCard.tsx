"use client";

import "./health-updates-strip.css";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  tone: string;
};

export default function FeaturedNoteCard({
  item,
  isArabic,
}: {
  item: Announcement;
  isArabic: boolean;
}) {
  const content = (
    <>
      <span className="ohUpdateMeta">
        <span className="ohUpdateSource">
          {isArabic ? "من OrganHeal" : "OrganHeal note"}
        </span>
      </span>

      <span className="ohUpdateHeadline ohUpdateFeaturedTitle" dir="auto">
        {item.title}
      </span>

      <span className="ohUpdateFeaturedBody" dir="auto">
        {item.body}
      </span>

      {item.url && (
        <span className="ohUpdateRead" aria-hidden="true">
          {isArabic ? "اعرف المزيد ↖" : "Learn more ↗"}
        </span>
      )}
    </>
  );

  return item.url ? (
    <a
      className="ohUpdateCard ohUpdateFeatured"
      data-tone={item.tone}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {content}
    </a>
  ) : (
    <div className="ohUpdateCard ohUpdateFeatured" data-tone={item.tone}>
      {content}
    </div>
  );
}

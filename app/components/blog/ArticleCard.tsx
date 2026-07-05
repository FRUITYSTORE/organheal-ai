import Link from "next/link";

type ArticleCardProps = {
  slug: string;
  category: string;
  readTime: string;
  title: string;
  excerpt: string;
  organSystem: string;
  labMarkers: string[];
  date: string;
  readLabel: string;
};

export default function ArticleCard({
  slug,
  category,
  readTime,
  title,
  excerpt,
  organSystem,
  labMarkers,
  date,
  readLabel,
}: ArticleCardProps) {
  return (
    <article className="ohCard articleCard">
      <div className="articleMetaRow">
        <p className="articleCategory">{category}</p>
        <span className="ohStatusBadge neutral">{readTime}</span>
      </div>

      <h3 className="ohCardTitle" style={{ fontSize: "1.16rem" }}>
        {title}
      </h3>

      <p className="ohCardText articleExcerpt">{excerpt}</p>

      <div className="articleMarkerRow">
        <span className="articleMarker">{organSystem}</span>

        {labMarkers.slice(0, 3).map((marker) => (
          <span className="articleMarker" key={`${slug}-${marker}`}>
            {marker}
          </span>
        ))}
      </div>

      <div className="articleCardFooter">
        <span className="articleDate">{date}</span>

        <Link href={`/blog/${slug}`} className="articleReadMore">
          {readLabel}
        </Link>
      </div>
    </article>
  );
}
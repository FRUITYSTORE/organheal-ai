import Link from "next/link";
import { notFound } from "next/navigation";

import { getKnowledgeItemBySlug } from "@/lib/services/knowledge/knowledge-item.service";

import "../../knowledge.css";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

function formatLabel(value: string) {
  return value
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

export default async function KnowledgeItemPage({
  params,
}: Props) {
  const { slug } = await params;

  const item = getKnowledgeItemBySlug(slug);

  if (!item) {
    notFound();
  }

  return (
    <main className="knowledgePage">
      <div className="knowledgeArticleContainer">
        <Link
          href="/knowledge"
          className="knowledgeBackLink"
        >
          ← Back to Knowledge Hub
        </Link>

        <header className="knowledgeArticleHero">
          <div className="knowledgeArticleHeroTop">
            <span className="knowledgeArticleType">
              {formatLabel(item.type)}
            </span>

            {item.readingMinutes && (
              <span className="knowledgeArticleReadingTime">
                {item.readingMinutes} min read
              </span>
            )}
          </div>

          <h1>{item.title}</h1>

          <p>{item.summary}</p>

          <div className="knowledgeArticleMeta">
            <span>
              Evidence: {formatLabel(item.evidenceLevel)}
            </span>

            <span>
              Reviewed: {item.reviewedAt}
            </span>
          </div>
        </header>

        <article className="knowledgeArticleBody knowledgeCard">
          {item.body &&
          item.body.trim() !== "Coming soon." ? (
            <div className="knowledgeArticleContent">
              {item.body}
            </div>
          ) : (
            <div className="knowledgeArticleEmpty">
              <span>Article content</span>

              <h2>Full medical content is being prepared</h2>

              <p>
                This article is currently available as a reviewed
                knowledge record. The complete educational content
                will be added after medical review.
              </p>
            </div>
          )}
        </article>

        <section className="knowledgeTakeawayCard">
          <span>Practical Takeaway</span>

          <p>{item.practicalTakeaway}</p>
        </section>

        <section className="knowledgeEvidenceCard knowledgeCard">
          <div className="knowledgeEvidenceHeader">
            <div>
              <span className="knowledgeEvidenceKicker">
                Medical Transparency
              </span>

              <h2>Evidence and Sources</h2>
            </div>

            <span className="knowledgeEvidenceLevel">
              {formatLabel(item.evidenceLevel)}
            </span>
          </div>

          <div className="knowledgeSourceList">
            {item.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="knowledgeSourceItem"
              >
                <div>
                  <strong>{source.name}</strong>

                  {source.publication && (
                    <span>{source.publication}</span>
                  )}
                </div>

                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>

          <div className="knowledgeReviewMeta">
            <span>
              Last reviewed: {item.reviewedAt}
            </span>

            {item.reviewedBy && (
              <span>
                Reviewed by: {item.reviewedBy}
              </span>
            )}
          </div>
        </section>

        <section className="knowledgeSafetyNotice">
          <strong>Medical safety reminder</strong>

          <p>
            This content is educational and does not replace
            evaluation, diagnosis, or treatment by a licensed
            healthcare professional.
          </p>
        </section>
      </div>
    </main>
  );
}
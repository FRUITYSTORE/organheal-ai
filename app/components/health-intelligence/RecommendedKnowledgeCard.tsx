import Link from "next/link";

import { PersonalizedKnowledgeRecommendations } from "@/lib/services/knowledge/knowledge-recommendation.service";

type Props = {
  recommendations: PersonalizedKnowledgeRecommendations;
};

export default function RecommendedKnowledgeCard({
  recommendations,
}: Props) {
  const pack = recommendations.recommendedPack;

  const article =
    recommendations.contentRecommendations.data
      .recommendations[0] ?? null;

  if (!pack && !article) {
    return null;
  }

  return (
    <section className="knowledgeRecommendationCard">
      <span className="knowledgeRecommendationEyebrow">
        Recommended Knowledge
      </span>

      <h2>
        Continue learning based on your health intelligence
      </h2>

      <p>
        OrganHeal selected educational content that matches
        your current health priorities.
      </p>

      {pack && (
        <Link
          href={`/knowledge/${pack.slug}`}
          className="knowledgeRecommendationPack"
        >
          <strong>{pack.name}</strong>

          <span>{pack.summary}</span>
        </Link>
      )}

      {article && (
  <Link
    href={`/knowledge/item/${article.item.slug}`}
    className="knowledgeRecommendationArticle"
  >
    <strong>{article.item.title}</strong>

    <span>{article.item.summary}</span>
  </Link>
)}
    </section>
  );
}
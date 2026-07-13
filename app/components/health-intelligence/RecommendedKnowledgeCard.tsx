import Link from "next/link";

import type { PersonalizedKnowledgeRecommendations } from "@/lib/services/knowledge/knowledge-recommendation.service";
import { buildKnowledgeExplanation } from "@/lib/services/knowledge/knowledge-explanation.service";
import "@/app/knowledge/knowledge.css";

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

const explanation =
  recommendations.intelligenceExplanation;
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
<section
  className="knowledgeRecommendationReason"
>
  <strong>
    {explanation.title}
  </strong>

  <ul>
    {explanation.reasons.map(
      (reason) => (
        <li key={reason}>
          {reason}
        </li>
      )
    )}
  </ul>
</section>
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
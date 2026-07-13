import type { ClinicalDecisionContext } from "@/lib/clinical-decision/pipeline/clinical-decision-context";
import type { ClinicalDecisionStage } from "@/lib/clinical-decision/pipeline/clinical-decision-stage";
import type { HealthKnowledgeAudience } from "@/lib/health-knowledge/models/knowledge-item";

import { getPersonalizedKnowledgeRecommendations } from "@/lib/services/knowledge/knowledge-recommendation.service";

function getAudience(
  value: string
): HealthKnowledgeAudience {
  const supportedAudiences: HealthKnowledgeAudience[] = [
    "general",
    "children",
    "parents",
    "older-adults",
    "pregnancy",
    "caregivers",
    "healthcare-professionals",
  ];

  return supportedAudiences.includes(
    value as HealthKnowledgeAudience
  )
    ? (value as HealthKnowledgeAudience)
    : "general";
}

export const personalizedKnowledgeStage: ClinicalDecisionStage<ClinicalDecisionContext> =
  {
    id: "personalized-knowledge",
    order: 20,

    shouldRun(context) {
      return (
        context.knowledge === null &&
        context.intelligence !== null
      );
    },

    run(context) {
      if (!context.intelligence) {
        return context;
      }

      const knowledge =
        getPersonalizedKnowledgeRecommendations({
          intelligence: context.intelligence,
          language: context.metadata.language,
          audience: getAudience(
            context.metadata.audience
          ),
        });

      return {
        ...context,
        knowledge,
      };
    },
  };
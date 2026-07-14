import type { ClinicalDecisionContext } from "@/lib/clinical-decision/pipeline/clinical-decision-context";
import type { ClinicalDecisionStage } from "@/lib/clinical-decision/pipeline/clinical-decision-stage";

import { getTimelineFromIntelligence } from "@/lib/modules/timeline";

export const healthTimelineStage: ClinicalDecisionStage<ClinicalDecisionContext> =
  {
    id: "health-timeline",
    order: 17,

    shouldRun(context) {
      return (
        context.timeline === null &&
        context.intelligence !== null
      );
    },

    run(context) {
      if (!context.intelligence) {
        return context;
      }

      const timeline =
        getTimelineFromIntelligence(
          context.intelligence
        );

      return {
        ...context,
        timeline,
      };
    },
  };
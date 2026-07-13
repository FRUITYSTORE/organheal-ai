import type { ClinicalDecisionContext } from "@/lib/clinical-decision/pipeline/clinical-decision-context";
import type { ClinicalDecisionStage } from "@/lib/clinical-decision/pipeline/clinical-decision-stage";

import { buildHealthIntelligence } from "@/lib/health-intelligence/health-intelligence.service";

export const healthIntelligenceStage: ClinicalDecisionStage<ClinicalDecisionContext> =
  {
    id: "health-intelligence",
    order: 10,

    shouldRun(context) {
      return context.intelligence === null;
    },

    run(context) {
      const intelligence = buildHealthIntelligence(
        context.patient
      );

      return {
        ...context,
        intelligence,
      };
    },
  };
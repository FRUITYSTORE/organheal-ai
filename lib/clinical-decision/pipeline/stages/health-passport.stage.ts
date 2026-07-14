import type { ClinicalDecisionContext } from "@/lib/clinical-decision/pipeline/clinical-decision-context";
import type { ClinicalDecisionStage } from "@/lib/clinical-decision/pipeline/clinical-decision-stage";

import { getPassportFromIntelligence } from "@/lib/modules/passport";

export const healthPassportStage: ClinicalDecisionStage<ClinicalDecisionContext> =
  {
    id: "health-passport",
    order: 15,

    shouldRun(context) {
      return (
        context.passport === null &&
        context.intelligence !== null
      );
    },

    run(context) {
      if (!context.intelligence) {
        return context;
      }

      const passport =
        getPassportFromIntelligence(
          context.intelligence
        );

      return {
        ...context,
        passport,
      };
    },
  };
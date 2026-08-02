import {
  buildClinicalComparisonResponse,
} from "@/lib/health-intelligence/application/assistant-response/clinical-comparison-response";

import type {
  ClinicalHandler,
} from "@/lib/health-intelligence/application/assistant-response/clinical-handlers/clinical-handler.types";

export const compareLatestReportsHandler:
  ClinicalHandler = ({
    language,
    healthContext,
  }) => {
    return buildClinicalComparisonResponse({
      language,
      healthContext,
    });
  };

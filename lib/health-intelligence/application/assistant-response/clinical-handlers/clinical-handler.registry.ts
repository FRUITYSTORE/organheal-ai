import {
  compareLatestReportsHandler,
} from "@/lib/health-intelligence/application/assistant-response/clinical-handlers/compare-latest-reports.handler";

import type {
  ClinicalHandler,
  SupportedClinicalHandlerIntent,
} from "@/lib/health-intelligence/application/assistant-response/clinical-handlers/clinical-handler.types";

export type ClinicalHandlerRegistry =
  Partial<
    Record<
      SupportedClinicalHandlerIntent,
      ClinicalHandler
    >
  >;

const CLINICAL_HANDLER_REGISTRY:
  ClinicalHandlerRegistry = {
    compare_latest_reports:
      compareLatestReportsHandler,
  };

export function getClinicalHandler(
  intent: SupportedClinicalHandlerIntent
): ClinicalHandler | null {
  return (
    CLINICAL_HANDLER_REGISTRY[
      intent
    ] ??
    null
  );
}
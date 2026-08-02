import {
  handleAfterLatestReportJourneyIntent,
} from "@/lib/health-intelligence/application/assistant-response/journey-handlers/after-latest-report.handler";

import {
  handleLastUpdateJourneyIntent,
} from "@/lib/health-intelligence/application/assistant-response/journey-handlers/last-update.handler";

import type {
  JourneyHandler,
  SupportedJourneyHandlerIntent,
} from "@/lib/health-intelligence/application/assistant-response/journey-handlers/journey-handler.types";

export type JourneyHandlerRegistry =
  Partial<
    Record<
      SupportedJourneyHandlerIntent,
      JourneyHandler
    >
  >;

const JOURNEY_HANDLER_REGISTRY:
  JourneyHandlerRegistry = {
    after_latest_report:
      handleAfterLatestReportJourneyIntent,

    last_update:
      handleLastUpdateJourneyIntent,
  };

export function getJourneyHandler(
  intent: SupportedJourneyHandlerIntent
): JourneyHandler | null {
  return (
    JOURNEY_HANDLER_REGISTRY[
      intent
    ] ??
    null
  );
}
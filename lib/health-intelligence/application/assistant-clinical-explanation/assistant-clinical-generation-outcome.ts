import type {
  AssistantOrchestratorResult,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

export type AssistantClinicalGenerationStatus =
  | "completed"
  | "not-eligible"
  | "validation-rejected"
  | "provider-failed"
  | "safety-rejected";

export type AssistantClinicalGenerationOutcome = {
  status:
    AssistantClinicalGenerationStatus;

  result:
    AssistantOrchestratorResult;
};

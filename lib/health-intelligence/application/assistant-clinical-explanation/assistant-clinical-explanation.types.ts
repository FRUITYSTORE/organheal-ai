import type {
  AssistantLatestReportContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import type {
  WholeBodyClinicalKnowledgeModel,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

export type AssistantClinicalExplanationLanguage =
  | "en"
  | "ar";

export type AssistantClinicalExplanationMode =
  | "full"
  | "next-step"
  | "cause-reasoning";

export type AssistantClinicalExplanationInput = {
  question:
    string;

  language:
    AssistantClinicalExplanationLanguage;

  mode?:
    AssistantClinicalExplanationMode;

  report:
    AssistantLatestReportContext;

  knowledge:
    WholeBodyClinicalKnowledgeModel;

  deterministicClinicalNarrative:
    string | null;
};

export type AssistantClinicalExplanationPriority =
  | "monitor"
  | "important"
  | "prompt";

export type AssistantClinicalExplanationConfidence =
  | "low"
  | "moderate"
  | "high";

export type AssistantClinicalExplanationUrgency =
  | "routine"
  | "timely"
  | "urgent"
  | "emergency";

export type AssistantClinicalExplanationFinding = {
  title:
    string;

  explanation:
    string;

  evidenceMarkers:
    string[];

  importance:
    AssistantClinicalExplanationPriority;

  confidence:
    AssistantClinicalExplanationConfidence;
};

export type AssistantClinicalExplanationRelationship = {
  markers:
    string[];

  explanation:
    string;

  confidence:
    AssistantClinicalExplanationConfidence;
};

export type AssistantClinicalExplanationContributor = {
  factor:
    string;

  whyPossible:
    string;

  confirmationNeeded:
    string;
};

export type AssistantClinicalExplanation = {
  overview:
    string;

  priorityFindings:
    AssistantClinicalExplanationFinding[];

  relationships:
    AssistantClinicalExplanationRelationship[];

  possibleContributors:
    AssistantClinicalExplanationContributor[];

  reassuringFindings:
    string[];

  missingContext:
    string[];

  nextSteps:
    string[];

  questionsForClinician:
    string[];

  urgency:
    AssistantClinicalExplanationUrgency;

  limitations:
    string[];
};

export type AssistantClinicalExplanationClient = {
  generate(
    input:
      AssistantClinicalExplanationInput
  ): Promise<unknown>;
};
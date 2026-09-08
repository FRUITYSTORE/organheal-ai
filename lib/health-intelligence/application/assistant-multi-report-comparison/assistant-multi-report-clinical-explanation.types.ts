import type {
  PatientClinicalLongitudinalComparison,
} from "@/lib/application/clinical/patient-clinical-longitudinal-comparison.service";

import type {
  AssistantClinicalExplanationConfidence,
  AssistantClinicalExplanationContributor,
  AssistantClinicalExplanationLanguage,
  AssistantClinicalExplanationPriority,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.types";

export type AssistantMultiReportClinicalExplanationInput = {
  question:
    string;

  language:
    AssistantClinicalExplanationLanguage;

  comparison:
    PatientClinicalLongitudinalComparison;

  deterministicClinicalNarrative:
    string | null;
};

export type AssistantMultiReportClinicalChange = {
  marker:
    string;

  explanation:
    string;

  importance:
    AssistantClinicalExplanationPriority;

  confidence:
    AssistantClinicalExplanationConfidence;
};

export type AssistantMultiReportClinicalPattern = {
  markers:
    string[];

  explanation:
    string;

  confidence:
    AssistantClinicalExplanationConfidence;
};

export type AssistantMultiReportClinicalExplanation = {
  overview:
    string;

  importantChanges:
    AssistantMultiReportClinicalChange[];

  patterns:
    AssistantMultiReportClinicalPattern[];

  possibleContributors:
    AssistantClinicalExplanationContributor[];

  missingContext:
    string[];

  nextSteps:
    string[];

  questionsForClinician:
    string[];

  limitations:
    string[];
};

export type AssistantMultiReportClinicalExplanationClient = {
  generate(
    input:
      AssistantMultiReportClinicalExplanationInput
  ): Promise<unknown>;
};
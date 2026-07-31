import {
  buildEvidenceBackedReasoning,
} from "../reasoning/evidence-backed-reasoning";

import type {
  EvidenceBackedReasoningResult,
} from "../reasoning/evidence-backed-reasoning";

export type AssistantClinicalEvidence = {
  symptoms: string[];
  onset: string | null;
  severity: string | null;
  associatedSymptoms: string[];
  associatedSymptomsKnown: boolean;
};

export type AssistantReportEvidence = {
  summary: string | null;
  keyFindings: string | null;
  riskLevel: string | null;
};

export type ClinicalEvidenceCompletion = {
  complete: boolean;
  status: "insufficient" | "partial" | "ready";
  completedFields: string[];
  missingFields: string[];
};

export type AssistantEvidenceReasoningResult = {
  evidenceCompletion:
    ClinicalEvidenceCompletion;

  highestValueClinicalQuestion:
    string | null;

  evidenceBackedReasoning:
    EvidenceBackedReasoningResult;
};

function assessClinicalEvidenceCompletion(
  evidence: AssistantClinicalEvidence
): ClinicalEvidenceCompletion {
  const completedFields: string[] = [];
  const missingFields: string[] = [];

  if (evidence.symptoms.length > 0) {
    completedFields.push("symptoms");
  } else {
    missingFields.push("symptoms");
  }

  if (evidence.onset) {
    completedFields.push("onset");
  } else {
    missingFields.push("onset");
  }

  if (evidence.severity) {
    completedFields.push("severity");
  } else {
    missingFields.push("severity");
  }

  if (evidence.associatedSymptomsKnown) {
    completedFields.push(
      "associatedSymptoms"
    );
  } else {
    missingFields.push(
      "associatedSymptoms"
    );
  }

  if (missingFields.length === 0) {
    return {
      complete: true,
      status: "ready",
      completedFields,
      missingFields,
    };
  }

  if (completedFields.length >= 2) {
    return {
      complete: false,
      status: "partial",
      completedFields,
      missingFields,
    };
  }

  return {
    complete: false,
    status: "insufficient",
    completedFields,
    missingFields,
  };
}

function getHighestValueClinicalQuestion(
  evidence: AssistantClinicalEvidence,
  language: "en" | "ar"
): string | null {
  const isArabic = language === "ar";

  if (evidence.symptoms.length === 0) {
    return isArabic
      ? "ما الأعراض التي تشعر بها حاليًا والمرتبطة بهذه المشكلة؟"
      : "What symptoms are you currently experiencing that may be related to this concern?";
  }

  if (!evidence.onset) {
    return isArabic
      ? "متى بدأت هذه الأعراض تقريبًا؟"
      : "Approximately when did these symptoms begin?";
  }

  if (!evidence.severity) {
    return isArabic
      ? "كيف تصف شدة الأعراض: خفيفة، متوسطة، أم شديدة؟"
      : "How would you describe the severity of the symptoms: mild, moderate, or severe?";
  }

  if (!evidence.associatedSymptomsKnown) {
    return isArabic
      ? "هل توجد أعراض أخرى مصاحبة لهذه الأعراض؟"
      : "Are you experiencing any other symptoms along with these symptoms?";
  }

  return null;
}

export function runAssistantEvidenceReasoning(
  clinicalEvidence:
    AssistantClinicalEvidence,

  reportEvidence:
    AssistantReportEvidence,

  language: "en" | "ar"
): AssistantEvidenceReasoningResult {
  const evidenceCompletion =
    assessClinicalEvidenceCompletion(
      clinicalEvidence
    );

  const evidenceBackedReasoning =
    buildEvidenceBackedReasoning({
      symptoms:
        clinicalEvidence.symptoms,

      onset:
        clinicalEvidence.onset,

      severity:
        clinicalEvidence.severity,

      associatedSymptoms:
        clinicalEvidence
          .associatedSymptoms,

      associatedSymptomsKnown:
        clinicalEvidence
          .associatedSymptomsKnown,

      reportSummary:
        reportEvidence.summary,

      reportKeyFindings:
        reportEvidence.keyFindings,

      reportRiskLevel:
        reportEvidence.riskLevel,
    });

  const highestValueClinicalQuestion =
    evidenceCompletion.complete
      ? null
      : getHighestValueClinicalQuestion(
          clinicalEvidence,
          language
        );

  return {
    evidenceCompletion,
    highestValueClinicalQuestion,
    evidenceBackedReasoning,
  };
}
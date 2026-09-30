import {
  assessClinicalUrgency,
  type ClinicalUrgencyLanguage,
} from "@/lib/health-intelligence/engines/clinical-urgency.engine";
import type { SafetyTriageResult } from "@/lib/symptom-explanation/contracts";

// Runs before anything else in the symptom-explanation flow. It reuses the
// same conservative urgency engine the assistant chat already uses, with its
// signal rules unchanged, so the video path and the chat can never disagree
// about what counts as urgent.
//
// Any urgent or emergency match blocks the video entirely. That is the most
// conservative choice, and it stands until the owner decides whether an
// educational video may ever follow emergency guidance (for example after
// the person confirms they are not having the symptom right now). The
// guidance itself is returned so the caller can show it immediately, without
// waiting on any planning or rendering.
export function evaluateSafetyGate(
  message: string,
  language: ClinicalUrgencyLanguage = "en"
): SafetyTriageResult {
  const assessment = assessClinicalUrgency({ message, language });

  if (assessment.level === "none") {
    return { allowVideo: true, level: "none" };
  }

  return {
    allowVideo: false,
    level: assessment.level,
    response: assessment.response,
    matchedSignalIds: assessment.matchedSignalIds,
  };
}

import type {
  PatientSummary,
} from "@/lib/models/patient";

import type {
  HealthIntelligenceResult,
} from "@/lib/health-intelligence/models/health-intelligence-result";

import type {
  HealthIntelligenceRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime";

import {
  buildPatientJourneySnapshot,
} from "@/lib/application/journey/patient-journey-snapshot.service";

import {
  buildPatientClinicalContext,
} from "@/lib/application/clinical/patient-clinical-context.service";

import {
  buildUnifiedIntelligenceExperience,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.service";

import type {
  UnifiedIntelligenceExperienceModel,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.model";

export type BuildUnifiedIntelligenceExperienceContextInput = {
  patientSummary:
    PatientSummary;

  intelligence:
    HealthIntelligenceResult;

  runtime:
    HealthIntelligenceRuntime;
};

export type UnifiedIntelligenceExperienceBuildResult =
  | {
      status:
        "ready";

      experience:
        UnifiedIntelligenceExperienceModel;

      unavailableReason:
        null;
    }
  | {
      status:
        "unavailable";

      experience:
        null;

      unavailableReason:
        "health_story_unavailable";
    };

export function buildUnifiedIntelligenceExperienceContext({
  patientSummary,
  intelligence,
  runtime,
}: BuildUnifiedIntelligenceExperienceContextInput): UnifiedIntelligenceExperienceBuildResult {
  const story =
    runtime.modules.story.data;

  if (!story) {
    return {
      status:
        "unavailable",

      experience:
        null,

      unavailableReason:
        "health_story_unavailable",
    };
  }

  const patientJourney =
    buildPatientJourneySnapshot({
      patientSummary,

      healthIntelligence:
        intelligence,
    });

  const clinicalContext =
    buildPatientClinicalContext({
      patientSummary,
    });

  const experience =
    buildUnifiedIntelligenceExperience({
      intelligence,
      story,
      patientJourney,
      clinicalContext,
    });

  return {
    status:
      "ready",

    experience,

    unavailableReason:
      null,
  };
}
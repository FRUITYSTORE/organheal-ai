import {
  presentNextDecision,
} from "./next-decision.presenter";

import {
  presentDoctorIntelligence,
} from "./doctor-intelligence.presenter";

import {
  presentPatientIntelligence,
} from "./patient-intelligence.presenter";

export const healthIntelligencePresenter = {
  presentNextDecision,
  presentDoctorIntelligence,
  presentPatientIntelligence,
} as const;
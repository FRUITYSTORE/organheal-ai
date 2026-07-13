import "server-only";

import type { PatientSummary } from "@/lib/models/patient";

export type PatientSummaryFactoryInput = {
  patient: PatientSummary;
};

export class PatientSummaryFactory {
  static build({
    patient,
  }: PatientSummaryFactoryInput): PatientSummary {
    return structuredClone(patient);
  }
}
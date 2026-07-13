import "server-only";

import type { PatientSummary } from "@/lib/models/patient";

import {
  PatientSummaryFactory,
} from "./patient-summary.factory";

export async function buildPatientSummary(
  patient: PatientSummary
) {
  return PatientSummaryFactory.build({
    patient,
  });
}
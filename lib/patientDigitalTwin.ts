import type { LabMarkerResult } from "./labMarkerDetector";
import type { RadiologyFinding } from "./radiologyEngine";

export type DigitalTwinProfile = {
  liverRisk: number;
  cardiovascularRisk: number;
  kidneyRisk: number;
  metabolicRisk: number;

  recoveryPotential: number;

  primarySystem: string;

  profileSummary: string;
};

export function buildPatientDigitalTwin(input: {
  markers: LabMarkerResult[];
  radiologyFindings?: RadiologyFinding[];
}) : DigitalTwinProfile {

  let liverRisk = 0;
  let cardiovascularRisk = 0;
  let kidneyRisk = 0;
  let metabolicRisk = 0;

  for (const marker of input.markers) {
    if (
      ["ALT", "AST", "Bilirubin", "Albumin", "ALP"].includes(marker.marker)
    ) {
      if (marker.status !== "Normal") {
        liverRisk += 15;
      }
    }

    if (
      [
        "LDL",
        "HDL",
        "Triglycerides",
        "Total Cholesterol",
      ].includes(marker.marker)
    ) {
      if (marker.status !== "Normal") {
        cardiovascularRisk += 15;
        metabolicRisk += 10;
      }
    }

    if (
      ["Creatinine", "eGFR", "Urea"].includes(marker.marker)
    ) {
      if (marker.status !== "Normal") {
        kidneyRisk += 20;
      }
    }

    if (
      ["Glucose", "HbA1c"].includes(marker.marker)
    ) {
      if (marker.status !== "Normal") {
        metabolicRisk += 20;
      }
    }
  }

  if (input.radiologyFindings) {
    for (const finding of input.radiologyFindings) {
      if (
        finding.organ === "Liver"
      ) {
        liverRisk += 20;
        metabolicRisk += 10;
      }

      if (
        finding.organ === "Heart"
      ) {
        cardiovascularRisk += 20;
      }
    }
  }

  liverRisk = Math.min(liverRisk, 100);
  cardiovascularRisk = Math.min(
    cardiovascularRisk,
    100
  );
  kidneyRisk = Math.min(kidneyRisk, 100);
  metabolicRisk = Math.min(
    metabolicRisk,
    100
  );

  const highestRisk = Math.max(
    liverRisk,
    cardiovascularRisk,
    kidneyRisk,
    metabolicRisk
  );

  let primarySystem = "General Health";

  if (highestRisk === liverRisk) {
    primarySystem = "Liver Health";
  } else if (highestRisk === cardiovascularRisk) {
    primarySystem = "Cardiovascular Health";
  } else if (highestRisk === kidneyRisk) {
    primarySystem = "Kidney Health";
  } else if (highestRisk === metabolicRisk) {
    primarySystem = "Metabolic Health";
  }

  const recoveryPotential = Math.max(
    100 - highestRisk,
    10
  );

  return {
    liverRisk,
    cardiovascularRisk,
    kidneyRisk,
    metabolicRisk,

    recoveryPotential,

    primarySystem,

    profileSummary:
      `Primary focus area: ${primarySystem}. ` +
      `Recovery potential estimated at ${recoveryPotential}/100.`,
  };
}
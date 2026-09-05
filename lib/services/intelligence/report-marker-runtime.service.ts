import {
  detectLabMarkers,
  type LabMarkerResult,
} from "@/lib/labMarkerDetector";

import {
  getHistoricalMedicalMarkers,
  saveMedicalReportMarkers,
  type HistoricalMedicalMarker,
} from "@/lib/repositories/report-markers.repository";

import {
  persistClinicalLabEvidenceEvents,
} from "@/lib/services/intelligence/report-evidence-events-runtime.service";

type PrepareReportMarkerRuntimeInput = {
  userId: string;
  reportId: number | null;
  extractedText: string;
};

type PrepareReportMarkerRuntimeResult = {
  detectedMarkers: LabMarkerResult[];
  historicalMarkerRows: HistoricalMedicalMarker[];
};

export async function prepareReportMarkerRuntime({
  userId,
  reportId,
  extractedText,
}: PrepareReportMarkerRuntimeInput): Promise<PrepareReportMarkerRuntimeResult> {
  /*
   * Legacy deterministic marker detection remains authoritative
   * for the current production intelligence engines.
   *
   * Parser v2 evidence events are persisted in parallel so that
   * broader report coverage can be introduced safely without
   * changing existing engine contracts.
   */
  const detectedMarkers =
    detectLabMarkers(
      extractedText
    );

  if (
    reportId !==
    null
  ) {
    const validMarkers =
      detectedMarkers
        .filter(
          (
            marker
          ): marker is LabMarkerResult & {
            value: number;
          } =>
            marker.value !==
            null
        )
        .map(
          (marker) => ({
            userId,

            reportId,

            markerName:
              marker.marker,

            markerValue:
              marker.value,

            markerUnit:
              marker.unit,

            markerStatus:
              marker.status,

            referenceLow:
              marker.referenceLow ??
              null,

            referenceHigh:
              marker.referenceHigh ??
              null,

            referenceSource:
              marker.referenceSource ??
              null,
          })
        );

    await saveMedicalReportMarkers(
      validMarkers
    );

    /*
     * Parser v2 evidence persistence is intentionally separate
     * from medical_report_markers.
     *
     * This preserves repeated report results such as:
     *
     * Potassium 5.7 mmol/L
     * Potassium 4.3 mmol/L
     *
     * without changing the canonical marker identity used by
     * existing production engines.
     */
    try {
      await persistClinicalLabEvidenceEvents({
        userId,
        reportId,
        extractedText,
      });
    } catch (error) {
      /*
       * Parser v2 must not break the existing report intelligence
       * pipeline while it is being introduced.
       *
       * Legacy markers remain available even if evidence-event
       * persistence temporarily fails.
       */
      console.error(
        "Could not persist clinical lab evidence events",
        error
      );
    }
  }

  let historicalMarkerRows:
    HistoricalMedicalMarker[] =
    [];

  try {
    historicalMarkerRows =
      await getHistoricalMedicalMarkers(
        userId
      );
  } catch (error) {
    console.error(
      "Could not load historical medical markers",
      error
    );
  }

  return {
    detectedMarkers,
    historicalMarkerRows,
  };
}
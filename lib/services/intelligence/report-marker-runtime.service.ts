import {
  detectLabMarkers,
  type LabMarkerResult,
} from "@/lib/labMarkerDetector";
import {
  getHistoricalMedicalMarkers,
  saveMedicalReportMarkers,
  type HistoricalMedicalMarker,
} from "@/lib/repositories/report-markers.repository";

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
  const detectedMarkers = detectLabMarkers(extractedText);

  if (reportId !== null) {
    const validMarkers = detectedMarkers
      .filter(
        (marker): marker is LabMarkerResult & { value: number } =>
          marker.value !== null
      )
      .map((marker) => ({
  userId,
  reportId,
  markerName: marker.marker,
  markerValue: marker.value,
  markerUnit: marker.unit,
  markerStatus: marker.status,
  referenceLow:
    marker.referenceLow ?? null,
  referenceHigh:
    marker.referenceHigh ?? null,
  referenceSource:
    marker.referenceSource ?? null,
}));

    try {
      await saveMedicalReportMarkers(validMarkers);
    } catch (error) {
      console.error("Could not save medical report markers", error);
    }
  }

  let historicalMarkerRows: HistoricalMedicalMarker[] = [];

  try {
    historicalMarkerRows = await getHistoricalMedicalMarkers(userId);
  } catch (error) {
    console.error("Could not load historical medical markers", error);
  }

  return {
    detectedMarkers,
    historicalMarkerRows,
  };
}
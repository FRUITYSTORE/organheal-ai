import { supabase } from "@/lib/supabase";

export type MedicalReportMarkerInput = {
  userId: string;
  reportId: number;
  markerName: string;
  markerValue: number;
  markerUnit: string | null;
};

export type HistoricalMedicalMarker = {
  marker_name: string;
  marker_value: number;
  created_at: string;
};

export async function saveMedicalReportMarkers(
  markers: MedicalReportMarkerInput[]
): Promise<void> {
  if (markers.length === 0) {
    return;
  }

  const markerRows = markers.map((marker) => ({
    user_id: marker.userId,
    report_id: marker.reportId,
    marker_name: marker.markerName,
    marker_value: marker.markerValue,
    marker_unit: marker.markerUnit,
  }));

  const { error } = await supabase
    .from("medical_report_markers")
    .insert(markerRows);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getHistoricalMedicalMarkers(
  userId: string
): Promise<HistoricalMedicalMarker[]> {
  const { data, error } = await supabase
    .from("medical_report_markers")
    .select("marker_name, marker_value, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as HistoricalMedicalMarker[];
}
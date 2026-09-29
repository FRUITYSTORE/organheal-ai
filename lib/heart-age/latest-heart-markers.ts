import { getMedicalReportMarkersForPatient } from "@/lib/repositories/report-markers.repository";

// Layer 2 of the Heart Age feature: for a logged-in member, pre-fill the two
// lab values almost nobody has memorized (Total Cholesterol, HDL) from their
// own uploaded reports instead of asking them to type numbers they don't
// know. This intentionally does NOT auto-fill age/sex/smoking/diabetes/blood
// pressure — those are either not lab values at all, or are a diagnosis
// decision the member should confirm themselves, not something to infer
// silently from a single abnormal reading.

export type LatestHeartMarker = {
  value: number;
  reportDate: string;
};

export type LatestHeartMarkers = {
  totalCholesterol: LatestHeartMarker | null;
  hdlCholesterol: LatestHeartMarker | null;
};

type MarkerRow = {
  marker_name: string;
  marker_value: number;
  created_at: string;
};

/**
 * Pure selection logic, kept separate from the Supabase call so it's easy to
 * unit test: given a patient's markers (any order), return the most recent
 * Total Cholesterol and HDL readings.
 */
export function pickLatestHeartMarkers(
  markers: MarkerRow[]
): LatestHeartMarkers {
  function latestFor(markerName: string): LatestHeartMarker | null {
    const matches = markers.filter(
      (marker) => marker.marker_name === markerName
    );

    if (matches.length === 0) return null;

    const mostRecent = matches.reduce((latest, current) =>
      new Date(current.created_at).getTime() >
      new Date(latest.created_at).getTime()
        ? current
        : latest
    );

    return {
      value: mostRecent.marker_value,
      reportDate: mostRecent.created_at,
    };
  }

  return {
    totalCholesterol: latestFor("Total Cholesterol"),
    hdlCholesterol: latestFor("HDL"),
  };
}

export async function getLatestHeartMarkers(
  userId: string
): Promise<LatestHeartMarkers> {
  const markers = await getMedicalReportMarkersForPatient(userId);
  return pickLatestHeartMarkers(markers);
}

import {
  supabase,
} from "@/lib/supabase";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

const MEDICAL_REPORT_MARKERS_TABLE =
  "medical_report_markers";

const HISTORICAL_MARKERS_SELECT =
  "marker_name, marker_value, created_at";

const REPORT_MARKERS_SELECT =
  "marker_name, marker_value, marker_unit, created_at";

export type ReportMedicalMarkerEvidence = {
  marker_name: string;
  marker_value: number;
  marker_unit: string | null;
  created_at: string;
};

export type MedicalReportMarkerInput = {
  userId:
    string;

  reportId:
    number;

  markerName:
    string;

  markerValue:
    number;

  markerUnit:
    string | null;
};

export type HistoricalMedicalMarker = {
  marker_name:
    string;

  marker_value:
    number;

  created_at:
    string;
};

export async function saveMedicalReportMarkers(
  markers:
    MedicalReportMarkerInput[],
  client:
    SupabaseClient = supabase
): Promise<void> {
  if (
    markers.length === 0
  ) {
    return;
  }

  const markerRows =
    markers.map(
      (marker) => ({
        user_id:
          marker.userId,

        report_id:
          marker.reportId,

        marker_name:
          marker.markerName,

        marker_value:
          marker.markerValue,

        marker_unit:
          marker.markerUnit,
      })
    );

  const {
    error,
  } =
    await client
      .from(
        MEDICAL_REPORT_MARKERS_TABLE
      )
      .insert(
        markerRows
      );

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export async function getHistoricalMedicalMarkers(
  userId:
    string,
  client:
    SupabaseClient = supabase
): Promise<
  HistoricalMedicalMarker[]
> {
  const {
    data,
    error,
  } =
    await client
      .from(
        MEDICAL_REPORT_MARKERS_TABLE
      )
      .select(
        HISTORICAL_MARKERS_SELECT
      )
      .eq(
        "user_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data ?? []
  ) as HistoricalMedicalMarker[];
}export async function getMedicalReportMarkersByReportId(
  userId: string,
  reportId: number,
  client: SupabaseClient = supabase
): Promise<ReportMedicalMarkerEvidence[]> {
  const {
    data,
    error,
  } =
    await client
      .from(
        MEDICAL_REPORT_MARKERS_TABLE
      )
      .select(
        REPORT_MARKERS_SELECT
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "report_id",
        reportId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const seenMarkers =
    new Set<string>();

  return (
    data ?? []
  )
    .filter(
      (
        row
      ): row is
        ReportMedicalMarkerEvidence =>
        typeof row.marker_name ===
          "string" &&
        typeof row.marker_value ===
          "number"
    )
    .filter(
      (row) => {
        const key =
          row.marker_name
            .trim()
            .toLocaleLowerCase();

        if (
          !key ||
          seenMarkers.has(
            key
          )
        ) {
          return false;
        }

        seenMarkers.add(
          key
        );

        return true;
      }
    );
}
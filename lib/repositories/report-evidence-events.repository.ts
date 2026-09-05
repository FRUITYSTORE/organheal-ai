import {
  supabase,
} from "@/lib/supabase";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  LabMarkerStatus,
} from "@/lib/labMarkerDetector";

const TABLE =
  "medical_report_evidence_events";

export type ReportEvidenceEventInput = {
  userId: string;
  reportId: number;
  sequenceIndex: number;
  rawMarkerName: string;
  canonicalMarkerName: string;
  markerValue: number;
  markerUnit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  markerStatus: LabMarkerStatus;
  flag: string | null;
  rawLine: string;
  normalizationConfidence:
    | "high"
    | "medium"
    | "low";
  contextType:
    | "result"
    | "repeat"
    | "specimen"
    | "method"
    | "note";
};

export type ReportEvidenceEvent = {
  id: string;
  report_id: number;
  sequence_index: number;
  raw_marker_name: string;
  canonical_marker_name: string;
  marker_value: number;
  marker_unit: string | null;
  reference_low: number | null;
  reference_high: number | null;
  marker_status: LabMarkerStatus;
  flag: string | null;
  raw_line: string;
  normalization_confidence:
    | "high"
    | "medium"
    | "low";
  context_type:
    | "result"
    | "repeat"
    | "specimen"
    | "method"
    | "note";
  created_at: string;
  updated_at: string;
};

export async function saveReportEvidenceEvents(
  events: ReportEvidenceEventInput[],
  client:
    SupabaseClient = supabase
): Promise<void> {
  if (
    events.length === 0
  ) {
    return;
  }

  const rows =
    events.map(
      (event) => ({
        user_id:
          event.userId,

        report_id:
          event.reportId,

        sequence_index:
          event.sequenceIndex,

        raw_marker_name:
          event.rawMarkerName,

        canonical_marker_name:
          event.canonicalMarkerName,

        marker_value:
          event.markerValue,

        marker_unit:
          event.markerUnit,

        reference_low:
          event.referenceLow,

        reference_high:
          event.referenceHigh,

        marker_status:
          event.markerStatus,

        flag:
          event.flag,

        raw_line:
          event.rawLine,

        normalization_confidence:
          event.normalizationConfidence,

        context_type:
          event.contextType,
      })
    );

  const {
    error,
  } =
    await client
      .from(
        TABLE
      )
      .upsert(
        rows,
        {
          onConflict:
            "user_id,report_id,sequence_index",
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export async function getReportEvidenceEventsByReportId(
  userId: string,
  reportId: number,
  client:
    SupabaseClient = supabase
): Promise<
  ReportEvidenceEvent[]
> {
  const {
    data,
    error,
  } =
    await client
      .from(
        TABLE
      )
      .select(
        "id, report_id, sequence_index, raw_marker_name, canonical_marker_name, marker_value, marker_unit, reference_low, reference_high, marker_status, flag, raw_line, normalization_confidence, context_type, created_at, updated_at"
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
        "sequence_index",
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
  ) as ReportEvidenceEvent[];
}
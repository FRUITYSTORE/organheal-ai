import type {
  ReportMedicalMarkerEvidence,
} from "@/lib/repositories/report-markers.repository";

import type {
  UploadedReportSummary,
} from "@/lib/repositories/reports.repository";

export type ClinicalLongitudinalDirection =
  | "increasing"
  | "decreasing"
  | "stable"
  | "mixed"
  | "insufficient";

export type ClinicalLongitudinalTrend =
  | "improved"
  | "worsened"
  | "stable"
  | "mixed"
  | "insufficient";

export type ClinicalLongitudinalMarkerPoint = {
  reportId:
    number;

  reportDate:
    string;

  value:
    number;

  unit:
    string;

  status:
    ReportMedicalMarkerEvidence["marker_status"];

  referenceLow:
    number | null;

  referenceHigh:
    number | null;

  referenceSource:
    ReportMedicalMarkerEvidence["reference_source"];
};

export type ClinicalLongitudinalMarkerSeries = {
  marker:
    string;

  unit:
    string;

  points:
    ClinicalLongitudinalMarkerPoint[];

  direction:
    ClinicalLongitudinalDirection;

  clinicalTrend:
    ClinicalLongitudinalTrend;

  comparable:
    boolean;

  limitation:
    string | null;
};

export type PatientClinicalLongitudinalComparison = {
  reportIds:
    number[];

  reportCount:
    number;

  markerSeries:
    ClinicalLongitudinalMarkerSeries[];

  comparableMarkerCount:
    number;

  limitations:
    string[];
};

export type BuildPatientClinicalLongitudinalComparisonInput = {
  reports:
    UploadedReportSummary[];

  reportMarkers:
    ReportMedicalMarkerEvidence[];
};

function getTimestamp(
  value:
    string
): number {
  const timestamp =
    new Date(
      value
    ).getTime();

  return Number.isNaN(
    timestamp
  )
    ? 0
    : timestamp;
}

function normalizeMarkerName(
  value:
    string
): string {
  return value
    .trim()
    .toLocaleLowerCase();
}

function normalizeMarkerUnit(
  value:
    string | null
): string | null {
  if (
    !value
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLocaleLowerCase();

  return normalized ||
    null;
}

function resolveDirection(
  values:
    number[]
): ClinicalLongitudinalDirection {
  if (
    values.length <
    2
  ) {
    return "insufficient";
  }

  const deltas =
    values
      .slice(
        1
      )
      .map(
        (
          value,
          index
        ) =>
          value -
          values[index]
      );

  if (
    deltas.every(
      (
        delta
      ) =>
        delta ===
        0
    )
  ) {
    return "stable";
  }

  const hasIncrease =
    deltas.some(
      (
        delta
      ) =>
        delta >
        0
    );

  const hasDecrease =
    deltas.some(
      (
        delta
      ) =>
        delta <
        0
    );

  if (
    hasIncrease &&
    hasDecrease
  ) {
    return "mixed";
  }

  return hasIncrease
    ? "increasing"
    : "decreasing";
}

function getReferenceDistance(
  point:
    ClinicalLongitudinalMarkerPoint
): number | null {
  const {
    value,
    referenceLow,
    referenceHigh,
  } =
    point;

  if (
    referenceLow ===
      null ||
    referenceHigh ===
      null
  ) {
    return null;
  }

  if (
    value <
    referenceLow
  ) {
    return (
      referenceLow -
      value
    );
  }

  if (
    value >
    referenceHigh
  ) {
    return (
      value -
      referenceHigh
    );
  }

  return 0;
}

function resolveClinicalTrend(
  points:
    ClinicalLongitudinalMarkerPoint[]
): ClinicalLongitudinalTrend {
  if (
    points.length <
    2
  ) {
    return "insufficient";
  }

  const distances =
    points.map(
      getReferenceDistance
    );

  if (
    distances.some(
      (
        distance
      ) =>
        distance ===
        null
    )
  ) {
    /*
     * Without comparable reference boundaries,
     * numeric direction alone is not enough to
     * claim clinical improvement or worsening.
     */
    return "insufficient";
  }

  const numericDistances =
    distances as number[];

  const direction =
    resolveDirection(
      numericDistances
    );

  if (
    direction ===
    "stable"
  ) {
    return "stable";
  }

  if (
    direction ===
    "mixed"
  ) {
    return "mixed";
  }

  return direction ===
    "decreasing"
      ? "improved"
      : "worsened";
}

function buildSeries(
  markerName:
    string,
  markers:
    ReportMedicalMarkerEvidence[],
  reportDateById:
    Map<number, string>
): ClinicalLongitudinalMarkerSeries {
  const normalizedUnits =
    new Set(
      markers
        .map(
          (
            marker
          ) =>
            normalizeMarkerUnit(
              marker.marker_unit
            )
        )
        .filter(
          (
            unit
          ): unit is string =>
            unit !== null
        )
    );

  if (
    normalizedUnits.size !==
    1
  ) {
    return {
      marker:
        markerName,

      unit:
        "",

      points:
        [],

      direction:
        "insufficient",

      clinicalTrend:
        "insufficient",

      comparable:
        false,

      limitation:
        "The marker cannot be compared safely because units are missing or inconsistent across reports.",
    };
  }

  const unit =
    [...normalizedUnits][0];

  const points =
    markers
      .flatMap(
        (
          marker
        ) => {
          const reportDate =
            reportDateById.get(
              marker.report_id
            );

          const normalizedUnit =
            normalizeMarkerUnit(
              marker.marker_unit
            );

          if (
            !reportDate ||
            normalizedUnit !==
              unit
          ) {
            return [];
          }

          return [
            {
              reportId:
                marker.report_id,

              reportDate,

              value:
                marker.marker_value,

              unit:
                marker.marker_unit!,

              status:
                marker.marker_status,

              referenceLow:
                marker.reference_low,

              referenceHigh:
                marker.reference_high,

              referenceSource:
                marker.reference_source,
            },
          ];
        }
      )
      .sort(
        (
          left,
          right
        ) =>
          getTimestamp(
            left.reportDate
          ) -
          getTimestamp(
            right.reportDate
          )
      );

  if (
    points.length <
    2
  ) {
    return {
      marker:
        markerName,

      unit,

      points,

      direction:
        "insufficient",

      clinicalTrend:
        "insufficient",

      comparable:
        false,

      limitation:
        "At least two comparable measurements are required for a longitudinal trend.",
    };
  }

  return {
    marker:
      markerName,

    unit,

    points,

    direction:
      resolveDirection(
        points.map(
          (
            point
          ) =>
            point.value
        )
      ),

    clinicalTrend:
      resolveClinicalTrend(
        points
      ),

    comparable:
      true,

    limitation:
      null,
  };
}

export function buildPatientClinicalLongitudinalComparison({
  reports,
  reportMarkers,
}: BuildPatientClinicalLongitudinalComparisonInput): PatientClinicalLongitudinalComparison {
  const sortedReports =
    [...reports].sort(
      (
        left,
        right
      ) =>
        getTimestamp(
          right.created_at
        ) -
        getTimestamp(
          left.created_at
        )
    );

  const reportIds =
    sortedReports.map(
      (
        report
      ) =>
        report.id
    );

  const selectedReportIds =
    new Set(
      reportIds
    );

  const reportDateById =
    new Map(
      sortedReports.map(
        (
          report
        ) => [
          report.id,
          report.created_at,
        ]
      )
    );

  const selectedMarkers =
    reportMarkers.filter(
      (
        marker
      ) =>
        selectedReportIds.has(
          marker.report_id
        )
    );

  const markersByName =
    new Map<
      string,
      {
        displayName:
          string;

        markers:
          ReportMedicalMarkerEvidence[];
      }
    >();

  for (
    const marker of
    selectedMarkers
  ) {
    const key =
      normalizeMarkerName(
        marker.marker_name
      );

    const existing =
      markersByName.get(
        key
      );

    if (
      existing
    ) {
      existing.markers.push(
        marker
      );
    } else {
      markersByName.set(
        key,
        {
          displayName:
            marker.marker_name,

          markers:
            [
              marker,
            ],
        }
      );
    }
  }

  const markerSeries =
    [...markersByName.values()]
      .map(
        (
          group
        ) =>
          buildSeries(
            group.displayName,
            group.markers,
            reportDateById
          )
      )
      .sort(
        (
          left,
          right
        ) =>
          left.marker.localeCompare(
            right.marker
          )
      );

  const limitations:
    string[] = [];

  if (
    reports.length <
    2
  ) {
    limitations.push(
      "At least two uploaded reports are required for longitudinal comparison."
    );
  }

  if (
    markerSeries.length ===
    0
  ) {
    limitations.push(
      "No structured laboratory markers were available across the selected reports."
    );
  }

  if (
    markerSeries.some(
      (
        series
      ) =>
        !series.comparable
    )
  ) {
    limitations.push(
      "Some markers were excluded from trend interpretation because measurements or units were not comparable."
    );
  }

  limitations.push(
    "A numeric trend does not by itself establish a diagnosis or explain the cause of a change."
  );

  return {
    reportIds,

    reportCount:
      reports.length,

    markerSeries,

    comparableMarkerCount:
      markerSeries.filter(
        (
          series
        ) =>
          series.comparable
      ).length,

    limitations,
  };
}
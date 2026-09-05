export type LabTrendPoint = {
  marker: string;
  value: number;
  unit: string | null;
  date: string;
};

export type LabTrendResult = {
  marker: string;
  unit: string | null;
  earliestValue: number;
  latestValue: number;
  changeAmount: number;
  trendDirection: "Improving" | "Stable" | "Worsening";
  trendSummary: string;
};

function normalizeUnit(
  unit: string | null
): string | null {
  if (!unit) {
    return null;
  }

  const normalized =
    unit
      .trim()
      .toLocaleLowerCase()
      .replace(/\s+/g, "");

  return normalized || null;
}

function haveCompatibleUnits(
  points: LabTrendPoint[]
): boolean {
  const normalizedUnits =
    new Set(
      points.map(
        (point) =>
          normalizeUnit(
            point.unit
          )
      )
    );

  /*
   * We only calculate a numeric trend when all points
   * use the same known unit.
   *
   * This intentionally prevents unsafe comparisons such as:
   * HDL 39 mg/dL -> HDL 0.93 mmol/L
   */
  return (
    normalizedUnits.size === 1 &&
    !normalizedUnits.has(
      null
    )
  );
}

export function buildHistoricalLabTrends(
  points: LabTrendPoint[]
): LabTrendResult[] {
  const grouped =
    points.reduce<
      Record<
        string,
        LabTrendPoint[]
      >
    >(
      (
        acc,
        point
      ) => {
        if (
          !acc[
            point.marker
          ]
        ) {
          acc[
            point.marker
          ] = [];
        }

        acc[
          point.marker
        ].push(
          point
        );

        return acc;
      },
      {}
    );

  return Object.entries(
    grouped
  )
    .filter(
      (
        [
          ,
          markerPoints,
        ]
      ) =>
        markerPoints.length >=
          2 &&
        haveCompatibleUnits(
          markerPoints
        )
    )
    .map(
      (
        [
          marker,
          markerPoints,
        ]
      ) => {
        const sorted =
          [
            ...markerPoints,
          ].sort(
            (
              a,
              b
            ) =>
              new Date(
                a.date
              ).getTime() -
              new Date(
                b.date
              ).getTime()
          );

        const earliestValue =
          sorted[0].value;

        const latestValue =
          sorted[
            sorted.length - 1
          ].value;

        const changeAmount =
          Number(
            (
              latestValue -
              earliestValue
            ).toFixed(
              2
            )
          );

        let trendDirection:
          | "Improving"
          | "Stable"
          | "Worsening" =
          "Stable";

        if (
          Math.abs(
            changeAmount
          ) >= 5
        ) {
          if (
            [
              "LDL",
              "Triglycerides",
              "ALT",
              "AST",
              "Bilirubin",
              "Creatinine",
              "HbA1c",
              "Glucose",
            ].includes(
              marker
            )
          ) {
            trendDirection =
              changeAmount <
              0
                ? "Improving"
                : "Worsening";
          } else if (
            [
              "HDL",
              "Vitamin D",
              "eGFR",
              "Hemoglobin",
            ].includes(
              marker
            )
          ) {
            trendDirection =
              changeAmount >
              0
                ? "Improving"
                : "Worsening";
          }
        }

        const unit =
          sorted[0]
            .unit;

        const unitSuffix =
          unit
            ? ` ${unit}`
            : "";

        return {
          marker,
          unit,
          earliestValue,
          latestValue,
          changeAmount,
          trendDirection,
          trendSummary:
            `${marker} changed from ${earliestValue}${unitSuffix} to ${latestValue}${unitSuffix}. Trend: ${trendDirection}.`,
        };
      }
    );
}
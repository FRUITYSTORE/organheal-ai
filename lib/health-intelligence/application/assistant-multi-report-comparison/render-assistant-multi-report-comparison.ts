import type {
  ClinicalLongitudinalMarkerSeries,
  PatientClinicalLongitudinalComparison,
} from "@/lib/application/clinical/patient-clinical-longitudinal-comparison.service";

function renderTrend(
  series:
    ClinicalLongitudinalMarkerSeries,
  language:
    "ar" | "en"
): string {
  if (
    language ===
    "ar"
  ) {
    switch (
      series.clinicalTrend
    ) {
      case "improved":
        return "اتجاهه نحو التحسن";

      case "worsened":
        return "اتجاهه نحو التدهور";

      case "stable":
        return "مستقر تقريبًا";

      case "mixed":
        return "الاتجاه متذبذب";

      case "insufficient":
        return "لا توجد معلومات كافية للحكم سريريًا";
    }
  }

  switch (
    series.clinicalTrend
  ) {
    case "improved":
      return "trending toward improvement";

    case "worsened":
      return "trending toward worsening";

    case "stable":
      return "approximately stable";

    case "mixed":
      return "showing a mixed pattern";

    case "insufficient":
      return "insufficient information for a clinical trend";
  }
}

function renderDirection(
  series:
    ClinicalLongitudinalMarkerSeries,
  language:
    "ar" | "en"
): string {
  if (
    language ===
    "ar"
  ) {
    switch (
      series.direction
    ) {
      case "increasing":
        return "القيم ترتفع";

      case "decreasing":
        return "القيم تنخفض";

      case "stable":
        return "القيم مستقرة";

      case "mixed":
        return "القيم متذبذبة";

      case "insufficient":
        return "لا توجد قياسات كافية";
    }
  }

  switch (
    series.direction
  ) {
    case "increasing":
      return "values are increasing";

    case "decreasing":
      return "values are decreasing";

    case "stable":
      return "values are stable";

    case "mixed":
      return "values fluctuate";

    case "insufficient":
      return "there are not enough measurements";
  }
}

function renderSeriesValues(
  series:
    ClinicalLongitudinalMarkerSeries
): string {
  return series.points
    .map(
      (
        point
      ) =>
        `${point.value} ${point.unit}`
    )
    .join(
      " → "
    );
}

export function renderAssistantMultiReportComparison(
  comparison:
    PatientClinicalLongitudinalComparison,
  language:
    "ar" | "en"
): string {
  if (
    comparison.reportCount <
    2
  ) {
    return language ===
      "ar"
      ? "لا يوجد عدد كافٍ من التقارير لإجراء مقارنة زمنية."
      : "There are not enough reports for a longitudinal comparison.";
  }

  if (
    comparison.markerSeries.length ===
    0
  ) {
    return language ===
      "ar"
      ? `راجعت ${comparison.reportCount} تقارير، لكن لم أجد مؤشرات مخبرية منظمة مشتركة تكفي لإجراء مقارنة موثوقة بينها.`
      : `I reviewed ${comparison.reportCount} reports, but there were not enough shared structured laboratory markers for a reliable comparison.`;
  }

  const comparableSeries =
    comparison.markerSeries.filter(
      (
        series
      ) =>
        series.comparable
    );

  if (
    comparableSeries.length ===
    0
  ) {
    return language ===
      "ar"
      ? `راجعت ${comparison.reportCount} تقارير، لكن المؤشرات الموجودة لا يمكن مقارنتها بأمان بسبب نقص القياسات أو اختلاف الوحدات.`
      : `I reviewed ${comparison.reportCount} reports, but the available markers could not be compared safely because measurements were missing or units differed.`;
  }

  const prioritizedSeries =
    [
      ...comparableSeries,
    ]
      .sort(
        (
          left,
          right
        ) => {
          const priority = {
            worsened:
              0,

            improved:
              1,

            mixed:
              2,

            stable:
              3,

            insufficient:
              4,
          };

          return (
            priority[
              left.clinicalTrend
            ] -
            priority[
              right.clinicalTrend
            ]
          );
        }
      )
      .slice(
        0,
        8
      );

  if (
    language ===
    "ar"
  ) {
    const lines =
      prioritizedSeries.map(
        (
          series
        ) =>
          `• ${series.marker}: ${renderSeriesValues(
            series
          )} — ${renderDirection(
            series,
            language
          )}، و${renderTrend(
            series,
            language
          )}.`
      );

    const excludedCount =
      comparison.markerSeries.length -
      comparableSeries.length;

    return [
      `قارنت آخر ${comparison.reportCount} تقارير المتاحة وفق المؤشرات المشتركة القابلة للمقارنة:`,
      "",
      ...lines,
      "",
      excludedCount >
      0
        ? `هناك ${excludedCount} مؤشر/مؤشرات لم أعتبرها trend موثوقًا بسبب نقص القياسات أو اختلاف الوحدات.`
        : "",
      "هذه المقارنة تصف اتجاه القيم فقط، ولا تثبت تشخيصًا أو سبب التغيّر.",
    ]
      .filter(
        Boolean
      )
      .join(
        "\n"
      );
  }

  const lines =
    prioritizedSeries.map(
      (
        series
      ) =>
        `• ${series.marker}: ${renderSeriesValues(
          series
        )} — ${renderDirection(
          series,
          language
        )}; ${renderTrend(
          series,
          language
        )}.`
    );

  const excludedCount =
    comparison.markerSeries.length -
    comparableSeries.length;

  return [
    `I compared the latest ${comparison.reportCount} available reports using shared comparable markers:`,
    "",
    ...lines,
    "",
    excludedCount >
    0
      ? `${excludedCount} marker(s) were not treated as a reliable trend because measurements were missing or units differed.`
      : "",
    "This comparison describes value trends only; it does not establish a diagnosis or the cause of change.",
  ]
    .filter(
      Boolean
    )
    .join(
      "\n"
    );
}
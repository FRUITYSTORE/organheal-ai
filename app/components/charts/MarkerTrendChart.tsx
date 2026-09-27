"use client";

import {
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { presentLabMarkerName } from "@/lib/presentation/intelligence/lab-marker-presentation";
import type { MarkerTrend } from "@/lib/health-marker-trends";

// A small, dependency-light trend line for one lab marker across a member's
// reports. Shows the normal reference band when it is known, and never
// claims a trend from a single point (the caller only passes markers with
// two or more comparable readings).
export default function MarkerTrendChart({
  trend,
  isArabic,
  height = 120,
}: {
  trend: MarkerTrend;
  isArabic: boolean;
  height?: number;
}) {
  const language = isArabic ? "ar" : "en";
  const markerName = presentLabMarkerName(trend.trend.marker, language);
  const data = trend.series.points.map((point) => ({
    date: point.date,
    value: point.value,
  }));
  const values = data.map((point) => point.value);
  const lowestValue = Math.min(...values, trend.referenceLow ?? Infinity);
  const highestValue = Math.max(...values, trend.referenceHigh ?? -Infinity);
  const padding = Math.max((highestValue - lowestValue) * 0.15, 1);
  const tone =
    trend.trend.trendDirection === "Improving"
      ? "#0f766e"
      : trend.trend.trendDirection === "Worsening"
        ? "#dc2626"
        : "#64748b";

  function formatDate(value: string) {
    try {
      return new Intl.DateTimeFormat(isArabic ? "ar" : "en", {
        month: "short",
        year: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  return (
    <div className="markerTrendChart" dir="ltr">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 8 }}>
          {trend.referenceLow !== null && trend.referenceHigh !== null && (
            <ReferenceArea
              y1={trend.referenceLow}
              y2={trend.referenceHigh}
              fill="#0f766e"
              fillOpacity={0.08}
              strokeOpacity={0}
            />
          )}

          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: "var(--oh-muted, #64748b)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />

          <YAxis
            domain={[lowestValue - padding, highestValue + padding]}
            hide
          />

          <Tooltip
            labelFormatter={(label) => formatDate(String(label))}
            formatter={(value) => [
              `${value}${trend.series.unit ? ` ${trend.series.unit}` : ""}`,
              markerName,
            ]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 10,
              border: "1px solid var(--oh-border, #e2e8f0)",
            }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke={tone}
            strokeWidth={2.5}
            dot={{ r: 3, fill: tone, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

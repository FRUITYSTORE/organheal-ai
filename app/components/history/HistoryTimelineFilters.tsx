type TimelineFilter = {
  value: string;
  label: string;
};

type HistoryTimelineFiltersProps = {
  filters: TimelineFilter[];
  selectedFilter: string;
  onChange: (value: string) => void;
  isArabic: boolean;
};

export default function HistoryTimelineFilters({
  filters,
  selectedFilter,
  onChange,
  isArabic,
}: HistoryTimelineFiltersProps) {
  const text = (
    english: string,
    arabic: string
  ) => (isArabic ? arabic : english);

  return (
    <section className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {text(
              "Filter Timeline",
              "تصفية المسار"
            )}
          </p>

          <h2 className="ohCardTitle">
            {text(
              "Focus your health history",
              "ركّز التاريخ الصحي"
            )}
          </h2>
        </div>
      </div>

      <div className="ohButtonRow">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={
              selectedFilter === filter.value
                ? "primaryBtn"
                : "secondaryBtn"
            }
            onClick={() =>
              onChange(filter.value)
            }
          >
            {filter.label}
          </button>
        ))}
      </div>
    </section>
  );
}
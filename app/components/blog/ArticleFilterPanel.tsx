type ArticleFilterPanelProps = {
  searchTerm: string;
  selectedCategory: string;
  selectedMarker: string;
  categoryOptions: string[];
  markerOptions: string[];
  labels: {
    eyebrow: string;
    title: string;
    description: string;
    status: string;
    searchPlaceholder: string;
    categoryAria: string;
    markerAria: string;
    allHealthAreas: string;
    allLabMarkers: string;
    clear: string;
    all: string;
  };
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMarkerChange: (value: string) => void;
  onReset: () => void;
};

export default function ArticleFilterPanel({
  searchTerm,
  selectedCategory,
  selectedMarker,
  categoryOptions,
  markerOptions,
  labels,
  onSearchChange,
  onCategoryChange,
  onMarkerChange,
  onReset,
}: ArticleFilterPanelProps) {
  return (
    <section className="articleSearchPanel">
      <div className="articleSearchHeader">
        <div>
          <p className="ohMetricLabel">{labels.eyebrow}</p>
          <h2 className="articleSearchTitle">{labels.title}</h2>
          <p className="articleSearchText">{labels.description}</p>
        </div>

        <span className="ohStatusBadge good">{labels.status}</span>
      </div>

      <div className="articleControlGrid">
        <div className="articleSearchInputWrap">
          <span className="articleSearchIcon">⌕</span>
          <input
            className="articleControl articleSearchInput"
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={labels.searchPlaceholder}
          />
        </div>

        <select
          className="articleControl"
          value={selectedCategory}
          onChange={(event) => onCategoryChange(event.target.value)}
          aria-label={labels.categoryAria}
        >
          <option value="all">{labels.allHealthAreas}</option>
          {categoryOptions.map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          className="articleControl"
          value={selectedMarker}
          onChange={(event) => onMarkerChange(event.target.value)}
          aria-label={labels.markerAria}
        >
          <option value="all">{labels.allLabMarkers}</option>
          {markerOptions.map((marker) => (
            <option value={marker} key={marker}>
              {marker}
            </option>
          ))}
        </select>

        <button type="button" className="articleClearButton" onClick={onReset}>
          {labels.clear}
        </button>
      </div>

      <div className="articleQuickFilterRow">
        <button
          type="button"
          className={`articleQuickFilter ${selectedCategory === "all" ? "active" : ""}`}
          onClick={() => onCategoryChange("all")}
        >
          {labels.all}
        </button>

        {categoryOptions.map((category) => (
          <button
            type="button"
            className={`articleQuickFilter ${selectedCategory === category ? "active" : ""}`}
            onClick={() => onCategoryChange(category)}
            key={category}
          >
            {category}
          </button>
        ))}
      </div>
    </section>
  );
}
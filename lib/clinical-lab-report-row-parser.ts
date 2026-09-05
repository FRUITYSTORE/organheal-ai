export type ClinicalLabReportRow = {
  rawName: string;
  value: number;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  flag: string | null;
  rawLine: string;
};

function normalizeUnit(
  unit: string | undefined
): string | null {
  if (!unit) {
    return null;
  }

  const normalized =
    unit
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

  const knownUnits: Record<
    string,
    string
  > = {
    "mg/dl": "mg/dL",
    "g/dl": "g/dL",
    "ng/ml": "ng/mL",
    "pg/ml": "pg/mL",
    "miu/l": "mIU/L",
    "mmol/l": "mmol/L",
    "µmol/l": "µmol/L",
    "umol/l": "µmol/L",
    "u/l": "U/L",
    "iu/l": "IU/L",
    "%": "%",
    "mg/g": "mg/g",
    "mg/l": "mg/L",
    "µg/dl": "µg/dL",
    "ug/dl": "µg/dL",
    "ng/l": "ng/L",
    "pg": "pg",
    "fl": "fL",
    "x10^3/ul": "x10^3/uL",
    "x10^6/ul": "x10^6/uL",
    "x10^9/l": "x10^9/L",
    "x10^12/l": "x10^12/L",
    "ml/min/1.73m²":
      "mL/min/1.73m²",
    "ml/min/1.73m2":
      "mL/min/1.73m²",
  };

  return (
    knownUnits[
      normalized
    ] ??
    unit.trim()
  );
}

function toNumber(
  value: string | undefined
): number | null {
  if (!value) {
    return null;
  }

  const parsed =
    Number(
      value.replace(
        ",",
        "."
      )
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

const UNIT_PATTERN =
  "(?:mg\\/dL|g\\/dL|ng\\/mL|pg\\/mL|mIU\\/L|mmol\\/L|µmol\\/L|umol\\/L|U\\/L|IU\\/L|%|mg\\/g|mg\\/L|µg\\/dL|ug\\/dL|ng\\/L|pg|fL|x10\\^3\\/uL|x10\\^6\\/uL|x10\\^9\\/L|x10\\^12\\/L|mL\\/min\\/1\\.73m(?:²|2))";

const FLAG_PATTERN =
  "(?:HIGH|LOW|NORMAL|BORDERLINE|H|L|N|\\*)";

const RESULT_PATTERN_SOURCE =
  [
    "([A-Za-z][A-Za-z0-9()\\-/+ .]{0,100}?)",
    "\\s+",
    "(-?\\d+(?:[.,]\\d+)?)",
    "\\s*",
    `(${UNIT_PATTERN})`,
    "(?:",
      "\\s+",
      "(-?\\d+(?:[.,]\\d+)?)",
      "\\s*(?:-|–|—|to)\\s*",
      "(-?\\d+(?:[.,]\\d+)?)",
    ")?",
    "(?:",
      "\\s+",
      `(${FLAG_PATTERN})`,
      "(?=\\s|$)",
    ")?",
  ].join(
    ""
  );

const LINE_RESULT_PATTERN =
  new RegExp(
    `^\\s*${RESULT_PATTERN_SOURCE}\\s*$`,
    "i"
  );

const FLAT_RESULT_PATTERN =
  new RegExp(
    RESULT_PATTERN_SOURCE,
    "gi"
  );

function cleanRawName(
  rawName: string
): string {
  let cleaned =
    rawName
      .replace(
        /\bTest\s+Result\s+Units?\s+Reference\s+(?:interval|range)\s+Flag\b/gi,
        " "
      )
      .replace(
        /\bTest\s+Result\s+Units?\s+Reference\s+(?:interval|range)\b/gi,
        " "
      )
      .replace(
        /\bTest\s+Result\s+Units?\b/gi,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  /*
   * In flattened PDF text, a section title can appear before
   * the table header. Once the table header has been removed,
   * remove a remaining leading all-uppercase section prefix.
   *
   * Examples:
   *
   * GLYCEMIC MARKERS Hemoglobin A1c
   * LIPID PROFILE Total cholesterol
   * CHEMISTRY / METABOLIC PANEL Glucose
   */
  cleaned =
    cleaned.replace(
      /^(?:[A-Z][A-Z /&-]*[A-Z])\s+(?=[A-Z][a-z]|[A-Za-z]{1,6}\b)/,
      ""
    );

  return cleaned
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function isLikelyLabName(
  rawName: string
): boolean {
  if (
    !rawName ||
    rawName.length >
      100
  ) {
    return false;
  }

  const normalized =
    rawName
      .toLowerCase();

  const rejectedFragments = [
    "page ",
    "report id",
    "patient ",
    "collected ",
    "received ",
    "ordering source",
    "reference laboratory",
    "final report",
  ];

  return !rejectedFragments.some(
    (fragment) =>
      normalized.includes(
        fragment
      )
  );
}

function buildRowFromMatch(
  match: RegExpMatchArray | RegExpExecArray
): ClinicalLabReportRow | null {
  const rawName =
    cleanRawName(
      match[1] ??
        ""
    );

  const value =
    toNumber(
      match[2]
    );

  if (
    !isLikelyLabName(
      rawName
    ) ||
    value === null
  ) {
    return null;
  }

  return {
    rawName,

    value,

    unit:
      normalizeUnit(
        match[3]
      ),

    referenceLow:
      toNumber(
        match[4]
      ),

    referenceHigh:
      toNumber(
        match[5]
      ),

    flag:
      match[6]
        ?.trim() ??
      null,

    rawLine:
      match[0]
        .trim(),
  };
}

function buildRowIdentity(
  row: ClinicalLabReportRow
): string {
  return [
    row.rawName
      .trim()
      .toLocaleLowerCase(),

    row.value,

    row.unit ??
      "",
  ].join(
    "|"
  );
}

export function parseClinicalLabReportRows(
  text: string
): ClinicalLabReportRow[] {
  const rows:
    ClinicalLabReportRow[] =
    [];

  const seen =
    new Set<string>();

  function addRow(
    row: ClinicalLabReportRow | null
  ) {
    if (!row) {
      return;
    }

    const identity =
      buildRowIdentity(
        row
      );

    if (
      seen.has(
        identity
      )
    ) {
      return;
    }

    seen.add(
      identity
    );

    rows.push(
      row
    );
  }

  /*
   * Pass 1:
   * Preserve true PDF line boundaries whenever available.
   *
   * This prevents section headings from becoming part of
   * the marker name.
   */
  const lines =
    text
      .replace(
        /\r/g,
        ""
      )
      .split(
        "\n"
      )
      .map(
        (line) =>
          line
            .replace(
              /\s+/g,
              " "
            )
            .trim()
      )
      .filter(
        Boolean
      );

  for (
    const line
    of lines
  ) {
    const match =
      line.match(
        LINE_RESULT_PATTERN
      );

    if (
      match
    ) {
      addRow(
        buildRowFromMatch(
          match
        )
      );
    }
  }

  /*
   * Pass 2:
   * Flattened PDF fallback.
   *
   * Some PDF extractors preserve only page-level line breaks.
   * In that situation, find structured
   *
   *   name + value + unit [+ reference] [+ flag]
   *
   * sequences across the flattened page text.
   */
  const flattenedText =
    text
      .replace(
        /\r/g,
        " "
      )
      .replace(
        /\n+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  FLAT_RESULT_PATTERN.lastIndex =
    0;

  let match:
    RegExpExecArray | null;

  while (
    (
      match =
        FLAT_RESULT_PATTERN.exec(
          flattenedText
        )
    ) !== null
  ) {
    addRow(
      buildRowFromMatch(
        match
      )
    );
  }

  return rows;
}
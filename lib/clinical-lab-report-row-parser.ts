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
    "x10^9/l": "x10^9/L",
    "x10^12/l": "x10^12/L",
    "ml/min/1.73m²":
      "mL/min/1.73m²",
    "ml/min/1.73m2":
      "mL/min/1.73m²",
  };

  return (
    knownUnits[normalized] ??
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
  "(?:mg\\/dL|g\\/dL|ng\\/mL|pg\\/mL|mIU\\/L|mmol\\/L|µmol\\/L|umol\\/L|U\\/L|IU\\/L|%|mg\\/g|mg\\/L|µg\\/dL|ug\\/dL|ng\\/L|pg|fL|x10\\^9\\/L|x10\\^12\\/L|mL\\/min\\/1\\.73m(?:²|2))";

const LAB_ROW_PATTERN =
  new RegExp(
    [
      "^\\s*",
      "(.+?)",
      "\\s+",
      "(-?\\d+(?:[.,]\\d+)?)",
      "\\s*",
      `(${UNIT_PATTERN})?`,
      "\\s*",
      "(?:(-?\\d+(?:[.,]\\d+)?)",
      "\\s*(?:-|–|—|to)\\s*",
      "(-?\\d+(?:[.,]\\d+)?))?",
      "\\s*",
      "(H|L|HIGH|LOW|NORMAL|N|\\*)?",
      "\\s*$",
    ].join(
      ""
    ),
    "i"
  );

export function parseClinicalLabReportRows(
  text: string
): ClinicalLabReportRow[] {
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
          line.trim()
      )
      .filter(
        Boolean
      );

  const rows:
    ClinicalLabReportRow[] =
    [];

  for (
    const line
    of lines
  ) {
    const match =
      line.match(
        LAB_ROW_PATTERN
      );

    if (!match) {
      continue;
    }

    const rawName =
      match[1]
        ?.trim();

    const value =
      toNumber(
        match[2]
      );

    if (
      !rawName ||
      value === null
    ) {
      continue;
    }

    /*
     * Reject obvious headings / sentences.
     * A raw test label should remain reasonably short.
     */
    if (
      rawName.length >
      80
    ) {
      continue;
    }

    rows.push({
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
        line,
    });
  }

  return rows;
}
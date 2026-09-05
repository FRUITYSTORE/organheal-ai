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

  const knownUnits: Record<string, string> = {
    "mg/dl": "mg/dL",
    "g/dl": "g/dL",
    "ng/ml": "ng/mL",
    "ng/dl": "ng/dL",
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
    "ml/min/1.73m²": "mL/min/1.73m²",
    "ml/min/1.73m2": "mL/min/1.73m²",
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

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

const UNIT_PATTERN =
  "(?:mg\\/dL|g\\/dL|ng\\/mL|ng\\/dL|pg\\/mL|mIU\\/L|mmol\\/L|µmol\\/L|umol\\/L|U\\/L|IU\\/L|%|mg\\/g|mg\\/L|µg\\/dL|ug\\/dL|ng\\/L|pg|fL|x10\\^3\\/uL|x10\\^6\\/uL|x10\\^9\\/L|x10\\^12\\/L|mL\\/min\\/1\\.73m(?:²|2))";

const SECTION_PATTERN =
  "(?:CHEMISTRY\\s*\\/\\s*METABOLIC PANEL|" +
  "GLYCEMIC MARKERS|" +
  "LIPID PROFILE|" +
  "LIVER\\s*\\/\\s*PROTEIN PROFILE|" +
  "KIDNEY FUNCTION|" +
  "COMPLETE BLOOD COUNT|" +
  "IRON STUDIES|" +
  "THYROID\\s*\\/\\s*VITAMINS\\s*\\/\\s*INFLAMMATION|" +
  "URINALYSIS\\s*\\/\\s*KIDNEY RISK MARKERS|" +
  "ADDITIONAL TESTS)";

const TABLE_HEADER_PATTERN =
  /^(?:Test\s+Result\s+Units?\s+Reference\s+(?:interval|range)\s+Flag\s*)+/i;

const START_OF_RESULT_PATTERN =
  new RegExp(
    [
      "((?:[A-Za-z]|[0-9]{1,3}(?=-[A-Za-z]))[A-Za-z0-9()\\-/+ .]{0,120}?)",
      "\\s+",
      "(-?\\d+(?:[.,]\\d+)?)",
      "\\s*",
      `(${UNIT_PATTERN})`,
    ].join(""),
    "gi"
  );

type ParsedCandidate = {
  match: RegExpExecArray;
  rawName: string;
  carriedFlag: string | null;
};

function stripLeadingCarryTokens(
  value: string
): {
  text: string;
  carriedFlag: string | null;
} {
  let text =
    value
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  let carriedFlag:
    string | null =
    null;

  /*
   * These tokens usually belong to the PREVIOUS result
   * after PDF flattening:
   *
   * fasting H Sodium
   * desirable H HDL cholesterol
   * male L Triglycerides
   * H Potassium - repeat
   */
  const carryMatch =
    text.match(
      /^(?:(?:fasting|desirable|male|female)\s+)?(HIGH|LOW|NORMAL|BORDERLINE|H|L|N|\*)\s+(.+)$/i
    );

  if (
    carryMatch
  ) {
    carriedFlag =
      carryMatch[1]
        .toUpperCase();

    text =
      carryMatch[2]
        .trim();
  }

  return {
    text,
    carriedFlag,
  };
}

function cleanRawName(
  rawName: string
): {
  rawName: string;
  carriedFlag: string | null;
} {
  const carry =
    stripLeadingCarryTokens(
      rawName
    );

  let cleaned =
    carry.text;

  /*
   * Remove report section prefixes even if there is prose or
   * a carried flag immediately before them.
   */
  const sectionRegex =
    new RegExp(
      `^.*?${SECTION_PATTERN}\\s+`,
      "i"
    );

  if (
    sectionRegex.test(
      cleaned
    )
  ) {
    cleaned =
      cleaned.replace(
        sectionRegex,
        ""
      );
  }

  /*
   * A section removal may expose the report table header,
   * so remove it AFTER section cleanup.
   */
  cleaned =
    cleaned
      .replace(
        TABLE_HEADER_PATTERN,
        ""
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  /*
   * Some flattened captures can contain the table header
   * without a recognizable section prefix.
   */
  cleaned =
    cleaned
      .replace(
        TABLE_HEADER_PATTERN,
        ""
      )
      .trim();

  return {
    rawName:
      cleaned,

    carriedFlag:
      carry.carriedFlag,
  };
}

function isLikelyLabName(
  rawName: string
): boolean {
  if (
    !rawName ||
    rawName.length >
      120
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
    "not for clinical care",
    "software validation",
  ];

  return !rejectedFragments.some(
    (fragment) =>
      normalized.includes(
        fragment
      )
  );
}

function parseReference(
  tail: string
): {
  referenceLow: number | null;
  referenceHigh: number | null;
  flag: string | null;
} {
  const normalized =
    tail
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  const rangeMatch =
    normalized.match(
      /^(-?\d+(?:[.,]\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:[.,]\d+)?)(?:\s+(?:fasting|desirable|male|female))?(?:\s+(HIGH|LOW|NORMAL|BORDERLINE|H|L|N|\*))?/i
    );

  if (
    rangeMatch
  ) {
    return {
      referenceLow:
        toNumber(
          rangeMatch[1]
        ),

      referenceHigh:
        toNumber(
          rangeMatch[2]
        ),

      flag:
        rangeMatch[3]
          ?.toUpperCase() ??
        null,
    };
  }

  const lessThanMatch =
    normalized.match(
      /^<=?\s*(-?\d+(?:[.,]\d+)?)(?:\s+(?:fasting|desirable|male|female))?(?:\s+(HIGH|LOW|NORMAL|BORDERLINE|H|L|N|\*))?/i
    );

  if (
    lessThanMatch
  ) {
    return {
      referenceLow:
        null,

      referenceHigh:
        toNumber(
          lessThanMatch[1]
        ),

      flag:
        lessThanMatch[2]
          ?.toUpperCase() ??
        null,
    };
  }

  const greaterThanMatch =
    normalized.match(
      /^>=?\s*(-?\d+(?:[.,]\d+)?)(?:\s+(?:fasting|desirable|male|female))?(?:\s+(HIGH|LOW|NORMAL|BORDERLINE|H|L|N|\*))?/i
    );

  if (
    greaterThanMatch
  ) {
    return {
      referenceLow:
        toNumber(
          greaterThanMatch[1]
        ),

      referenceHigh:
        null,

      flag:
        greaterThanMatch[2]
          ?.toUpperCase() ??
        null,
    };
  }

  const flagMatch =
    normalized.match(
      /^(?:fasting|desirable|male|female\s+)?(HIGH|LOW|NORMAL|BORDERLINE|H|L|N|\*)(?:\s|$)/i
    );

  return {
    referenceLow:
      null,

    referenceHigh:
      null,

    flag:
      flagMatch?.[1]
        ?.toUpperCase() ??
      null,
  };
}

export function parseClinicalLabReportRows(
  text: string
): ClinicalLabReportRow[] {
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

  const rawMatches:
    RegExpExecArray[] =
    [];

  START_OF_RESULT_PATTERN.lastIndex =
    0;

  let match:
    RegExpExecArray | null;

  while (
    (
      match =
        START_OF_RESULT_PATTERN.exec(
          flattenedText
        )
    ) !== null
  ) {
    rawMatches.push(
      match
    );
  }

  const candidates:
    ParsedCandidate[] =
    rawMatches.map(
      (rawMatch) => {
        const cleaned =
          cleanRawName(
            rawMatch[1] ??
              ""
          );

        return {
          match:
            rawMatch,

          rawName:
            cleaned.rawName,

          carriedFlag:
            cleaned.carriedFlag,
        };
      }
    );

  const rows:
    ClinicalLabReportRow[] =
    [];

  for (
    let index = 0;
    index <
    candidates.length;
    index += 1
  ) {
    const current =
      candidates[index];

    const next =
      candidates[
        index + 1
      ];

    const value =
      toNumber(
        current
          .match[2]
      );

    if (
      value === null ||
      !isLikelyLabName(
        current.rawName
      )
    ) {
      continue;
    }

    const currentEnd =
      current.match.index +
      current.match[0].length;

    const nextStart =
      next?.match.index ??
      flattenedText.length;

    const tail =
      flattenedText.slice(
        currentEnd,
        nextStart
      );

    const reference =
      parseReference(
        tail
      );

    /*
     * If the flattened parser consumed the previous result's
     * flag as the beginning of the next marker, transfer that
     * flag back to the current result.
     */
    const flag =
      reference.flag ??
      next?.carriedFlag ??
      null;

    rows.push({
      rawName:
        current.rawName,

      value,

      unit:
        normalizeUnit(
          current
            .match[3]
        ),

      referenceLow:
        reference.referenceLow,

      referenceHigh:
        reference.referenceHigh,

      flag,

      rawLine:
        flattenedText
          .slice(
            current.match.index,
            nextStart
          )
          .trim(),
    });
  }

  return rows;
}
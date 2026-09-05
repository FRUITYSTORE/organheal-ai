export type CanonicalClinicalLabMarker = {
  rawName: string;
  canonicalName: string;
  confidence:
    | "high"
    | "medium"
    | "low";
};

function normalizeName(
  name: string
): string {
  return name
    .trim()
    .toLocaleLowerCase()
    .replace(
      /[-_/]+/g,
      " "
    )
    .replace(
      /[^a-z0-9%+\-\s]/gi,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function stripCommonResultQualifier(
  normalizedName: string
): string {
  return normalizedName
    .replace(
      /\b(?:initial|repeat|repeated|recheck|rechecked|first|second|baseline)\b/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

const canonicalAliases: Record<
  string,
  string[]
> = {
  HbA1c: [
    "hba1c",
    "hb a1c",
    "hemoglobin a1c",
    "glycated hemoglobin",
    "glycosylated hemoglobin",
  ],

  Glucose: [
    "glucose",
    "blood glucose",
    "fasting glucose",
  ],

  "Total Cholesterol": [
    "total cholesterol",
    "cholesterol total",
  ],

LDL: [
  "ldl",
  "ldl cholesterol",
  "ldl cholesterol calculated",
  "ldl cholesterol - calculated",
  "low density lipoprotein",
],

  HDL: [
    "hdl",
    "hdl cholesterol",
    "high density lipoprotein",
  ],

  Triglycerides: [
    "triglycerides",
    "triglyceride",
    "tg",
  ],

  TSH: [
  "tsh",
  "thyroid stimulating hormone",
],

"Free T4": [
  "free t4",
  "free thyroxine",
],

RBC: [
  "rbc",
  "rbc count",
  "red blood cell count",
],

WBC: [
  "wbc",
  "wbc count",
  "white blood cell count",
],

"Non-HDL Cholesterol": [
  "non hdl cholesterol",
  "non-hdl cholesterol",
],

  Creatinine: [
    "creatinine",
    "serum creatinine",
  ],

  eGFR: [
    "egfr",
    "gfr",
    "estimated glomerular filtration rate",
    "glomerular filtration rate",
  ],

  ALT: [
    "alt",
    "alanine aminotransferase",
  ],

  AST: [
    "ast",
    "aspartate aminotransferase",
  ],

  Ferritin: [
    "ferritin",
    "serum ferritin",
  ],

  "Vitamin D": [
  "vitamin d",
  "25 oh vitamin d",
  "25 hydroxy vitamin d",
  "25-oh vitamin d",
],

  "Vitamin B12": [
    "vitamin b12",
    "b12",
    "cobalamin",
  ],

  Potassium: [
    "potassium",
    "serum potassium",
    "k",
  ],

  "hs-CRP": [
    "hs crp",
    "high sensitivity crp",
    "high sensitivity c reactive protein",
  ],

  "Urine ACR": [
    "urine acr",
    "urine albumin creatinine ratio",
    "albumin creatinine ratio",
    "urine albumin to creatinine ratio",
  ],

  MCV: [
    "mcv",
    "mean corpuscular volume",
  ],

  MCH: [
    "mch",
    "mean corpuscular hemoglobin",
  ],

  "Serum Iron": [
    "serum iron",
    "iron",
  ],

  "Transferrin Saturation": [
    "transferrin saturation",
    "transferrin saturation percent",
    "tsat",
  ],

  Hemoglobin: [
    "hemoglobin",
    "haemoglobin",
    "hb",
  ],
};

const aliasLookup =
  Object.entries(
    canonicalAliases
  ).flatMap(
    (
      [
        canonicalName,
        aliases,
      ]
    ) =>
      aliases.map(
        (alias) => ({
          canonicalName,

          alias:
            normalizeName(
              alias
            ),
        })
      )
  );

function findCanonicalMatch(
  normalizedName: string
) {
  return aliasLookup.find(
    (entry) =>
      entry.alias ===
      normalizedName
  );
}

export function normalizeClinicalLabMarkerName(
  rawName: string
): CanonicalClinicalLabMarker {
  const normalizedRawName =
    normalizeName(
      rawName
    );

  const exactMatch =
    findCanonicalMatch(
      normalizedRawName
    );

  if (
    exactMatch
  ) {
    return {
      rawName,

      canonicalName:
        exactMatch
          .canonicalName,

      confidence:
        "high",
    };
  }

  /*
   * Some reports distinguish repeated measurements by
   * appending a qualifier to the marker name:
   *
   * Potassium - initial
   * Potassium - repeat
   *
   * The qualifier belongs to the evidence event, not to
   * the biological marker identity.
   */
  const normalizedWithoutQualifier =
    stripCommonResultQualifier(
      normalizedRawName
    );

  if (
    normalizedWithoutQualifier !==
    normalizedRawName
  ) {
    const qualifiedMatch =
      findCanonicalMatch(
        normalizedWithoutQualifier
      );

    if (
      qualifiedMatch
    ) {
      return {
        rawName,

        canonicalName:
          qualifiedMatch
            .canonicalName,

        confidence:
          "high",
      };
    }
  }

  /*
   * Keep an unknown but structurally valid lab row instead
   * of discarding it. This is essential for forward
   * compatibility with new laboratories and test names.
   */
  return {
    rawName,

    canonicalName:
      rawName.trim(),

    confidence:
      "low",
  };
}
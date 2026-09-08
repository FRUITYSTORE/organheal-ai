import PDFParser from "pdf2json";
import mammoth from "mammoth";
import ExcelJS from "exceljs";
import sharp from "sharp";

import {
  parse as parseCsv,
} from "csv-parse/sync";

import {
  XMLParser,
} from "fast-xml-parser";

import {
  resolveReportFileCapability,
  type ReportIngestionKind,
} from "@/lib/report-ingestion/report-file-capabilities";

export type ExtractedReportFileType =
  Exclude<
    ReportIngestionKind,
    "medical-imaging" |
    "planned"
  >;

export type ExtractReportTextInput = {
  buffer:
    Buffer;

  fileName:
    string;

  mimeType?:
    string | null;
};

export type ExtractReportTextResult = {
  fileType:
    ExtractedReportFileType;

  text:
    string;
};

function cleanExtractedText(
  value:
    string
): string {
  return value
    .replace(
      /^\uFEFF/,
      ""
    )
    .replace(
      /\r\n?/g,
      "\n"
    )
    .replace(
      /[ \t]+\n/g,
      "\n"
    )
    .replace(
      /\n{4,}/g,
      "\n\n"
    )
    .trim();
}

function safeDecodePdfText(
  text:
    string
): string {
  try {
    return decodeURIComponent(
      text
    );
  } catch {
    return text;
  }
}

function extractTextFromPdfBuffer(
  buffer:
    Buffer
): Promise<string> {
  if (
    buffer.length <
      5 ||
    buffer
      .subarray(
        0,
        5
      )
      .toString(
        "ascii"
      ) !==
      "%PDF-"
  ) {
    throw new Error(
      "The uploaded file does not contain a valid PDF signature."
    );
  }

  return new Promise(
    (
      resolve,
      reject
    ) => {
      const parser =
        new PDFParser();

      parser.on(
        "pdfParser_dataError",
        (
          errorData
        ) => {
          reject(
            errorData instanceof Error
              ? errorData
              : errorData.parserError ||
                  new Error(
                    "PDF parsing failed."
                  )
          );
        }
      );

      parser.on(
        "pdfParser_dataReady",
        (
          pdfData
        ) => {
          try {
            const text =
              pdfData.Pages
                .map(
                  (
                    page
                  ) =>
                    page.Texts
                      .map(
                        (
                          textItem
                        ) =>
                          safeDecodePdfText(
                            textItem.R
                              .map(
                                (
                                  item
                                ) =>
                                  item.T
                              )
                              .join(
                                " "
                              )
                          )
                      )
                      .join(
                        " "
                      )
                )
                .join(
                  "\n\n"
                );

            resolve(
              text
            );
          } catch (
            error
          ) {
            reject(
              error
            );
          }
        }
      );

      parser.parseBuffer(
        buffer
      );
    }
  );
}

function decodeHtmlEntities(
  value:
    string
): string {
  return value
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&quot;/gi,
      "\""
    )
    .replace(
      /&#39;/gi,
      "'"
    );
}

function stripInlineHtml(
  value:
    string
): string {
  return decodeHtmlEntities(
    value
      .replace(
        /<br\s*\/?>/gi,
        " "
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function convertHtmlToStructuredText(
  html:
    string
): string {
  let workingHtml =
    html.replace(
      /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi,
      (
        _match,
        rowHtml:
          string
      ) => {
        const cells:
          string[] = [];

        const cellPattern =
          /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;

        let cellMatch:
          RegExpExecArray | null;

        while (
          (
            cellMatch =
              cellPattern.exec(
                rowHtml
              )
          ) !==
          null
        ) {
          cells.push(
            stripInlineHtml(
              cellMatch[1] ??
              ""
            )
          );
        }

        return cells.length >
          0
          ? `\n${cells.join(
              "\t"
            )}\n`
          : "\n";
      }
    );

  workingHtml =
    workingHtml
      .replace(
        /<br\s*\/?>/gi,
        "\n"
      )
      .replace(
        /<\/p>/gi,
        "\n"
      )
      .replace(
        /<\/li>/gi,
        "\n"
      )
      .replace(
        /<li\b[^>]*>/gi,
        "• "
      )
      .replace(
        /<[^>]+>/g,
        " "
      );

  return decodeHtmlEntities(
    workingHtml
  );
}

async function extractTextFromDocxBuffer(
  buffer:
    Buffer
): Promise<string> {
  if (
    buffer.length <
      4 ||
    buffer[0] !==
      0x50 ||
    buffer[1] !==
      0x4b
  ) {
    throw new Error(
      "The uploaded file does not contain a valid DOCX container."
    );
  }

  const result =
    await mammoth
      .convertToHtml({
        buffer,
      });

  return convertHtmlToStructuredText(
    result.value
  );
}

function decodeTextBuffer(
  buffer:
    Buffer
): string {
  if (
    buffer.length >=
      2 &&
    buffer[0] ===
      0xff &&
    buffer[1] ===
      0xfe
  ) {
    return buffer
      .subarray(
        2
      )
      .toString(
        "utf16le"
      );
  }

  if (
    buffer.length >=
      2 &&
    buffer[0] ===
      0xfe &&
    buffer[1] ===
      0xff
  ) {
    const swapped =
      Buffer.alloc(
        buffer.length -
        2
      );

    for (
      let index =
        2;
      index +
        1 <
      buffer.length;
      index +=
        2
    ) {
      swapped[
        index -
        2
      ] =
        buffer[
          index +
          1
        ];

      swapped[
        index -
        1
      ] =
        buffer[
          index
        ];
    }

    return swapped.toString(
      "utf16le"
    );
  }

  return buffer.toString(
    "utf8"
  );
}

function extractTextFromRtfBuffer(
  buffer:
    Buffer
): string {
  let value =
    decodeTextBuffer(
      buffer
    );

  if (
    !value
      .trimStart()
      .startsWith(
        "{\\rtf"
      )
  ) {
    throw new Error(
      "The uploaded file does not appear to be a valid RTF document."
    );
  }

  value =
    value
      .replace(
        /\\par[d]?\b/g,
        "\n"
      )
      .replace(
        /\\line\b/g,
        "\n"
      )
      .replace(
        /\\tab\b/g,
        "\t"
      )
      .replace(
        /\\u(-?\d+)\??/g,
        (
          _match,
          rawCode:
            string
        ) => {
          let code =
            Number(
              rawCode
            );

          if (
            code <
            0
          ) {
            code +=
              65536;
          }

          return String.fromCharCode(
            code
          );
        }
      )
      .replace(
        /\\'([0-9a-fA-F]{2})/g,
        (
          _match,
          hex:
            string
        ) =>
          Buffer.from(
            hex,
            "hex"
          ).toString(
            "latin1"
          )
      )
      .replace(
        /\\[a-zA-Z]+-?\d* ?/g,
        ""
      )
      .replace(
        /[{}]/g,
        ""
      );

  return value;
}

function formatStructuredScalar(
  value:
    unknown
): string {
  if (
    value ===
    null
  ) {
    return "null";
  }

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value
    );
  }

  return "";
}

function flattenStructuredValue(
  root:
    unknown
): string {
  const lines:
    string[] = [];

  const stack:
    Array<{
      path:
        string;

      value:
        unknown;

      depth:
        number;
    }> = [
      {
        path:
          "root",

        value:
          root,

        depth:
          0,
      },
    ];

  const MAX_DEPTH =
    30;

  const MAX_LINES =
    50_000;

  while (
    stack.length >
      0 &&
    lines.length <
      MAX_LINES
  ) {
    const current =
      stack.pop();

    if (
      !current
    ) {
      break;
    }

    if (
      current.depth >
      MAX_DEPTH
    ) {
      lines.push(
        `${current.path}: [nested data omitted]`
      );

      continue;
    }

    if (
      Array.isArray(
        current.value
      )
    ) {
      for (
        let index =
          current.value.length -
          1;
        index >=
        0;
        index -=
          1
      ) {
        stack.push({
          path:
            `${current.path}[${index}]`,

          value:
            current.value[
              index
            ],

          depth:
            current.depth +
            1,
        });
      }

      continue;
    }

    if (
      current.value &&
      typeof current.value ===
        "object"
    ) {
      const entries =
        Object.entries(
          current.value as
            Record<
              string,
              unknown
            >
        );

      for (
        let index =
          entries.length -
          1;
        index >=
        0;
        index -=
          1
      ) {
        const [
          key,
          value,
        ] =
          entries[
            index
          ]!;

        stack.push({
          path:
            current.path ===
              "root"
              ? key
              : `${current.path}.${key}`,

          value,

          depth:
            current.depth +
            1,
        });
      }

      continue;
    }

    lines.push(
      `${current.path}: ${formatStructuredScalar(
        current.value
      )}`
    );
  }

  return lines.join(
    "\n"
  );
}

function extractTextFromJsonBuffer(
  buffer:
    Buffer
): string {
  const text =
    decodeTextBuffer(
      buffer
    )
      .replace(
        /^\uFEFF/,
        ""
      );

  const parsed =
    JSON.parse(
      text
    ) as unknown;

  return flattenStructuredValue(
    parsed
  );
}

function extractTextFromXmlBuffer(
  buffer:
    Buffer
): string {
  const text =
    decodeTextBuffer(
      buffer
    );

  const parser =
    new XMLParser({
      ignoreAttributes:
        false,

      attributeNamePrefix:
        "@",

      trimValues:
        true,

      parseTagValue:
        false,

      parseAttributeValue:
        false,
    });

  const parsed =
    parser.parse(
      text
    ) as unknown;

  return flattenStructuredValue(
    parsed
  );
}

function extractTextFromCsvBuffer(
  buffer:
    Buffer
): string {
  const text =
    decodeTextBuffer(
      buffer
    );

  const records =
    parseCsv(
      text,
      {
        bom:
          true,

        relax_column_count:
          true,

        skip_empty_lines:
          true,

        relax_quotes:
          true,
      }
    ) as unknown[][];

  return records
    .map(
      (
        row
      ) =>
        row
          .map(
            (
              value
            ) =>
              value ===
                null ||
              value ===
                undefined
                ? ""
                : String(
                    value
                  )
          )
          .join(
            "\t"
          )
    )
    .join(
      "\n"
    );
}

function spreadsheetCellToText(
  value:
    ExcelJS.CellValue
): string {
  if (
    value ===
    null ||
    value ===
    undefined
  ) {
    return "";
  }

  if (
    value instanceof
    Date
  ) {
    return value
      .toISOString();
  }

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value
    );
  }

  if (
    typeof value ===
      "object"
  ) {
    if (
      "result" in
        value &&
      value.result !==
        undefined &&
      value.result !==
        null
    ) {
      return String(
        value.result
      );
    }

    if (
      "text" in
        value &&
      typeof value.text ===
        "string"
    ) {
      return value.text;
    }

    if (
      "richText" in
        value &&
      Array.isArray(
        value.richText
      )
    ) {
      return value.richText
        .map(
          (
            item
          ) =>
            item.text
        )
        .join(
          ""
        );
    }
  }

  return String(
    value
  );
}

async function extractTextFromXlsxBuffer(
  buffer:
    Buffer
): Promise<string> {
  if (
    buffer.length <
      4 ||
    buffer[0] !==
      0x50 ||
    buffer[1] !==
      0x4b
  ) {
    throw new Error(
      "The uploaded file does not contain a valid XLSX container."
    );
  }

  const workbook =
  new ExcelJS.Workbook();

await workbook.xlsx.load(
  buffer as unknown as Parameters<
    typeof workbook.xlsx.load
  >[0]
);

  const sections:
    string[] = [];

  for (
    const worksheet of
    workbook.worksheets
  ) {
    const lines:
      string[] = [];

    worksheet.eachRow(
      {
        includeEmpty:
          false,
      },
      (
        row
      ) => {
        const values:
          string[] = [];

        row.eachCell(
          {
            includeEmpty:
              true,
          },
          (
            cell
          ) => {
            values.push(
              spreadsheetCellToText(
                cell.value
              )
            );
          }
        );

        lines.push(
          values.join(
            "\t"
          )
        );
      }
    );

    if (
      lines.length >
      0
    ) {
      sections.push(
        [
          `Sheet: ${worksheet.name}`,
          ...lines,
        ].join(
          "\n"
        )
      );
    }
  }

  return sections.join(
    "\n\n"
  );
}

async function extractTextFromImageBuffer(
  buffer:
    Buffer
): Promise<string> {
  const apiKey =
    process.env
      .OCR_SPACE_API_KEY;

  if (
    !apiKey
  ) {
    throw new Error(
      "OCR image extraction is not configured on the server."
    );
  }

  const normalizedImage =
    await sharp(
      buffer,
      {
        failOn:
          "error",
      }
    )
      .rotate()
      .jpeg({
        quality:
          95,
      })
      .toBuffer();

  const formData =
    new FormData();

  formData.append(
    "base64Image",
    `data:image/jpeg;base64,${normalizedImage.toString(
      "base64"
    )}`
  );

  formData.append(
    "language",
    "eng"
  );

  formData.append(
    "isOverlayRequired",
    "false"
  );

  formData.append(
    "OCREngine",
    "2"
  );

  const response =
    await fetch(
      "https://api.ocr.space/parse/image",
      {
        method:
          "POST",

        headers: {
          apikey:
            apiKey,
        },

        body:
          formData,
      }
    );

  const data =
    (await response.json()) as {
      IsErroredOnProcessing?:
        boolean;

      ErrorMessage?:
        string[];

      ParsedResults?:
        Array<{
          ParsedText?:
            string;
        }>;
    };

  if (
    !response.ok ||
    data
      .IsErroredOnProcessing
  ) {
    throw new Error(
      data
        .ErrorMessage?.[0] ||
      "Image OCR failed."
    );
  }

  return (
    data
      .ParsedResults?.[0]
      ?.ParsedText ??
    ""
  );
}

export async function extractReportTextFromBuffer({
  buffer,
  fileName,
  mimeType,
}: ExtractReportTextInput): Promise<
  ExtractReportTextResult
> {
  const capability =
    resolveReportFileCapability({
      fileName,
      mimeType,
    });

  if (
    !capability ||
    !capability
      .uploadEnabled ||
    !capability
      .analysisEnabled ||
    capability.kind ===
      "medical-imaging" ||
    capability.kind ===
      "planned"
  ) {
    throw new Error(
      "Unsupported report file type."
    );
  }

  let rawText:
    string;

  switch (
    capability.kind
  ) {
    case "pdf":
      rawText =
        await extractTextFromPdfBuffer(
          buffer
        );
      break;

    case "image":
      rawText =
        await extractTextFromImageBuffer(
          buffer
        );
      break;

    case "docx":
      rawText =
        await extractTextFromDocxBuffer(
          buffer
        );
      break;

    case "text":
      rawText =
        decodeTextBuffer(
          buffer
        );
      break;

    case "rtf":
      rawText =
        extractTextFromRtfBuffer(
          buffer
        );
      break;

    case "csv":
      rawText =
        extractTextFromCsvBuffer(
          buffer
        );
      break;

    case "xlsx":
      rawText =
        await extractTextFromXlsxBuffer(
          buffer
        );
      break;

    case "json":
      rawText =
        extractTextFromJsonBuffer(
          buffer
        );
      break;

    case "xml":
      rawText =
        extractTextFromXmlBuffer(
          buffer
        );
      break;

    default:
      throw new Error(
        "Unsupported report extraction capability."
      );
  }

  const text =
    cleanExtractedText(
      rawText
    );

  if (
    !text
  ) {
    throw new Error(
      "No readable content was found in this report."
    );
  }

  return {
    fileType:
      capability.kind,

    text,
  };
}
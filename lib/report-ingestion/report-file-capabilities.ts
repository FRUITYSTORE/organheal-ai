export type ReportIngestionKind =
  | "pdf"
  | "image"
  | "docx"
  | "text"
  | "rtf"
  | "csv"
  | "xlsx"
  | "json"
  | "xml"
  | "medical-imaging"
  | "planned";

export type ReportFileCapability = {
  id:
    string;

  kind:
    ReportIngestionKind;

  extensions:
    readonly string[];

  mimeTypes:
    readonly string[];

  uploadEnabled:
    boolean;

  analysisEnabled:
    boolean;

  plannedReason?:
    string;
};

export type ReportFileDescriptor = {
  fileName:
    string;

  mimeType?:
    string | null;
};

export const REPORT_FILE_CAPABILITIES:
  readonly ReportFileCapability[] = [
  {
    id:
      "pdf",

    kind:
      "pdf",

    extensions: [
      ".pdf",
    ],

    mimeTypes: [
      "application/pdf",
    ],

    uploadEnabled:
      true,

    analysisEnabled:
      true,
  },

  {
    id:
      "raster-image",

    kind:
      "image",

    extensions: [
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".bmp",
    ],

    mimeTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/bmp",
    ],

    uploadEnabled:
      true,

    analysisEnabled:
      true,
  },

  {
    id:
      "docx",

    kind:
      "docx",

    extensions: [
      ".docx",
    ],

    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],

    uploadEnabled:
      true,

    analysisEnabled:
      true,
  },

  {
    id:
      "plain-text",

    kind:
      "text",

    extensions: [
      ".txt",
      ".md",
    ],

    mimeTypes: [
      "text/plain",
      "text/markdown",
    ],

    uploadEnabled:
      true,

    analysisEnabled:
      true,
  },

  {
    id:
      "rtf",

    kind:
      "rtf",

    extensions: [
      ".rtf",
    ],

    mimeTypes: [
      "application/rtf",
      "text/rtf",
    ],

    uploadEnabled:
      true,

    analysisEnabled:
      true,
  },

  {
    id:
      "csv",

    kind:
      "csv",

    extensions: [
      ".csv",
    ],

    mimeTypes: [
      "text/csv",
      "application/csv",
    ],

    uploadEnabled:
      true,

    analysisEnabled:
      true,
  },

  {
    id:
      "xlsx",

    kind:
      "xlsx",

    extensions: [
      ".xlsx",
    ],

    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],

    uploadEnabled:
      true,

    analysisEnabled:
      true,
  },

  {
    id:
      "json",

    kind:
      "json",

    extensions: [
      ".json",
    ],

    mimeTypes: [
      "application/json",
      "text/json",
    ],

    uploadEnabled:
      true,

    analysisEnabled:
      true,
  },

  {
    id:
      "xml",

    kind:
      "xml",

    extensions: [
      ".xml",
    ],

    mimeTypes: [
      "application/xml",
      "text/xml",
    ],

    uploadEnabled:
      true,

    analysisEnabled:
      true,
  },

  {
    id:
      "legacy-word",

    kind:
      "planned",

    extensions: [
      ".doc",
    ],

    mimeTypes: [
      "application/msword",
    ],

    uploadEnabled:
      false,

    analysisEnabled:
      false,

    plannedReason:
      "Legacy DOC ingestion requires a separate safe conversion pipeline.",
  },

  {
    id:
      "legacy-excel",

    kind:
      "planned",

    extensions: [
      ".xls",
    ],

    mimeTypes: [
      "application/vnd.ms-excel",
    ],

    uploadEnabled:
      false,

    analysisEnabled:
      false,

    plannedReason:
      "Legacy XLS ingestion requires a separate safe conversion pipeline.",
  },

  {
    id:
      "advanced-image",

    kind:
      "planned",

    extensions: [
      ".heic",
      ".heif",
      ".tif",
      ".tiff",
    ],

    mimeTypes: [
      "image/heic",
      "image/heif",
      "image/tiff",
    ],

    uploadEnabled:
      false,

    analysisEnabled:
      false,

    plannedReason:
      "Advanced image ingestion requires dedicated multi-frame and format validation.",
  },

  {
    id:
      "dicom",

    kind:
      "medical-imaging",

    extensions: [
      ".dcm",
      ".dicom",
    ],

    mimeTypes: [
      "application/dicom",
    ],

    uploadEnabled:
      false,

    analysisEnabled:
      false,

    plannedReason:
      "DICOM will use the dedicated OrganHeal Medical Imaging pipeline.",
  },

  {
    id:
      "nifti",

    kind:
      "medical-imaging",

    extensions: [
      ".nii.gz",
      ".nii",
    ],

    mimeTypes:
      [],

    uploadEnabled:
      false,

    analysisEnabled:
      false,

    plannedReason:
      "NIfTI will use the dedicated OrganHeal Medical Imaging pipeline.",
  },
] as const;

function normalizeMimeType(
  value:
    string | null | undefined
): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .split(
        ";"
      )[0] ??
    ""
  );
}

function resolveByExtension(
  fileName:
    string
): ReportFileCapability | null {
  const normalizedName =
    fileName
      .trim()
      .toLowerCase();

  const candidates =
    REPORT_FILE_CAPABILITIES
      .flatMap(
        (
          capability
        ) =>
          capability.extensions.map(
            (
              extension
            ) => ({
              capability,

              extension:
                extension.toLowerCase(),
            })
          )
      )
      .sort(
        (
          left,
          right
        ) =>
          right.extension.length -
          left.extension.length
      );

  return (
    candidates.find(
      (
        candidate
      ) =>
        normalizedName.endsWith(
          candidate.extension
        )
    )?.capability ??
    null
  );
}

function resolveByMimeType(
  mimeType:
    string | null | undefined
): ReportFileCapability | null {
  const normalizedMimeType =
    normalizeMimeType(
      mimeType
    );

  if (
    !normalizedMimeType
  ) {
    return null;
  }

  return (
    REPORT_FILE_CAPABILITIES.find(
      (
        capability
      ) =>
        capability.mimeTypes.some(
          (
            supportedMimeType
          ) =>
            supportedMimeType ===
            normalizedMimeType
        )
    ) ??
    null
  );
}

export function resolveReportFileCapability(
  descriptor:
    ReportFileDescriptor
): ReportFileCapability | null {
  return (
    resolveByExtension(
      descriptor.fileName
    ) ??
    resolveByMimeType(
      descriptor.mimeType
    )
  );
}

export function isSupportedReportFile(
  descriptor:
    ReportFileDescriptor
): boolean {
  const capability =
    resolveReportFileCapability(
      descriptor
    );

  return Boolean(
    capability
      ?.uploadEnabled &&
    capability
      .analysisEnabled
  );
}

export function getReportFileRejectionReason(
  descriptor:
    ReportFileDescriptor
): string {
  const capability =
    resolveReportFileCapability(
      descriptor
    );

  if (
    !capability
  ) {
    return "Unsupported file format.";
  }

  if (
    capability
      .plannedReason
  ) {
    return capability
      .plannedReason;
  }

  return "This file format is not enabled for analysis yet.";
}

const enabledCapabilities =
  REPORT_FILE_CAPABILITIES.filter(
    (
      capability
    ) =>
      capability.uploadEnabled &&
      capability.analysisEnabled
  );

export const REPORT_UPLOAD_ACCEPT_ATTRIBUTE =
  Array.from(
    new Set(
      enabledCapabilities.flatMap(
        (
          capability
        ) => [
          ...capability.extensions,
          ...capability.mimeTypes,
        ]
      )
    )
  ).join(
    ","
  );

export const REPORT_UPLOAD_SUPPORTED_EXTENSIONS_LABEL =
  Array.from(
    new Set(
      enabledCapabilities.flatMap(
        (
          capability
        ) =>
          capability.extensions.map(
            (
              extension
            ) =>
              extension
                .slice(
                  1
                )
                .toUpperCase()
          )
      )
    )
  ).join(
    ", "
  );
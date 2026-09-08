import type {
  AssistantSemanticReportReference,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-routing.types";

import type {
  UploadedReportSummary,
} from "@/lib/repositories/reports.repository";

export type AssistantReportReferenceResolutionStatus =
  | "resolved"
  | "partial"
  | "ambiguous"
  | "not-found"
  | "unsupported";

export type AssistantReportReferenceResolution = {
  status:
    AssistantReportReferenceResolutionStatus;

  reference:
    AssistantSemanticReportReference;

  reports:
    UploadedReportSummary[];

  requestedCount:
    number;

  resolvedCount:
    number;

  reason:
    string;
};

export type AssistantReportReferenceResolverInput = {
  userId:
    string;

  reference:
    AssistantSemanticReportReference;

  /**
   * Report already active in the authenticated
   * assistant conversation/runtime.
   *
   * It must still be verified against the
   * authenticated user's reports before use.
   */
  activeReportId?:
    number | null;
};

export type AssistantReportReferenceResolverDependencies = {
  getRecentReports: (
    userId:
      string,
    limit:
      number
  ) => Promise<
    UploadedReportSummary[]
  >;

  getReportsByIds: (
    userId:
      string,
    reportIds:
      number[]
  ) => Promise<
    UploadedReportSummary[]
  >;
};

export type AssistantReportReferenceResolver = {
  resolve: (
    input:
      AssistantReportReferenceResolverInput
  ) => Promise<
    AssistantReportReferenceResolution
  >;
};
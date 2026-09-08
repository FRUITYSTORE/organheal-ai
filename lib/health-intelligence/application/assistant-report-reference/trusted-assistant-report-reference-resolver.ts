import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  getRecentUploadedReports,
  getUploadedReportsByIds,
} from "@/lib/repositories/reports.repository";

import {
  createAssistantReportReferenceResolver,
} from "./assistant-report-reference-resolver.service";

import type {
  AssistantReportReferenceResolver,
} from "./assistant-report-reference.types";

/**
 * Creates a report resolver that can only access
 * report rows through the authenticated user's ID.
 *
 * The caller must provide the trusted server-side
 * Supabase client explicitly.
 *
 * No service-role or trusted credential is created
 * or exposed inside the conversational layer.
 */
export function createTrustedAssistantReportReferenceResolver(
  client:
    SupabaseClient
): AssistantReportReferenceResolver {
  return createAssistantReportReferenceResolver({
    getRecentReports:
      (
        userId,
        limit
      ) =>
        getRecentUploadedReports(
          userId,
          limit,
          client
        ),

    getReportsByIds:
      (
        userId,
        reportIds
      ) =>
        getUploadedReportsByIds(
          userId,
          reportIds,
          client
        ),
  });
}
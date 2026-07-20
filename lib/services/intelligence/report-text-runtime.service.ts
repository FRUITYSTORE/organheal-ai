import { supabase } from "@/lib/supabase";
import {
  getUploadedReportExtractedText,
} from "@/lib/repositories/reports.repository";

type LoadReportTextRuntimeInput = {
  userId: string;
  insightId: number;
  reportId: number | null;
  filePath: string | null | undefined;
  fileName: string | null | undefined;
};

export type LoadReportTextRuntimeResult = {
  extractedText: string | null;
  errorMessage: string | null;
  requiresLogin: boolean;
};

export async function loadReportTextRuntime({
  userId,
  insightId,
  reportId,
  filePath,
  fileName,
}: LoadReportTextRuntimeInput): Promise<LoadReportTextRuntimeResult> {
  let extractedText: string | null = null;

  if (reportId) {
    try {
      extractedText = await getUploadedReportExtractedText(
        userId,
        reportId
      );
    } catch (error) {
      console.error(
        "Could not load saved extracted report text",
        error
      );
      extractedText = null;
    }
  }

  if (extractedText && extractedText.trim().length >= 30) {
    return {
      extractedText: extractedText.trim(),
      errorMessage: null,
      requiresLogin: false,
    };
  }

  if (reportId && filePath) {
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        return {
          extractedText: null,
          errorMessage: "Your session expired. Please login again.",
          requiresLogin: true,
        };
      }

      const extractionResponse = await fetch("/api/extract-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          insightId,
          reportId,
          filePath,
          fileName,
        }),
      });

      const extractionResult = await extractionResponse.json();

      if (!extractionResponse.ok || !extractionResult.success) {
        return {
          extractedText: null,
          errorMessage:
            extractionResult.error || "PDF extraction failed.",
          requiresLogin: extractionResponse.status === 401,
        };
      }

      extractedText =
        typeof extractionResult.text === "string"
          ? extractionResult.text.trim()
          : null;
    } catch (error) {
      console.error("Extraction failed", error);

      return {
        extractedText: null,
        errorMessage: "Extraction failed.",
        requiresLogin: false,
      };
    }
  }

  if (!extractedText || extractedText.length < 30) {
    return {
      extractedText: null,
      errorMessage: "No readable report text was extracted yet.",
      requiresLogin: false,
    };
  }

  return {
    extractedText,
    errorMessage: null,
    requiresLogin: false,
  };
}
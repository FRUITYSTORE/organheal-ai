import {
  buildClinicalLabRowEvidence,
} from "@/lib/services/intelligence/clinical-lab-row-evidence.service";

import {
  saveReportEvidenceEvents,
  type ReportEvidenceEventInput,
} from "@/lib/repositories/report-evidence-events.repository";

function inferContextType(
  markerName: string,
  seenCounts: Map<string, number>
): ReportEvidenceEventInput["contextType"] {
  const key =
    markerName
      .trim()
      .toLocaleLowerCase();

  const currentCount =
    seenCounts.get(
      key
    ) ?? 0;

  seenCounts.set(
    key,
    currentCount + 1
  );

  return currentCount > 0
    ? "repeat"
    : "result";
}

export async function persistClinicalLabEvidenceEvents({
  userId,
  reportId,
  extractedText,
}: {
  userId: string;
  reportId: number;
  extractedText: string;
}): Promise<void> {
  const evidence =
    buildClinicalLabRowEvidence(
      extractedText
    );

  if (
    evidence.length === 0
  ) {
    return;
  }

  const seenCounts =
    new Map<
      string,
      number
    >();

  const events:
    ReportEvidenceEventInput[] =
    evidence.map(
      (
        item,
        index
      ) => ({
        userId,

        reportId,

        sequenceIndex:
          index,

        rawMarkerName:
          item.rawMarkerName,

        canonicalMarkerName:
          item.markerName,

        markerValue:
          item.markerValue,

        markerUnit:
          item.markerUnit,

        referenceLow:
          item.referenceLow,

        referenceHigh:
          item.referenceHigh,

        markerStatus:
          item.markerStatus,

        flag:
          null,

        rawLine:
          item.rawMarkerName,

        normalizationConfidence:
          item.normalizationConfidence,

        contextType:
          inferContextType(
            item.markerName,
            seenCounts
          ),
      })
    );

  await saveReportEvidenceEvents(
    events
  );
}
import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  PatientSummary,
} from "@/lib/models/patient";

import {
  buildWholeBodyClinicalKnowledge,
} from "@/lib/health-intelligence/builders/whole-body-clinical-knowledge.builder";

function createEmptyPatientSummary():
  PatientSummary {
  return {
    profile:
      null,

    assessments:
      [],

    latestCheckIn:
      null,

    recentCheckIns:
      [],

    uploadedReports:
      [],

    healthInsights:
      [],

    generatedResults:
      [],

    historyItems:
      [],
  };
}

function createOphthalmologyPatientSummary():
  PatientSummary {
  return {
    ...createEmptyPatientSummary(),

    uploadedReports: [
      {
        id:
          101,

        file_name:
          "retina-screening-report.pdf",

        file_path:
          "user/reports/retina-screening-report.pdf",

        report_type:
          "ophthalmology",

        extraction_status:
          "Completed",

        extracted_text:
          "Retinal screening report text.",

        created_at:
          "2026-08-01T08:00:00.000Z",

        extracted_at:
          "2026-08-01T08:02:00.000Z",
      },
    ],

    healthInsights: [
      {
        id:
          501,

        report_id:
          101,

        insight_title:
          "Retinal screening review",

        summary:
          "A generated review is available for the retinal screening report.",

        key_findings:
          "Review documented retinal findings with the treating clinician.",

        recommendations:
          "Continue the recommended ophthalmology follow-up.",

        doctor_brief:
          "Retinal screening report reviewed.",

        ai_status:
          "Generated",

        risk_level:
          "Moderate",

        next_best_action:
          "Discuss the result with an ophthalmology professional.",

        report_type:
          "ophthalmology",

        created_at:
          "2026-08-01T08:05:00.000Z",
      },
    ],
  };
}

describe(
  "Whole-body clinical intelligence",
  () => {
    describe(
      "Knowledge Builder",
      () => {
        it(
          "returns an insufficient clarify-first result when no patient evidence is available",
          () => {
            const knowledge =
              buildWholeBodyClinicalKnowledge(
                createEmptyPatientSummary()
              );

            expect(
              knowledge.nodes
            ).toEqual(
              []
            );

            expect(
              knowledge.relationships
            ).toEqual(
              []
            );

            expect(
              knowledge.coveredDomains
            ).toEqual(
              []
            );

            expect(
              knowledge.evidenceSufficiency
            ).not.toBeNull();

            expect(
              knowledge
                .evidenceSufficiency
                ?.status
            ).toBe(
              "insufficient"
            );

            expect(
              knowledge
                .evidenceSufficiency
                ?.reasoningPermission
            ).toBe(
              "clarify-first"
            );

            expect(
              knowledge
                .evidenceSufficiency
                ?.completenessScore
            ).toBe(
              0
            );

            expect(
              knowledge
                .evidenceSufficiency
                ?.requiresClarification
            ).toBe(
              true
            );
          }
        );

        it(
          "supports a whole-body domain outside the original six organ pages",
          () => {
            const knowledge =
              buildWholeBodyClinicalKnowledge(
                createOphthalmologyPatientSummary()
              );

            expect(
              knowledge.coveredDomains
            ).toContain(
              "ophthalmology"
            );

            expect(
              knowledge.nodes.some(
                (node) =>
                  node.domains.includes(
                    "ophthalmology"
                  )
              )
            ).toBe(
              true
            );

            expect(
              knowledge.nodes.some(
                (node) =>
                  node.id ===
                  "node:report:101"
              )
            ).toBe(
              true
            );

            expect(
              knowledge.nodes.some(
                (node) =>
                  node.id ===
                  "node:insight:501"
              )
            ).toBe(
              true
            );
          }
        );
      }
    );

    describe(
      "Clinical Relationship Engine",
      () => {
        it(
          "creates a direct report-to-insight relationship when report_id matches",
          () => {
            const knowledge =
              buildWholeBodyClinicalKnowledge(
                createOphthalmologyPatientSummary()
              );

            expect(
              knowledge.relationships
            ).toHaveLength(
              1
            );

            expect(
              knowledge.relationships[0]
            ).toMatchObject({
              sourceNodeId:
                "node:report:101",

              targetNodeId:
                "node:insight:501",

              type:
                "direct",

              confidence:
                "high",

              clinicalSignificance:
                "important",

              contradictingEvidenceIds:
                [],

              missingEvidence:
                [],
            });

            expect(
              knowledge
                .relationships[0]
                .supportingEvidenceIds
            ).toEqual(
              expect.arrayContaining([
                "evidence:report:101",
                "evidence:insight:501",
              ])
            );
          }
        );

        it(
          "does not create a relationship when the referenced report is absent",
          () => {
            const patient =
              createOphthalmologyPatientSummary();

            const patientWithoutReport:
              PatientSummary = {
              ...patient,

              uploadedReports:
                [],

              healthInsights:
                patient.healthInsights.map(
                  (insight) => ({
                    ...insight,

                    report_id:
                      999,
                  })
                ),
            };

            const knowledge =
              buildWholeBodyClinicalKnowledge(
                patientWithoutReport
              );

            expect(
              knowledge.relationships
            ).toEqual(
              []
            );

            expect(
              knowledge.nodes.some(
                (node) =>
                  node.id ===
                  "node:insight:501"
              )
            ).toBe(
              true
            );
          }
        );
      }
    );

    it(
  "connects separate reports from the same clinical domain as longitudinal context",
  () => {
    const patient:
      PatientSummary = {
      ...createEmptyPatientSummary(),

      uploadedReports: [
        {
          id: 201,

          file_name:
            "lipid-panel-january.pdf",

          file_path:
            "user/reports/lipid-panel-january.pdf",

          report_type:
            "cardiovascular",

          extraction_status:
            "Completed",

          extracted_text:
            "January lipid panel.",

          created_at:
            "2026-01-10T08:00:00.000Z",

          extracted_at:
            "2026-01-10T08:02:00.000Z",
        },

        {
          id: 202,

          file_name:
            "lipid-panel-august.pdf",

          file_path:
            "user/reports/lipid-panel-august.pdf",

          report_type:
            "cardiovascular",

          extraction_status:
            "Completed",

          extracted_text:
            "August lipid panel.",

          created_at:
            "2026-08-10T08:00:00.000Z",

          extracted_at:
            "2026-08-10T08:02:00.000Z",
        },
      ],
    };

    const knowledge =
      buildWholeBodyClinicalKnowledge(
        patient
      );

    expect(
      knowledge.relationships.some(
        (relationship) =>
          relationship.sourceNodeId ===
            "node:report:201" &&
          relationship.targetNodeId ===
            "node:report:202"
      )
    ).toBe(
      true
    );
  }
);

it(
  "does not create a temporal report relationship when report timing is unavailable",
  () => {
    const patient:
      PatientSummary = {
      ...createEmptyPatientSummary(),

      uploadedReports: [
        {
          id: 203,

          file_name:
            "cardiology-undated.pdf",

          file_path:
            "user/reports/cardiology-undated.pdf",

          report_type:
            "cardiovascular",

          extraction_status:
            "Completed",

          extracted_text:
            "Undated cardiovascular report.",

          created_at:
           "invalid-date",

          extracted_at:
            null,
        },

        {
          id: 204,

          file_name:
            "cardiology-august.pdf",

          file_path:
            "user/reports/cardiology-august.pdf",

          report_type:
            "cardiovascular",

          extraction_status:
            "Completed",

          extracted_text:
            "August cardiovascular report.",

          created_at:
            "2026-08-10T08:00:00.000Z",

          extracted_at:
            "2026-08-10T08:02:00.000Z",
        },
      ],
    };

    const knowledge =
      buildWholeBodyClinicalKnowledge(
        patient
      );

    expect(
      knowledge.relationships.some(
        (relationship) =>
          relationship.type ===
            "temporal" &&
          (
            relationship.sourceNodeId ===
              "node:report:203" ||
            relationship.targetNodeId ===
              "node:report:203"
          )
      )
    ).toBe(
      false
    );
  }
);

    describe(
      "Evidence Sufficiency Engine",
      () => {
        it(
          "raises structural completeness when evidence nodes and an explicit relationship exist",
          () => {
            const emptyKnowledge =
              buildWholeBodyClinicalKnowledge(
                createEmptyPatientSummary()
              );

            const connectedKnowledge =
              buildWholeBodyClinicalKnowledge(
                createOphthalmologyPatientSummary()
              );

            const emptySufficiency =
              emptyKnowledge
                .evidenceSufficiency;

            const connectedSufficiency =
              connectedKnowledge
                .evidenceSufficiency;

            expect(
              emptySufficiency
            ).not.toBeNull();

            expect(
              connectedSufficiency
            ).not.toBeNull();

            expect(
              connectedSufficiency
                ?.evidenceNodeCount
            ).toBe(
              2
            );

            expect(
              connectedSufficiency
                ?.relationshipCount
            ).toBe(
              1
            );

            expect(
              connectedSufficiency
                ?.sourceTypeCount
            ).toBe(
              2
            );

            expect(
              connectedSufficiency
                ?.completenessScore
            ).toBeGreaterThan(
              emptySufficiency
                ?.completenessScore ??
                0
            );

            expect(
              connectedSufficiency
                ?.canProvideProvisionalInterpretation
            ).toBe(
              true
            );

            expect(
              connectedSufficiency
                ?.reasoningPermission
            ).toBe(
              "provisional-answer"
            );

            expect(
              connectedSufficiency
                ?.requiresClarification
            ).toBe(
              true
            );
          }
        );

        it(
          "keeps evidence, relationship, reasoning, and recommendation confidence separate",
          () => {
            const knowledge =
              buildWholeBodyClinicalKnowledge(
                createOphthalmologyPatientSummary()
              );

            const confidence =
              knowledge
                .evidenceSufficiency
                ?.confidence;

            expect(
              confidence
            ).toMatchObject({
              evidenceConfidence:
                expect.any(
                  String
                ),

              relationshipConfidence:
                "high",

              reasoningConfidence:
                expect.any(
                  String
                ),

              recommendationConfidence:
                expect.any(
                  String
                ),
            });

            expect(
              Object.keys(
                confidence ?? {}
              )
            ).toEqual(
              expect.arrayContaining([
                "evidenceConfidence",
                "relationshipConfidence",
                "reasoningConfidence",
                "recommendationConfidence",
              ])
            );
          }
        );

        it(
          "treats completenessScore as structural evidence completeness rather than diagnostic certainty",
          () => {
            const knowledge =
              buildWholeBodyClinicalKnowledge(
                createOphthalmologyPatientSummary()
              );

            const sufficiency =
              knowledge
                .evidenceSufficiency;

            expect(
              sufficiency
                ?.completenessScore
            ).toBeGreaterThan(
              0
            );

            expect(
              sufficiency
                ?.gaps.some(
                  (gap) =>
                    gap.type ===
                    "missing-current-context"
                )
            ).toBe(
              true
            );

            expect(
              sufficiency
                ?.gaps.some(
                  (gap) =>
                    gap.type ===
                    "missing-user-reported-context"
                )
            ).toBe(
              true
            );

            expect(
              sufficiency
                ?.status
            ).not.toBe(
              "sufficient"
            );
          }
        );
      }
    );
  }
);
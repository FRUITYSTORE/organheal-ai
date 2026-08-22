import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  executeAuthenticatedFollowUp,
} from "@/lib/health-intelligence/application/authenticated-follow-up-runtime.service";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import {
  buildHealthRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder";

import {
  buildFollowUpRuntime,
} from "@/lib/health-intelligence/application/follow-up-runtime.service";

const mockedEnqueueFollowUpDelivery =
  vi.fn();

vi.mock(
  "@/lib/services/shared/patient-summary.service",
  () => ({
    getPatientSummary:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/health-intelligence/health-intelligence.service",
  () => ({
    buildHealthIntelligence:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder",
  () => ({
    buildHealthRuntime:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/health-intelligence/application/follow-up-runtime.service",
  () => ({
    buildFollowUpRuntime:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/jobs/background-job.service",
  () => ({
    BackgroundJobService:
      class {
        enqueueFollowUpDelivery =
          mockedEnqueueFollowUpDelivery;
      },
  })
);

const mockedGetPatientSummary =
  vi.mocked(
    getPatientSummary
  );

const mockedBuildHealthIntelligence =
  vi.mocked(
    buildHealthIntelligence
  );

const mockedBuildHealthRuntime =
  vi.mocked(
    buildHealthRuntime
  );

const mockedBuildFollowUpRuntime =
  vi.mocked(
    buildFollowUpRuntime
  );

function createPatient() {
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

function createNextDecision() {
  return {
    primary: {
      type:
        "add-followup-history",
    },

    alternatives:
      [],

    context: {
      evidenceStrength:
        "moderate",

      evidenceScore:
        0.6,

      confidenceLevel:
        "moderate",

      confidenceScore:
        0.6,

      momentumStatus:
        "stable",
    },

    generatedAt:
      "2026-08-22T10:00:00.000Z",
  };
}

function createIntelligence() {
  return {
    recommendations: {
      data: {
        decisionLayer:
          "journey",

        decisionReason:
          "follow_up_needed",
      },
    },
  };
}

function createFollowUp({
  enqueue,
}: {
  enqueue:
    boolean;
}) {
  return {
    decision: {
      followUpRequired:
        enqueue,
    },

    message: {},

    dispatchPlan: {},

    deliveryEnvelope: {
      enqueue,

      status:
        enqueue
          ? "ready"
          : "not-enqueueable",

      userId:
        enqueue
          ? "user-123"
          : null,
    },
  };
}

describe(
  "Authenticated follow-up runtime",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();
      }
    );

    it(
      "composes authenticated health state into a durable follow-up delivery job",
      async () => {
        const patient =
          createPatient();

        const intelligence =
          createIntelligence();

        const nextDecision =
          createNextDecision();

        const followUp =
          createFollowUp({
            enqueue:
              true,
          });

        mockedGetPatientSummary
          .mockResolvedValue(
            patient as never
          );

        mockedBuildHealthIntelligence
          .mockReturnValue(
            intelligence as never
          );

        mockedBuildHealthRuntime
          .mockResolvedValue({
            modules: {
              nextDecision: {
                status:
                  "ready",

                data:
                  nextDecision,

                error:
                  null,
              },
            },
          } as never);

        mockedBuildFollowUpRuntime
          .mockReturnValue(
            followUp as never
          );

        mockedEnqueueFollowUpDelivery
          .mockResolvedValue({
            jobId:
              "job-follow-up",

            created:
              true,
          });

        const client =
          {} as never;

        const result =
          await executeAuthenticatedFollowUp({
            userId:
              " user-123 ",

            client,

            language:
              "en",

            requestId:
              "req-123",

            referenceTime:
              "2026-08-22T10:00:00.000Z",
          });

        expect(
          mockedGetPatientSummary
        ).toHaveBeenCalledWith(
          "user-123",
          client
        );

        expect(
          mockedBuildHealthRuntime
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            userId:
              "user-123",

            patient,

            intelligence,

            language:
              "en",
          })
        );

        expect(
          mockedBuildFollowUpRuntime
        ).toHaveBeenCalledWith({
          userId:
            "user-123",

          nextDecision,

          recommendationDecision: {
            layer:
              "journey",

            reason:
              "follow_up_needed",
          },

          language:
            "en",

          requestId:
            "req-123",

          referenceTime:
            "2026-08-22T10:00:00.000Z",
        });

        expect(
          mockedEnqueueFollowUpDelivery
        ).toHaveBeenCalledWith({
          envelope:
            followUp
              .deliveryEnvelope,
        });

        expect(
          result.enqueueResult
        ).toEqual({
          jobId:
            "job-follow-up",

          created:
            true,
        });
      }
    );

    it(
      "does not enqueue when the follow-up runtime produces a non-enqueueable envelope",
      async () => {
        mockedGetPatientSummary
          .mockResolvedValue(
            createPatient() as never
          );

        mockedBuildHealthIntelligence
          .mockReturnValue(
            createIntelligence() as never
          );

        mockedBuildHealthRuntime
          .mockResolvedValue({
            modules: {
              nextDecision: {
                status:
                  "ready",

                data:
                  createNextDecision(),

                error:
                  null,
              },
            },
          } as never);

        const followUp =
          createFollowUp({
            enqueue:
              false,
          });

        mockedBuildFollowUpRuntime
          .mockReturnValue(
            followUp as never
          );

        const result =
          await executeAuthenticatedFollowUp({
            userId:
              "user-123",

            client:
              {} as never,
          });

        expect(
          mockedEnqueueFollowUpDelivery
        ).not.toHaveBeenCalled();

        expect(
          result.enqueueResult
        ).toBeNull();

        expect(
          result.followUp
        ).toBe(
          followUp
        );
      }
    );

    it(
      "fails safely when the health runtime has no ready next decision",
      async () => {
        mockedGetPatientSummary
          .mockResolvedValue(
            createPatient() as never
          );

        mockedBuildHealthIntelligence
          .mockReturnValue(
            createIntelligence() as never
          );

        mockedBuildHealthRuntime
          .mockResolvedValue({
            modules: {
              nextDecision: {
                status:
                  "unavailable",

                data:
                  null,

                error:
                  null,
              },
            },
          } as never);

        await expect(
          executeAuthenticatedFollowUp({
            userId:
              "user-123",

            client:
              {} as never,
          })
        ).rejects.toThrow(
          "The health runtime did not produce a ready next decision."
        );

        expect(
          mockedBuildFollowUpRuntime
        ).not.toHaveBeenCalled();

        expect(
          mockedEnqueueFollowUpDelivery
        ).not.toHaveBeenCalled();
      }
    );
  }
);
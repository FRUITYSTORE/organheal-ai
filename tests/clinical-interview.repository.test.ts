import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/lib/supabase",
  () => ({
    supabase: {},
  })
);

import {
  createClinicalInterview,
  getClinicalInterview,
  updateClinicalInterview,
} from "@/lib/repositories/clinical-interview.repository";

import type {
  ClinicalReasoningState,
} from "@/lib/health-intelligence/runtime/clinical-reasoning-state";

function createReasoningState():
  ClinicalReasoningState {
  return {
    id:
      "reasoning_state_test",

    originalQuestion:
      "What could be causing my abnormal result?",

    currentQuestion:
      "What could be causing my abnormal result?",

    intent:
      "cause-reasoning",

    language:
      "en",

    status:
    "awaiting-clarification",

    askedClarificationQuestionIds:
      [],

    resolvedGapTypes:
      [],

    collectedEvidence:
      [],

    runtimeHistory:
      [],

    currentRuntime:
      {} as ClinicalReasoningState["currentRuntime"],

    createdAt:
      "2026-08-18T12:00:00.000Z",

    updatedAt:
      "2026-08-18T12:00:00.000Z",
  };
}

function createClient({
  data,
  error = null,
}: {
  data:
    unknown;

  error?:
    { message: string } | null;
}) {
  const single =
    vi.fn()
      .mockResolvedValue({
        data,
        error,
      });

  const maybeSingle =
    vi.fn()
      .mockResolvedValue({
        data,
        error,
      });

  const select =
    vi.fn();

  const eq =
    vi.fn();

  const insert =
    vi.fn();

  const update =
    vi.fn();

  const chain = {
    insert,
    update,
    select,
    eq,
    single,
    maybeSingle,
  };

  insert.mockReturnValue(
    chain
  );

  update.mockReturnValue(
    chain
  );

  select.mockReturnValue(
    chain
  );

  eq.mockReturnValue(
    chain
  );

  const from =
    vi.fn()
      .mockReturnValue(
        chain
      );

  return {
    client: {
      from,
    },

    from,
    insert,
    update,
    select,
    eq,
    single,
    maybeSingle,
  };
}

describe(
  "Clinical interview repository",
  () => {
    it(
      "creates an interview owned by the authenticated user",
      async () => {
        const reasoningState =
          createReasoningState();

        const row = {
          id:
            "interview-1",

          user_id:
            "user-1",

          status:
            "active",

          reasoning_state:
            reasoningState,

          created_at:
            "2026-08-18T12:00:00.000Z",

          updated_at:
            "2026-08-18T12:00:00.000Z",
        };

        const mock =
          createClient({
            data:
              row,
          });

        const result =
          await createClinicalInterview(
            {
              userId:
                "user-1",

              reasoningState,
            },

            mock.client as never
          );

        expect(
          mock.from
        ).toHaveBeenCalledWith(
          "clinical_interview_sessions"
        );

        expect(
          mock.insert
        ).toHaveBeenCalledWith({
          user_id:
            "user-1",

          status:
            "active",

          reasoning_state:
            reasoningState,
        });

        expect(
          result
        ).toEqual(
          row
        );
      }
    );

    it(
      "loads an interview using both user id and interview id",
      async () => {
        const mock =
          createClient({
            data:
              null,
          });

        const result =
          await getClinicalInterview(
            "user-1",
            "interview-1",
            mock.client as never
          );

        expect(
          mock.eq
        ).toHaveBeenNthCalledWith(
          1,
          "user_id",
          "user-1"
        );

        expect(
          mock.eq
        ).toHaveBeenNthCalledWith(
          2,
          "id",
          "interview-1"
        );

        expect(
          mock.maybeSingle
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          result
        ).toBeNull();
      }
    );

    it(
      "updates an interview using both user id and interview id",
      async () => {
        const reasoningState =
          createReasoningState();

        const mock =
          createClient({
            data: {
              id:
                "interview-1",

              user_id:
                "user-1",

              status:
                "active",

              reasoning_state:
                reasoningState,

              created_at:
                "2026-08-18T12:00:00.000Z",

              updated_at:
                "2026-08-18T12:05:00.000Z",
            },
          });

        await updateClinicalInterview(
          {
            userId:
              "user-1",

            interviewId:
              "interview-1",

            reasoningState,
          },

          mock.client as never
        );

        expect(
          mock.eq
        ).toHaveBeenNthCalledWith(
          1,
          "user_id",
          "user-1"
        );

        expect(
          mock.eq
        ).toHaveBeenNthCalledWith(
          2,
          "id",
          "interview-1"
        );

        expect(
          mock.single
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );

    it(
      "propagates database errors",
      async () => {
        const mock =
          createClient({
            data:
              null,

            error: {
              message:
                "Database failure",
            },
          });

        await expect(
          getClinicalInterview(
            "user-1",
            "interview-1",
            mock.client as never
          )
        ).rejects.toThrow(
          "Database failure"
        );
      }
    );
  }
);
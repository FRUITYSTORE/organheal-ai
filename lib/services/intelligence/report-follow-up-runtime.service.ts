export type TriggerReportFollowUpInput = {
  accessToken:
    string;

  language?:
    "en" | "ar";
};

export type TriggerReportFollowUpResult =
  | {
      success:
        true;

      enqueued:
        boolean;

      jobId:
        string | null;

      created:
        boolean;
    }
  | {
      success:
        false;

      errorMessage:
        string;
    };

type FollowUpApiResponse = {
  success?:
    boolean;

  followUpRequired?:
    boolean;

  deliveryEnqueueable?:
    boolean;

  enqueueResult?:
    {
      jobId:
        string;

      created:
        boolean;
    } | null;

  error?:
    string;

  requestId?:
    string;
};

export async function triggerReportFollowUp({
  accessToken,
  language = "en",
}: TriggerReportFollowUpInput):
  Promise<
    TriggerReportFollowUpResult
  > {
  const normalizedToken =
    accessToken.trim();

  if (!normalizedToken) {
    return {
      success:
        false,

      errorMessage:
        "A valid access token is required to trigger report follow-up.",
    };
  }

  try {
    const response =
      await fetch(
        "/api/follow-up",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${normalizedToken}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              language,
            }),
        }
      );

    const body =
      (await response.json()) as
        FollowUpApiResponse;

    if (
      !response.ok ||
      body.success === false
    ) {
      return {
        success:
          false,

        errorMessage:
          body.error ??
          "Could not trigger report follow-up.",
      };
    }

    return {
      success:
        true,

      enqueued:
        body.deliveryEnqueueable ===
        true,

      jobId:
        typeof body.enqueueResult
          ?.jobId ===
          "string"
          ? body.enqueueResult.jobId
          : null,

      created:
        body.enqueueResult
          ?.created ===
        true,
    };
  } catch (error) {
    return {
      success:
        false,

      errorMessage:
        error instanceof Error
          ? error.message
          : String(
              error
            ),
    };
  }
}
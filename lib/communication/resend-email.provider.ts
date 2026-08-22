export type SendEmailInput = {
  to:
    string;

  subject:
    string;

  text:
    string;

  html?:
    string;

  replyTo?:
    string;

  idempotencyKey?:
    string;

  signal?:
    AbortSignal;
};

export type ResendEmailSendResult = {
  messageId:
    string;

  recipient:
    string;

  from:
    string;
};

type ResendApiResponse = {
  id?:
    unknown;

  error?:
    unknown;
};

const RESEND_API_URL =
  "https://api.resend.com/emails";

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireEnvironmentValue(
  key:
    "RESEND_API_KEY" |
    "ORGANHEAL_EMAIL_FROM"
): string {
  const value =
    process.env[
      key
    ]?.trim();

  if (!value) {
    throw new Error(
      `${key} is not configured.`
    );
  }

  return value;
}

function normalizeEmailAddress(
  value:
    string,
  fieldName:
    string
): string {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    !EMAIL_REGEX.test(
      normalized
    )
  ) {
    throw new Error(
      `A valid ${fieldName} email address is required.`
    );
  }

  return normalized;
}

function normalizeRecipient(
  value:
    string
): string {
  return normalizeEmailAddress(
    value,
    "recipient"
  );
}

function normalizeSubject(
  value:
    string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "An email subject is required."
    );
  }

  if (
    normalized.length >
      200
  ) {
    throw new Error(
      "Email subject is too long."
    );
  }

  return normalized;
}

function normalizeText(
  value:
    string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "Email text content is required."
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value:
    string | undefined
): string | undefined {
  if (
    value ===
      undefined
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return (
    normalized ||
    undefined
  );
}

function normalizeIdempotencyKey(
  value:
    string | undefined
): string | undefined {
  if (
    value ===
      undefined
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "Email idempotency key cannot be empty."
    );
  }

  return normalized;
}

function normalizeSender(
  value:
    string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "Email sender is required."
    );
  }

  /*
   * Resend supports values such as:
   *
   * OrganHeal AI <followup@organheal.com>
   *
   * Sender-domain verification remains an
   * external provider configuration concern.
   */
  return normalized;
}

export async function sendEmailWithResend({
  to,
  subject,
  text,
  html,
  replyTo,
  idempotencyKey,
  signal,
}: SendEmailInput):
  Promise<
    ResendEmailSendResult
  > {
  const apiKey =
    requireEnvironmentValue(
      "RESEND_API_KEY"
    );

  const from =
    normalizeSender(
      requireEnvironmentValue(
        "ORGANHEAL_EMAIL_FROM"
      )
    );

  const recipient =
    normalizeRecipient(
      to
    );

  const normalizedSubject =
    normalizeSubject(
      subject
    );

  const normalizedText =
    normalizeText(
      text
    );

  const normalizedHtml =
    normalizeOptionalText(
      html
    );

  const normalizedReplyTo =
    replyTo
      ? normalizeEmailAddress(
          replyTo,
          "reply-to"
        )
      : undefined;

  const normalizedIdempotencyKey =
    normalizeIdempotencyKey(
      idempotencyKey
    );

  const headers:
    Record<
      string,
      string
    > = {
      Authorization:
        `Bearer ${apiKey}`,

      "Content-Type":
        "application/json",
    };

  if (
    normalizedIdempotencyKey
  ) {
    headers[
      "Idempotency-Key"
    ] =
      normalizedIdempotencyKey;
  }

  const response =
    await fetch(
      RESEND_API_URL,
      {
        method:
          "POST",

        headers,

        body:
          JSON.stringify({
            from,

            to: [
              recipient,
            ],

            subject:
              normalizedSubject,

            text:
              normalizedText,

            ...(normalizedHtml
              ? {
                  html:
                    normalizedHtml,
                }
              : {}),

            ...(normalizedReplyTo
              ? {
                  reply_to:
                    normalizedReplyTo,
                }
              : {}),
          }),

        signal,
      }
    );

  if (!response.ok) {
    throw new Error(
      `Resend email provider returned status ${response.status}.`
    );
  }

  const result =
    (await response.json()) as
      ResendApiResponse;

  const messageId =
    result.id;

  if (
    typeof messageId !==
      "string" ||
    !messageId.trim()
  ) {
    throw new Error(
      "Resend email provider returned no message ID."
    );
  }

  return {
    messageId:
      messageId.trim(),

    recipient,

    from,
  };
}
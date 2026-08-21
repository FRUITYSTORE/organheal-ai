export type WhatsAppCloudLanguage =
  | "en"
  | "ar";

export type WhatsAppTemplateParameter = {
  text:
    string;
};

export type SendWhatsAppTemplateInput = {
  to:
    string;

  templateName:
    string;

  language:
    WhatsAppCloudLanguage;

  parameters?:
    WhatsAppTemplateParameter[];

  signal?:
    AbortSignal;
};

export type WhatsAppCloudSendResult = {
  messageId:
    string;

  recipient:
    string;

  templateName:
    string;

  graphApiVersion:
    string;
};

type WhatsAppCloudApiResponse = {
  messages?:
    Array<{
      id?:
        unknown;
    }>;

  contacts?:
    Array<{
      input?:
        unknown;

      wa_id?:
        unknown;
    }>;

  error?:
    unknown;
};

const DEFAULT_GRAPH_API_VERSION =
  "v23.0";

const WHATSAPP_PHONE_REGEX =
  /^\+[1-9][0-9]{7,14}$/;

function requireEnvironmentValue(
  key:
    "WHATSAPP_ACCESS_TOKEN" |
    "WHATSAPP_PHONE_NUMBER_ID"
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

function getGraphApiVersion():
  string {
  const configured =
    process.env
      .WHATSAPP_GRAPH_API_VERSION
      ?.trim();

  return (
    configured ||
    DEFAULT_GRAPH_API_VERSION
  );
}

function normalizePhoneNumber(
  value:
    string
): string {
  const normalized =
    value.trim();

  if (
    !WHATSAPP_PHONE_REGEX.test(
      normalized
    )
  ) {
    throw new Error(
      "A valid WhatsApp phone number in E.164 format is required."
    );
  }

  /*
   * Meta's `to` field expects the international
   * number without formatting characters.
   */
  return normalized.slice(
    1
  );
}

function normalizeTemplateName(
  value:
    string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "A WhatsApp template name is required."
    );
  }

  return normalized;
}

function resolveTemplateLanguageCode(
  language:
    WhatsAppCloudLanguage
): string {
  return language ===
    "ar"
    ? "ar"
    : "en_US";
}

function normalizeParameters(
  parameters:
    WhatsAppTemplateParameter[] | undefined
): WhatsAppTemplateParameter[] {
  if (!parameters) {
    return [];
  }

  return parameters.map(
    (
      parameter,
      index
    ) => {
      const text =
        parameter.text
          .trim();

      if (!text) {
        throw new Error(
          `WhatsApp template parameter ${index + 1} is empty.`
        );
      }

      return {
        text,
      };
    }
  );
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  language,
  parameters,
  signal,
}: SendWhatsAppTemplateInput):
  Promise<
    WhatsAppCloudSendResult
  > {
  const accessToken =
    requireEnvironmentValue(
      "WHATSAPP_ACCESS_TOKEN"
    );

  const phoneNumberId =
    requireEnvironmentValue(
      "WHATSAPP_PHONE_NUMBER_ID"
    );

  const graphApiVersion =
    getGraphApiVersion();

  const recipient =
    normalizePhoneNumber(
      to
    );

  const normalizedTemplateName =
    normalizeTemplateName(
      templateName
    );

  const normalizedParameters =
    normalizeParameters(
      parameters
    );

  const bodyComponents =
    normalizedParameters.length >
      0
      ? [
          {
            type:
              "body",

            parameters:
              normalizedParameters.map(
                (
                  parameter
                ) => ({
                  type:
                    "text",

                  text:
                    parameter.text,
                })
              ),
          },
        ]
      : undefined;

  const response =
    await fetch(
      `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            messaging_product:
              "whatsapp",

            recipient_type:
              "individual",

            to:
              recipient,

            type:
              "template",

            template: {
              name:
                normalizedTemplateName,

              language: {
                code:
                  resolveTemplateLanguageCode(
                    language
                  ),
              },

              ...(bodyComponents
                ? {
                    components:
                      bodyComponents,
                  }
                : {}),
            },
          }),

        signal,
      }
    );

  if (!response.ok) {
    throw new Error(
      `WhatsApp Cloud provider returned status ${response.status}.`
    );
  }

  const result =
    (await response.json()) as
      WhatsAppCloudApiResponse;

  const messageId =
    result.messages?.[0]
      ?.id;

  if (
    typeof messageId !==
      "string" ||
    !messageId.trim()
  ) {
    throw new Error(
      "WhatsApp Cloud provider returned no message ID."
    );
  }

  return {
    messageId:
      messageId.trim(),

    recipient,

    templateName:
      normalizedTemplateName,

    graphApiVersion,
  };
}
import type {
  FollowUpDeliveryJobPayload,
} from "@/lib/jobs/background-job.service";

import type {
  WhatsAppCloudLanguage,
  WhatsAppTemplateParameter,
} from "@/lib/communication/whatsapp-cloud.provider";

type FollowUpPurpose =
  FollowUpDeliveryJobPayload[
    "delivery"
  ]["purpose"];

export type WhatsAppFollowUpTemplate = {
  templateName:
    string;

  language:
    WhatsAppCloudLanguage;

  parameters:
    WhatsAppTemplateParameter[];
};

const TEMPLATE_NAMES:
  Record<
    FollowUpPurpose,
    string
  > = {
    "routine-continuity":
      "organheal_routine_continuity",

    "complete-health-data":
      "organheal_complete_health_data",

    "complete-report-analysis":
      "organheal_complete_report_analysis",

    "repeat-checkin":
      "organheal_repeat_checkin",

    "review-health-plan":
      "organheal_review_health_plan",

    "professional-review":
      "organheal_professional_review",

    "urgent-review":
      "organheal_urgent_review",
  };

function requireText(
  value:
    string,
  fieldName:
    string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required to build a WhatsApp follow-up template.`
    );
  }

  return normalized;
}

export function buildWhatsAppFollowUpTemplate(
  payload:
    FollowUpDeliveryJobPayload
): WhatsAppFollowUpTemplate {
  const {
    language,
    purpose,
    title,
    body,
    actionLabel,
    safetyNote,
  } =
    payload.delivery;

  const parameters:
    WhatsAppTemplateParameter[] = [
      {
        text:
          requireText(
            title,
            "Follow-up title"
          ),
      },
      {
        text:
          requireText(
            body,
            "Follow-up body"
          ),
      },
  ];

  if (
    actionLabel?.trim()
  ) {
    parameters.push({
      text:
        actionLabel.trim(),
    });
  }

  if (
    safetyNote?.trim()
  ) {
    parameters.push({
      text:
        safetyNote.trim(),
    });
  }

  return {
    templateName:
      TEMPLATE_NAMES[
        purpose
      ],

    language,

    parameters,
  };
}
export const JOB_TYPES = {
  PDF_EXTRACTION:
    "pdf-extraction",

  REPORT_ANALYSIS:
    "report-analysis",

  HEALTH_INTELLIGENCE:
    "health-intelligence",

  DOCTOR_BRIEF:
    "doctor-brief",

  PATIENT_REPORT:
    "patient-report",

    KNOWLEDGE_RECOMMENDATION:
    "knowledge-recommendation",

  FOLLOW_UP_DELIVERY:
    "follow-up-delivery",
} as const;

export type JobType =
  (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export const JOB_STATUS = {
  PENDING:
    "pending",

  RUNNING:
    "running",

  COMPLETED:
    "completed",

  FAILED:
    "failed",

  RETRYING:
    "retrying",

  CANCELLED:
    "cancelled",
} as const;

export type JobStatus =
  (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export type BackgroundJob<
  TPayload = unknown,
> = {
  id: string;

  type:
    JobType;

  status:
    JobStatus;

  payload:
    TPayload;

  attempts:
    number;

  maxAttempts:
    number;

    createdAt:
    string;

  /*
   * Optional at the shared job-contract level to preserve
   * compatibility with older callers and test fixtures.
   *
   * Jobs created through createJob() always receive a
   * concrete availability timestamp.
   */
  availableAt?:
    string;

  startedAt:
    string | null;

  finishedAt:
    string | null;

  lastError:
    string | null;
};
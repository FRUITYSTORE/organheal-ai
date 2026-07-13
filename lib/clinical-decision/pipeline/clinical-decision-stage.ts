export type ClinicalDecisionStageRunStatus =
  | "completed"
  | "skipped"
  | "failed";

export type ClinicalDecisionStageExecution = {
  stageId: string;
  status: ClinicalDecisionStageRunStatus;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  error: string | null;
};

export type ClinicalDecisionStageResult<TContext> = {
  context: TContext;
  execution: ClinicalDecisionStageExecution;
};

export interface ClinicalDecisionStage<TContext> {
  id: string;
  order?: number;

  shouldRun?(
    context: Readonly<TContext>
  ): boolean | Promise<boolean>;

  run(
    context: Readonly<TContext>
  ): TContext | Promise<TContext>;
}
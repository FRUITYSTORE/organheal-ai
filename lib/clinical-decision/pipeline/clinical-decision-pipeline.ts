import type {
  ClinicalDecisionStage,
  ClinicalDecisionStageExecution,
} from "@/lib/clinical-decision/pipeline/clinical-decision-stage";

export type ClinicalDecisionPipelineOptions = {
  stopOnFailure?: boolean;
};

export type ClinicalDecisionPipelineResult<TContext> = {
  context: TContext;
  executions: ClinicalDecisionStageExecution[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  successful: boolean;
};

export class ClinicalDecisionPipeline<TContext> {
  private readonly stages: ClinicalDecisionStage<TContext>[] = [];

  private readonly stopOnFailure: boolean;

  constructor(
    options: ClinicalDecisionPipelineOptions = {}
  ) {
    this.stopOnFailure =
      options.stopOnFailure ?? true;
  }

  addStage(
    stage: ClinicalDecisionStage<TContext>
  ) {
    const duplicateStage = this.stages.some(
      (currentStage) =>
        currentStage.id === stage.id
    );

    if (duplicateStage) {
      throw new Error(
        `Clinical decision stage "${stage.id}" is already registered.`
      );
    }

    this.stages.push(stage);

    return this;
  }

  getStages() {
    return [...this.stages].sort(
      (firstStage, secondStage) =>
        (firstStage.order ?? 0) -
        (secondStage.order ?? 0)
    );
  }

  async run(
    initialContext: TContext
  ): Promise<ClinicalDecisionPipelineResult<TContext>> {
    const pipelineStartedAt = new Date();
    const executions: ClinicalDecisionStageExecution[] = [];

    let context = initialContext;
    let successful = true;

    for (const stage of this.getStages()) {
      const stageStartedAt = new Date();

      try {
        const shouldRun = stage.shouldRun
          ? await stage.shouldRun(context)
          : true;

        if (!shouldRun) {
          const completedAt = new Date();

          executions.push({
            stageId: stage.id,
            status: "skipped",
            startedAt: stageStartedAt.toISOString(),
            completedAt: completedAt.toISOString(),
            durationMs:
              completedAt.getTime() -
              stageStartedAt.getTime(),
            error: null,
          });

          continue;
        }

        context = await stage.run(context);

        const completedAt = new Date();

        executions.push({
          stageId: stage.id,
          status: "completed",
          startedAt: stageStartedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          durationMs:
            completedAt.getTime() -
            stageStartedAt.getTime(),
          error: null,
        });
      } catch (error) {
        const completedAt = new Date();

        successful = false;

        executions.push({
          stageId: stage.id,
          status: "failed",
          startedAt: stageStartedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          durationMs:
            completedAt.getTime() -
            stageStartedAt.getTime(),
          error:
            error instanceof Error
              ? error.message
              : "Unknown pipeline stage error.",
        });

        if (this.stopOnFailure) {
          break;
        }
      }
    }

    const pipelineCompletedAt = new Date();

    return {
      context,
      executions,
      startedAt: pipelineStartedAt.toISOString(),
      completedAt: pipelineCompletedAt.toISOString(),
      durationMs:
        pipelineCompletedAt.getTime() -
        pipelineStartedAt.getTime(),
      successful,
    };
  }
}
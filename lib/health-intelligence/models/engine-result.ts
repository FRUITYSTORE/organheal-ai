export type EngineStatus = "ready" | "insufficient-data";

export type EngineResult<T> = {
  status: EngineStatus;
  confidence: number;
  generatedAt: string;
  data: T;
};
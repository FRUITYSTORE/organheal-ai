import {
  after,
} from "next/server";

export type AfterResponseTask =
  () =>
    void |
    Promise<void>;

export function scheduleAfterResponse(
  task:
    AfterResponseTask
): void {
  after(
    task
  );
}
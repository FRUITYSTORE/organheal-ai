import "server-only";
import type { ArtifactOwnership } from "./artifact-output";

/** Runtime-only facts: JSON, paths supplied by callers and copied result objects
 * cannot mint cleanup authority. No clinical content or database dependency. */
export type ExecutionResources = Readonly<{
  cleanupConfirmed: boolean;
  artifact?: ArtifactOwnership;
}>;
const resources = new WeakMap<object, ExecutionResources>();
export function recordExecutionResources(result: object, facts: ExecutionResources): void {
  resources.set(result, Object.freeze(facts));
}
export function readExecutionResources(result: object): ExecutionResources | undefined {
  return resources.get(result);
}
export function transferExecutionResources<T extends object>(source: object, target: T): T {
  const facts = resources.get(source);
  if (facts) resources.set(target, facts);
  return target;
}

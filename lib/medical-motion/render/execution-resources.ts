import "server-only";
import type { ArtifactOwnership } from "./artifact-output";
import type { OutputDimensions } from "./dimension-policy";

/** Runtime-only facts: JSON, paths supplied by callers and copied result objects
 * cannot mint cleanup authority. No clinical content or database dependency. */
export type ExecutionResources = Readonly<{
  cleanupConfirmed: boolean;
  artifact?: ArtifactOwnership;
  dimensions?: OutputDimensions;
}>;
const resources = new WeakMap<object, ExecutionResources>();
export function recordExecutionResources(result: object, facts: ExecutionResources): void {
  resources.set(result, Object.freeze(facts));
}
type CandidateIdentity={jobId:string;userId:string;attemptToken:string};
const candidates = new WeakMap<object, {owner:ArtifactOwnership;dimensions:OutputDimensions;identity?:CandidateIdentity}>();
export function recordCandidateOwnership(candidate:object,owner:ArtifactOwnership,dimensions:OutputDimensions,identity?:CandidateIdentity) {
  candidates.set(candidate,{owner,dimensions,identity:identity?Object.freeze({...identity}):undefined});
}
export function readCandidateOwnership(candidate:object) {return candidates.get(candidate);}
export function readExecutionResources(result: object): ExecutionResources | undefined {
  return resources.get(result);
}
export function transferExecutionResources<T extends object>(source: object, target: T): T {
  const facts = resources.get(source);
  if (facts) resources.set(target, facts);
  return target;
}

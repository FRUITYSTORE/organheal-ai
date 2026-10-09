import "server-only";
import { isAuthorizedCinematicTimeline, type CinematicTimeline } from "./cinematic-timeline-specification";
import { CinematicRuntimeError } from "./runtime-output";

/** Internal filter specification for the existing process/ownership compositor adapter
 * in R2.4C. No process spawning, database writes or alternate ownership implementation. */
export function cinematicCompositionFilters(capability: CinematicTimeline,
  media: readonly { width: number; height: number; frameRate: number; frameCount: number; duration: number; audio: boolean }[]) {
  if (!isAuthorizedCinematicTimeline(capability) || media.length !== capability.scenes.length)
    throw new CinematicRuntimeError("CINEMATIC_TIMELINE_INVALID");
  const p = capability.outputProfile;
  const filters = capability.scenes.map((s, i) => {
    const base = media[i];
    if (base.width !== p.width || base.height !== p.height || base.frameRate !== p.fps || base.frameCount !== s.frameCount ||
      Math.abs(base.duration - s.duration) > .000001 || base.audio)
      throw new CinematicRuntimeError("OUTPUT_PROFILE_INVALID");
    // Exact native 24fps bases only. No fps conversion or scaling in this contract.
    const chain = ["setsar=1", "format=yuv420p", `trim=end_frame=${s.frameCount}`, "setpts=PTS-STARTPTS"];
    const incoming = capability.transitions[i - 1], outgoing = capability.transitions[i];
    if (incoming?.kind === "fade-through-neutral") chain.push(`fade=t=in:st=0:d=${incoming.duration / 2}:color=black`);
    if (outgoing?.kind === "fade-through-neutral") chain.push(`fade=t=out:st=${s.duration - outgoing.duration / 2}:d=${outgoing.duration / 2}:color=black`);
    return `[${i}:v]${chain.join(",")}[s${i}]`;
  });
  filters.push(`${capability.scenes.map((_, i) => `[s${i}]`).join("")}concat=n=${media.length}:v=1:a=0[timeline]`);
  return Object.freeze(filters);
}

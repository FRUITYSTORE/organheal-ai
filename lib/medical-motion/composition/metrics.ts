import type { ReuseEvent } from "../artifacts/reuse";
import type { CompositionEvent } from "./compositor";
/** Local bounded counters only. No owner/context, text, fingerprint or provider diagnostics. */
export class CompositionMetrics {
  private counts = { "base-cache-hit": 0, "base-cache-miss": 0, "composition-start": 0,
    "composition-complete": 0, "composition-failure": 0, "Blender-avoided": 0, "reusable-audio-hit": 0 };
  readonly reuse = (event: ReuseEvent) => {
    if (event.disposition === "CACHE_HIT") { this.counts["base-cache-hit"]++; this.counts["Blender-avoided"]++; }
    else if (event.disposition === "CACHE_MISS") this.counts["base-cache-miss"]++;
  };
  readonly composition = (event: CompositionEvent) => {
    if (["composition-start", "composition-complete", "composition-failure", "reusable-audio-hit"].includes(event)) this.counts[event]++;
  };
  get snapshot() { return Object.freeze({ ...this.counts }); }
}

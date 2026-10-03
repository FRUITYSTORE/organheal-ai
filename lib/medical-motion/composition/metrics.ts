import type { ReuseEvent } from "../artifacts/reuse";
import type { CompositionEvent, CompositionMeasurement } from "./compositor";
/** Local bounded counters only. No owner/context, text, fingerprint or provider diagnostics. */
export class CompositionMetrics {
  private counts = { "base-cache-hit": 0, "base-cache-miss": 0, "composition-start": 0,
    "composition-complete": 0, "composition-failure": 0, "Blender-avoided": 0, "reusable-audio-hit": 0,
    "base-render-created": 0, ffmpegMilliseconds: 0, outputBytes: 0 };
  readonly reuse = (event: ReuseEvent) => {
    if (event.disposition === "CACHE_HIT") { this.counts["base-cache-hit"]++; this.counts["Blender-avoided"]++; }
    else if (event.disposition === "CACHE_MISS") this.counts["base-cache-miss"]++;
    else if (event.disposition === "RENDER_CREATED") this.counts["base-render-created"]++;
  };
  readonly composition = (event: CompositionEvent, measurement?: CompositionMeasurement) => {
    if (["composition-start", "composition-complete", "composition-failure", "reusable-audio-hit"].includes(event)) this.counts[event]++;
    if (event === "composition-complete" && measurement &&
      Number.isSafeInteger(measurement.ffmpegMilliseconds) && measurement.ffmpegMilliseconds >= 0 &&
      Number.isSafeInteger(measurement.outputBytes) && measurement.outputBytes > 0 && measurement.outputBytes <= 67108864) {
      this.counts.ffmpegMilliseconds += measurement.ffmpegMilliseconds;
      this.counts.outputBytes += measurement.outputBytes;
    }
  };
  get snapshot() { return Object.freeze({ ...this.counts }); }
}

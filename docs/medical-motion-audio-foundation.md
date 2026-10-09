# Medical Motion audio foundation — R2.5A

`MEDICAL_AUDIO_COMPOSITION_V1` is an additive post-composition adapter in the
existing composition layer. It reuses `ExecutionOwnership`, the guarded FFmpeg
runtime and private artifact allocation/validation. It does not call Blender,
change cinematic masters, create a second renderer, publish patient products or
authorize clinical content.

## Authority and identities

The server reconstructs the opaque cinematic compiler capability and admits the
preserved visual bytes only when execution evidence, compiler/lock fingerprints,
SHA-256, dimensions, frame count and duration agree. Approved font and audio bytes
are retained privately; copied JSON cannot authorize execution. Lease confirmation
precedes work and the internal handoff. Cancellation/failed handoff discards the
owned invocation; uncertain process shutdown retains files for reconciliation.
Durable publication would still require the existing fenced publication RPC.

The educational script catalogue currently contains one neutral Arabic and one
English script. Free-form planner/patient text cannot issue script authority.
Script hash/version/medical-content version are independent of voice identity.
Composition identity includes visual identity/hash, script, language, audio hash,
voice/provider metadata, cues, timing, font hash and versioned presentation policies.
No patient prose is used in reusable keys. This identity is not a new durable cache.

`NarrationProviderPort` models EXTERNAL_TTS, OWNED_TTS, PREGENERATED and TEST_FIXTURE.
Only TEST_FIXTURE is executable now: deterministic PCM WAV test tones, not spoken
narration or a heartbeat sound. Future adapters accept an approved script, locale,
voice profile and bounded style; return verified audio/duration/timing/hash; and
retain secrets outside core contracts. A clinical script adapter must consume
existing medical approval/safety authority; a TTS provider cannot change wording,
diagnostic certainty or visualization meaning.

## Timing and presentation

The original 276-frame/24fps visual is reused when narration fits. Longer approved
audio inserts complete 24-frame stationary EXPLAIN cycles taken from the approved
visual, before REORIENT; the final transition shifts by whole seconds. Required
explanation cue ends also govern extension. The total is bounded to 60 seconds.
No heartbeat stretching, rate/rhythm changes, invented motion or disease-driven
animation are available. No anatomical source boundary changes are permitted.

`NO_DEAD_VISUAL_TIME_V1` rejects unexplained static spans above one second,
including long residual holds after a short camera movement. Explicit evidenced
comprehension, reading, clinical-comparison and intentional-pause holds are valid.
This is presentation validation, not render/medical authority. R2.5A derives its
activity from approved native motion and the bounded presentation preset.

Owner polish adds a smooth 1–1.035 screen-space camera presentation push over
0–4 seconds, then removes that extra factor over 4–5 seconds as the existing
physical approach takes over. Rotation and anatomy are unchanged; the added
transform ends before the 5.5-second source boundary. Every HERO projected bound
from the approved execution is checked against the existing safe-organ rectangle.
This is a digital framing adjustment, not a newly rendered physical camera orbit.
Subtitles and test-tone audio start at 400 ms; 11.1 seconds of fixture audio occupies
the remainder of the unchanged 11.5-second timeline. Original proof files are retained.

`MEDICAL_SUBTITLE_V1` uses local Arial/Pango shaping, UTF-8 logical text and Arabic
RTL. Diacritics and punctuation are preserved; no transliteration/reversal is
performed. Cue order, scene association, density, duration, overlap and two-line
limits are checked. Rasterized typography must fit the R2.4 lower safe rectangle
(top-origin 0.08, 0.86, 0.92, 0.96). No subtitle enters Blender. Font bytes are pinned
and copied privately; no remote font lookup/download is needed.

Labels have a separate sparse educational contract. Validation requires an existing
canonical ID and a supported, evidenced source-scene anchor outside the focal region.
R2.4 HERO/MOTION have no such anatomical bindings, so all real labels fail closed;
the acceptance is label-free. Canonical/anchor planning is tested with fixtures.
Projection/rendering of real labels requires future approved anchor bindings.

Music is policy-only: clinical review is OFF, patient-education preview defaults
OFF, explicit future opt-in requires speech ducking and a -24 dB music gain ceiling.
CREATOR_ALLOWED_FUTURE is not executable. No music assets/services are integrated.
The audio mix uses -18 LUFS normalization, -2 dB true-peak target/limiter, short
fades, 48 kHz stereo AAC at 128 kbps. Encoded sample-peak QC rejects values above
-1 dBFS, allowing codec reconstruction margin; it is not a certified true-peak meter.

## Evidence and limits

Real acceptance reuses the approved R2.4 MP4 with a generated tone and timed Arabic
subtitles. It produces full 1080×1920 and review 540×960 MP4s, cue/layout evidence,
hashes, media probes and separate preparation/composition timing metrics in TEMP.
No audio/model/video binary belongs in Git. Re-encoding necessarily changes video
bytes; the original imagery, motion timing and source-honest transition are retained.
Text/voice/policy changes affect only post-composition identity, never master identity.

Everything remains internal-review, educational, clinically unreviewed and
`patientFacing=false`. Licensing/provenance status remains unresolved. This milestone
does not claim human voice quality, forced alignment, dialect coverage, production
TTS readiness, clinical authorization or patient delivery readiness.

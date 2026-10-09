# Medical Motion voice runtime V1

R2.5B adds measured speech and semantic synchronization to the existing owned
`MEDICAL_AUDIO_COMPOSITION_V1` compositor. It does not introduce another rendering
engine, public endpoint, patient delivery path or medical approval mechanism.

## Authority and identity

Resolve the exact internal educational catalogue through
`resolveEducationalNarration`: `HEART_EDUCATION_AR_V1` or
`HEART_EDUCATION_EN_V1`, version `1`. The texts are equivalent generic education,
not personalized advice. R2.5A catalogue entries retain their text and identity.

Resolve an opaque `AR_CLINICAL_CALM_V1` or `EN_CLINICAL_CALM_V1` profile. A trusted
server adapter implementing `MedicalNarrationProvider` receives this approved
script through `renderMedicalNarration`. It returns independently rendered/imported
segments with matching segment/text/request identities. Copied JSON cannot replace
the approved script, profile, voice, sync plan, visual or compiled composition.
Non-fixture speech also requires an independent transcription or a server-reviewed
human transcript matching the approved text. Normalization removes punctuation
and Arabic diacritics only; substitutions fail closed. The existing service adapter
transcribes each generated segment before core admission. This is a content check,
not proof of voice naturalness or a replacement for owner listening.

The existing speech service is reused through `lib/voice/medical-narration-provider.ts`.
Credentials and vendor calls remain outside Medical Motion core. That adapter
supports `CLINICAL_STANDARD` only: unsupported slow-rate or pronunciation controls
fail rather than being silently ignored. `CLINICAL_SLOW` is available to adapters
that explicitly support it; `CREATOR_STANDARD_FUTURE` and future male/female
presentation variants remain non-executable. Canonical pronunciation hints contain
no vendor SSML and do not change script meaning.

Audio is canonical 48kHz mono PCM16 WAV for intake, normalized to 48kHz stereo AAC
in the existing compositor. Decoded segment samples determine timing, with at
most one millisecond of zero padding per segment. Semantic pauses are 250ms after
the introduction, 300ms before transition, 300ms after reveal wording and 250ms
before the disclaimer. No word timing is invented; supplied word timing is
validated and preserved as optional evidence. Default subtitles remain sentences.

The independent identities are the visual master fingerprint/hash, approved
script hash, versioned voice profile, pinned voice audio/request identity,
`MEDICAL_AV_SYNC_V1` plan identity and compiled final composition fingerprint.
Operational latency/cost do not invalidate pinned voice media. Generated TTS is
not promised to regenerate bit-for-bit: preserve the actual bytes and hash.

## Semantic synchronization and visual reuse

The executable educational recipe associates introduction with the external
HERO, approach with the exterior explanation, transition with “now we transition,”
native heartbeat with its source-motion explanation and the closing disclaimer
with the internal context. Structure focus and other catalogue cue types are
modelled but cannot activate unsupported targets or labels.

Narration starts at 400ms. The source boundary is derived from the measured start
of the transition segment, quantized to 24fps. A 200ms fade out and 200ms fade in
make an explicit dark boundary between independent sources. There is no crossfade,
morph, geometry merge, retarget or inferred anatomical equivalence.

The approved external frame is reused with a smooth center-based digital approach
bounded to 1.095x. Its recorded organ projection must remain inside the approved
safe rectangle at the maximum approach. The native internal cycle uses the exact
approved frames 168–191 at 24fps. Only complete 24-frame cycles are repeated; no
motion time stretch, speed change, disease-driven rhythm or invented deformation
is allowed. The final cycle count covers speech and a 750ms minimum breathing
budget. `NO_DEAD_VISUAL_TIME_V1` is enforced for the bounded exterior approach
and native-motion interior. No Blender execution is needed for this recipe.

Segment subtitles use measured speech start/end plus the 400ms opening offset.
RTL shaping, UTF-8, diacritics, punctuation, local-font pinning, safe region and
readability limits remain enforced by R2.5A. Timing evidence reports target
availability, scene, cue, frame-quantized visual event and lead/lag. Resolution is
segment-level, not word-level semantic alignment or avatar lip synchronization.
The visible event is the first eligible subtitle frame, or the first source-fade
frame for the transition. It is not a claim that the continuous camera approach
or native action restarts at every spoken cue. Frame onsets are rounded upward;
the fully revealed destination is recorded separately from the source boundary.

## Ownership, quality and fallback

`compileVoiceComposition` admits only opaque approved capabilities. It reuses the
existing execution lease, cancellation, bounded FFmpeg subprocess, private owned
invocation, artifact inspection, SHA-256 evidence and fresh handoff fencing.
Acceptance is label-free and `MUSIC_OFF`. Outputs remain internal review only,
patient-facing false; source licensing and clinical status are not upgraded.

Provider generation is bounded to 120 seconds and canonical audio to 60 seconds.
The existing adapter performs no automatic retry or voice/provider substitution.
`VOICE_FALLBACK_V1` permits at most one same-voice retry; alternate providers or
prerecorded narration require explicit server selection and a new identity.

The scorecard is a bounded, subjective internal product review, not medical
evidence. Repeated term errors, robotic cadence, rushed delivery, clipped endings,
material language errors or dramatic delivery fail even with otherwise high
scores. Automated transcription and sample-peak checks do not prove naturalness
or clinical tone. Actual generated voice remains pending owner listening review;
no fabricated subjective score is assigned. Cost stays null when unavailable.

The next milestone is owner-reviewed voice selection and pronunciation evaluation,
then durable provider/audio reuse integration under the existing artifact system.
Website integration, production licensing clearance and patient approval remain
separate gates.

## Owner entrance polish and catalogue foundation

The owner accepted the tested Arabic cedar candidate's naturalness, pacing,
pauses, synchronization and subtitle presentation. `ORGANHEAL_VOICE_CATALOG_V1`
records this one candidate against its actual narration hash. This does not make
cedar the universal voice, approve English delivery or approve future generations.
Arabic and English CALM, DEEP and WARM_GUIDE presentation definitions support
future male/female audition slots. Untested profiles do not resolve as executable
voice authority and no provider availability is implied.

`HERO_ENTRANCE_V1` reuses the approved exterior frame. A centered exact-aspect
canvas permits a 0.9x starting coverage, rising to 0.99x over the first four seconds
then to the existing 1.095x safety cap before the source fade. Both stages use
`3t²−2t³` easing. This is an honest screen-space approach, not new 3D perspective:
physical camera distance delta is zero. Every frame's organ bounds is checked
against the existing safe rectangle. Source geometry, materials, lighting,
narration timing, fade boundary and native motion are unchanged.

The owner-approved entrance is a SCREEN-SPACE presentation preset. Its minimum
validated safe-rectangle margin is 0.421% of the corresponding frame dimension.
Automatic magnification beyond this approved preset is prohibited without new
per-frame framing/clipping validation. The existing 1.095x cap and compiler bounds
checks remain enforced. Future `TRUE_CAMERA_DOLLY` presets must use the existing
trusted cinematic camera/compiler path and validate actual depth, parallax and
framing separately; this screen-space preset cannot authorize camera-space motion.

`SUPPORTING_AUDIO_CATALOG_V1` models ambience, subtle UI cues, transition cues,
medical motion cues and music without activating any audio assets. Clinical
review defaults OFF; patient education requires explicit recipe opt-in and
licensed sources. Catalogue data cannot grant license or execution authority.
Narration remains primary. The identity is clean, restrained, premium, modern,
medical and non-alarming: no drama/horror, advertising boom hits, fake emergency
sounds or pathological heartbeat effects. No supporting audio is added to this proof.

# Trusted Execution Pipeline V1 — R2.6B

Internal review only; patientFacing=false. No endpoint, delivery activation,
clinical approval, new anatomy, motion alteration or Blender render is introduced.

## Authority

MEDICAL_MOTION_CONTEXT_ADAPTER_V1 accepts an injected server reader that must
authorize owner/reference and return structured source records. This is an internal
adapter boundary, not a public input API. Evidence authority, verification, source
reference and temporal context are preserved. Free medical prose is not accepted.
USER_STATED remains unconfirmed. Current pathologyAuthority is always false,
including for an existing diagnosis: this implementation admits education only.

MEDICAL_EXPLANATION_EXECUTION_PLAN_V1 recomputes the planner from that opaque
context and optional opaque approved visual. A supplied plan must match exactly;
its JSON never supplies instructions. Unknown teaching targets, source/organ
mismatch, copied capabilities and unsafe modifications fail closed. Missing
visuals record TRUSTED_VISUAL_UNAVAILABLE and use narration only. Kidney never
receives a heart substitute. Symptoms retain urgent-care qualifiers and remain
execution-blocked pending the existing clinical safety gate; this milestone does
not introduce a new triage or symptom-authorization path.

readChapterOwnership requires a trusted server reader to bind distinct narration
and composition job attempts to the same owner/context/revision. The binding is
opaque and chapter-specific. ExecutionOwnership confirms each stage before work
and before handoff. No result is published or delivered by this runtime.
Production queue/repository wiring must supply this reader; fixture adapters use
isolated local jobs. Request JSON cannot select readers or job attempts.

## Narration and voice

EXECUTION_NARRATION_BUILDER_V1 uses bounded educational intent templates for LDL,
Heart Age, kidney results, reported chest discomfort and general education. It
does not interpolate measurements, diagnoses, treatments or arbitrary prose.
Unconfirmed reports receive an explicit qualifier. Narration never refers to a
missing internal visual. Source motion is never presented as a patient's pulse.
Editorial templates remain clinically unreviewed; approved voice selection is
not medical-script approval.

The private existing narration issuer admits only opaque validated chapters.
The existing Voice Runtime retains measured PCM timing, transcript verification,
per-segment limits and its 60-second audio limit. Marin is preferred in both
languages. Cedar is an approved same-language fallback only after the explicitly
classified provider availability error. Content mismatch, cancellation, invalid
media or voice drift stop without switching. Onyx is never in selection order.
Only explicit Medical Motion voice calls classify HTTP 429/503 as availability;
legacy speech calls preserve their behavior. No environment/default voice change.

## Chapters, timing and visuals

CHAPTER_COMPOSITION_V1 preserves independent chapter identities and the planner's
240-second chapter ceiling. Existing media composition is bounded to 60 seconds
per invocation. A chapter proof longer than that compiles a bounded first chunk
and explicitly records complete=false and remainingPlannedSeconds; it must never
be treated as a complete long chapter or stitched by repeating narration.
The multi-factor fixture proves two independent chapter plans and measured
composition specifications without rendering all 369 seconds.

The first executable path produces complete short LDL and Heart Age chapters.
Long-form section expansion, chunk scheduling and final chapter assembly remain
unimplemented. This is an explicit limitation, not silent truncation or a relaxed
media limit. No custom rendering class executes here.

MEDICAL_AV_SYNC_V1 drives subtitles and explicit fade-through-dark from actual
segment timing. Target duration can extend safe native presentation by complete
one-second source cycles at speed ratio 1. No sentence is cut, no speech is sped
up, no beat is stretched, and no source is merged or retargeted. Existing source
hashes, master IDs, framing limits, Arabic shaping, lower-safe subtitle placement,
audio normalization and MUSIC_OFF are preserved. Visual availability is exact
compiled-master/hash authority, not a claimed cache hit.

## Identity and acceptance

Context, plan, execution plan, narration plan/script, voice audio, visual master,
chapter composition and final video have separate versioned identities. Evidence
changes invalidate downstream plans/scripts. Voice choice changes audio, not
medical text or visual identity. Subtitle formatting is downstream of narration.
Owner/revision participates in execution binding; no copied serialization issues
authority. Output hash is measured from composed bytes, not a promised SLA.

Acceptance uses synthetic authorized local contexts, real marin speech with
independent transcript audits, the preserved approved R2.4 cinematic and the
existing owned FFmpeg compositor. Rejected speech audits are preserved in TEMP;
no transcript mismatch is normalized into acceptance. No patient data, music,
labels, source binaries or generated media are stored in Git.

Editorial reference sources (these do not approve the asset or personalized script):
- American Heart Association: https://www.heart.org/en/health-topics/cholesterol/hdl-good-ldl-bad-cholesterol-and-triglycerides
- CDC Heart Age: https://archive.cdc.gov/www_cdc_gov/vitalsigns/heartage/index.html
- NHS chest pain: https://www.nhs.uk/conditions/chest-pain/
# R2.6B visual differentiation

`LDL_HEART_EDUCATION_RECIPE_V1` uses a closer exterior approach, generic
heart-region educational focus, an explicit internal source transition at the
narrated transition, complete native cycles, and a fade back to the exterior
for next-action context. No coronary label or lesion is generated.

`HEART_AGE_EXPLANATION_RECIPE_V1` uses a wider risk-metric opening, the same
narration-required source boundary, factor explanation through the existing
subtitles, and a gradual internal reframe with native motion. Tissue aging is
never depicted. These are screen-space compositions, not new anatomical views.

Recipe identity participates in execution, chapter composition and final video
identity. Medical narration identity excludes recipe metadata; approved speech
bytes and meaning remain reusable. Exterior magnification is at most 1.04,
below the approved 1.095 limit; internal presentation only reduces the existing
frame. Geometry, materials, evidence authority and native cycle speed remain
unchanged. Both proofs remain internal-review only.

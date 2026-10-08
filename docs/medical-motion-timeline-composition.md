# MM-PROD-4B — internal multi-base composition V2

V1 remains the single-base path, including its approval RPC, fingerprints,
still-image support and private output. V2 is an additive internal capability
using the existing `medical-motion-compose` job/runtime. No delivery route,
patient timeline request, research profile or anatomy asset is activated.

## Trust and timing

`TrustedTimelineProducer` runs existing medical/anatomy authorization for every
scene before retrieving and probing private storage bytes. It issues an opaque,
immutable V2 approved specification; JSON copies cannot schedule work.
Every base must be a video with an exact profile-aware, ready reuse ledger entry.
The specification contains 2–8 ordered, distinct base artifacts, original scene
indices, job/artifact/SHA identities, rendering fingerprints, actual durations,
and full source-profile snapshots. All scenes belong to one owner/context.

Initial V2 supports durations exactly representable at the normalized 25fps
output rate. Unsupported timing fails explicitly rather than changing scene
duration silently. Total duration is the sum of inspected base durations, at
most 60 seconds. Overlay/narration times are global and validated with existing
presentation primitives against every authorized scene. Narration approval,
ownership, hashes and non-overlap rules remain enforced by the V1 media path.

Each boundary is a cut or a 0.15–0.75 second fade through black. Fade duration
is split equally inside the outgoing/incoming clips; it adds no timeline time.
Adjacent fade intervals cannot overlap inside a segment. Source images never
overlap: no crossfade, morph, registration, mesh mixing or generated frames.
Uncontrolled base audio is always stripped. Only approved audio is added.

## Durable provenance and publication

One new migration adds `medical_motion_timeline_compositions` and ordered
`medical_motion_timeline_segments`. These do not reuse V1 single-base columns.
The existing immutable approved-spec table holds versioned V2 content, including
boundaries and private presentation. `approve_motion_timeline_v2` atomically
validates owner/context, every published reusable base and exact profile identity,
then schedules the existing compose job. It is service-role-only.

`motion_timeline_operation_v2` checks/registers immutable intent and per-segment
reuse epochs. Final publication rechecks the approved spec, current attempt and
lease, complete provenance and every ready reuse identity under ordered database
locks. V1 and V2 provenance are mutually exclusive. Final V2 output is private
and prohibited from entering reusable base ledgers/links.

On retry, the same approved job may reconcile a previously registered immutable
artifact intent. Its original creation attempt remains recorded; only the current
fenced attempt may recover and publish it. An old attempt cannot register/publish.
Profile reconstruction and current medical readiness run again before recovery.

## Media and resource boundary

The separate V2 compositor accepts capability-bound bytes, never input URLs or
arbitrary input paths. Each clip is hashed and inspected, fit to a deterministic
1280×720 intermediate with SAR 1, yuv420p and 25fps, then concatenated in order.
The existing private overlay/audio compositor produces the requested output
aspect ratio and validates dimensions, frame count, duration and audio.
Temporary inputs are exclusive, mode 0600; existing bounded, shell-free FFmpeg
execution and cancellation/cleanup ownership are retained. Each artifact remains
limited to 64MiB; V2 bounds the aggregate base payload to 64MiB as well.

Real acceptance uses red/blue test videos with synthetic audio. It proves order,
black boundary pixels, silence and timing; it is not medical visual qualification.

MM-PROD-4C product orchestration and patient delivery remain future work.

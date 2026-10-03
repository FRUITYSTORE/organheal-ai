# Reusable artifact lookup and cache safety V1

Reuse is an explicit trusted composition option:
`createMedicalMotionArtifactRuntime(client, { mode, reuse: true }, storage)`.
The existing renderer/worker/publication pipeline is reused. The isolated
standalone worker now supports an explicit server environment opt-in described
in [isolated cache acceptance](medical-motion-isolated-cache-acceptance.md).
The installed Windows service configuration remains cache-disabled; no automatic
SCM installation, reboot or production migration occurs. Future service
activation needs reviewed configuration and operational acceptance. The cache
is not a public API and cannot be enabled by queued AI data.

## Identity and privacy

The existing compiler-issued, immutable medical base/output fingerprints are
combined with the actual renderer signature, media, usage scope, DSL/compiler
versions and mechanism ID/version into a SHA-256 V1 lookup key. The renderer
signature covers adapter camera/motion/presentation details that cannot be
conflated even when the generic DSL matches. Patient names/IDs, job IDs, clinical
prose, filesystem paths, timestamps and personalization values are excluded.
No personalization composer runs and no patient text is burned into base media.
Copies, JSON/hash claims and patient-specific geometry cannot mint eligibility.

There is still one artifact registry and one object per durable artifact. Its
existing private origin ownership metadata is retained, not copied into cache
identity or lookup responses. `medical_motion_reuse_keys` is a coordination
ledger, not another artifact database. `medical_motion_reuse_links` records
consumer job/attempt, key/generation, artifact, authorization contract version
and reused/render-created disposition. Job/attempt UUIDs in these private tables
are necessary fencing/provenance references, never reusable identity or shared
media metadata. No user ID or clinical input is duplicated there. Lookup returns
only bounded disposition, generation and media integrity fields, never producer
job/user/context metadata. Storage UUIDs remain opaque.

## Safety before lookup, hit and publication

The handler reconstructs its own context and runs the current Safety Gate,
mechanism/evidence eligibility, anatomy readiness, DSL validation and existing
opaque authorization checks before cache access. Lookup requires a matching
current job context capability and replays those checks. Source/version/license
relationships are checked against the current catalog; explicit license rejection
blocks even internal review. Unresolved licenses may remain internal-review only;
patient-facing use requires the existing explicit commercial clearance and
independent medical/geometry/semantic approval gates. Scope is hashed: an internal
artifact never becomes patient-facing. Current myocardium-dependent scenes still
fail before lookup or rendering. No mechanism approval or anatomy is invented.
Cache additionally requires independently verified anatomy for every used
structure, even for internal review. The actual current heart is therefore cache
ineligible. Existing development rendering can continue without cache registration.
Positive cache/real-Blender acceptance uses explicitly hypothetical TEST-only
review metadata and smoke geometry, never a medically verified asset claim.

Before linking, creating ready identity, and submitting publication, authorization
is revalidated. Database operations independently fence the current job attempt
and lease using the database clock. Publication locks/checks the exact ready
cache generation and artifact. Invalidated or superseded links cannot publish.
No hash, cached artifact or Storage presence replaces current authority.

## Hit, miss and concurrent requests

A primary-key/index lookup reserves a key with one producer job/attempt. An
equivalent live producer causes `CACHE_CONFLICT`, not another render. The loser
uses the existing bounded job retry policy and later reconciles to the winner.
No process-local lock coordinates workers. Concurrency is proven using separate
cache instances and real PostgreSQL, including concurrent handlers, one render,
one object and two separately fenced publications.

On `CACHE_MISS`, the existing owned render, validation, opaque upload, readback,
registry persistence and publication chain remains. Only a newly verified base
artifact created under the reservation can become ready. A valid hit verifies
integrity, links the current consumer attempt, and publishes the same artifact
through the existing ownership/publication RPC without Blender or another upload.
Legacy artifacts lacking cache provenance are not retroactively promoted.

## Integrity and recovery

Supabase uploads add only a SHA-256 metadata value, retain `upsert: false`, and
remain private. The Storage `info` API supplies bounded MIME/size/digest metadata.
Lookup compares it against immutable registry data. Missing objects, MIME/size/
digest mismatch or invalid metadata invalidate the slot and cannot publish.
Metadata/provider errors fail closed; they do not trigger duplicate rendering.
When digest metadata is absent, for recovered bytes, and every 15 minutes using
the database clock, the cache performs bounded full-byte SHA verification.
Storage verification has a 10-second deadline and cancellation boundary; maximum
media size remains 64 MiB. Metadata-only intervals rely on controlled immutable
private Storage writes, not a claim of cryptographically rereading every hit.

Reservation authority follows the existing producer job lease. A crashed/lost
producer can be replaced with a new generation. An upload intent created after
the reservation can be recovered and verified under that generation, even if its
persist response was lost, without rendering/uploading again. Missing incomplete
intents can be discarded from the slot; old registry/object history is retained.
An invalid ready slot may be replaced safely under a new generation with a new
opaque object; old bytes are never overwritten. Lost ready/publication responses
reconcile through the existing idempotent/fenced paths. Unknown states retain the
existing quarantine behavior. Cache history/storage garbage collection is deferred.

## Database and operational boundary

The migration adds the two private coordination/provenance tables, lookup and FK
indexes, and one server-only fenced RPC; it extends the existing result-binding
and owner-scoped metadata resolver. RLS is enabled; PUBLIC/anon/authenticated/
service_role direct table reads/writes are revoked. Only service_role can execute
the privileged RPC, which uses an empty search path and checks current ownership.
Reuse links and published results are immutable. The consumer resolver projects
only that consumer's job/user/attempt, never the producer's private metadata.
The test-only migration/cleanup harness is guarded by localhost/127.0.0.1 and the
exact established isolated database name. It cleans only synthetic test owners.

Deterministic dispositions: `CACHE_HIT`, `CACHE_MISS`, `CACHE_INELIGIBLE`,
`CACHE_STALE`, `CACHE_INVALID`, `CACHE_CONFLICT`. Local counters and optional
operational observation expose lookup/hit/miss/ineligible/stale/invalid/concurrent/
render-created categories only. No PHI, paths, keys, credentials or provider
diagnostics are logged. Telemetry failure cannot change authority.

Internal shared reuse is distinct from delivery authorization. There are no
patient download URLs, sharing endpoints, personalized media, external analytics
or FFmpeg implementation. A future delivery/composition layer must revalidate
current access/readiness and maintain its own identity; a cache hit alone grants
neither user access nor permission to add medical claims. Heart/lung/kidney/liver/
brain TEST contracts prove generic identity/license behavior and real PostgreSQL
miss/ready/hit/link coordination with synthetic bytes. Non-heart rendering and
patient-ready anatomy remain outside that proof.

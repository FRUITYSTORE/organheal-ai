# Durable artifact handoff and fenced publication

The original provider limitation below is a historical acceptance boundary.
See [isolated real Storage acceptance](medical-motion-real-storage-acceptance.md)
for the subsequent real-provider evidence and narrow cancellation correction.

This milestone supersedes the local-candidate-only limitation in
`medical-motion-safe-handler.md`. It supplies an explicitly composed server
runtime, not a deployed worker host, public API, download endpoint or UI.
Production policy requires the durable artifact service. The development-only
legacy candidate consumer remains for existing internal smoke checks.

## Repository evidence and storage decision

Existing laboratory report storage uses private Supabase Storage with owner
checks and temporary signed URLs. Studio media helpers also use public audio
storage/public URLs; those semantics are unsuitable here. The implementation
reuses the installed Supabase client and private bucket pattern, with a small
put-if-absent/readback interface for artifact-specific integrity and recovery.
No second general-purpose upload framework or dependencies were added.

Production persistence is the private `medical-motion-artifacts` bucket. It is
created/checked by the explicit trusted client; a public bucket fails closed.
The migration intersects anon/authenticated Storage object policies with a
restrictive denial for this bucket, including against other permissive policies.
The service-role capability remains server-only. Storage provisioning is not
automatic deployment and has not contacted production.

## Ordered handoff

1. Claim using existing database-clock lease and attempt fencing.
2. Read immutable owner-scoped execution context. Run current Safety Gate,
   authorization, plan compilation and anatomical/render readiness. These gates
   run before looking for cached artifacts as well as before fresh rendering.
3. Reconcile existing registry intents and private bytes before rerendering.
4. If absent, execute trusted rendering and accept only runtime-owned resources.
   Candidate authority binds job, user, attempt, output ownership and dimensions.
5. Reuse artifact validation, reject symlinks/non-files/oversize/changed files,
   read at most the existing 64 MiB policy into a bounded buffer, close the file.
6. Reserve a DB-generated UUID for `(job_id, origin_attempt)` with immutable
   media, byte count and SHA-256. Reservation precedes every storage write.
7. Read the stable opaque key; upload only if absent, with `upsert:false`.
   Regardless of upload response, read back and compare MIME, size and digest.
8. Fenced registry persist marks the intent durable using DB time. Reconfirm
   ownership, then use accepted Step 4 `publish_background_job_result`.
9. Step 4 inserts a result linked by a real conditional artifact FK and completes
   the job atomically. Return `already-finalized` to avoid a second generic worker
   completion. Cleanup the invocation only after known publication success.

The same attempt's existing periodic renewal remains active through storage
read/upload/readback/registration. No new ownership system exists. Publication
has a fresh renewal plus authoritative SQL fencing. New durable executions do
not release the lease into `awaiting-artifact-publication` before persistence.

## Identity, authority and recovery

The DB UUID is also the object key. No filenames, user names, mechanism names,
clinical text, local paths, credentials or URLs are stored in keys/registry.
One reservation per job/origin attempt provides idempotency rather than random
UUID generation alone. Identical replay returns the same row/key; changed bytes
conflict. An eligible new attempt can adopt an earlier artifact of the same job
and owner after checking current gates and stored bytes. Origin identity remains
immutable. Expired attempts cannot reserve, register or publish.

`resume_motion_artifact_job` locks a legacy awaiting job, checks owner/type,
consumes a bounded retry and clears its old attempt. The explicit runtime then
claims fresh ownership and reconciles. A false resume result does not start work.
There is no serialized local-file recovery authority: surviving files may remain
quarantined, but an absent durable object requires a fresh validated render under
the new attempt. Lost pending/host files cannot strand a job on their own.
Exhausted jobs fail explicitly; hosting/scheduling recovery is future deployment
work, not implemented as a daemon here.

Running-job crashes use existing lease-expiry recovery. Reserved intent + object
recovers even if registry persist never committed. A persisted row + absent or
corrupt object fails closed; it is never silently replaced. Already completed
publication is retrievable and cannot be claimed/rerendered. The migration
refuses pre-existing Medical Motion result references requiring manual review;
it does not legitimize unverifiable UUIDs. Other job types retain Step 4 semantics.

The registry is immutable except its one-way persisted transition. RLS plus
explicit privilege revocation excludes direct client/service-role table access;
narrow SECURITY DEFINER RPCs pin their search path. `background_job_results`
gets an artifact FK column constrained equal to `reference_id` when populated.
An insertion trigger requires persisted same-job/same-owner artifacts for Medical
Motion; a completion trigger rejects its ordinary complete mutation without the
current attempt's real publication. No accepted migration is changed.

## Cancellation and cleanup

Installed Storage SDK download supports AbortSignal. Upload does not. Upload
reads an already-closed local file's Buffer; cancellation waits for its result
and guards every later step. Late upload success cannot restore authority or
publish. SQL independently rejects lost/expired attempts. This does not promise
immediate network upload cancellation or bounded provider network latency.

Blender writer termination and output authority remain with existing renderer
logic. There is no deletion during writing or uploading. Known success cleans
only the invocation's owned files. Unknown registry/storage/publication outcome
or ownership loss retains/quarantines the candidate; it never deletes another
attempt's resources. No retention scheduler or broad cleanup daemon is added.

Every normal object write has a reserved intent, so uploaded but unregistered/
unpublished objects are discoverable by UUID and row ownership. They remain
invisible at the retrieval boundary and can only be reconciled for their own
job/owner. Incomplete provider staging objects are a provider responsibility;
future garbage collection needs deployment-specific verification and policy.

## Retrieval and integrity

The only internal retrieval method returns verified metadata for a completed
job, its result and persisted artifact belonging to the requested user/job.
It reads private bytes to check integrity; it returns no bytes, paths or URLs.
Unpublished or another owner's artifact returns no metadata and does not read
storage. Provider exceptions become fixed codes; no raw diagnostics reach
`last_error` or registry fields. Existing immutable clinical context remains the
separate protected source of clinical data.

PNG full decoding/expected dimensions and MP4 bounded container checks reuse
existing renderer validation. SHA-256 establishes byte identity, not clinical
quality, anatomical verification or complete MP4 decoding. Myocardium-dependent
explanations still fail current readiness; cached bytes cannot bypass that gate.

## Failure matrix

| Boundary | Outcome/evidence |
| --- | --- |
| Render/upload/registry/publication succeed | Real PostgreSQL + real Blender + filesystem contract e2e; one linked result, completed, local cleanup |
| Upload fails | Retryable fixed code, reserved intent only, no publication, local quarantine |
| Upload commits/response lost | Stable key readback validates and proceeds; no second object |
| Registry fails before/after commit | New attempt reconciles existing bytes/intent without rerender |
| Publication transient before commit | Identical replay; twice unknown retains running work until fenced recovery |
| Publication commits/response lost | Identical replay reconciles; even twice unknown DB completion remains authoritative |
| Crash after upload/registry | Recreated service/new lease adopts same artifact; local file may disappear |
| Crash after publication | Completed job unclaimable, linked artifact retrievable |
| Ownership lost during upload/before publication | Late success remains unpublished; SQL token/lease fencing rejects it |
| Conflicting replay | Immutable identity/digest conflict; no overwrite |
| Corrupted bytes or persisted object missing | Fail closed, no substitution |
| Local file disappears | Invalid handoff; reserved-without-object recovery can rerender under new valid attempt |
| Duplicate workers/reservations | Claim fencing + job row locking; one reservation per origin attempt |
| Shutdown during upload | Upload may finish, but aborted operation cannot persist/publish; quarantine |
| Legacy awaiting job | Explicit bounded resume/reclaim, reconcile first or rerender if nothing durable |

## Acceptance evidence and limits

Tests use the guarded isolated PostgreSQL 17.11 database on localhost/127.0.0.1,
exactly `organheal_ownership_test_step3c`. Test fixture rows are synthetic and
cleanup is owner-scoped. Environment values/passwords are never printed.

Local Supabase Storage was unavailable. Therefore filesystem put-if-absent,
restart/readback/cancellation/failure tests prove the storage **adapter contract**,
not actual Supabase Storage durability, HTTP MIME/404 behavior or provider crash
semantics. SDK-mock tests and transactional Storage-policy SQL fixtures are
additional contract evidence, not live provider acceptance. The real Blender
development fixture proves infrastructure, not medically approved heart assets.

Before production: verify isolated real provider behavior and deployed policies;
deploy the reviewed migration/private bucket; provision an explicitly capable
worker host with recovery scheduling and observability; retain anatomy gates;
design product delivery separately. None of those are performed here.

Final local acceptance: 991 distinct tests passed, 0 failed, 0 skipped (986
standard targeted tests plus 5 explicit real Blender tests). This includes 31
new real PostgreSQL registry/policy tests, 25 filesystem storage contract tests,
13 real PostgreSQL handler recovery tests and 9 SDK contract tests. All 108
tests in the designated PostgreSQL suites executed; the storage/handler/Blender
suites additionally exercised the same guarded database. TypeScript, the
91-page production build and diff whitespace checks passed. No live Supabase
Storage provider acceptance is claimed.

# Durable job foundation

One generic `medical-motion-render` type uses the existing queue. Its payload is
exactly schemaVersion, executionContextId, executionVersion and sceneIndex;
sceneIndex is a safe integer from 0 to 1023 (the existing maximum scene-list
width). It contains no clinical text, candidate plan, runtime authority, paths,
timeout or capability selection. Context/plan validation reuses the accepted
contract before enqueue; loading revalidates the immutable candidate afterward.

The trusted server supplies owner and a server-issued stable UUID request
identity separately from content. Preserve that identity across response loss.
The atomic RPC creates a context/request mapping and job together. Repeating the
same identity/content/scene returns the same context/job, including terminal work;
repeating the revision with another scene creates one additional job on the same
context. Changed content requires a new request UUID; conflicting identity reuse
returns a static conflict. No clinical string/hash or semantic similarity is used
as an idempotency key. The advisory lock hashes only the opaque owner/request
identities; full-key equality, not hash equality, determines reuse.

A composite context/owner FK and validation trigger prove relational ownership,
payload consistency and execution version. A unique index covers context,
execution version and scene across all job states. Both context and logical job
identities are immutable; ordinary operational lease/status transitions still
work. Protected request mappings persist replay identity. No retention/account
deletion workflow is added. Job request_id uses its opaque generated job UUID,
preserving the existing global request_id uniqueness across scenes and users.

All enqueue and claim entrypoints are service-role-only; context/request raw data
privileges stay revoked. Direct service-role Medical Motion insertion is rejected.
Security-definer code uses an empty search path and qualified relations. Legacy
claim entrypoints safely default to PDF/follow-up; repository callers send an
explicit copied server allow-list. Render workers may opt into the render type.
Both next/by-ID claiming use identical filters before acquiring ownership.
Recovery leaves work in the existing queue; it grants no capability and cannot
bypass filters on re-claim. Attempt fencing, lease renewal and publication RPCs
retain their existing semantics.

Reconstruction is non-executing: validate references, load by context ID plus job
owner, verify versions and reconstruct the existing execution input. This does
not mint authorization, run Blender or assert anatomy readiness. Versions other
than execution version 1 currently fail closed; future supported versions need
their own immutable revision and the existing version component of job identity.

Handler outcome classification is deferred to actual handler integration. No
speculative Promise<void> worker redesign is introduced. That next step must map
invalid input, Safety Gate rejection and unavailable anatomy to permanent safe
outcomes; separate retryable infrastructure failure, ownership cancellation and
publication reconciliation without logging PHI. This foundation adds no handler,
dispatcher registration, rendering, Storage, upload or publication integration.

Rollout must apply the migration before deploying repository clients that send
the new allow-list parameters. Drain old binaries during this additive rollout;
the replaced legacy SQL functions still exclude render work. The new migration
builds on the accepted job/context schema and does not rewrite previous files.

Real PostgreSQL acceptance uses the same guarded disposable local 17.11 database
as context/ownership/publication tests. Run suites without file parallelism.
Concurrency scenarios use independent connections and synthetic content only.

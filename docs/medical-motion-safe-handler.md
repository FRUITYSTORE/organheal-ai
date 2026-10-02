# Safe render handler foundation

Historical milestone record. Its local-only durability limitation and stranded
awaiting state are superseded by [durable artifact handoff](medical-motion-durable-artifacts.md).
The development smoke consumer remains; production now requires durable storage
and fenced artifact publication. The statements below describe the accepted
foundation before that extension.

`createMedicalMotionRenderHandler` is an internal, explicitly render-capable
factory. It is not registered by `createBackgroundJobRuntime`. There is no
worker host, route, storage uploader or artifact publication in this milestone.

The handler validates the PHI-free versioned payload, confirms existing
ExecutionOwnership, reads and reconstructs the immutable context with the
claimed row's user ID, and invokes the trusted execution entry. Asset version
comes from that snapshot. Mode comes from server policy; filenames and existing
renderer timeout/executable/root policies never come from the payload. Existing
Safety Gate and anatomical readiness remain authoritative.

Permanent failures return fixed codes for immediate fenced failure. Context
read transport errors are retryable. Blender failures/timeouts are retryable
only with runtime evidence of termination and successful invocation cleanup.
Unknown cleanup is not retried; retained files need operator investigation.
Unexpected errors are constant diagnostics, with no clinical text or paths.

## Local success and handoff

Existing queued statuses cannot describe local success without lying about
durable completion. `awaiting-artifact-publication` is a single new state:

- The transition locks the job and checks current attempt token and database
  lease time. An identical transition replay reports already-finalized.
- Token remains, lease is cleared, completion time is absent, payload is
  unchanged and no result reference is created.
- Claims and recovery exclude it. Existing complete/retry/fail/renew/publication
  RPCs cannot exit it. A future artifact flow must explicitly reconcile it.
- No local path, clinical content, arbitrary metadata or fake UUID is persisted.

The generic worker processes explicit dispositions; legacy void handlers retain
their old behavior. It fences deferred completion before handing the internal
candidate to a required trusted consumer. Lost/unknown transition state refuses
handoff and disposes the candidate. Transition transport is replayed once with
the identical identity, never by rerunning the handler.
The old in-memory worker cannot consume durable dispositions and fails closed,
discarding any deferred candidate rather than completing or requeuing it.

The candidate grants invocation-specific disposal, media type, execution time
and a private local path. The accepting consumer owns disposal. It must never
serialize the candidate or expose its path to a client. A smoke consumer simply
discards it. This milestone provides no durable handoff guarantee: crash before
transition can consume a bounded retry; crash after transition may lose the
local artifact while leaving nonclaimable pending work. Automatic reconciliation,
storage integrity and retention are acceptance criteria for the next milestone.

Runtime-only resource facts use a WeakMap through existing result wrappers;
JSON/copies cannot supply cleanup or artifact ownership authority. Renderer
remains independent of job/DB ownership.

## Local acceptance

New SQL tests require PostgreSQL 17.11 at localhost/127.0.0.1 and exactly
`organheal_ownership_test_step3c`, with existing local test environment variables.
The manual Blender test also requires the local Blender executable. Run:

```powershell
npx vitest run tests/medical-motion-handler.test.ts tests/background-job-dispositions.test.ts --no-file-parallelism
npx vitest run tests/medical-motion-handler.postgres.test.ts --no-file-parallelism
npx vitest run tests/manual/medical-motion-handler-blender.test.ts --no-file-parallelism
```

The Blender smoke loads the existing builder/script and gates in explicit
development mode, reduces samples and frame count only in the test wrapper,
validates a real local MP4, and discards it. It does not establish full video
timing, production performance or medically verified anatomy. Both shutdown
and real database lease loss must stop the active child and clean its invocation.

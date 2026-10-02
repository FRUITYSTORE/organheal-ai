# Durable execution context foundation

`MedicalMotionExecutionContextRepository` is server-only. Supply an authenticated
owner from trusted server policy separately from the untrusted content object.
Read/reconstruct by **context ID and expected owner**, never ID alone. No browser
API, producer, queue payload or worker registration is introduced by this step.

The database generates ID/time and stores one fixed message/language, candidate
JSON plan, schema/execution version and asset version. Caller/source updates
cannot replace that snapshot. New content requires a new context. Create is not
automatically retried: a lost response leaves commit state unknown. Future atomic
context/enqueue and idempotency design must resolve that boundary.

RLS has no client policies. All table privileges, including service-role direct
SELECT, writes and TRUNCATE, are revoked. Only service-role create/read RPCs are
granted; both use empty search paths and qualified relations. Read matches owner
explicitly despite service-role BYPASSRLS. Row triggers also reject privileged
UPDATE/DELETE. Database administrators retain DDL/administrative authority; this
does not claim resistance to an administrator disabling triggers.

The shared decoded JSON snapshot rejects accessors, unsupported prototypes,
cycles, hidden/symbol properties, nonfinite values and excessive traversal.
Context limits reserve 32 nodes, two depth levels and 512 UTF-16 units for later
database/request envelopes. Individual string, width and key limits remain the
execution limits. Existing plan validation runs before create and after read;
its normalized copy is not persisted. PostgreSQL checks an envelope and storage
size, **not medical validity or the entire TypeScript plan contract**. The trusted
RPC is not an alternative public plan-validation API.

Errors contain static codes only. No repository logs, clinical text in errors,
job payloads, filenames, result metadata or runtime-control storage is added.
Underlying database/HTTP infrastructure logging and retention must also be
configured for PHI before production adoption; the repository cannot control
external administrators, proxies or deployment logging settings.

Reconstruction preserves the exact candidate/message/language and takes
sceneIndex separately. Version 1 is the current execution semantics; incompatible
request/compiler/policy semantics require an execution-version bump and explicit
support policy. Unsupported schema/execution versions fail closed on read.
Reconstruction compares the recorded asset version to the organ module registry;
unavailable versions fail, with no latest substitution. Future callers must use
the recorded context/asset version in trusted execution options. Reconstruction
does not mint runtime authority or assert medically verified anatomy. Normal
execution re-runs Safety Gate, plan validation, compiler, runtime authorization
and anatomy readiness. Current myocardium remains unavailable.

The primitive has no organ-specific columns or fake source binding. Provenance
is deferred until an actual producer exists. `auth.users` deletion is restricted
while contexts exist; no cascade, retention or account-deletion workflow is
implemented. That limitation needs an explicit future policy before deployment;
there is no permanent-retention promise.

Mandatory PostgreSQL acceptance uses only localhost/127.0.0.1, PostgreSQL 17.11,
and database `organheal_ownership_test_step3c`. Missing test configuration fails
the suite instead of skipping it. The RPC-shaped psql adapter exercises the real
repository plus real SQL roles/storage without connecting to Supabase. Synthetic
fixtures are cleaned by guarded administrator transactions, not application APIs.

# Isolated cache activation and acceptance

The packaged standalone worker reads `MEDICAL_MOTION_WORKER_REUSE` from its
trusted server environment: absent or `disabled` preserves normal rendering;
`enabled` requires `MEDICAL_MOTION_WORKER_ENVIRONMENT=isolated-test`. Invalid
values fail startup before claims. Queue data never configures this option.
The existing exact local database and approved isolated Storage host guards
remain mandatory. Enabling also checks cache tables and RPC readiness.

Use `npm run worker:medical-motion:build`, then the existing packaged launcher
with an explicit isolated environment. No production activation or provider
migration occurs. The existing reuse migration is applied only if absent in the
guarded local database. It retains RLS, revoked direct table privileges,
index-backed identity lookup, generation/lease fences and service-only mutation.

Enabled workers emit only `MEDICAL_MOTION_CACHE` and a bounded disposition.
They never emit keys, paths, URLs, credentials or clinical content. A cache hit
still reconstructs its own context, replays current authorization/readiness and
source/license checks, validates Storage integrity, and publishes independently
through the existing fenced result RPC. Cache V1 coordination and recovery are
unchanged. Missing/invalid provider data fails closed; disabling is an explicit
operator action, never an automatic safety downgrade after a provider failure.

Real acceptance uses the approved isolated private `medical-motion-artifacts`
bucket, actual `info` metadata, programmatic local PostgreSQL, real Blender smoke
media and the packaged launcher from a neutral working directory. An external
TEST-only preload supplies hypothetical reviewed metadata and fault probes; the
production launcher never installs it. Missing myocardium remains missing, and
no smoke geometry is asserted to be medically verified or patient-approved.
The actual unverified heart stays cache-ineligible while development rendering
remains available through the normal path.

Provider integrity acceptance covers custom SHA/MIME/size, private/anonymous
access rejection, absent objects, immutable uploads, metadata-first hits and
bounded byte verification after the 15-minute window. MIME/size/digest response
faults are external TEST injections over actual isolated provider responses;
they never alter another object's data or overwrite the canonical object.
Restart probes interrupt only owned test process trees at reservation, render,
upload, ready registration and reused publication. Exact synthetic owner/UUID
cleanup follows confirmed outcomes; ambiguous provider state is retained.
The cache worker harness also owns a unique temporary output root. It removes
that exact resolved root only after process termination and confirmed provider/
registry cleanup, with parent/prefix/symlink guards. Unknown outcomes preserve it.

Windows SCM integration is conditional on an elevated execution token and a
reviewed service configuration contract. The current service remains stopped
and cache-disabled. Its installed configuration/package is not changed here;
worker/process acceptance does not claim Session 0/service acceptance. The
standalone runtime remains compatible with cache-disabled service operation.
No reboot, security policy change or production connection is authorized here.

Isolated latency measurements include polling/publication for full-job timings;
lookup-to-hit timings include readiness and provider verification. These smoke
measurements are not production performance or medical readiness claims.

## Acceptance record (2026-10-03)

1485 automated regressions across 93 files and 76 real acceptance tests across
4 files passed, with no skips: 1561 unique tests. Real groups: 22 cache worker,
32 previous worker/process, 16 isolated Storage, and 6 Blender/handler tests.
TypeScript, production build and diff checks passed. The package has 60 modules
and excludes external TEST fixtures.

Measured reuse baseline: 6 jobs, 1 Blender execution, 1 Storage upload, 1 durable
artifact, 6 independently published results, 5 hits and 1 miss. The first render
job took 5516 ms; four subsequent full-job hit timings were 1233/1212/1525/1333 ms.
Fresh lookup-to-hit timings were 675/608/765/681 ms; the deeper verification hit
took 968 ms. Resource-count spread was 2. This avoided 5 of 6 render invocations
(83.3%) in the eligible TEST workload; the first pair alone avoided 1 of 2 (50%).
Actual unverified anatomy remained ineligible and myocardium-dependent work
failed before cache/render, as required.

The existing local reuse migration was already present; its two RLS tables,
six indexes, two primary keys, service-only RPC and denied direct client writes
were verified. No production migration was applied. Final local counts for
jobs/results/artifacts/keys/links/contexts/requests/users were all zero. Exact
test object deletion and private workspace cleanup completed. The process token
was not elevated; installed SCM state remained stopped and unchanged. This
record accepts isolated packaged runtime/provider behavior, not SCM activation.

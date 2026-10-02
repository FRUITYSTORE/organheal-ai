# Isolated Medical Motion worker hosting and recovery

This milestone adds a standalone supervised worker around the accepted durable
queue, handler, ExecutionOwnership, artifact service and fenced publication.
It adds no request handler, clinical/anatomy authority, public delivery or second
queue. Request/Vercel workers retain their existing non-render capabilities.

## Running the isolated worker

Use `npm run worker:medical-motion` from the repository root with Node 24,
the repository's installed TypeScript and application dependencies, and explicit
trusted server environment configuration. The source loader is scoped to this
Node process; it does not change Next.js or the request runtime. A deployment
image must include TypeScript; a production-only npm install is insufficient.

Required configuration (never log values):

- `MEDICAL_MOTION_WORKER_ENVIRONMENT=isolated-test`.
- `ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL`: PostgreSQL on localhost/127.0.0.1,
  database exactly `organheal_ownership_test_step3c`, PostgreSQL 17.11.
- `ORGANHEAL_TEST_PSQL`: explicit trusted executable.
- `NEXT_PUBLIC_SUPABASE_URL`: the expressly approved isolated project host
  `pmjuyyqofkdbgqmrdbuh.supabase.co`, HTTPS without credentials, alternate port,
  path, query or fragment. The authorized project mapping is
  `organheal-medical-motion-test`; it is not a management-API discovery claim.
- `SUPABASE_SERVICE_ROLE_KEY`: that isolated project's server credential.
- `BLENDER_EXECUTABLE_PATH`: explicit local Blender 5.2.1 executable.
- Existing private bucket `medical-motion-artifacts`; startup never creates it.

The entrypoint deliberately cannot be pointed at a cloud database or another
Storage host. No production deployment is authorized or implemented here.
Apply the new pending-recovery migration only to the guarded local test DB for
this milestone. Do not apply it to production as part of acceptance.

## Resource policy

| Server setting | Default | Accepted range |
| --- | ---: | ---: |
| `MEDICAL_MOTION_WORKER_CONCURRENCY` | 1 | 1–2 |
| `MEDICAL_MOTION_WORKER_POLL_BATCH` | 1 | 1–10 |
| `MEDICAL_MOTION_WORKER_IDLE_MS` | 1000 | 100–30000 |
| `MEDICAL_MOTION_WORKER_ERROR_MAX_MS` | 10000 | 1000–60000 |
| `MEDICAL_MOTION_WORKER_RECOVERY_MS` | 30000 | 1000–300000 |
| `MEDICAL_MOTION_WORKER_SHUTDOWN_MS` | 10000 | 1000–30000 |

Only positive decimal integers are accepted. Error maximum must be at least the
idle interval. Concurrency one is the accepted local operating policy; increasing
it requires host resource sizing. Batch limits bound scheduling, not concurrency.
Claims are serialized even when two operation slots are configured. Idle/error
waits are interruptible; error delay doubles with a bounded exponent and cap.
Existing renderer defaults remain 120 seconds for stills and 20 minutes for video.
SQL/connect/process deadlines and Storage fetch deadlines bound dependency waits.

## Recovery and ownership

Before readiness and periodically, the worker invokes accepted expired-lease
recovery, then the narrowly scoped service-only `resume_motion_worker_pending`.
Expired-lease recovery retains its existing cross-job maintenance behavior; the
worker still claims only `medical-motion-render`. It never recovers live leases.
The new helper locks a bounded set of awaiting Medical Motion rows with
`SKIP LOCKED` and delegates to `resume_motion_artifact_job`. No new authority is
introduced. Existing retry budgets apply; exhaustion becomes failed.

Pending/due retry jobs are selected by existing claim RPCs. Awaiting jobs get new
ownership. The handler revalidates context/Safety Gate and checks registry/Storage
before rendering. Uploaded bytes reconcile even without a persisted registry
response; persisted artifacts reconcile before publication. Completed rows are
excluded. A missing candidate/object permits a fresh render under a new attempt;
a conflict fails without overwrite. UUID intent rows from abandoned attempts may
remain; artifact GC remains outside scope. The unique published result remains
the durable result identity.

DB lease and attempt token are the authority. The worker UUID is diagnostic only.
Renewal RPC uncertainty uses the accepted suspension/loss policy; the host cannot
grant publication eligibility. Recovery never treats an expired worker as owner.

## Shutdown and supervision

SIGINT/SIGTERM and a trusted Node IPC `shutdown` message stop claims and abort
active execution. Existing lifecycle code stops renewal and terminates Blender
before disposing resources when termination is confirmed. Cleanup is bounded.
Exit code 0 means settled shutdown, 1 startup failure, 2 cleanup did not settle.
No host process can handle its own abrupt OS kill. An always-on external
supervisor must terminate the worker's owned process tree on crash/forced timeout,
then restart after backoff. Acceptance on Windows uses `taskkill /PID <owned PID>
/T /F`; it never kills processes by executable name. Bare parent-only forced kill
without tree supervision is not an accepted deployment model.

There is no chosen hosting vendor or Vercel Blender path. A production supervisor,
resource sizing, credentials provisioning and operational alerts remain later
deployment acceptance work. Do not infer production readiness from local tests.

## Internal health and diagnostics

An immutable in-process snapshot provides started/ready, Blender availability,
DB reachability, Storage configuration, active jobs, last successful poll/recovery,
shutdown and settled status. Trusted IPC may request `health`; no public endpoint
exists. A successful poll means queue processing returned, not clinical success.
Storage configuration does not assert perpetual provider availability.

Logs contain fixed events, timestamps, active count, worker UUID and optionally
job UUID. They omit attempt tokens, clinical input, plans, findings, paths, provider
diagnostics, Blender stdout/stderr, URL credentials and keys. Sink failures do not
change ownership. Unknown generic handler errors become a fixed host retry code;
accepted handler-specific dispositions remain unchanged.

## Acceptance execution

Unit/configuration and guarded local SQL suites run without skips. Manual process
acceptance forks the actual composition against real Blender, local PostgreSQL
and real isolated Storage. Its fault hooks exist only in the test fixture, never
in job payloads or the production entrypoint. Run PostgreSQL/provider/process
suites sequentially to prevent test fixtures competing for the shared local queue.

Exact synthetic-owner rows and known registry UUID objects are cleaned after each
scenario. No bucket-wide deletion or production connection is allowed. Interrupted
local render directories are not guessed/deleted; they may be retained by the
accepted fail-safe policy and require separate operator reconciliation.

Earlier interim failures exposed a single-column SQL-to-JSON adapter defect;
the actual transport now selects a derived row before `row_to_json`, with a real
SQL regression. Test assertions were corrected to use `persisted_at`, inspect
both log streams and respect the existing ownership-loss disposition.

One earlier restart completion exceeded a 90-second harness deadline; its precise
cause was not captured. Subsequent complete 20-scenario runs passed with a
150-second completion allowance, which accommodates existing bounded Storage
requests and the existing retry delay. No engine timeout, lease, retry budget or
Safety Gate was weakened. Longer-duration provider/worker soak remains a MEDIUM
follow-up; this milestone proves isolated functional acceptance, not production
availability or load capacity.

## Exact milestone file manifest

- `docs/medical-motion-isolated-worker.md`
- `lib/medical-motion/artifacts/runtime.ts`
- `lib/medical-motion/worker/config.ts`
- `lib/medical-motion/worker/entry.ts`
- `lib/medical-motion/worker/host.ts`
- `lib/medical-motion/worker/local-postgres.ts`
- `package.json`
- `scripts/medical-motion-loader.cjs`
- `scripts/medical-motion-server-only.cjs`
- `scripts/medical-motion-worker.cjs`
- `supabase/migrations/20261002130419_medical_motion_worker_pending_recovery.sql`
- `tests/fixtures/medical-motion-worker-process.cjs`
- `tests/manual/medical-motion-worker-process.acceptance.test.ts`
- `tests/medical-motion-worker-configuration.test.ts`
- `tests/medical-motion-worker-host.test.ts`
- `tests/medical-motion-worker-recovery.postgres.test.ts`

## Measured isolated acceptance

- Worker lifecycle/configuration: 36 passing tests.
- Real PostgreSQL worker recovery: 8 passing tests, zero skipped SQL tests.
- Complete targeted regression: 1036 passing tests across 52 files, zero failures
  or skips. Includes the 44 new tests above and 5 existing real Blender tests.
  Groups: Medical Motion/ownership 712; background jobs 135; clinical/symptom 189.
- Final process acceptance: 21 passing tests, zero failures or skips. Includes
  successful standalone CLI execution without fault overrides, multiple queued
  jobs at concurrency one, all nine interruption/shutdown points, durable awaiting
  reconciliation, explicit stale-token publication refusal, Storage/renewal
  outages, conflicting bytes and dependency startup failures.
- Independent real Storage regression: 15 passing tests, zero failures or skips;
  private access controls, byte readback, overwrite refusal and real Blender MP4.
- Unique accepted test cases: 1072 (1036 + 21 + 15); subsets are not double counted.
- PostgreSQL 17.11 and Blender 5.2.1 LTS executed; Storage uses the approved
  isolated project/private bucket and installed SDK 2.112.3.

Final source validation passed: `npx tsc --noEmit`, `npm run build` (91/91 pages)
and `git diff --check`. Known test objects were removed with scoped readback;
isolated bucket inventory was empty. The guarded local DB had zero remaining
Medical Motion jobs/artifact rows, and no Blender processes remained.

Security review: no remaining BLOCKER/HIGH. MEDIUM: the earlier 90-second
threshold miss lacks a captured root cause; longer worker/provider soak is needed
before production acceptance. LOW: source-loader packaging relies on the installed
TypeScript runtime and Node 24 module behavior; deployment packaging must prove
that contract. Supervision, deployment credentials, resource sizing, alerts,
verified anatomy and product delivery remain deferred production/product gates.

The local Worker Hosting & Recovery milestone is accepted. Staged diff validation
is mandatory before the authorized exact-message commit and normal push.
Production deployment remains unaccepted. No anatomy/Safety Gate/clinical logic
or stable page was changed; `.claude/` and `supabase/.temp/` remain excluded.

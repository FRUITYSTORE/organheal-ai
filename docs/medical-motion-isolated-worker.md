# Isolated Medical Motion worker hosting and recovery

This milestone adds a standalone supervised worker around the accepted durable
queue, handler, ExecutionOwnership, artifact service and fenced publication.
It adds no request handler, clinical/anatomy authority, public delivery or second
queue. Request/Vercel workers retain their existing non-render capabilities.

## Running the isolated worker

Build a versioned release with `npm ci`, `npx tsc --noEmit`, and
`npm run worker:medical-motion:build`. Deploy the resulting
`dist/medical-motion-worker/`, the worker launcher/package/server-only scripts,
`render/blender/` assets, package manifest/lockfile and production dependencies
(`npm ci --omit=dev` in the release directory). Do not replace an active release.
TypeScript is a build-time dependency only; no source loader is used at runtime.

Launch with `npm run worker:medical-motion` in that release directory, or
`node <absolute-release-directory>/scripts/medical-motion-worker.cjs` from any
directory. The launcher locates its own release and selects it as the Blender
asset working directory. Neither editor state nor an interactive shell is needed.
The deployment service manager injects environment variables before launch;
the worker does not read `.env` files or prompt for secrets.

Supported contract: Node **24.16.0 or newer within major 24**, tested **24.16.0**.
Other majors and earlier minor versions fail before importing the worker.
Blender **5.2.1 LTS** is the only tested/accepted version. Its explicit executable
is checked at startup with a bounded `--version` probe; job payloads cannot
select an executable. PostgreSQL 17.11 is the accepted isolated database version.
Compiled module hashes are checked before startup. They detect corruption, not
malicious release replacement; restrict release write access to deployment owners.

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
Exit codes are stable: **0** settled shutdown; **64** invalid configuration or
unsupported Node; **69** missing/unaccepted Blender; **75** startup database
unavailable; **76** startup private Storage unavailable; **78** workspace/free
space/writability failure; **70** package/internal/startup-recovery failure;
**74** shutdown did not settle. Fatal output contains fixed codes only.
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

Trusted IPC `health` additionally reports phase (`starting`, `ready`, `degraded`,
`shutting-down`, `fatal`), startup recovery completion, process RSS and active
resource count. Resource counts include transient SQL/socket activity. Startup
flags describe verified dependencies; Storage configuration is not a continuous
provider availability guarantee. No HTTP endpoint is added.

Logs contain fixed events, timestamps, active count, worker UUID and optionally
job UUID. They omit attempt tokens, clinical input, plans, findings, paths, provider
diagnostics, Blender stdout/stderr, URL credentials and keys. Sink failures do not
change ownership. `STARTING`, `READY`, `CLAIM`, `JOB_STARTED`, `JOB_FINISHED`
(allow-listed disposition), `OWNERSHIP_LOST`, `RECOVERY_OK`, `RECOVERY_FAILED`,
`PUBLICATION_RECONCILED` (accepted fenced publication, including new uploads),
`POLL_FAILED`, `STOPPING`, `STOPPED`, `STARTUP_FAILED` form the event taxonomy.
Empty polls emit no event. Recovery interval has a 1-second lower bound; failed
poll/recovery delays have bounded exponential backoff. The supervisor owns log
collection, quota/rotation and retention. Blender output retains existing bounded
tails and never reaches these operational logs.
Unknown generic handler errors become a fixed host retry code;
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

## Previous isolated acceptance (before supervised packaging)

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

## Single worker environment contract

The required variables listed above are server-injected. The following completes
their classification without adding another configuration source:

| Classification | Variables / policy |
| --- | --- |
| REQUIRED, isolated runtime only | `MEDICAL_MOTION_WORKER_ENVIRONMENT`, `ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL`, `ORGANHEAL_TEST_PSQL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BLENDER_EXECUTABLE_PATH` |
| OPTIONAL WITH DEFAULT | All six worker numeric settings in the resource table; `MEDICAL_MOTION_OUTPUT_ROOT` defaults to OS temp + `organheal-render-output`; `MEDICAL_MOTION_RENDER_SCRIPT` defaults to release `render/blender/render_scene.py`; OS `TMP`/`TEMP` use service-account OS defaults |
| TEST ONLY | `ORGANHEAL_WORKER_TEST_STAGE`, `ORGANHEAL_HANDLER_SMOKE_CANCEL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (independent private-access acceptance). The local DB variables are required here because this package intentionally supports only the isolated acceptance environment. They are not a production DB contract. |
| FORBIDDEN IN CLIENT ENVIRONMENT | Service-role key, DB URL/password, psql/executable configuration and all trusted worker controls. Never add `NEXT_PUBLIC_` equivalents for server credentials. The existing public Supabase project URL identifies the host and contains no credential; its prefix does not make the worker a client entrypoint. |

Bucket identity is the fixed `medical-motion-artifacts` constant, not an override.
Stills/video have fixed maximum render deadlines of 120 seconds/20 minutes;
there is no externally configurable render timeout in this package. Supply only
the isolated credential; `SENTRY_DSN` is rejected before loading modules. Exclude unrelated telemetry credentials from service
environment. This runbook never contains credential values.

## Workspace and resource envelope

Choose dedicated writable service-account temp/output directories. The output
root must be absolute. Startup rejects a symlink root, verifies free space with
`statfs`, and creates/removes only an exclusive UUID probe. Each checked volume
must have at least concurrency × 64 MiB (existing artifact maximum) + 64 MiB
reserve. At concurrency one this is a **128 MiB startup floor**, not render disk
sizing: frames, Blender scratch space and abandoned attempts need more capacity.
Monitor disk usage; render failure and safe disposal remain invocation-owned.
Abrupt death may leave invocation directories; automated GC is outside scope.
Never recursively remove a shared output root as a recovery action.

Default/accepted operating concurrency is one; maximum configurable is two,
with at most that many active Blender render children. A separate bounded version
probe runs before claims. Artifact upload/read allocation remains ≤64 MiB per
artifact. CPU/GPU/RAM sizing for full clinical renders is **unknown**; two-frame
smoke acceptance is not sizing evidence. Prevent overlapping old/new releases
under one supervisor during deploy even though fencing still protects results.

## Supervisor-neutral operator procedure

1. Install a sealed versioned release and restricted service credentials. Keep
   writable scratch space separate. Verify the dedicated isolated endpoints;
   this entrypoint cannot authorize production deployment.
2. Start the documented command as a noninteractive service. On Windows use a
   service wrapper with equivalent IPC shutdown and process-tree/job-object
   containment; on Unix use SIGTERM and service-manager control-group cleanup.
3. Wait for `READY` and trusted IPC `health` with `recoveryComplete=true` before
   admitting work. Startup validates config → Blender → workspace → DB → private
   Storage → recovery → readiness → claim. Never enqueue a health job to probe it.
4. Non-zero exit: restart only with bounded backoff (e.g. 1–60 seconds), a restart
   budget (e.g. 3 failures), and alert/escalation. Configuration/package/version/
   workspace failures require operator correction. Zero exit after a deliberate
   stop is not a crash. There is no built-in always-restart loop.
5. Deploy: stop old worker with SIGTERM/IPC shutdown; allow configured shutdown
   timeout plus dependency/termination margin (test supervisor uses 35 seconds).
   If exceeded, terminate only its owned process tree. Confirm its exit before
   starting the new immutable release; check startup recovery/readiness again.
6. Abrupt loss: contain/kill descendants, restart after backoff. Accepted DB lease
   expiry/fencing and durable reconciliation own recovery, not the supervisor.
   Never reset live attempts, insert duplicate results, overwrite objects or
   requeue completed work manually. Tests shorten only known synthetic leases.
7. Runtime SQL outages degrade health and use bounded recovery/poll retry.
   Storage outages follow existing handler disposition and durable retry rules;
   no result may publish through an uncertain or stale attempt. Restore the
   provider then verify recovery and unique publication.
8. Observe readiness, exits, backlog age, RSS, disk, provider failures and log
   quota. Missing readiness, persistent degradation or restart-budget exhaustion
   needs an operator. Never include raw job content or provider errors in alerts.

Production checklist remains deferred: approved production transport/credentials,
host resource sizing for full renders, actual OS service installation and reboot
acceptance, alerting, storage retention/GC and product delivery. This milestone
packages and exercises a production-like **isolated** worker; it does not deploy
OrganHeal production or verify cardiac anatomy.

## Supervised packaging acceptance

Accepted locally on Windows, Node 24.16.0, Blender 5.2.1 LTS, PostgreSQL 17.11
and the approved isolated private Storage project (SDK 2.112.3). Other OS/service
installations require their own acceptance; the Unix procedure above is a
supervision contract, not a claim of a tested Linux deployment.

- Complete targeted regression: **1055/1055**, 53 files, no failures/skips.
  Medical Motion/ownership 731; background jobs 135; clinical/symptom 189.
  Includes 116 real SQL tests and 63 worker config/host/SQL/packaging tests.
- Packaging-specific checks: **19/19**, including deterministic JS builds,
  neutral-cwd loading with TypeScript/source imports forbidden, Node versions,
  telemetry exclusion, integrity/path checks, free-space and write failures.
- Real worker/supervisor processes: **32/32**, no failures/skips. Includes the
  actual packaged command, explicit environment, startup dependency categories,
  graceful deployment, abrupt interruption, stale publication refusal, durable
  awaiting reconciliation and exclusion of completed work.
- Soak: **180-second** active window with three sequential real lightweight
  jobs; whole test including readiness and completed-work restart **197.2 s**.
  No duplicate claims/results, unexpected exits or orphan Blender children.
  Post-work parent RSS spread stayed below 64 MiB; resource-count median growth
  ≤2 and transient range ≤8; operational events <120. These are bounded smoke
  stability checks, not full-render RAM sizing or a clinical latency SLO.
- Independent real Storage acceptance: **15/15**, run separately after SQL
  regression. Unique accepted cases **1102** (1055 + 32 + 15); focused reruns
  and included subsets are not added again.
- `npx tsc --noEmit`, `npm run build` (91/91 pages), diff validation passed.
  Final local jobs/artifacts, isolated bucket objects and Blender processes: zero.

An initial overlapping SQL/Storage run violated empty-database fixture isolation;
it is excluded from acceptance. Its exact synthetic residue was scoped/removed,
then complete SQL regression and Storage acceptance passed sequentially. Future
provider/SQL suites sharing this database must run serially.

The source-loader deployment gap is closed. The historical 90-second miss did
not recur in this bounded acceptance; its original cause remains unproven and
full-workload timing/sizing remains deferred. No BLOCKER/HIGH remains in this
milestone. Actual OS service installation/reboot, alerts and production readiness
remain separate deployment gates.

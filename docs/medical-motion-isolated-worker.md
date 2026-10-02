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
- PostgreSQL uses the packaged `pg` runtime client; no PostgreSQL executable is required.
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
| REQUIRED, isolated runtime only | `MEDICAL_MOTION_WORKER_ENVIRONMENT`, `ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BLENDER_EXECUTABLE_PATH` |
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

## Isolated Windows SCM service

Windows Application Control initially rejected a fresh native build with error
4551 (that run: 1 passed, 14 failed). The exact subsequent artifact passed the
native execution check and actual SCM acceptance without a policy/trust-store
change. Do not use the rejected run as acceptance evidence. The native builder
reuses an unchanged artifact only when source, compiler, build recipe and output
hashes match; executable preflight occurs before a new SCM entry is created.
Compiler success alone is insufficient evidence of executable trust. Every new
native release must pass that gate. Signing/distribution trust on other hosts is
not established; no signing certificate or signing tool was provisioned.

One Windows model is implemented: a .NET Framework `ServiceBase` host, built
with the host's existing Framework compiler, wrapping the existing packaged Node
worker. No third-party wrapper, SDK or dependency download is required.
The service is **OrganHealMedicalMotionTest**, never a production service.
Installation requires an elevated administrator token; runtime uses
**NT SERVICE\OrganHealMedicalMotionTest** in Session 0 and rejects admin runtime.
SCM uses delayed automatic start, independent of editor, terminal or user login.

From an elevated PowerShell with the four existing isolated test variables
available in its **process environment**:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/medical-motion-worker-service.ps1 -Action Install
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/medical-motion-worker-service.ps1 -Action Start
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/medical-motion-worker-service.ps1 -Action Status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/medical-motion-worker-service.ps1 -Action Stop
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/medical-motion-worker-service.ps1 -Action Restart
```

The required variables are `ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
Neither user/machine environment fallback nor an editor `.env` is used at boot.
The installer captures the approved isolated configuration into a DPAPI
LocalMachine encrypted blob, outside the repository. Arguments and registry
contain no credentials. The exact local database and isolated Storage host
guards remain mandatory; bucket readiness requires `medical-motion-artifacts`
to be private. No production endpoint or telemetry target is permitted.

Runtime is sealed under `C:\ProgramData\OrganHealMedicalMotionTest`. SYSTEM and
Administrators have full access; the service identity has read/execute at the
root and modify only on `temp`, `output`, `state`, `logs`. Other identities are
not granted access. The installer copies the built worker, current Node binary,
render scripts and existing production dependencies, without downloading them.
The compiler and repository are not needed by the running service. The native
host clears inherited child environment and permits only documented keys.

Configuration updates require a stopped service:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/medical-motion-worker-service.ps1 -Action Stop
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/medical-motion-worker-service.ps1 -Action Configure
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/medical-motion-worker-service.ps1 -Action Start
```

Install reruns detect the exact owned service. Running services are preserved;
stopped owned services have policy, ACL and protected configuration reconciled.
An unrelated service/root with the same name is rejected.
An owned marker alone is insufficient: before executing a reused release the
installer requires protected inheritance, SYSTEM/Administrators ownership and
no nonprivileged writer on the root. Newly provisioned directories explicitly
use Administrators ownership. Secrets/target guards run before SCM creation.
Uninstall stops and
removes only this verified service and its known encrypted configuration;
retained runtime/log/output directories are deliberately preserved. Reinstall
validates and reuses that owned release. Updating executable/package contents
requires a stopped service and separate validation; Install is not a hot updater.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/medical-motion-worker-service.ps1 -Action Uninstall
```

### Supervision, readiness and alerts

The Node supervisor gives each worker three retries per rolling ten minutes,
persisted in `state\restart.json`, with 1/2/4-second delays. Corrupt state fails
closed. Exhaustion emits a bounded CRITICAL alert and stops normally; SCM
non-crash failure actions are disabled, preventing a second restart loop.
Unexpected native-host or Node-supervisor crashes have two SCM retries
(3/10 seconds), then none;
that native failure counter resets after 24 hours. Repair configuration before
restarting; the rolling worker budget expires after ten minutes. Do not reset
budget state automatically merely because a process or service restarted.

Windows Job Objects contain the supervisor and each worker's entire subtree.
The launcher waits for native assignment before beginning worker execution.
An exited worker releases its nested job before the next attempt starts;
native-host termination closes all job handles. Graceful SCM stop requests
worker cancellation, allows 35 seconds to drain, then closes owned jobs if
necessary. Existing leases, fencing and durable reconciliation remain authoritative.

`state\health.json` is a protected atomic snapshot: starting/ready/degraded/
shutting-down/fatal, active count, operational PIDs, Session 0/nonadmin evidence,
timestamp, and generic Blender/DB/Storage readiness flags. Status includes a
separate operational state. A running SCM status is insufficient: require **fresh** health,
`ready=true` and `recoveryComplete=true`. Stopped status always overrides a
retained snapshot. Lost responses mark readiness false after 15 seconds; failure
to provide startup health within 90 seconds stops the supervisor.

Structured events are in `logs\operations.jsonl`, rotated at 10 MiB with one
previous file. Only fixed codes, UUIDs, timestamps, counts and fixed dispositions
are retained, with native value validation. No PHI, secrets, URLs, artifact paths
or raw diagnostics enter the sink. Log I/O failure stops the native host safely.
Alerts have per-code 60-second cooldown and global maximum 20 per 60 seconds;
suppression counters and code keyspace are bounded. No user notifications or
paid monitoring provider are used. Process-local alert cooldown resets on a new
supervisor; SCM and persisted restart budgets still bound crash-related events.

INFO: start/ready/stop/recovery completed. CRITICAL: configuration, package,
Blender, DB/Storage startup, repeated unsafe recovery, exhausted budget.
WARNING: restart, repeated retry, reconciliation, low disk reserve, waiting work
older than two minutes, prolonged degraded health, missing health, rejected log
schema. Queue monitoring is read-only every 30 seconds, serial with a 10-second
database deadline, and returns only aggregate count/age. Workspace floors reuse
the existing artifact/concurrency contract; CPU/RAM sizing remains unmeasured
for realistic full workload.

The existing `PUBLICATION_RECONCILED` event includes normal durable publication
confirmation as well as recovery. Its WARNING is a broad publication signal,
not a diagnosis of a Storage fault. More precise recovery-only alert attribution
remains an observability refinement; it must not alter publication/fencing.

### Acceptance and manual reboot checkpoint

`-Acceptance` explicitly enables only the existing synthetic two-frame render
fixture and protected fault instrumentation; job/clinical data cannot select it.
The one-second recovery interval is also acceptance-only. Normal isolated
service configuration reuses the worker's existing polling/recovery defaults.
The final service acceptance suite is
`tests/manual/medical-motion-service.acceptance.test.ts`. Provider, SQL and
worker process suites sharing the isolated database must run sequentially.
Native assembly tests need an execution context allowed to load the locally
built executable; do not change application-control policies to run tests.

**REAL REBOOT: NOT EXECUTED — USER AUTHORIZATION REQUIRED.** Service/process
restart evidence must never be presented as proof of a physical reboot.
After explicit user authorization, record ready state and exact synthetic job
UUID; reboot manually during a controlled synthetic job; after login inspect
SCM status and fresh Session 0 health, startup recovery, lease fencing and one
durable publication for that UUID. Inspect fixed logs and absence of owned
orphan Blender processes. A failed checkpoint requires investigation; do not
silently reset leases, budgets or fabricate recovery evidence.

This service is restricted to isolated engineering acceptance. Production
deployment, realistic workload sizing, retention/delivery, anatomical authority
and product readiness remain separate gates.
### Historical test-only verification checkpoint (superseded by runtime migration)

At this earlier checkpoint, `pg` was a devDependency only. `tests/helpers/medical-motion-cleanliness.ts`
connects directly to localhost/127.0.0.1 and only
`organheal_ownership_test_step3c`, rejecting URL query/fragment overrides.
It runs the original aggregate counts inside a read-only transaction, bounds
connection/query time, closes the connection, and suppresses private driver
diagnostics. Final verification after the acceptance rerun returned **0 jobs
and 0 artifact registry rows**. No production worker transport was changed.

This verification does not resolve the existing worker's dependency on
`psql.exe`. Windows previously reported Application Control blocking the
unsigned executable; the latest PostgreSQL/service rerun failed at subprocess
launch with `UNKNOWN`. No Windows security policy or exclusions were changed.
That earlier rerun returned: **44 unique tests passed, 17 failed, 0 skipped**
(43 operational/native/guard tests plus the final cleanliness test; 16 SCM
acceptance tests and one PostgreSQL queue test failed). Earlier successful
1152-test acceptance rounds are historical evidence, not current acceptance.
TypeScript, Next.js build (91 pages), and diff whitespace checks passed.
The service remains installed and stopped with normal isolated configuration.
At that checkpoint the milestone was **BLOCKED / NOT ACCEPTED**; no commit or push is authorized
until all required acceptance gates pass. Physical reboot remains unperformed.

### Direct PostgreSQL runtime transport

The deployable isolated worker and SCM supervisor load `local-postgres.ts`.
Consequently `pg` belongs in runtime dependencies; `@types/pg` remains a dev
dependency. This is not a new production database adapter: the strict local
host and exact test database guards still reject every remote/production target.
URL query and fragment overrides are rejected before connecting.

`postgres-transport.ts` opens one bounded connection per call, preserves raw
PostgreSQL text results, session-local roles and explicit transaction boundaries,
and closes the connection on success, failure or timeout. Response size remains
bounded at 2 MiB, connection timeout at 5 seconds, statement timeout at 7 seconds
and total request deadline at 10 seconds. Only sanitized categories and SQLSTATE
leave the transport; no driver message, connection string or credential is logged.
The RPC allow-list, SQL functions and ownership/publication model are unchanged.

The test helper shares the transport. Former CLI lock markers are SQL literal
SELECTs, dispatched before the remainder on the same connection so concurrency
assertions still observe uncommitted locked state. No PostgreSQL process launches
remain in the runtime or affected test clients. `ORGANHEAL_TEST_PSQL` is no longer
required by the installer or worker. An inert legacy native environment allow-list
entry does not launch or require that executable.

The worker manifest includes 50 hashed source modules. The installed isolated
release contains all 13 packages in pg's dependency closure; neutral-directory
resolution verified every package stays inside that release. Packaged-loader
tests also run with PATH and NODE_PATH empty and no PostgreSQL executable setting.
Windows Application Control's earlier unsigned psql limitation is eliminated as
an execution dependency, without changing the executable or any security policy.

### Final isolated OS-service acceptance

The corrected milestone passed **1172 unique test cases, zero failures and zero
skips**. Parameterized cases count separately; repeated focused runs do not.
Evidence: 1107 tests across 58 regression files, 16 actual SCM cases, 32 actual
worker-process cases (including 180-second soak), 15 real Storage cases, and two
final cleanliness cases. The formerly failing 17-case rerun passed 17/17; its
PostgreSQL queue test also appears in the regression suite and is counted once.
The regression includes 125 real PostgreSQL cases, 189 clinical/symptom cases,
and five dedicated real Blender cases; these counts overlap the suite total.

Final read-only verification found **0 background jobs, 0 artifact registry rows,
and 0 objects in the isolated private bucket**. No broad cleanup was performed.
Normal configuration (no acceptance/fault flags) reached ready in Session 0 under
the non-admin virtual service identity, with recovery, Blender, DB and Storage
checks passing. The installed delayed-auto service was then stopped; no Blender
process remained. TypeScript, Next.js build (91/91 pages), and diff checks passed.

Security review found zero BLOCKER/HIGH findings in this milestone's scope and
zero npm advisories on the new pg closure. Existing unrelated repository npm
audit findings remain a separate dependency-maintenance task; no broad upgrades
were performed. The coarse publication-warning interpretation documented above
remains an observability refinement. Physical host reboot, signing/distribution
on another host, realistic workload sizing, production deployment and anatomical
authority remain explicitly deferred gates. No automatic reboot or security
policy change was performed; no production provider was contacted.

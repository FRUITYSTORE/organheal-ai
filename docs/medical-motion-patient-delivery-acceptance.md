# Patient Delivery Orchestration V1 acceptance

Repository checkpoint: `C:\Users\baraa\organheal-ai`, branch `codex/medical-motion-worker-execution`, starting HEAD `350d9f7a6d0d888f819eb022b23422910d7e59c9`, upstream 0/0, staging empty, tracked tree clean. Unrelated untracked `.claude/` and `supabase/.temp/` were excluded throughout. No production provider connection, automatic reboot, service configuration change or security-policy change is part of this milestone.

## Implementation and actual acceptance

The new product read model links existing trusted revisions, contexts, base jobs, approved specs, private compose jobs and published registry records. The API reuses existing verified Bearer authentication and exposes only explicit product projections. Creation, owner status/history/cancel, bounded progress, medical unavailable and 60-second private access are implemented. No patient page was changed; no new dependency was installed.

Actual isolated acceptance passed **11/11**, without skips, using two real synthetic Supabase Auth sessions, guarded local PostgreSQL, actual Blender, actual FFmpeg and the private dedicated test Storage bucket. A reaches ready and downloads privately; B cannot read/cancel/sign A's UUID or use ordinary bucket access. Double-click resolves the same product request. A/B share one base with **one Blender execution and two private FFmpeg compositions**; Arabic/English finals differ, and identical replay adds zero executions.

Queued cancellation preserves base infrastructure. A cancellation while B needs that base preserves B's final. Running FFmpeg cancellation terminates the process and produces no published result. Approval/publication race barriers prove cancellation winning prevents orphan specs/jobs and fences uploaded bytes; ready winning preserves its final. Publication interruption retries with the original spec and stable product request. The actual signed URL expires after a 66-second wait; reissuing for the authorized owner works without recomposition. Current production anatomy authority returns unavailable and creates no private approval.

Real acceptance uses development TEST anatomy/script fixtures only. Heart/lung/kidney/liver/brain scene contracts are tested without claims of medically verified geometry. Current myocardium readiness remains blocked. Installed service stays render-only; production source provisioning and opt-in composition/delivery host activation are separate rollout requirements.

## Corrections discovered during implementation

The initial real run exposed PostgreSQL command-snapshot visibility when an outer SELECT tried to join a spec inserted by the approval function. The operation now performs the existing approval RPC and reads the inserted owned spec in a separate PL/pgSQL statement inside the same transaction. Product/spec/job linkage remains atomic; mismatch rolls the transaction back. Focused tests cover atomic replay, wrong-language rollback, copied/cross-owner approval rejection and cancellation winning approval. Terminal failed cancellation is a no-op.

Two new fixture assertions initially expected singular organ identifiers; they were corrected to the existing `lungs` and `kidneys` catalog identifiers. This changed test assertions only. No medical gate, schema criterion or test case was removed.

## Verification record

The complete automatic affected regression was run once after focused corrections: **1,680/1,680 tests across 102 files, zero skips**. This includes 55 new API/PostgreSQL tests and the previous 1,625 tests covering personalization, cache, artifacts, scene/mechanism/anatomy, background ownership/publication, worker/service packaging and clinical/symptom contracts. Focused PostgreSQL rerun passed 29/29; the final full run includes all 26 API tests.

The five previous real acceptance suites passed **64/64 across five files**, without skips: durable personalization 12, composition media 23, composition pipeline 7, real Storage 16 and Blender handler 6. Including the new actual delivery suite gives **75/75 real tests across six files**. Total unique final acceptance: **1,755/1,755 across 108 files, zero skips**. Focused/debug runs are not added to this total. Unchanged SCM acceptance was not rerun.

`npx tsc --noEmit`, `npm run build` and `git diff --check` passed. Build retains the previously existing dynamic filesystem tracing warning in `render/artifact-output.ts`; it completed successfully with 91 static pages. No new production dependency, default heavy HTTP execution or service activation was introduced.

## Final isolated cleanup and security

Programmatic PostgreSQL verification first required localhost/127.0.0.1 and the exact `organheal_ownership_test_step3c` database. Final counts were **zero in all ten public tables**: background jobs, job results, execution contexts, source requests, delivery requests, artifacts, reusable keys, reusable links, composition provenance and approved specs. Local synthetic `auth.users` count: **zero**.

The pinned isolated Supabase test host was verified distinct from the repository's production target before connection. Final `medical-motion-artifacts` bucket remained private with **zero objects**; isolated Auth had **zero users**. Acceptance removed only tracked synthetic users/opaque objects and exact local fixture owners. Final verification was read-only. No production target was contacted.

All **three new migration function bodies** match the tested database. RLS is enabled; direct table privileges are absent for anon, authenticated and service_role. Only the operation RPC is executable by service_role; both helper functions are inaccessible to application roles. SECURITY DEFINER RPC/projection have empty search paths. The immutable trigger is enabled, and all five foreign keys are validated.

Review covered owner IDOR, copied UUIDs, server-only approval authority, private transport expiry, diagnostics/PHI leakage, immutable identity, approval/publication cancellation races, shared base preservation, current medical authority and centralized eligibility. No remaining BLOCKER/HIGH/MEDIUM/LOW defect was identified within this foundation scope. Deferred rollout requirements: verified patient anatomy, trusted source-reference provisioning/discovery, explicit composition-capable host integration, patient UI and later entitlement/quota enforcement. Already issued signed transport expires naturally; medical revocation blocks new signing rather than pretending to revoke an existing bearer link instantly.

**Milestone: ACCEPTED as a patient delivery orchestration foundation with isolated TEST fixtures.** This does not constitute production deployment or clinical approval. The authorized exact-file commit/push receipt is supplied in the final report.

## Exact milestone file manifest

Only these 19 files are intended for staging. Protected unrelated directories are excluded.

```text
app/api/medical-motion/requests/route.ts
app/api/medical-motion/requests/[requestId]/route.ts
app/api/medical-motion/requests/[requestId]/cancel/route.ts
app/api/medical-motion/requests/[requestId]/access/route.ts
docs/medical-motion-patient-delivery.md
docs/medical-motion-patient-delivery-acceptance.md
lib/medical-motion/artifacts/runtime.ts
lib/medical-motion/delivery/api.ts
lib/medical-motion/delivery/contracts.ts
lib/medical-motion/delivery/repository.ts
lib/medical-motion/delivery/service.ts
lib/medical-motion/worker/local-postgres.ts
supabase/migrations/20261003053232_medical_motion_patient_delivery.sql
tests/helpers/medical-motion-artifacts.ts
tests/helpers/medical-motion-delivery.ts
tests/helpers/medical-motion-rpc.ts
tests/manual/medical-motion-delivery.acceptance.test.ts
tests/medical-motion-delivery-api.test.ts
tests/medical-motion-delivery.postgres.test.ts
```

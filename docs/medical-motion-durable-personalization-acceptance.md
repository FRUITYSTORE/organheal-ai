# Durable Personalization Jobs V1 acceptance

Date: 2026-10-03. Repository: `C:/Users/baraa/organheal-ai`.
Branch: `codex/medical-motion-worker-execution`. Starting HEAD: `f4543a994ff692bd6b7d68268d9c6f4721bd9eb1`; initial upstream 0/0, staging empty, tracked tree clean. Protected unrelated untracked directories were excluded throughout.

Architecture and operational boundaries: [durable personalization](medical-motion-durable-personalization.md).

## Validation evidence

| Check | Result |
|---|---|
| New producer/spec tests | 29 passed |
| New local capacity tests | 3 passed |
| New real PostgreSQL approved-spec/job tests | 18 passed, actually executed |
| Added measurement regression | 1 passed within 12 passing handoff tests |
| Full affected regression, run once | 100 files, 1,625 unique assertions; initial 1,594 passed / 31 failed / 0 skipped |
| Necessary correction | Test-only legacy fixture cleanup now checks deferred constraints before re-enabling the job trigger |
| Affected correction rerun | Four files, 55/55 passed; replaces the corresponding results, not additional unique test counts |
| Consolidated automatic result | 1,625/1,625, 100 files, 0 skipped |
| Actual media acceptance | 64/64, five files, 0 skipped |
| Unique total | **1,689 passed / 105 files / 0 skipped** |
| TypeScript | `npx tsc --noEmit` passed after the final correction |
| Build | `npm run build` passed; Next.js 16.3.2, all 91 pages generated |
| Whitespace | `git diff --check` passed |

The full-run failures were traced to deferred-FK trigger events in legacy fixture teardown. Rolled-back teardown left synthetic jobs, causing empty-database checks in three other files to fail. The correction changes test cleanup only, preserves the deferred FK, and weakens no runtime or acceptance rule. Exact failed-run synthetic owners were verified against the run timestamp and fixed test context, cleaned with parameterized owner IDs, and all affected files passed afterward. The unchanged full suite was not rerun.

Actual media files: composition media 23; composition pipeline 7; durable personalization 12; real Blender handler 6; isolated real Storage 16. Actual Blender 5.2.1 and FFmpeg/FFprobe 9.0.2 executed. Media tests run through worker ownership and durable publication, not solely the compositor. Existing worker packaging tests load the compiled closure from a neutral working directory without global psql or runtime TypeScript. Installed SCM entry/configuration/launcher were unchanged, so SCM/reboot acceptance was not repeated.

## A/B baseline

One reusable base, two owner/context-bound approved specs and private finals: **one Blender execution, two FFmpeg compositions, one cache miss, one cache hit, one Blender avoided**. Identical A replay adds **zero Blender and zero composition**. Arabic A and English B preserve the two-frame base timing. Observed pair: 5,635 ms overall; FFmpeg aggregate 434 ms; final output aggregate 302,766 bytes. These are short local TEST measurements, not production latency or billing estimates.

Recovery tests cover approval/job restart without rereading the health source, FFmpeg crash/retry, persisted upload intent, interruption before publication, lost committed-publication response, duplicate requests during recovery, current asset drift, and cancellation from a separate runtime. Cancellation kills actual running FFmpeg, revokes the durable lease and produces no result/publication. Whole-body slot/spec fixtures cover heart, lung, kidney, liver and brain without anatomical claims.

## Final isolated cleanup and security

Strict guarded target: local PostgreSQL only, exact `organheal_ownership_test_step3c`, no production fallback. Final counts are **zero in all nine relevant public tables**: background jobs, job results, execution contexts, requests, artifacts, reusable keys, reusable links, composition provenance and approved specs. Local synthetic `auth.users`: **zero**.

Final dedicated non-production Supabase `medical-motion-artifacts` bucket remains private and has **zero objects**. Provider acceptance removed only exact tracked synthetic UUIDs and verified absence. No production Supabase connection occurred.

All four new RPCs have SECURITY DEFINER, empty search path, service-role execution and no anon/authenticated execution. Approved-spec RLS is enabled; direct SELECT/INSERT/UPDATE/DELETE grants are absent for anon, authenticated and service_role. Relevant immutable triggers are enabled; owner/job FK is validated, deferred NO ACTION. All **12 migration function bodies** match the tested local database exactly.

## Review and disposition

No remaining BLOCKER/HIGH/MEDIUM/LOW defect identified within the approved V1 scope. Deferred product work: additional medically approved source mappings, richer approved charts/narration libraries, automatic post-base product orchestration, trusted priority policy, durable billing/telemetry aggregation and production provisioning. These are not silently represented as implemented.

The runtime capability is explicit and opt-in; installed service stays render-only. The trusted injected Health Intelligence loader maps only `wellnessScore` with fixed bilingual wording. Private approvals do not bypass clinical readiness. Unverified myocardium remains blocked; no patient-facing medical approval, dataset, anatomy fabrication, public delivery route, paid AI/TTS call or stable UI change was introduced.

**Milestone: ACCEPTED for trusted durable V1 infrastructure**, subject to the authorized exact-file commit/push receipt in the final report. Clinical anatomy and production delivery remain separately gated. Recommended next large safe milestone: trusted asynchronous delivery orchestration for internal-review artifacts, including post-base scheduling and owner-scoped request/status/cancel APIs; no implementation in this phase.

## Exact milestone file manifest

These 27 files are the only intended staging paths. `.claude/` and `supabase/.temp/` remain untouched and excluded.

```text
docs/medical-motion-durable-personalization.md
docs/medical-motion-durable-personalization-acceptance.md
lib/jobs/job-types.ts
lib/medical-motion/artifacts/repository.ts
lib/medical-motion/artifacts/runtime.ts
lib/medical-motion/composition/approved-spec.repository.ts
lib/medical-motion/composition/approved-spec.ts
lib/medical-motion/composition/authorization.ts
lib/medical-motion/composition/base-inspection.ts
lib/medical-motion/composition/compositor.ts
lib/medical-motion/composition/job-runtime.ts
lib/medical-motion/composition/metrics.ts
lib/medical-motion/composition/operation.ts
lib/medical-motion/composition/producer.ts
lib/medical-motion/composition/scheduling.ts
lib/medical-motion/composition/service.ts
lib/medical-motion/worker/local-postgres.ts
supabase/migrations/20261003042649_medical_motion_approved_personalization.sql
tests/helpers/approved-personalization.ts
tests/helpers/medical-motion-artifacts.ts
tests/helpers/medical-motion-rpc.ts
tests/manual/medical-motion-durable-personalization.acceptance.test.ts
tests/medical-motion-composition-handoff.test.ts
tests/medical-motion-composition-job-capacity.test.ts
tests/medical-motion-job.postgres.test.ts
tests/medical-motion-personalization-jobs.postgres.test.ts
tests/medical-motion-personalization-producer.test.ts
```

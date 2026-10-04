# Verified payment provider integration V1 acceptance

Accepted for isolated TEST/development foundation on 2026-10-04. Real external Stripe callback remains **DEFERRED**, as explicitly permitted by the milestone. This is not live-payment, production-migration or verified medical-anatomy release acceptance.

Checkpoint: `C:/Users/baraa/organheal-ai`, branch `codex/medical-motion-worker-execution`, starting HEAD `cae4f99ddd8ed91c4f40d99a5300c04bd96b9325`, upstream initially 0/0, staging empty. No unexpected tracked changes. Protected unrelated untracked directories were not read, modified or staged.

## Implementation and review

The existing Stripe service and checkout/webhook/portal routes are reused. Stripe 23.0.0 is pinned with its lockfile and official raw-body signature verification. Explicit TEST-key and deployment gates prevent live billing or production Supabase use. Client amounts, currencies, plans, Price IDs, allowances, successful-payment claims and anonymous purchases are rejected. Report checkout selects only owned identity and Completed status. Provider metadata contains opaque attempt/owner UUIDs, not report content or identity by email.

Two RLS-enabled server-only tables hold purchase attempts and minimal provider event envelopes. Stable attempt/provider keys, unique event IDs, event/attempt locks and the accepted transactional entitlement RPC provide replay/concurrency safety. One-time fulfillment preserves original actual purchase amount/currency and report scope. Subscription grants require active status and a verified paid invoice linked to the subscription with an expected-price line covering the current period. An older paid invoice cannot unlock a new unpaid period. Same-period extension/proration cannot create a second allowance bundle.

Current provider snapshots, period/event monotonicity and terminal reversal policy handle ordering. Cancel-at-period-end preserves paid expiry; terminal cancellation/reversal prevents future new reservations. Failed payment creates no new period, while existing paid grants retain their original expiry. Refund/dispute never deletes historical results or automatically manipulates money/usage credits. Callback after remote creation but before local Checkout binding recovers only the original freshly verified attempt/customer/Price. Canonical minimal event-envelope fingerprints are stable across JSON whitespace changes, without retaining full payloads.

Dry-run reconciliation uses trusted provider references and does not grant. Repeated apply converges through the original purchase/period identity. Legacy profiles.plan is only a hint: protected provider references, TEST mode, UUID owner metadata and actual paid period must independently verify. There is no browser grant/reconciliation endpoint, production backfill or duplicate subscription/entitlement system. Safety alerts and preview remain free; report reveal reuses computed intelligence; Medical Motion retains its independent anatomy gate.

No new BLOCKER/HIGH remains within this milestone. Review covered self-grant, IDOR, duplicate event/action, allowance inflation, provider/customer mismatch, conflicting event identity, ordering, PHI, raw error leakage, public function privileges and outage/crash recovery. Direct application-role table privileges are absent; only service_role executes the new RPC, with empty search path and validated constraints. Accepted entitlement/motion SQL and clinical engines are unchanged.

## Validation evidence

- Focused final payment acceptance: **79/79 tests, 4 files, zero skipped**, including **60 real PostgreSQL provider tests**. Official signatures are real SDK verification; provider API objects are controlled TEST fixtures, not actual external payments.
- Full affected regression ran **once**: **1879/1879, 120 files, zero skipped**. Final review then strengthened remote-create/local-bind recovery, serialization-stable event identity and current paid-period proof. Only affected payment files were rechecked; the full regression was not repeated.
- Consolidated final unique acceptance: **1883/1883, 120 files, zero failures and zero skipped**. Rechecks replace earlier results for the same files and are not additional unique tests.
- Overlapping regression groups (tests/files, not additive): PostgreSQL **315/15**, patient delivery **57/2**, Medical Motion **1093/43**, symptom explanation **160/8**, report/intelligence **74/10**, billing/Stripe/usage/product/API **144/10**, auth-related **64/6**.
- Crash coverage: DB outage before receipt, provider outage after durable receipt, forced failure between grant and event completion (both roll back), lost acknowledgment after committed fulfillment, replay and trusted reconciliation.
- Final `npx tsc --noEmit`: passed. Final `npm run build`: passed, 91 pages; existing dynamic filesystem tracing warning in unchanged `lib/medical-motion/render/artifact-output.ts:34` remains. TypeScript/build were rechecked after final corrections.
- `git diff --check`: passed. Exact staging and cached check required before the approved commit.
- Final isolated database: **0 rows in all 16 public acceptance tables and auth.users**. Localhost/127.0.0.1 and exactly `organheal_ownership_test_step3c` remain mandatory. The full final payment migration was applied fresh to its empty local draft schema. Stored payment RPC body matches final source; two new tables have RLS, no application-role direct privileges, validated constraints and service-only RPC execution.
- Existing protected directories, production Supabase/PostgreSQL, live Stripe, Blender, FFmpeg, Windows SCM and security policy were untouched. No host reboot, tunnel or unverified binary installation.

## External and repository-wide limitations

Stripe TEST key/webhook secret/Price configuration/mode were absent from process, local Next environment, User and Machine scopes. Stripe CLI was absent. **No external Checkout/payment/callback was performed.** Local signed fixtures and PostgreSQL acceptance do not establish real provider acceptance. Provider launch and production migration remain disabled.

Dependency audit before and after the SDK addition found the same existing **19 advisories: 1 critical, 10 high, 7 moderate, 1 low**. Stripe has no reported advisory and no new advisory package was introduced. Those repository-wide baseline risks are not fixed by this milestone and need separate dependency remediation before production readiness. The existing build tracing warning is also retained.

Deferred: real isolated external Stripe acceptance, production release/migration/backfill, final commercial quotas/refund/upgrade policy, replacement/expired Checkout and subscription switching policy, unmapped legacy records needing operator investigation, polished conversion UI, and automatic reconciliation scheduling. Annual TEST checkout is disabled unless explicitly configured; annual pricing is not finalized.

## Exact milestone manifest

1. `app/api/billing/checkout/route.ts`
2. `app/api/billing/portal/route.ts`
3. `app/api/billing/webhook/route.ts`
4. `docs/verified-payment-integration.md`
5. `docs/verified-payment-acceptance.md`
6. `lib/billing/stripe.service.ts`
7. `lib/billing/payment-config.ts`
8. `lib/billing/payment-checkout.ts`
9. `lib/billing/payment-repository.ts`
10. `lib/billing/payment-fulfillment.ts`
11. `lib/billing/payment-reconciliation.ts`
12. `lib/billing/stripe-paid-period.ts`
13. `package.json`
14. `package-lock.json`
15. `supabase/migrations/20261004022308_verified_payment_fulfillment.sql`
16. `tests/billing-checkout-api-route.test.ts`
17. `tests/billing-webhook-api-route.test.ts`
18. `tests/payment-provider.postgres.test.ts`

Commit message: `feat(monetization): add verified payment fulfillment`. Normal push only; final hash/upstream status belongs in the final report. `.claude/` and `supabase/.temp/` remain unrelated, untracked and excluded.

# Monetization and entitlements foundation V1 acceptance

Accepted on 2026-10-04 from `ee06ae87387ca7cdad6c33ed1159c0ae1c2b0beb`, branch `codex/medical-motion-worker-execution`. Existing milestone work was resumed and preserved. No unrelated tracked changes were present. This accepts the commercial foundation, not a live payment launch or clinical production release.

## Validation

- Focused acceptance: 87/87 tests across 5 files, zero skipped.
- Full affected regression ran once: 115 files, initially 1789 passed and 9 failed. An interrupted preliminary launch had left one confirmed synthetic Medical Motion fixture. Its known test message, creation timestamp and exact owner were verified without printing content or credentials. The existing guarded cleanup helper removed only that owner. No implementation change or weakened empty-database assertion was needed.
- Only the two affected ownership/publication files were rerun: 9/9 passed. Consolidated final result: **1798/1798 unique tests, 115 files, zero failures and zero skipped**. Rechecks are not counted as additional unique tests.
- Real local PostgreSQL: 255 tests across 14 files. Guard requires localhost/127.0.0.1 and exactly `organheal_ownership_test_step3c`; PostgreSQL 17.11. No production database, Supabase provider or payment provider connection.
- Included regression groups (overlap, not additive): patient delivery 57/2; Medical Motion 1093/43; symptom explanation 160/8; report/intelligence 70/9; billing/Stripe/usage/product/API 80/9 (tests/files).
- `npx tsc --noEmit`: passed.
- `npm run build`: passed, 91 pages generated. Existing dynamic filesystem tracing warning in `lib/medical-motion/render/artifact-output.ts:34` remains; that file is unchanged.
- `git diff --check`: passed. Exact staged manifest and cached diff check required before commit.
- Actual Blender/FFmpeg, SCM, host reboot and remote storage acceptance were not rerun or counted here: their execution paths and configuration are unchanged. The manual delivery fixture is adapted for explicit test grants only.

## Database and security review

All 14 isolated public acceptance tables and `auth.users` have exactly zero rows after the final PostgreSQL recheck. Seven created function bodies match migration source exactly; the renamed orchestration delegate matches the previously accepted SQL unchanged. Four new tables have RLS enabled and no direct application-role privileges. Only the two intended RPCs have service-role execution; private helpers are not executable by application roles. All six new immutable/settlement triggers remain enabled.

Central capabilities and scoped grants do not trust client plans, prices, metadata or AI prose. The API verifies identity and is read-only with private no-store caching. Owner-scoped transactions serialize competing allowance reservations; immutable action identity prevents repeat consumption. Composite owner foreign keys isolate grants, ledger, reservations and delivery products. Publication settles inside the existing fenced transaction, cancellation/failure releases held usage, and a medically unavailable paid request creates no allowance reservation. Critical alerts and actual computed preview stay available after verified ownership even if commercial resolution fails. Operational units use a bounded non-clinical whitelist. No BLOCKER or HIGH remains for this foundation.

Deferred rollout items: verified provider receipt/webhook adapter, final commercial quotas, legacy profile-plan migration/backfill, broad report-route/UI integration, Family/clinic delegation and full failed-attempt cost instrumentation. One-time historical purchase provenance is retained but upgrade payment arithmetic is not implemented. Missing verified myocardium remains a medical gate independent of entitlement. The existing build tracing warning is a separate deployment performance concern.

## Exact milestone manifest

1. `app/api/billing/entitlements/route.ts`
2. `app/pricing/page.tsx`
3. `docs/monetization-entitlements.md`
4. `docs/monetization-entitlements-acceptance.md`
5. `lib/billing/product-authorization.ts`
6. `lib/billing/product-catalog.ts`
7. `lib/billing/product-contracts.ts`
8. `lib/billing/provider-entitlements.ts`
9. `lib/billing/report-product-access.ts`
10. `lib/medical-motion/delivery/repository.ts`
11. `lib/medical-motion/delivery/service.ts`
12. `lib/medical-motion/worker/local-postgres.ts`
13. `supabase/migrations/20261003063120_product_entitlements.sql`
14. `tests/entitlements-api.test.ts`
15. `tests/helpers/medical-motion-artifacts.ts`
16. `tests/helpers/medical-motion-rpc.ts`
17. `tests/helpers/product-entitlements.ts`
18. `tests/manual/medical-motion-delivery.acceptance.test.ts`
19. `tests/medical-motion-delivery.postgres.test.ts`
20. `tests/product-authorization.test.ts`
21. `tests/product-entitlements.postgres.test.ts`
22. `tests/report-product-access.test.ts`

`.claude/` and `supabase/.temp/` are existing unrelated untracked directories, untouched and excluded. No dependency changes, Windows security changes, reboot, force push, merge or rebase are part of this milestone.

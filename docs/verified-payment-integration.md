# Verified payment provider integration V1

This extends the accepted entitlement foundation and the existing checkout, webhook and portal routes. It adds the official pinned Stripe SDK 23.0.0 in the existing `stripe.service.ts` boundary. There is no second provider client, subscription table, entitlement model or plan resolver. No production deployment or payment activation is included.

## Explicit TEST deployment

`ORGANHEAL_BILLING_MODE=stripe-test` and a `sk_test_` secret are mandatory. Every payment HTTP route also requires the dedicated isolated Supabase host `pmjuyyqofkdbgqmrdbuh.supabase.co` over HTTPS, without credentials or URL parameters. The configuration defaults to disabled. Test fixtures use the strictly guarded existing local PostgreSQL target; they do not make Supabase or Stripe calls. Live keys, live events and Connect account events are rejected. No keys or provider payloads are logged.

Required server configuration names (values must never be committed): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_ONE_TIME_ANALYSIS`, `STRIPE_PRICE_ID_PLUS_MONTHLY`, and `ORGANHEAL_BILLING_TEST_PLUS_ALLOWANCES`. The latter explicitly maps allowed Plus capabilities to finite allowances or intentional null unlimited values; there are no default quotas. The fixed test deployment gate also checks `NEXT_PUBLIC_SUPABASE_URL`. Optional `ORGANHEAL_BILLING_TEST_RETURN_ORIGIN` supplies a server-controlled redirect origin; the default is localhost. Annual checkout additionally needs `ORGANHEAL_BILLING_TEST_ANNUAL_ENABLED=true` and the existing yearly Price ID configuration. Annual pricing is not finalized here.

## Checkout, identity and privacy

POST `/api/billing/checkout` accepts only `{offer:'one-time-analysis',reportId:<owned numeric report>}` or `{offer:'plus-monthly'}` (explicitly enabled annual follows the same contract). The report must exist under the verified owner and have Completed extraction. Only identity/status is selected; clinical report text is never loaded for checkout. Amount, currency, plan, Price ID, entitlement, allowance and successful-payment claims from the client are rejected. Anonymous users cannot buy.

The server snapshots the configured Price ID and allowance bundle in a durable purchase attempt. Owner/offer/scope uniqueness and stable provider idempotency keys coordinate retries and double clicks. The provider Price must be active, TEST mode and have the correct payment/recurrence behavior. A reused attempt cannot silently change its price or allowance policy. Stripe metadata carries opaque internal IDs only: the checkout/subscription/payment-intent carries an attempt UUID, and the customer carries an owner UUID. No report ID, email, lab value or diagnosis is sent. The response supplies only the checkout URL and a success boolean.

The TEST customer is created/reused through a stable owner idempotency key and is stored on the purchase attempt. A customer lock prevents one provider customer mapping to two owners. The portal uses this canonical TEST identity, never a historical production customer from profiles. Historical billing references remain protected compatibility data; `profiles.plan` is never sufficient to grant new capabilities.

The pricing success redirect is display only. Creating or returning from Checkout does not grant anything. Existing polished pricing/dashboard pages are unchanged. V1 retains one purchase attempt per owner/offer/scope; automatic retry after an expired Checkout, plan switching and replacement subscriptions need an explicit later policy rather than minting additional attempts implicitly.

## Verified events and transactional fulfillment

POST `/api/billing/webhook` reads the raw bounded body and uses official `Stripe.webhooks.constructEvent` with the configured secret and timestamp tolerance. The verified event must be TEST mode. The ledger stores ID/type/time/canonical envelope digest, bounded processing status/result/error and a purchase reference; it does not store the raw provider object. Event uniqueness prevents concurrent duplicate commercial effects, and conflicting reuse of an event identity fails closed.

Receipt persistence is a separate transaction before provider reads. Current Checkout/Subscription/Invoice state is re-read through the TEST client rather than trusting browser metadata or callback arrival order. References must match the registered attempt, customer, checkout, Price and offer; subscription bundles additionally require exactly one quantity-one item. Unknown/malformed ownership references are rejected with bounded audit state. Unsupported verified event types are durably ignored. Provider or database outage leaves receipt pending and returns a retryable failure; it never acknowledges unfinished work as success.

Fulfillment locks the event and attempt and invokes the existing `product_operation` in one PostgreSQL transaction. One-time payment requires complete/paid Checkout and preserves actual provider amount/currency under the original purchase identity. Repeated paid events with different IDs retain one grant. Subscription periods derive stable provenance from subscription/start and grant only the stored configured capability bundle. A same-period provider extension/proration does not mint another allowance; existing grants retain their original immutable expiry, and a new verified period creates the next bundle. A failure between grant and event completion rolls both back. A lost acknowledgment after commit replays without duplicate allowance.

## Lifecycle policy

Only active subscriptions with a verified paid latest invoice linked to that subscription and an expected-price line covering the current period grant a period. An older paid invoice cannot grant a new unpaid period. Trialing is not enabled by V1 policy. Past-due, unpaid, incomplete/expired or unpaid active snapshots do not grant new paid periods. Previously verified paid grants retain their original expiry during recoverable payment failure; no new allowance is minted. Cancel-at-period-end preserves the paid period. Actual terminal cancellation/expiration revokes future reservations; stale reactivation for the same canceled period is ignored. Existing consumed results remain owner-accessible under the accepted replay rules; medical history is never deleted.

Refund or dispute revokes future premium use for the affected purchase/subscription, including partial confirmed refunds under this conservative V1 policy. It does not automatically return usage credits, move money or delete results. Reversal is terminal and cannot be undone by a later paid event. A reversal arriving first resolves the original payment-intent/Checkout identity; subscription reversals resolve invoice-payment to invoice/subscription. Invalid or ambiguous references cannot grant or revoke another owner.

Medical Motion still requires independent verified medical/anatomical readiness. Verified Plus can authorize commercially eligible TEST work; unavailable anatomy creates no reservation or consumption. One-time report payment does not grant unrelated Medical Motion. Free report preview and already-determined critical alerts are unchanged by payment failure, expired subscription or provider outage. A paid report reveals the same previously computed owned result, without rerunning clinical analysis.

## Operator migration and reconciliation

`PaymentFulfillmentService.reconcile(attemptId, dryRun=true)` retrieves trusted provider state for lost callbacks. Dry run performs no commercial mutation; repeated apply observations converge through original purchase/period identities. There is no browser reconciliation or grant endpoint.

`reconcileLegacyBilling(client,owner,offer,dryRun=true)` reads protected legacy customer/subscription references, then independently verifies TEST provider state, owner UUID metadata, customer, configured Price and period/payment state. A legacy Plus string without verified references yields no grant. Dry run is deterministic for the same provider snapshot; apply creates a canonical attempt and uses the same transactional fulfillment. Production migration and bulk execution are not performed. Legacy subscriptions missing trusted owner metadata require manual investigation, not email-based matching or inferred grants. Normal callbacks for such unmapped legacy metadata remain rejected; operator reconciliation is the explicit transition path.

## Storage, observability and remaining rollout

Only two new commercial tables are added: `payment_purchase_attempts` and `payment_provider_events`. Both have RLS and no direct application-role grants. The narrow `payment_operation` RPC is service-role only, uses an empty search path and indexes pending-event/customer/provider references. Clinical engines, entitlement tables, usage reservations, motion geometry and render/SCM execution remain unchanged.

Durable receipt/state/result records provide PHI-safe received/ignored/rejected/fulfilled/replayed/reversed/reconciled observations; the webhook logs only a bounded result code. No raw Stripe errors, payment payloads, signed URLs or secrets are logged. Reconciliation is operator-driven in V1, not a new background service.

Real external TEST callback is DEFERRED if credentials/configuration are unavailable; signed local fixtures are explicitly not proof of an external Stripe payment. No public tunnel or unverified CLI is installed. Next rollout requires real isolated TEST callbacks, production migration/review, final commercial policy, and polished conversion UI. Existing repository dependency advisories and build tracing warning must be tracked separately before production readiness.

References: official [Stripe webhook verification](https://docs.stripe.com/webhooks), [subscription events](https://docs.stripe.com/billing/subscriptions/webhooks), [invoice-payment references](https://docs.stripe.com/api/invoice-payment/list), and [Supabase function privilege guidance](https://supabase.com/docs/guides/database/functions).

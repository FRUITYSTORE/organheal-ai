# Monetization and entitlements foundation V1

Commercial authority lives in `lib/billing`, outside clinical engines. This phase extends the existing billing area, verified API authentication, Medical Motion product hook and durable publication transactions. It introduces no live payment call, new dependency, medical asset, checkout, pricing redesign or default service capability.

## Existing billing compatibility

The repository already contains protected billing profile columns, Stripe checkout/portal/signature-verified subscription webhooks and `usage-quota` API rate limits. The pricing page labels Plus as coming soon. These existing interfaces remain unchanged. `profiles.plan` is a compatibility/display and legacy API-limit projection; it does not grant new product entitlements. User metadata, a client-supplied plan name or price cannot grant new premium access.

The canonical capability layer is not a second plan enum: it models grants for products that legacy tier/rate-limit state cannot represent (a report-specific purchase, a period allowance, or credits). A future verified payment adapter will translate provider facts through `ProviderEntitlements`; this phase deliberately does not wire existing Stripe events into new grants or assume a final subscription allowance. Legacy endpoint migration is a separate rollout step, not an implicit entitlement backfill.

## Catalog and authority

`PRODUCT_CAPABILITIES` centrally defines safety alerts, report preview/full analysis, advanced assistant/intelligence, doctor brief, patient PDF, personalized Medical Motion, extended history, trends, health passport and future family-profile IDs. Safety and preview are free for verified owners. Safety is a distinct capability; there is no caller-provided flag that bypasses authorization for a premium product.

`COMMERCIAL_OFFERS` separates prices from capabilities. Planning values are USD 799 minor units for one analysis and USD 999/month for Plus. The existing annual UI planning value (USD 9900) is retained centrally; annual savings text is derived from catalog amounts. No price is a clinical contract, no final allowance numbers are chosen, and no FX logic is added.

`ProductAuthorizationService` resolves deterministic ALLOWED_FREE / SUBSCRIPTION / ONE_TIME / CREDIT and DENIED_ENTITLEMENT_REQUIRED / ALLOWANCE_EXHAUSTED / PRODUCT_UNAVAILABLE dispositions. Only durable server-issued grants provide premium authority. A promotional/admin grant uses the ALLOWED_CREDIT disposition with its separate source kind retained in the private record. Read-only decisions are not reservations: premium work must use the transactional reserve boundary.

## Durable grants, periods and credits

Four RLS-enabled, application-inaccessible tables hold entitlements, usage reservations, credit-ledger entries and operational usage events. Owner/beneficiary, capability, explicit account/report/context scope, validity, source UUID, offer, allowance and immutable identity are stored. V1 beneficiaries must equal the account owner; future dependent/clinic membership needs an explicit trusted adapter and constraint extension. The capability registry need not be redesigned.

One-time analysis grants have a report scope and one-unit allowance. Existing numeric report references are supported; Medical Motion revision/context references remain UUIDs. A purchase for one report cannot unlock another. Plus activates only explicitly configured capabilities, with explicit period start/end and allowance (or intentional `null` unlimited). New periods use new stable provenance IDs; no automatic billing-calendar or default monthly quota is invented. Subscription bundles commit atomically; a conflicting receipt rolls back every new capability in the bundle.

Provider-neutral provenance can retain the actual verified purchase amount/currency when supplied. It never substitutes a current planning catalog price for historical purchase value. This supports a future promotional upgrade window using immutable source/date/offer/value facts; no refund arithmetic, payment processor IDs as entitlement identity or promotional calculation is implemented now.

Credit grants have a finite allowance. The immutable ledger records grant +N, reservation -1, consumption 0 and release/refund +1 exactly once. This is auditable grant accounting, not a wallet/payment system. Only trusted server/admin methods mutate records; no self-grant HTTP endpoint exists.

## Reservation lifecycle

Owner-scoped transaction advisory locks serialize new reservations and grants. Owner/capability/stable action UUID uniquely identify usage; the original scope cannot change on replay. Held plus consumed reservations count against the grant. Concurrent different actions with one remaining unit permit exactly one winner. Repeated identical action returns the same reservation without another spend.

States are reserved, consumed and released. Only successful qualifying result completion consumes. Cancellation, terminal backend failure and medical unavailability release held usage. Automatic retry retains the reservation. Released identities cannot reserve or consume anew; they return PRODUCT_UNAVAILABLE. Cancellation after successful completion cannot refund usage; explicit trusted refund can release consumed usage once. Revocation/expiry blocks new reservations; previously authorized held work and consumed-result replay retain their original decision. Period accounting remains tied to the original grant.

## Medical Motion integration

The existing creation hook now uses central commercial authorization before the unchanged clinical/anatomy gate. A wrapper around the accepted `motion_delivery_operation_v1` transaction atomically creates/reuses the product request and reserves its one usage unit. A losing last-unit race rolls back the new product row. Medically unavailable creation never reserves or consumes paid usage. All existing SQL ownership, lease, approval, fencing and publication rules remain in the delegated function.

Approval requires held/consumed product usage. Released work cannot enter pending orchestration. Terminal product replay is free read/reuse, not authority to create new work. Existing ready results remain accessible to their verified owner without retroactively charging them. Shared base work and cache are never deleted or commercially charged twice by private request cancellation.

Indexed triggers on Medical Motion terminal job transitions and result insertion settle usage in the same PostgreSQL transaction as durable publication/cancellation/failure. They do not depend on patient polling or an in-memory callback. Ready requires the existing fenced result. Publication winning consumes once; cancellation winning releases and prevents publication. Render/compositor executables, host/SCM configuration and physical motion/anatomy logic are unchanged.

## Report foundation and safety

`ReportProductAccessService` checks report ownership through the existing repository, then reveals an already-computed Health Intelligence result using a stable analysis UUID. It does not rerun clinical analysis after purchase. Successful full reveal settles once; release winning a reveal race prevents premium disclosure. This is an explicit future report-route integration seam; existing report pages/endpoints are not broadly paywalled in this phase.

Free preview counts derive from computed report marker findings and ready health patterns. Missing evidence yields zero; no upsell numbers are fabricated. Existing critical clinical findings are projected outside commercial denial, including a commercial DB outage after ownership is verified. Clinical severity remains the authority; risk scores are not reinterpreted as urgent alerts. Clinical engines never import the billing layer.

## Reads, units and operational limits

GET `/api/billing/entitlements` reuses verified Bearer `getUser`, denies anonymous sessions, derives owner from auth and returns at most 100 active safe grant/remaining summaries with private no-store caching. It exposes no ledger mutations, provider/provenance IDs or service credentials.

Successful private publication records bounded, PHI-free units: cache hit/Blender avoidance when known, composition completion, final artifact bytes, output profile and duration band. These are successful-result observations, not total process-launch or cloud-dollar claims. A trusted `recordCost` boundary can receive measured Blender/composition counts and AI units later; retries use an immutable event UUID and conflicting replay fails. No clinical values, prose, paths, arbitrary price or plan can enter operational units. Grant provenance is commercial audit data, separate from clinical content and technical cost units.

Deferred: live provider verification/receipt mapping, subscription checkout and migration of legacy billing projections, entitlement backfill, final commercial quotas, customer UI, additional clinical release gates, durable measurement adapters for all failed attempts, Family/clinic delegation and promotional payment arithmetic. Missing verified medical anatomy remains blocked independently of payment.

Security follows the official [Supabase function privilege and empty-search-path guidance](https://supabase.com/docs/guides/database/functions), with service-only RPCs and no direct application table grants. Validation uses guarded local PostgreSQL only; no production or payment provider connection is required.

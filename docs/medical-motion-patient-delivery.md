# Patient delivery orchestration V1

This milestone adds a durable product request and authenticated API around the existing execution contexts, render jobs, private approved personalization specs, compose jobs and fenced artifact registry. It creates no second queue, auth system, medical asset or patient UI. Installed service configuration and default render-only capability remain unchanged.

## Trusted source and creation

The request body contains exactly `sourceRef`, `sceneIndex`, `language` (`ar` or `en`) and `aspectRatio` (`16:9`, `9:16`, `1:1`). `sourceRef` is an existing server-issued, owner-bound Medical Motion revision reference. It is not a clinical plan, context ID or user-supplied approval. The trusted upstream revision/context/base-job path must already have prepared that source. Unknown and other-owner references return the same not-found result. The API never invents a source/check-in identifier to satisfy the producer.

Every route uses the existing Bearer authentication helper and verified Supabase `getUser` identity. Anonymous sessions are denied. `userId`, AI prose, anatomy, worker options and storage paths cannot be supplied in the body. A single server-side `authorizeProductUse` hook runs before source resolution and request insertion; current policy allows authenticated product use. Entitlements, credits and billing are deferred.

Current clinical, mechanism and anatomy authorization runs before request approval and again before composition and ready delivery. Non-patient-approved anatomy yields `failed / unavailable / medical-visualization-not-available`. Current unverified myocardium remains unavailable. Whole-body fixture tests exercise generic scene authority only; they do not approve geometry for patient use. The existing clinical execution adapter still uses its heart path.

## Identity, orchestration and audit

`medical_motion_delivery_requests` is an RLS-enabled read/orchestration model. Its opaque product UUID differs from context/job IDs. Owner, source revision, scene, language and output profile define its immutable unique logical identity. Concurrent repeated creation returns the same row. Changing language creates another private composition while preserving eligible language-neutral base reuse.

The row links the existing owned revision, context and base job, then an immutable approved spec. Existing spec/job/result/registry/cache links retain the remaining audit chain. Direct table grants are revoked for all application roles. Only the service role may execute the owner-filtered operation RPC. Clients receive explicit product projections, not these internal references.

The long-lived heavy host may explicitly supply `advanceDelivery` alongside its existing composition capability. The callback invokes `delivery.advancePending(hostSignal)` before ordinary render/compose polling. It reads at most ten eligible completed-base requests, revalidates current medical authority, uses the existing trusted structured-source producer, and atomically approves/links spec and composition job. Cancellation winning the product row lock creates no orphan approved spec/job. Concurrent advancement deduplicates through existing approval identity. No source loading, Blender or FFmpeg occurs in HTTP/status polling.

Example trusted host wiring, after obtaining the previously approved producer and FFmpeg runtime:

```ts
let delivery: MedicalMotionDeliveryService;
const runtime = createMedicalMotionArtifactRuntime(client, {
  mode: "production", signal: hostSignal, reuse: true,
  composition: { runtime: ffmpegRuntime, concurrency: 1 },
  advanceDelivery: () => delivery.advancePending(hostSignal),
});
delivery = new MedicalMotionDeliveryService(
  client, runtime.artifacts, "production", trustedProducer,
);
```

This is an explicit deployment integration seam, not activation of the installed service. Composition/host bounds and existing retry/lease/fencing semantics remain in force. The production API has no producer/heavy capability. A trusted source loader, clinically approved assets and an explicitly configured composition-capable host are required before patient rollout.

## API and lifecycle

| Method and route | Behavior |
| --- | --- |
| POST `/api/medical-motion/requests` | Validate four-field body, authorize product use, run medical gate, create/reuse product request; 202 response. |
| GET `/api/medical-motion/requests?offset=0` | Owner history, at most 20 rows, offset 0–1000, bounded next offset. |
| GET `/api/medical-motion/requests/{requestId}` | Owner status and safe descriptor when ready. |
| POST `/api/medical-motion/requests/{requestId}/cancel` | Idempotent owner cancellation. |
| GET `/api/medical-motion/requests/{requestId}/access` | Revalidate owner/readiness and issue temporary private transport. |

Responses are `private, no-store`, vary by Authorization, use no-referrer, and include a request trace ID. Unknown/other-owner UUIDs yield 404. Invalid input yields 400, policy denial 403, non-ready access 409, and bounded technical uncertainty 503. Internal errors, tokens, leases, paths, object keys and raw clinical context are never projected.

| Backend condition | Product status / stage |
| --- | --- |
| Base pending | queued / preparation |
| Base running | rendering / visualization |
| Base complete, waiting for approval | preparing / preparation |
| Composition pending or running | personalizing / personalization |
| Automatic retry | preparing / preparation |
| Awaiting artifact publication | preparing / finalizing |
| Fenced published composition complete | ready / ready |
| Medical authority unavailable | failed / unavailable |
| Terminal backend failure | failed / failed |
| Cancellation wins | cancelled / cancelled |

Active status responses guide polling every five seconds, with `Retry-After`; terminal states return no polling interval. There are no fabricated completion percentages. V1 reports `retryable: false`: transient work retries through the existing durable job lifecycle, and resubmitting identical input does not mint jobs. Corrected medical/source input needs a new trusted revision, not a manual duplicate-job endpoint.

Cancellation changes only the requesting owner's private work/product row. Shared base work/cache remains intact, including a currently held base lease. Existing composition cancellation terminates actual FFmpeg through ownership checks and fences publication. Completed/failed/cancelled requests remain terminal. The composition job lock serializes cancellation with publication: ready winning preserves its artifact; cancellation winning denies publication/delivery, even if bytes were already uploaded. Exact test cleanup removes only known test objects; production orphan retention/cleanup remains the existing fenced artifact policy.

## Private delivery

Status/history read registry metadata, never download the full video. Safe descriptors contain opaque artifact ID, `video/mp4`, approved actual duration, 720p profile dimensions, language and timestamp. Access checks owner, current medical readiness, completed fenced registry state and a private bucket before signing. A revoked medical gate blocks access and projects unavailable without rewriting the original approval audit.

The existing `medical-motion-artifacts` bucket stays private. Signed transport lasts **60 seconds**, pins HTTPS/provider origin, bucket and opaque object path, and is regenerated on demand. It is neither persisted nor logged. URL possession permits temporary transport; it is not proof of ownership and cannot authorize another signing operation. Links already issued remain transport capabilities until expiry. No permanent public URL, enumeration route or service-role credential reaches the caller. See the official [Supabase signed URL contract](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl).

## Usage and rollout boundaries

One PHI-safe observer receives output profile, duration band, nullable base-hit/render-needed and composition-needed/reused dimensions. Unknown cache decisions are `null`, not fabricated misses. These are observations, not billable execution counts; existing execution metrics measure actual work. No clinical values, owner identifiers, tokens or URLs are emitted. No billing, quota or rate-limit system is implemented here.

Patient UI, entitlement enforcement, source-reference discovery, explicit host deployment, approved whole-body clinical adapters/assets and release approval remain separate work. This acceptance establishes the foundation with isolated TEST fixtures and verifies that the current production medical gate fails safely.

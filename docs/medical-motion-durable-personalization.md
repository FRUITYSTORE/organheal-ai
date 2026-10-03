# Durable private personalization V1

This phase extends the accepted compositor, execution contexts, jobs, private artifact registry and reusable base cache. It adds no public route, delivery URL, clinical asset, paid service or default OS service capability.

## Trusted source and approval

`TrustedPersonalizationProducer` receives an injected, trusted owner-scoped Health Intelligence loader. V1 maps only the latest structured check-in's `wellnessScore` (finite 0–100), ID and timestamp. It ignores notes, model output, diagnoses and arbitrary prose. The caption is fixed Arabic/English presentation text; the numeric value is not a risk classification or diagnosis. Lab, report, trend and narration mappings require separate approved adapters later.

Existing clinical Safety Gate, mechanism, explanation validation and anatomy readiness run before source access or media processing. Current unverified myocardium remains unavailable. Whole-body tests use declared-slot metadata fixtures, not medically verified geometry. The clinical execution adapter remains the existing heart path.

Approval snapshots bind schema/producer/composition versions, owner, execution context, scene, published base job/artifact, compiler identities, render signature, base SHA, actual video duration, approved specification and structured source provenance. Language/profile/text/numeric fields live only in private specification storage. In-process issuance is frozen and cannot be minted by copying JSON; server-role RPC access remains a trusted backend boundary, not an end-user approval authority.

## Durable identity and replay

`medical_motion_approved_specs` is immutable, RLS-enabled and inaccessible through direct anon, authenticated or service-role table grants. Owner-bound private RPCs create/read/cancel approved work. Approval atomically inserts a spec and an existing background job; deferred job FK enforcement prevents committed orphans. A unique owner/context/logical-identity constraint plus transaction advisory locking deduplicates equivalent requests. Conflicting content under an existing identity fails.

The only compose queue payload is `{ approvedPersonalizationSpecId, compositionVersion }`. Restart/retry reads the original private snapshot, never current AI output or a refreshed health source. Current gate, base generation, SHA, compiler/overlay identities and versions are checked again before composition/reconciliation. Incompatible drift fails rather than silently rewriting a snapshot.

Private finals use existing opaque UUID storage keys and fenced publication. They cannot enter the reusable base cache or be retrieved by another user. Response loss reconciles recorded intent rather than producing another final.

## Scheduling and capacity

`PersonalizationSchedulingService.schedule` uses the existing revision/context/base-job infrastructure. With no published base it returns `awaiting-base`; it performs no inline Blender/FFmpeg work. A trusted orchestrator invokes it again with the same revision after base publication. Once the base is available, it approves and queues composition atomically. Automatic product delivery orchestration is deferred.

Composition is an explicit long-lived capability. Request/cron workers remain unchanged. `createMedicalMotionArtifactRuntime` optionally accepts `composition: { runtime, concurrency }`; omission preserves render-only behavior. The installed service configuration is unchanged. The same host alternates render/compose polling when this capability is explicitly supplied.

Local composition capacity is configurable from 1–4; database claims enforce a global maximum of four valid compose leases. Existing host total task and render limits still apply, so enabling compose does not expand its total process budget. Full capacity returns without an in-memory waiting queue. Existing `available_at`, retry/backoff and stale-job recovery are reused. FIFO remains the current policy; future trusted priority policy can extend claim ordering without adding billing or client-controlled tiers now.

Cancellation updates the existing durable job and aborts local execution. A separate worker detects cancellation/attempt loss through a read-only owner/token/lease check every second, with bounded requests. This check never renews leases. Existing ownership lifecycle terminates/joins FFmpeg and prevents publication after cancellation. Shutdown and uncertainty also fail closed.

## Operational measurements

`CompositionMetrics` observes cache hit/miss, successfully created base renders, Blender avoidance, composition execution, actual elapsed FFmpeg work, bytes and audio reuse without patient values. Base creation counts successful cache-backed renders; it does not count failed Blender process launches. The new job runtime exposes aggregate execution/publication/ownership-loss counters and active/max capacity. Acceptance records actual Blender launches and duplicate avoidance explicitly; no billing, production cost estimate or patient telemetry dump is introduced.

## Acceptance scope

Real acceptance uses only the guarded local `organheal_ownership_test_step3c` PostgreSQL database and the pinned isolated Supabase test Storage project. Actual Blender/FFmpeg execute through durable jobs. A/B fixtures share one medical base: one Blender execution, two private compositions, and zero additional work for identical A. Arabic/English preserve the base frames. Five organs exercise generic specification/slot contracts only.

Failures covered include approval restart, FFmpeg crash/retry, upload/publication interruption, lost publication response, duplicate recovery request, drift, queued/running cancellation and cross-owner access. No machine reboot, production connection, SCM configuration change or Windows security policy change is part of this phase.

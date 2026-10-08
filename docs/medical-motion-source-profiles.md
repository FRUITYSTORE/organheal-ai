# Trusted anatomy source profiles (MM-PROD-4A.1)

This is provenance infrastructure, not anatomy or patient approval. The active
source-profile registry is empty. The existing heart asset, myocardium gate,
medical approval and license/coverage requirements remain unchanged.

The server registry issues opaque selections. Browser, AI and candidate-plan
JSON cannot issue a selection. Registry definitions are detached, bounded and
immutable. A version-1 SHA-256 fingerprint covers the complete canonical profile
definition, including structure/representation constraints, camera dependencies,
labels, usage, limitations and evidence. Unordered sets have stable ordering.

Context creation and atomic job enqueue take selections as a separate trusted
server argument. They persist `source_profile_bindings` separately from the
candidate plan: `{ bindingVersion: "1", scenes: [{ sceneIndex, profile }] }`.
Each immutable snapshot records profile ID/version/fingerprint, organ, source
ID/version, anatomy/asset version and permitted usage. There is no PHI in this
snapshot. Binding lists and JSON budgets are bounded. Legacy rows stay NULL;
there is no invented history or backfill.

Reconstruction resolves the exact historical registry identity and compares the
entire stored snapshot. Missing definitions, changed fingerprints and unbound
scene indices fail with `CONTEXT_VERSION_UNAVAILABLE`. Authority travels outside
clinical JSON through a WeakMap on reconstructed server inputs. The worker passes
that selection into the central explanation authorization; copies confer no
authority. A restart must load the exact trusted historical definition. There is
no latest-version or alternative-source fallback.

The compiler checks required, highlighted, labelled and camera-dependent anatomy
against one profile. Since the current Blender builder renders all available
heart parts, both compiler and renderer also require the full present inventory
to belong to that profile. A restricted highlight cannot conceal mixed sources.
The renderer verifies the authorized identity; it does not choose a source.

Profile identity participates in scene/base/output fingerprints and render
signatures. Reuse identities accept precisely the legacy ten keys or eleven keys
with `sourceProfile: { profileId, profileVersion, fingerprint }`. Exact identity
conflicts, ownership, leases, attempts, epochs and publication/link rules remain.
The durable chain is context → job → reuse identity/link → base artifact, with
compiled fingerprints and render signature on the reuse identity. Existing
non-cache artifact/job/context relationships also preserve profile provenance.

The single additive migration adds a nullable column and a bounded envelope
constraint. Unique `create_medical_motion_profile_context_v1` and
`enqueue_medical_motion_profile_job_v1` RPCs avoid overload ambiguity. Existing
create/read and enqueue remain compatible; legacy enqueue cannot adopt a
profile-aware request revision. RPCs are service-role-only, have empty search
paths, and grant no table access. Existing immutability triggers and RLS remain.
Apply this migration before deploying these profile-aware server paths.

Local migration tests use only the guarded `organheal_ownership_test_step3c`
database. Clean dependency-schema fixtures and their DDL roll back, while the
current-schema migration exercises the existing project state. No production
connection or database reset is part of acceptance.

MM-PROD-4B scene timelines, asset bindings, clinical source approval and any
source-boundary media composition are outside this milestone.

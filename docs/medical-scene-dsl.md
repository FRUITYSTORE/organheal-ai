# Medical Scene DSL and reusable render contract V1

The existing explanation compiler now uses one generic scene compiler core. The
heart remains a renderer adapter, not the DSL vocabulary. Other organs have
contract-only unit fixtures; they have no renderable modules or patient approval.

## Authority and compilation

The clinical endpoint runs server Safety Gate, validates the candidate plan,
resolves the immutable mechanism/version, and evaluates server evidence. The
shared compiler checks mechanism anatomy readiness (including non-highlighted
dependencies), independent adapter requirements, and camera/label dependencies.
It then constructs canonical DSL, validates the compiler-issued result and only
then issues the existing opaque renderer authorization. Blender independently
rechecks readiness and current assets. It receives existing renderer scene data,
not clinical facts, registry definitions or patient prose.

`compileMedicalScene` is server-only. Its context (registry, normalized evidence,
Safety Gate result, catalog and module source) is trusted application code, never
an AI/client DTO. Public candidates contain only mechanism ID/version. Registry
registration is a code configuration API, not a candidate-ingestion endpoint.
The two-argument `compileExplanationScene` API remains a legacy **preview**:
it cannot issue DSL or render authorization. The server path supplies the trusted
third argument. Preview hashes, copied DSL and serialized capabilities cannot
authorize rendering. Runtime WeakSet/WeakMap identity protects these boundaries.

## Contract

`contracts/medical-scene.ts` defines required structures using the existing
`AnatomyRequirements`, their actual exact representations, independent highlights,
mechanism identity, system/organ lists, anatomy/asset/source versions, bounded
operations, camera/motion/flow intents, structure label IDs, reviewed registry
visual emphasis, duration, render intent, usage and output profile. Object names,
coordinates, job IDs, timestamps, patient identifiers and free AI prose are absent.
Output is detached and recursively frozen. Sets are deduplicated/sorted; object
keys canonicalized; meaningful ordered arrays remain ordered.

Safe operations are highlight, camera focus and structure label, each version 1
with an explicit allowed representation list. Unknown operations are rejected by
registration/compilation. Advanced flow, pressure, rate and lumen operations have
explicit semantics but are unsupported in compiler V1 even with reviewed rules.
Narrowing requires lumen, never surface. No cavity/wall/myocardium substitution is
permitted. Development permits existing illustrative placeholder review only;
production keeps all independent anatomy, licensing and mechanism approval gates.

Camera V1 supports organ overview and structure focus, without transforms. Flow
follow, cross sections and regional closeups are deferred. Motion supports static
and illustrative cycle where a module has a controller. An illustrative cycle is
**not medically verified physiologic deformation**. Rate/flow/physiologic motion
are unsupported. Render intent supports still, short clip, loop and educational
segment as contracts; generic compilation does not promise executable Blender
support or seamless looping for other organs. The current heart adapter preserves
its existing short video, presets, duration and controller. Structure labels are
semantic IDs for later presentation, not burned-in text implemented by this step.

Output supports 16:9, 9:16, 1:1, 720p/1080p and `asset-native` LOD only. No alternate
LOD availability is invented. Duration is bounded 0–60 seconds (exclusive zero).
DSL, compiler contract, operation and render identity input versions are separate.
Future behavior changes must bump the applicable version before cache reuse.

## Base versus personalization

Overlay slots are bounded: text value, chart, subtitle, caption, voice segment,
risk band and educational label. Slot values are external, length-bounded text
or finite numbers; nested geometry/effects and unknown keys fail. Chart and risk
slot values are opaque bounded presentation references, not executable graphics
or clinical assertions. Structured chart schema and composer policy are deferred.
Only trusted presentation code may populate medically meaningful text; this
contract does not validate clinical truth or sanitize a future compositor.

Overlay values/language never enter the medical base. Registry visual state does
enter identity; a clinically reviewed visual state change changes its hash.
Clinical severity has no automatic mapping to visual emphasis. Labels are
language-neutral structure IDs and narration is a slot, not embedded prose. Future
embedded text/audio must be separately versioned and hashed if they change pixels
or audio in the base. Overlays cannot mutate mechanism or anatomy.

`baseFingerprint` covers all medical DSL fields including exact representations,
anatomy/asset/source revisions, operations/versions, camera/motion and approved
visual state, duration/render intent and usage. Output profile and overlay slot
declarations are excluded from the medical base hash. `outputFingerprint` adds
aspect/resolution/LOD and adapter contract version; physical output variants must
never be conflated. Gated renderer signatures include both DSL fingerprints;
legacy preview/render signatures remain unchanged. The full authorized request
identity also includes the compiled DSL.

## Reuse and future boundaries

Reuse is deterministic. Shared ready geometry produces `reusable-base`, scoped
to its explicit `internal-review` or `patient-facing` usage. Internal reuse is
never production approval. Unready, invalid or unsupported input produces
`unsupported` with reasons and no DSL. Patient-specific anatomy/pathology needs a
separately verified render: `patient-specific-render-required`, also no fabricated
DSL or geometry. These classifications do not implement patient geometry.

A future cache can map `(baseFingerprint, outputFingerprint)` to a reusable
artifact **after replaying current evidence/readiness/authorization gates**. A
hash is not an authorization token. Review revocation must invalidate eligibility
even if geometry versions have not changed. No cache storage or database table
exists in this milestone. Future FFmpeg may compose bounded text/chart/subtitle/
voice values or derive approved presentation variants. It must have its own
validated composition identity and security boundary. No FFmpeg engine is added.

## Medical limitations

Current heart assets/mechanisms remain internal-only. The missing verified
myocardium blocks the dependent mechanism before authorization. TotalSegmentator
Issue #618 is not bypassed or assumed resolved. Four non-heart fixtures (lung
bronchoconstriction, kidney filtration, liver fat accumulation category, brain
test neural region) prove schema extensibility with hypothetical TEST metadata;
they neither model pathology nor establish actual anatomy or patient readiness.
No datasets, geometry, service installation, production connections or UI changes
are part of this milestone.

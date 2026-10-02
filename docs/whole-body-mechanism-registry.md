# Whole-Body Mechanism Registry and Medical Visualization Contracts V1

2026-10-03. Engineering foundation, not a reviewed mechanism library or a diagnosis system.

## Existing flow and migration

The symptom engine previously had two closed mechanism IDs and a heart-only
anatomy table. Plans already enforced minimum representations, regions and
verification; the scene compiler supported only heart presets. Server-issued
runtime authorization already required the existing Safety Gate. Clinical
Reasoning separately models hypotheses, supporting/contradictory evidence,
missing evidence, calibrated confidence and decision traces. Those engines and
their thresholds remain unchanged.

The two existing educational definitions now live in the generic immutable
registry. `getMechanismAnatomy` is a compatibility adapter, not a second anatomy
requirement table. The registry uses the existing whole-body catalog and
`AnatomyRequirements`. Generic contracts support multiple systems/organs and
explicit required, optional and highlighted structures. New systems do not
require changing a registry type union. Current compiler capability remains
heart-only; registering a definition does not implement an organ renderer.

Flow: clinical input → existing safety triage → candidate ID/version → registry
resolution → deterministic evidence eligibility → authoritative anatomy minimums
→ validated plan → existing scene compiler → anatomy and mechanism approval
readiness → authorized renderer. Independent gates remain necessary; an eligible
candidate is neither a diagnosis nor a ready render.

## Authoritative definitions and AI boundary

`createMechanismRegistry` is for trusted code registration only. Definitions are
validated, detached, deeply frozen and resolved by exact ID/version. No mutable
map or registration method is returned. Consumers check runtime identity:
rewritten objects, JSON and copies cannot grant visualization/anatomy permission.
This definition identity is not clinical render authorization; the existing
server-issued capability remains required.

An untrusted candidate contains only `mechanismId` and `mechanismVersion`. Extra
fields, invented IDs, unknown versions, replacement requirements, confidence,
diagnosis or patient-approval flags are rejected. AI cannot add definitions through
the request boundary. Future clinically reviewed adapters must generate normalized
evidence on the server; arbitrary AI text is never such an adapter.

The existing symptom plan is still narrowly validated. It may specify an explicit
registered version; omitted legacy versions resolve to the pinned compatibility
version 1, without upgrading. The compiler emits mechanism ID/version into scene
identity and the render fingerprint alongside anatomy/source and asset versions.
Clinical scenes cannot enter the generic renderer with just an identity string.
No cache, new Scene DSL, Blender generator, patient model or LLM call is added.

## Evidence and trigger model

Rules match normalized kind/code and, when specified, origin. Kinds are symptom,
lab, vital sign, assessment response, verified report finding and longitudinal
trend. Facts have present/absent/unknown assertions, provenance origin and evidence
reference; no numeric clinical thresholds are invented. Triggers require at least
one matching positive rule; all required evidence rules must match. Supporting
evidence supplies trace references but never replaces required evidence.
Contradictions and contraindications block before missing-evidence fallback.
Conflicting positive/negative normalized facts require clinical review.

Outcomes: eligible, insufficient-evidence, blocked, needs-clinical-review.
Safety is checked before registry resolution. Missing-evidence behavior is explicit
per definition. Draft/rejected definitions fail; production additionally needs
independent medical review and patient approval evidence.

For compatibility, the current two internal educational mechanisms require a
server-observed nonempty clinical message, coded `clinical-message-provided` as
an assessment response. This fact proves only that input was supplied. It does
not establish symptoms, ischemia, hypertension, physiology, severity or diagnosis.
No automatic mechanism selector is implemented. The candidate remains a possible
educational explanation. This weak educational policy cannot become patient-facing
without formal review and a more specific evidence policy where appropriate.

The current authorization endpoint has no trusted report-evidence adapter. A plan
claiming `documented` therefore fails evidence eligibility, even if it contains
finding references or AI confidence. Generic documented eligibility additionally
requires a server-verified, mechanism-specific confirmation fact. String references
alone do not establish record authenticity. Existing Clinical Reasoning confidence
and traces remain separate; their scores do not override these gates.

## Anatomy, visualization and severity

Required anatomy always participates in readiness, including unhighlighted
dependencies. Optional anatomy is not required until selected; a selected missing
optional structure fails explicitly. Highlights are selections, not the source of
the dependency graph. IDs/representations/coverage/provenance/source versions and
anatomy approval remain checked by the accepted anatomy readiness implementation.
Multi-organ dependencies are partitioned by organ without substitutions.

Current definitions allow highlight, camera focus and structure labels. Invented
plaque, tumor, clot, scar, unsupported pathology and unvalidated deformation are
always prohibited. Other operation contracts are future capabilities only:
nontrivial effects require explicit reviewed rules, positive evidence and verified
anatomy; narrowing additionally requires an explicitly suitable lumen
representation. An operation permission alone does not authorize rendering.
The present compiler constructs only its existing presets and rejects unsupported
finding visualization; it does not generate any new pathology geometry.

Profiles carry explicit primary/secondary structures, camera/effect/motion/flow/
label intents, neutral/subtle visual emphasis and `patientIndependent=true`.
Patient-specific data never belongs to these reusable base definitions. Clinical
severity is none/mild/moderate/high/unknown, separate from visual emphasis;
there is no automatic severity-to-animation mapping or new threshold logic.

Engineering status, medical review status and patient-facing status are separate.
Engineering-valid does not mean medically-reviewed; medically-reviewed does not
mean patient-approved. Medical and patient approval each require evidence.
No actual mechanism in this milestone has patient approval. Even hypothetical
approved anatomy cannot promote an unreviewed mechanism into patient use.

## Representative set and sources

Six representative contracts are exercised: two migrated cardiac definitions in
the application registry and four non-heart TEST definitions. All actual
definitions remain internal-only and medically unreviewed. The test catalog adds
explicit TEST region identifiers solely to prove generic schema behavior; they
do not claim anatomical existence, geometry or complete physiological coverage.

| Mechanism | Domain | Scope/status |
|---|---|---|
| myocardialOxygenDemandSupply v1 | Cardiovascular | Existing definition; requires complete verified myocardial LV/RV/septal/LA/RA tissue; currently unavailable |
| leftVentricularPressureLoad v1 | Cardiovascular | Existing internal LV/aorta educational view; no wall thickening or pressure pathology |
| bronchoconstriction v1 | Respiratory | TEST airway-region contract; verified-report rule, no narrowing generated |
| reduced_filtration v1 | Renal | TEST filtration-region contract; verified-report rule, no filtration threshold inferred |
| fat_accumulation_pattern v1 | Hepatic | TEST liver contract; verified-report rule, no fat geometry generated |
| nerve_compression v1 | Neurologic | TEST neural-region contract under the brain fixture; not a claim that a peripheral nerve is a brain structure |

Authoritative educational sources were checked on 2026-10-03. They support the
general mechanism categories, not the specific fixture representation/evidence
rules, medical approval, diagnosis or suitability of an anatomical mesh:

- [NHLBI coronary supply](https://www.nhlbi.nih.gov/health/coronary-heart-disease/causes).
- [NHLBI pressure and heart workload](https://www.nhlbi.nih.gov/files/docs/resources/heart/lat_disc.pdf).
- [NHLBI airway control](https://www.nhlbi.nih.gov/health/lungs/body-controls-breathing).
- [NIDDK kidney filtration](https://www.niddk.nih.gov/health-information/kidney-disease/kidneys-how-they-work).
- [NIDDK liver fat accumulation](https://www.niddk.nih.gov/health-information/liver-disease/nafld-nash/definition-facts).
- [NINDS peripheral neuropathy/compression](https://www.ninds.nih.gov/sites/default/files/2025-05/peripheral-neuropathy.pdf).

The myocardium gate remains unchanged: no V1/V2 label, chamber surface or
placeholder supplies verified complete muscle. No anatomy dataset is imported.

## Acceptance boundaries and next compiler milestone

Tests prove exact version resolution, immutable authority, evidence policies,
contraindications, claim restrictions, optional/required/highlight independence,
representation failure, patient approval separation, current myocardium failure,
five-domain extensibility and fingerprint sensitivity. The existing worker/DB/
service implementation is not changed; worker packaging is regressed because
its dependency closure includes planning modules. No SCM installation or provider
reacceptance is needed for these contract changes.

Remaining: formal review of mechanism content and selection policies, a trusted
clinical-record normalization adapter, approved anatomy and sources/licenses,
cross-organ compiler capabilities and validated nontrivial effect rules.

Next large safe milestone: a validated patient-independent Scene DSL and generic
compiler boundary that consumes registered mechanism profiles and anatomy
requirements, rejects unsupported effects and preserves deterministic identity.
Start with TEST fixtures and existing safe heart presets; do not add pathology,
cache, FFmpeg personalization or patient-facing approval automatically.

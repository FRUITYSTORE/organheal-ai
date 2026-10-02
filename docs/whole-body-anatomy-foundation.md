# Whole-Body Anatomy Foundation V1

Audit date: 2026-10-03. This is engineering and source-planning evidence, not medical approval.

## Architecture and current inventory

BodySystem → AnatomyOrgan → AnatomyStructure → explicit asset representation.
`WholeBodyAnatomyCatalog` validates identifiers, unique records and relationships;
it freezes a detached copy. Systems and organs have open identifiers, so adding a
taxonomy concept does not require changing an engine type union. Only heart has
an implemented `OrganModule`. The legacy four-organ explanation vocabulary is
still a clinical consumer constraint, not the whole-body registry.

The catalog has five systems, five organs and 26 structure concepts: the existing
22 heart inventory records and four evidenced TotalSegmentator label candidates
(left upper lung lobe, left kidney, liver, brain). Candidates promise neither
geometry nor reviewed semantics. No lung/kidney/liver/brain module was created.
The heart contains 13 available development objects and nine missing records;
all remain anatomically unverified. Four chamber surfaces and three coronary
centerlines are reference-derived; four vessel tubes and two valve tori are
illustrative placeholders. Myocardium, septa and other missing structures remain
missing. No chamber is converted into muscle and no pathology is inferred.

Reuse `AnatomyRegistryEntry`, `AnatomyRequirement`, coverage and `OrganModule`;
do not maintain a parallel requirement model. Each module binds one explicit
representation per structure in that asset version. A different representation
or LOD must be an explicitly selected/versioned asset, never a silent fallback.
Representation choices include tissue, wall, cavity, lumen, vessel, surface,
bone, organ-volume, region, composite, centerline, placeholder and unknown.
Neither filename nor existence of a mesh establishes its representation.

`assetVersion` identifies geometry/material changes. `anatomyVersion` identifies
semantic/provenance revisions; source ID/version pairs are also included in new
scene fingerprints. Existing identity-free internal scenes retain their legacy
hash. New heart scenes carry identity and the renderer rejects stale identities
before Blender; production requires identity. No cache, LOD pipeline, FFmpeg
personalization or patient-state layer is implemented.

## Review and patient boundary

Geometry, semantics, anatomical verification/coverage, clinical approval and
license clearance are independent axes with independent evidence references.
Lifecycle is a derived summary, not an API that grants approval:

| Summary | Meaning |
|---|---|
| missing | No available asset binding |
| discovered | Concept/source known; geometry not imported |
| semantically-unverified | Imported geometry with unresolved meaning |
| imported | Meaning reviewed; geometry verification incomplete |
| geometry-verified | Geometry/meaning reviewed; anatomical evidence incomplete |
| anatomically-verified | Anatomical evidence exists; clinical approval incomplete |
| clinically-approved | Independent clinical approval evidence also exists |
| rejected | Any explicit review rejection |

This summary alone does not authorize rendering. Production requires explicit
anatomical dependencies even with no highlights. Production additionally needs
module production status, anatomical validation, registered structure/organ,
exact source/version/license provenance, independent geometry and semantic
evidence, Blender compatibility, clinical approval, cleared per-asset license
use under reviewed commercially compatible terms, no placeholder, verified
anatomy and complete evidenced coverage. Wrong representation, missing regions,
partial coverage and missing dependencies fail explicitly. Existing myocardium,
septum and valve tissue gates are preserved.

Safety Gate → validated mechanism/plan → canonical compiler → readiness →
renderer authorization stays in that order. A required dependency need not be
highlighted; every dependency is checked, while only selections map to highlight
objects. AI text cannot authorize readiness or change minimum mechanism rules.
Internal development mode remains explicitly separate and never certifies an
asset. Hypothetical reviewed metadata in tests is not a real source approval.

## Source audit and licensing

Pinned TotalSegmentator source/package audit: **2.18.0**, commit
`246be1de845148081a151870b99aaf8407b7621c`. This identifies inspected code/docs,
not the model weight artifact, annotation release or a predicted patient mask.
The audited [README](https://github.com/wasserth/TotalSegmentator/blob/246be1de845148081a151870b99aaf8407b7621c/README.md)
documents 117 `total` categories, NIfTI output (separate masks or multilabel),
optional DICOM SEG/RTSTRUCT, openly available Apache-2.0 default task and
separately licensed commercial tasks. These are segmentation candidates, not
an anatomical atlas or medical-device validation. Exact selected labels are
checked against the pinned [class map](https://github.com/wasserth/TotalSegmentator/blob/246be1de845148081a151870b99aaf8407b7621c/totalsegmentator/map_to_binary.py).

| Source/version | Structures/form and semantic certainty | Rights/attribution/derivatives | OrganHeal decision |
|---|---|---|---|
| TotalSegmentator V1; annotation/artifact version unresolved | Cardiac labels ambiguous; no wall/cavity/full myocardium conclusion | Code Apache license does not independently clear exact legacy model/data/output chain; unresolved | Not accepted as verified cardiac source |
| TotalSegmentator V2 `total`; pinned code 2.18.0 | 117 voxel label categories; organ/vessel/bone/muscle candidates; individual prediction semantics/coverage still require review | Apache-2.0 upstream task terms; retain applicable notices/changes; requested TotalSegmentator/nnU-Net citation; per-asset clearance still needed | Four discovered label concepts only; no imported assets |
| `heartchambers_highres`; pinned config task 301 | Seven masks; wall/cavity and myocardial regional coverage unproven | Commercial task; academic/noncommercial option is not commercial clearance; exact agreement/model artifact unresolved | Candidate only; see decision record |
| Z-Anatomy local reference; revision unpinned | Chamber surface/centerline derivation; meaning and geometry quality not medically reviewed | Atlas claims BY-SA 4.0; mixed upstream sources; attribution/ShareAlike and derivative chain unresolved | Existing development heart only; no commercial/patient clearance |
| BodyParts3D current archive; archive 4.0, license page 2025-02-27 | OBJ atlas geometry, anatomical concept/representation IDs; individual asset not inspected | Current archive CC BY 4.0, attribution/link/changes; selected version must be confirmed | Source candidate, no import |
| BodyParts3D legacy site; version unresolved | Legacy atlas reference, no inspected model | Legacy CC BY-SA 2.1 JP; attribution/ShareAlike | Existing derivative chain requires reconciliation |
| OrganHeal illustrative primitives; heart-v2-development | Tubes/tori, no anatomical truth claim | Internal distribution/license review unresolved | Development placeholders only |

Z-Anatomy [README snapshot](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ad876c0af51563498816c6f0da4283ebd1914ffa/Readme.md)
is audit evidence, **not** the revision of local `Startup.blend`. It lists
BodyParts3D, UW brain/white matter references without detailed terms, Dundee
cranial nerves (BY 4.0), Dundee inner ear (BY-NC-SA 4.0), Lissie Cowley kidney
(BY-NC 4.0), and Wikipedia-derived definitions (BY-SA 3.0). Those are upstream
references, not additional assets imported into this repository. Mixed terms
prevent blanket commercial clearance; the manifest's historical retopology
description does not settle derivative rights.

BodyParts3D has a material version/license discrepancy: the
[legacy license](https://lifesciencedb.jp/bp3d/info_en/license/index.html) declares
BY-SA 2.1 JP, while the [current archive license](https://dbarchive.biosciencedbc.jp/jp/bodyparts3d/lic.html)
declares BY 4.0. The [archive metadata](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README.html)
distinguishes concept and representation identifiers; a compound concept does
not guarantee a complete compound mesh. New archive terms do not automatically
relicense an older Z-Anatomy derivative. Review exact component/version chain.
Official [BY 4.0](https://creativecommons.org/licenses/by/4.0/),
[BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/),
[BY-SA 2.1 JP](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en) and
[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) terms require the
applicable obligations; catalog terms review is not per-asset legal clearance.

No new source files, binary assets, models, masks or datasets were downloaded.
Only public documentation/code/license metadata was inspected. Source and license
records have limitations/evidence; asset provenance records derivation and a
separate license-review decision. Unresolved or NC terms fail commercial
production readiness even if a mesh exists or someone toggles medical flags.

## Source availability matrix (planning only)

“Label known” means a named category exists, not medically verified geometry.
All rows have **no patient-ready asset now**; absence from the small catalog does
not imply the source has no anatomy in that system.

| System | Candidate exists? | Semantics known? | License review | Usable now / further audit |
|---|---|---|---|---|
| Cardiovascular | V2 total/highres, Z-Anatomy/BP3D | Labels known; cardiac regions unresolved | Apache task vs commercial highres; atlas chain unresolved | Development heart only; chamber/myocardium protocol and regions needed |
| Respiratory | V2 lung lobes/trachea; atlas | Labels known; detailed bronchial coverage not reviewed | Default task terms reviewed; atlas component terms unresolved | No imported lung; review masks and airway representation |
| Neurologic | V2 brain; atlas brain/nerves | Whole brain label known; substructure meaning not reviewed | Default task terms reviewed; UW/component terms unresolved | No imported brain; audit detailed neuro anatomy |
| Digestive | V2 digestive organ labels; atlas | Named labels, no complete regional review | Default task terms reviewed; exact atlas versions unresolved | Not registered/imported; audit chosen organs |
| Hepatic | V2 liver; atlas | Liver label known; segments/ducts not established | Default task terms reviewed; per-asset review needed | Liver concept only; no mesh |
| Renal/urinary | V2 kidneys/bladder; atlas | Kidney label known; collecting-system coverage not established | Default task terms reviewed; some Z kidney references NC | Left kidney concept only; resolve component chain |
| Endocrine | V2 thyroid/adrenal labels; atlas | Category names only; complete system not reviewed | Default task terms reviewed; component audit needed | No module; audit selected structures |
| Metabolic | Organs above; no independent “metabolic anatomy” asset established | Mechanism-specific dependencies unresolved | Depends on chosen components | No coverage claim; define clinical dependency graph later |
| Musculoskeletal | V2 bones/muscles; atlas | Labels known; joints/cartilage/attachments not reviewed | Default task terms reviewed; atlas version audit needed | No imported assets |
| Reproductive | Selected default labels such as prostate; atlas candidates | Complete reproductive coverage not established | Exact components/tasks need audit | No imported assets; unsupported details unavailable |
| Integumentary | Atlas candidate | Skin layer/coverage semantics not audited | Exact component/license audit needed | Not available in current registry |
| Sensory | Atlas candidate | Eye/ear substructures not audited | Inner-ear NC reference; other component terms unresolved | Not available; no commercial clearance |
| Vascular / cross-system | Default vessel labels; atlas | Label names, not complete tree/wall/lumen verification | Default vs special-task terms must be distinguished | Review branching, topology and representations |

## Gaps and next milestone

Engineering contracts and fail-closed readiness are available. **Zero current
structures have patient-facing clinical approval.** Whole-body availability is
not a percentage inferred from category counts. Existing backend/service
acceptance remains preserved; metadata changes need renderer/compiler/worker
packaging regression, not reinstalling SCM or connecting production providers.

Next large safe milestone: evidence-reviewed anatomy onboarding for one selected
organ/asset, including exact source/weight/annotation version, commercial rights,
representation protocol, regional coverage and independent anatomical/clinical
review. Start with source and review acceptance criteria; import no asset until
its source/license gates pass. Keep the myocardium gate unresolved until evidence
supports it. Cache/reuse, personalization and patient-state layers remain later.

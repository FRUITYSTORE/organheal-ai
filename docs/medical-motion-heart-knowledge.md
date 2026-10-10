# Heart Medical Visual Knowledge Pack V1

Status: **INTERNAL REVIEW — INCOMPLETE**. No patient execution, delivery, medical
approval, license clearance or anatomical validation is added. Existing R2.6B
files are preserved byte-for-byte. No website integration or anatomy acquisition.

## Architecture

The versioned coverage matrix is defined before the scene modules in
`lib/medical-motion/heart-knowledge/coverage.ts`. Each topic carries bilingual
terminology, intent, required authority, anatomy/motion needs, source references,
safety, gaps and readiness. `library.ts` derives the scene library, distinct
topic recipe registry, asset gap report and coverage score from that matrix.
Registry completeness is never counted as clinical or executable completeness.

`resolver.ts` adds a planning adapter to the existing `planMedicalExplanation`
and opaque owner-context contract. Copied context fails existing authority checks.
Exact topic/teaching-target matching and verified topic-specific evidence are
required for personalized planning. Query aliases are lookup hints, never
diagnostic classifiers. Cache matches are explicitly unverified planning hints.
The adapter grants **no render authority**. Existing chapter ownership, narration,
marin/cedar selection, source profiles and approved native motion are unchanged.

The three visual authority levels are separate. General educational mechanism
does not assert a patient finding. Safe personalization can plan emphasis and
source-verified result/risk context. Patient pathology requires the existing
clinical authority plus finding-specific evidence and an approved scene; this
new pack's patient-pathology path is entirely BLOCKED, even for a diagnosis label.
USER_STATED, labs, risk estimates and symptoms cannot open that path.

## Implemented review graphics

Eight original code-drawn schematic modules:

- LDL/cholesterol transport particles
- triglyceride-rich transport particles
- glucose/HbA1c measurement window
- arterial pressure concepts
- Heart Age risk-factor communication
- electrical conduction/ECG concept sequence
- normal circulation ordering
- coronary supply relationship

These are types C/D/E/F, not invented anatomical geometry. They use progressive
reveal and explicit reading time; no simulated physiological timing, ECG waveform,
particle concentration, clinical numerical weights, measured pressure trace or
pathological heartbeat is invented. Equal factor nodes are categories, not a
contribution estimate. HbA1c's approximate time window needs clinical review and
does not imply a universal patient-specific measurement relationship.

`review-graphics.ts` compiles opaque, fixed owner-review scenes, verifies the
existing local Arial font capability, shapes Arabic with local Pango and renders
bounded frame buffers. It does not spawn a second render engine. The TEMP proof
harness uses the existing guarded FFmpeg runtime to encode these buffers. Proofs
are not production jobs and are not published. Source media from the medical
reference pages is never copied. Original schematic media uses no external model
or texture license; project release/licensing review remains required.

Five Arabic proofs: LDL, pressure, Heart Age, electrical sequence and normal flow;
1080×1920, 24 fps, 8 seconds, no audio, with 540×960 review copies and contact
sheets. The flow proof is a directional graph, **not a validated cardiac-cycle
mechanical animation**. The electrical proof is a sequence, **not a measured ECG
or validated sinus/AF rhythm**. Anatomical/phase-accurate versions remain missing.

## Gaps and source boundary

Existing HERO/MOTION/APIL/BP3D/SSM remain independent internal references. HERO is
not structure-addressable. Motion is native source animation, not a validated
pathological preset. BP3D cavities cannot satisfy myocardial tissue; SSM is not a
complete myocardial shell or independently represented septum; APIL RARV cannot
be split. Their source/license/medical-review limitations remain unchanged.

Arterial-wall/cross-section anatomy, plaque progression, stenosis/ischemia/MI,
validated rhythm presets, valves, pericardium, septa, congenital anatomy, detailed
procedures and disease-specific mechanical scenes remain ASSET_REQUIRED or
BLOCKED. Acquisition must establish official URL, author, exact license, archive
SHA-256, attribution, commercial/derivative rights, redistribution, units/axes,
topology and medical review before activation. No speculative assets were made.

All catalogue topics have general educational routing or explicit safe failure.
Medication entries are mechanism catalogue definitions, not prescribing advice.
Symptom routes require existing urgent clinical safety authority and do not infer
disease. Troponin is not an automatic MI diagnosis; BNP is not an automatic heart
failure diagnosis; HDL is not shown cleaning arteries; Heart Age is not tissue age.

## Medical references and review boundary

Primary reference pages support the editorial concepts, not clinical approval:
[NHLBI heart](https://www.nhlbi.nih.gov/health/heart),
[blood-flow order](https://www.nhlbi.nih.gov/health/heart/blood-flow),
[electrical and pressure concepts](https://www.nhlbi.nih.gov/health/heart/heart-beats),
[tests](https://www.nhlbi.nih.gov/health/heart-tests),
[cholesterol](https://www.nhlbi.nih.gov/health/blood-cholesterol),
[atherosclerosis](https://www.nhlbi.nih.gov/health/atherosclerosis),
[CDC Heart Age methodology](https://www.cdc.gov/mmwr/preview/mmwrhtml/mm6434a6.htm),
[MedlinePlus tests](https://medlineplus.gov/lab-tests/),
[troponin](https://medlineplus.gov/lab-tests/troponin-test/),
[BNP](https://medlineplus.gov/lab-tests/natriuretic-peptide-tests-bnp-nt-probnp/).
Arabic terminology and simplified diagrams remain unreviewed by a clinician.

## Next activation requirement

Owner visual review and qualified medical review of the schematic pack, then a
separate approved integration with existing owned chapter/media authority. No
automatic planner-to-patient execution is added here. Source and clinical
qualification of artery-wall and valve assets is the next anatomy acquisition gap.

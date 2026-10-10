# MM-ORGANHEAL-ARTERY-LAYERED-MASTER-V1

Historical prototype report. The obsolete implementation and prototype tests were retired by MM-VISUAL-LIBRARY-LEGACY-CLEANUP-V1. Original milestone findings and status snapshots below are retained as history; they are not current runtime instructions.

**NO — MEDICAL_STRUCTURE_PASS_VISUAL_FAIL.** The editable semantic candidate exists, but the single presentation pass still reads as a schematic tube/cut channel. It is not qualified as the LDL/plaque/stenosis animation base. No automatic second styling pass was started. MEDICAL_REVIEW_PENDING; patientFacing=false; no clinical approval or runtime activation.

1. Source lock: NHLBI/NIH/HHS `Atherosclerosis diagram.png`, PUBLIC_DOMAIN_CONFIRMED, SHA-256 `9a9865390c625960d6bfcee88baecddb18bd74a21c611e9de2659f6f32203e48`. Exact rights record: https://commons.wikimedia.org/w/index.php?title=File:Atherosclerosis_diagram.png&oldid=1283005813. Official counterpart was verified in the preceding rights milestone. Source file unchanged.
2. Structure contract: `ARTERY_LAYERED_STRUCTURE_CONTRACT_V1`, contained in candidate manifest. This is an editable research-artwork contract, not a second runtime engine or clinical anatomy authority.
3. Total vector paths: **4** authored paths; **18** shapes/use references; **39** unique deterministic IDs. Blood, shading and mask references reuse geometry rather than duplicate anatomy. Every shape/path/use belongs to one explicit family. No unresolved semantic paths; assignment does not mean medical validation.
4. Layer IDs: ARTERY_OUTER, ARTERY_WALL, LUMEN, BLOOD_REGION, PLAQUE, NARROWED_LUMEN_STATE, BACKGROUND, SHADING, HIGHLIGHT, CAMERA_SAFE_REGION. Families: ANATOMY, BLOOD, PATHOLOGY, PRESENTATION. FLOW_CUE_REGION omitted; future flow may use the lumen masks.
5. Healthy construction: a common visible longitudinal cutaway envelope; wall is the envelope minus the lumen; blood reuses the lumen. Pathology is hidden. Removing pathology objects entirely leaves identical healthy pixels. This is a source-guided 2D cutaway, not a new 3D tube or reconstructed back surface.
6. Plaque construction: explicit upper-wall-associated path, clipped to the healthy lumen. Raster tests verify containment and wall-side boundary contact. It visibly intrudes into the flow region. Disabling pathology restores the independently authored healthy counterpart supported by source panel A, rather than guessing hidden diseased anatomy.
7. Narrowing construction: same master and **same plaque geometry** as PLAQUE. Source B contains one plaque/narrowed comparison, not a severity series. NARROWED is the residual-lumen review emphasis. Its residual mask is healthy lumen minus plaque, with no pixels outside healthy lumen. No clinical percentage is assigned.
8. Deferred: early lesion/fatty streak, thrombus, rupture, calcification, microscopic histology, patient-specific morphology, RBC/LDL particles and severity progression. No Servier paths used. Servier disposition remains REFERENCE_ONLY / SEMANTIC_LAYER_BLOCKER / VISUAL_BASE_REFERENCE_ONLY.
9. Assumptions: `ARTERY_LAYERED_MASTER_ASSUMPTIONS_V1` in manifest records ten visible/simplified/omitted/presentation decisions. Curves and scale are educational/nonliteral; original cross-section inset, arrows, labels and classroom layout omitted. Red/brown and ochre are illustrative treatments, not tissue composition or oxygenation data. Texture is presentation-only, not source histology. Medical review remains required.
10. Source fidelity: **SOURCE_FIDELITY_PASS for qualitative educational concepts only**: wall surrounds lumen, blood occupies it, plaque is wall-associated, plaque narrows the opening, healthy state is recoverable. Pixel tracing, registered dimensions, complete longitudinal anatomy or clinical proportions are not claimed. Original perspective/section detail is simplified, which also limits visual credibility.
11–12. Proofs below: six full PNGs at1080×1920, six review PNGs at540×960. No narration, audio, labels on artwork, particles or video. Anatomy/pathology path data are identical in both modes; gradients/texture/shadow/style differ.

| State | Medical base | OrganHeal presentation |
|---|---|---|
| HEALTHY | [Full PNG](C:/Users/baraa/AppData/Local/Temp/organheal-artery-layered-master-v1/healthy-medical-base.png) | [Full PNG](C:/Users/baraa/AppData/Local/Temp/organheal-artery-layered-master-v1/healthy-organheal-presentation.png) |
| PLAQUE | [Full PNG](C:/Users/baraa/AppData/Local/Temp/organheal-artery-layered-master-v1/plaque-medical-base.png) | [Full PNG](C:/Users/baraa/AppData/Local/Temp/organheal-artery-layered-master-v1/plaque-organheal-presentation.png) |
| NARROWED | [Full PNG](C:/Users/baraa/AppData/Local/Temp/organheal-artery-layered-master-v1/narrowed-medical-base.png) | [Full PNG](C:/Users/baraa/AppData/Local/Temp/organheal-artery-layered-master-v1/narrowed-organheal-presentation.png) |

Review copies have `-review.png` appended to each corresponding stem; exact paths/hashes in candidate manifest and TEMP render evidence.

13. [Owner contact sheet](C:/Users/baraa/AppData/Local/Temp/organheal-artery-layered-master-v1/source-reconstruction-presentation-contact.png),1620×3000. Three rows: original full source / medical reconstruction / presentation. Labels are review-only. Original source appears unchanged, scaled with letterboxing, including its original source labels.
14. Semantic structure: PASS. Wall/lumen masks disjoint at interior alpha threshold; blood confined to lumen; plaque contained and wall-contact verified; residual lumen smaller, nonempty, contained. Reference-space mask areas are implementation QA, not medical stenosis measures. IDs and source/master hashes guarded.
15. Visual quality: **FAIL**. Silhouette/wall still look like a generic cut channel; tissue is too smooth and simplified; plaque resembles a shaped insert despite geometric attachment; portrait composition leaves substantial empty space. Shading adds depth but does not meet the biological patient-education target. No quality pass is inferred from automated tests.
16. Animation readiness: **blocked by visual gate**. Candidate metadata maps blood/LDL overlays to lumen/residual mask, plaque focus/reveal to PLAQUE, comparisons to shared master states and emphasis to LUMEN/NARROWED_LUMEN_STATE. These are future targets, not activated animation. No plaque growth, severity morph, physiological flow, thrombus or hidden-surface parallax authorized. Whole-artwork 2D presentation is the only presently representable camera/parallax concept.
17. External asset cost: **$0**. Existing Sharp/XML/Vitest tooling only. No paid stock/plugins/add-ons/commissioned artwork.
18. Historical files created at that milestone (prototype tooling/tests now retired):
    - Preserved SVG: `medical-assets/archive/legacy-prototypes/organheal-artery-layered-master-v1/master.svg`
    - `medical-assets/organheal-artery-layered-master-v1.json`
    - `scripts/render-artery-layered-master-v1.cjs`
    - `tests/medical-motion-artery-layered-master.test.ts`
    - this report.

TEMP-only preparation/QA helpers are retained outside Git. Rendered PNGs/masks/evidence are under `C:/Users/baraa/AppData/Local/Temp/organheal-artery-layered-master-v1`. No source image, binary model or raster proof is added to Git. Existing repository files remain unchanged.

19. Focused tests: **12/12 PASS**. Initial healthy-state assertion incorrectly expected every pathology-state pixel difference to fall inside plaque, ignoring residual-lumen emphasis; corrected to compare healthy output with all pathology objects physically removed. Final containment/wall-contact/disjointness tests remain intact. Initial `npx` PowerShell shim was blocked by execution policy; `npx.cmd` ran successfully. Neither correction altered presentation.
20. TypeScript: **PASS**, `npx.cmd tsc --noEmit`. No full regression/build; shared runtime untouched.
21. Diff check: final result appended below. Source/master identity, PNG dimensions, render pixel correspondence, exact semantic IDs and pre-existing file hashes verified. Sharp emitted font-cache warnings; contact-sheet labels rendered and were inspected.
22. Exact Git status appended below. Branch `codex/medical-motion-worker-execution`; HEAD `d378b02188e4765ed7d1926975b17538040b8ac7`. No staging/commit/push; protected directories untouched.
23. Recommended next milestone: owner/medical-illustrator review of this candidate's cutaway construction and visual-fail evidence. Obtain explicit direction before another authoring/presentation pass. Retain semantic research asset and defer animation integration; do not claim this is the production artery master.

Provenance: ORGANHEAL_RECONSTRUCTION_FROM_PUBLIC_DOMAIN_REFERENCE. Source courtesy credit: NHLBI; NIH; U.S. Department of Health and Human Services. OrganHeal independently authored semantic reconstruction and presentation; changes and educational simplifications recorded; no source authorship or endorsement claimed.

**CAN ORGANHEAL_ARTERY_LAYERED_MASTER_V1 NOW BECOME THE BASE FOR LDL / PLAQUE / STENOSIS ANIMATION? NO: semantic structure exists, but the visual gate failed.**

Final validation: git diff --check PASS; 57 pre-existing files byte-identical; source/master hashes and JSON PASS.

Exact git status --short:

```text
 M lib/medical-motion/cinematic-master-runtime.ts
 M lib/medical-motion/composition/audio-compositor.ts
 M lib/medical-motion/composition/medical-av-sync.ts
 M lib/medical-motion/composition/narration-foundation.ts
 M lib/medical-motion/composition/voice-runtime.ts
 M lib/voice/medical-narration-provider.ts
 M lib/voice/voice-synthesis.service.ts
 M medical-assets/LICENSE_MANIFEST.json
 M medical-assets/heart-hero-selected-local-inventory.json
 M tests/medical-motion-cinematic-runtime.test.ts
 M tests/medical-motion-heart-hero-master.test.ts
 M tests/production-heart-source-intake.test.ts
?? .claude/
?? docs/medical-motion-artery-layered-master-v1.md
?? docs/medical-motion-artery-quality-v2.md
?? docs/medical-motion-coronary-quality-gate.md
?? docs/medical-motion-coronary-source-intake-v1.md
?? docs/medical-motion-heart-free-asset-audit-v1.md
?? docs/medical-motion-heart-free-asset-qualification-v1.md
?? docs/medical-motion-heart-knowledge.md
?? docs/medical-motion-heart-master-rights.md
?? docs/medical-motion-nhlbi-atherosclerosis-rights-reconciliation-v1.md
?? docs/medical-motion-public-domain-atherosclerosis-master-v1.md
?? docs/medical-motion-servier-layer-qualification-v1.md
?? docs/medical-motion-servier-semantic-mask-proof-v1.md
?? docs/medical-motion-trusted-execution.md
?? lib/medical-motion/chapter-execution-runtime.ts
?? lib/medical-motion/execution-narration.ts
?? lib/medical-motion/explanation-execution.ts
?? lib/medical-motion/heart-knowledge/
?? lib/medical-motion/render/explanation-visual-recipe.ts
?? medical-assets/artery-source-candidate-registry-v1.json
?? medical-assets/candidates/organheal-artery-layered-master-v1/
?? medical-assets/coronary-source-silesian-import-report.json
?? medical-assets/heart-asset-cost-forecast-v1.json
?? medical-assets/heart-free-asset-execution-matrix-v1.json
?? medical-assets/heart-free-asset-inventory-v1.json
?? medical-assets/heart-free-asset-qualification-v1.json
?? medical-assets/heart-master-rights-evidence.json
?? medical-assets/nhlbi-atherosclerosis-rights-reconciliation-v1.json
?? medical-assets/organheal-artery-layered-master-v1.json
?? medical-assets/organheal-derivative-medical-art-policy-v1.json
?? medical-assets/public-domain-atherosclerosis-source-gate-v1.json
?? medical-assets/servier-atheroma-atomic-path-inventory-v1.json
?? medical-assets/servier-atheroma-semantic-mask-proof-v1.json
?? medical-assets/servier-coronary-derivative-readiness-v1.json
?? medical-assets/servier-coronary-layer-contract-v1.json
?? medical-assets/servier-heart-layer-preparation-v1.json
?? medical-assets/servier-native-group-extraction-v1.json
?? render/blender/artery_master.py
?? render/blender/artery_master_v2.json
?? render/blender/artery_master_v2.py
?? scripts/render-artery-layered-master-v1.cjs
?? supabase/.temp/
?? tests/medical-motion-artery-layered-master.test.ts
?? tests/medical-motion-artery-quality-v2.test.ts
?? tests/medical-motion-coronary-artery.test.ts
?? tests/medical-motion-coronary-rights.test.ts
?? tests/medical-motion-explanation-execution.test.ts
?? tests/medical-motion-explanation-visual-recipe.test.ts
?? tests/medical-motion-heart-knowledge.test.ts
```

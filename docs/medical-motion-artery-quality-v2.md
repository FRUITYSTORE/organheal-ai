# MM-ARTERY-QUALITY-V2 qualification result

Historical prototype report. The obsolete implementation and prototype tests were retired by MM-VISUAL-LIBRARY-LEGACY-CLEANUP-V1. Original milestone findings and status snapshots below are retained as history; they are not current runtime instructions.

Decision: **ASSET_QUALITY_BLOCKER**. The five new diagnostic stills do not meet the biological vascular-tissue quality threshold. Stop condition reached; no clips, clinical activation or downstream disease scenes were produced.

The candidate is owned procedural geometry, internal-review only, patientFacing=false, patientPathologyClaim=false, medicalReviewStatus=PENDING and clinical approval unreviewed. No runtime registration or existing file was changed.

## Changes and limitations

- Geometry: continuous tapered, gently curved centerline with simplified inner/medial/outer wall regions and visible section surfaces. These are educational dimensionless proportions, not measured coronary anatomy. The long segment still reads as a cut tube. Section surfaces show faceting; topology has not been medically or production qualified.
- Tissue: muted red/tan procedural color variation, fine bump, restrained specular response and subsurface presentation. The result remains too uniform/synthetic.
- Blood: restrained transmission/absorption medium with owned biconcave cell concepts. It does not yet clearly convey a blood-filled lumen. Cell trajectories are illustrative, not CFD or validated flow. Particle-wall containment and cell/fluid topology are not qualified.
- LDL: separate core plus surface-envelope motifs with varied orientation; EDUCATIONAL_SCALE_NOT_LITERAL. Motifs are not molecule counts, apoB geometry or packing evidence. The result remains schematic.
- Plaque: eccentric continuous inner-wall thickening, not an independent attached blob. The continuous lining/fluid presentation does not reveal enough lesion contour or stage distinction. Mathematical state separation does not establish visual or medical credibility.
- States: HEALTHY_ARTERY_STATE_V1, EARLY_PLAQUE_STATE_V1 and ADVANCED_NARROWING_STATE_V1 share one geometry/camera family. Coefficients are shape controls, not percentage stenosis, clinical stages or a temporal progression claim. No state-transition video was validated.
- Cameras: ARTERY_HERO_CAMERA_V1 (65 mm) and ARTERY_WALL_FOCUS_CAMERA_V1 (75 mm); tiny bounded orbit definitions. Both ends remain within the frame. The wall-focus view is diagnostic rather than a qualified close view.

## Framing and real rendering

Blender 5.2.1 LTS; one headless invocation, five 1080x1920 PNGs. Framing validated at every one of 120 proposed frames per proof, using projected object-bound corners. This is conservative broad framing evidence, not animation/particle containment validation.

Safe rectangle: x=0.07–0.93, y=0.18–0.88; clip planes 0.05–100. Hero distance 17.889777, wall-focus distance 21.796956 in educational units. Aggregate projected bounds across all proofs: x=0.245203–0.792467, y=0.191355–0.879107. Minimum frame-edge margins: left 24.52%, right 20.75%, bottom 19.14%, top 12.09%. Minimum clearance to the required safe rectangle is approximately 0.0893% at its top boundary. Camera-space depths are 15.859152–24.946213; no near/far clipping detected. Both ends are framed, but their material/section appearance remains a quality limitation.

| Proof | Scene/preflight seconds | Render seconds |
|---|---:|---:|
| healthy-artery | 7.462 | 13.276 |
| healthy-wall-focus | 7.367 | 11.956 |
| ldl-transport | 12.570 | 12.186 |
| early-plaque | 7.211 | 11.975 |
| advanced-narrowing | 7.256 | 11.975 |

TEMP root: `C:/Users/baraa/AppData/Local/Temp/organheal-artery-quality-v2`.
Each proof is `<root>/<proof>/<proof>.png`, with a 540x960 `<proof>-review.png` and `still-evidence.json` including all framing samples and executed builder/config hashes.

Comparison: `<root>/old-vs-new-comparison.png`: old left/new right; healthy top/narrowing bottom. No labels burned into the proofs. Quality/timing summary: `<root>/quality-review.json`.

Video paths: **none**. The user-required stop condition (still schematic/pipe-like) takes precedence over generating five clips from a failed asset. No narration, labels, music or composed disease videos were generated.

Warnings: Blender material/world node deprecations, unavailable HIP probing and an OptiX cache database warning. All five PNG renders completed; Blender exited 0. No cache files were changed manually.

## Reference assumptions

Wall-region concepts were checked against [NCBI vascular anatomy](https://www.ncbi.nlm.nih.gov/books/NBK547743/); lipoprotein core/envelope concepts against [Endotext](https://www.ncbi.nlm.nih.gov/books/NBK305896/); wall-associated plaque concepts against [NCBI atherosclerosis](https://www.ncbi.nlm.nih.gov/books/NBK343489/) and [NHLBI](https://www.nhlbi.nih.gov/health/atherosclerosis). No reference figures or downloaded artery meshes were copied. Those conceptual references do not validate these proportions, colors, lesion geometry, trajectories or render quality.

## Validation

Focused artery V2 + prior artery/rights/Heart Knowledge/R2.6B execution and directly affected cinematic tests: **111/111 passed, 12/12 files**. V2 contributes four tests. TypeScript: PASS. git diff --check: PASS. No full regression or build: shared runtime behavior was not changed. Real framing evidence is separate from automated subjective-quality assessment; tests do not certify aesthetics.

All 31 pre-existing uncommitted files were checked against the initial preservation SHA-256 pins and remain byte-identical. Branch/HEAD remain codex/medical-motion-worker-execution / d378b02188e4765ed7d1926975b17538040b8ac7. No staging, commit or push. Protected directories were not opened or changed. New files only: this report, artery_master_v2.py, artery_master_v2.json and medical-motion-artery-quality-v2.test.ts.

The artery master remains unqualified. Further tissue/section-surface, blood-medium and lesion-readability work requires another quality pass; do not expand the disease runtime from this candidate.

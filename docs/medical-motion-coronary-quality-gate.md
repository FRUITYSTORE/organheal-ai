# MM-HEART-CORONARY-V1 — rights reconciliation and first visual gate

Historical prototype report. The obsolete implementation and prototype tests were retired by MM-VISUAL-LIBRARY-LEGACY-CLEANUP-V1. Original milestone findings and status snapshots below are retained as history; they are not current runtime instructions.

Milestone status: **INCOMPLETE — ASSET_QUALITY_BLOCKER**.
No coronary pack is READY, production-approved or patient-facing. No staging,
commit or push. Existing R2.6B, Heart Knowledge and rights research were preserved.

## Rights reconciliation completed

The existing selected HERO inventory and the `HEART_HERO.ownerVisualSelection`
manifest record now identify Realistic Human Heart by neshallads, Sketchfab UUID
`3f8072336ce94d18b3d0d055a1ece089`, under CC BY 4.0. Commercial use, modification,
derivative use and rendered output permissions are recorded with attribution and
change-notice obligations. Evidence remains the preserved rights audit and the
official public model API:
https://api.sketchfab.com/v3/models/3f8072336ce94d18b3d0d055a1ece089

Credit: "Realistic Human Heart" by neshallads, licensed under CC BY 4.0.
OrganHeal presentation/material/camera changes applied. Preserve the source URL
and https://creativecommons.org/licenses/by/4.0/ with that credit.

The existing cinematic master retains its source ID, source hash, asset version,
geometry and clinical status. Its current provenance/rights metadata is reconciled.
The original visual configuration and lock files are unchanged; their historical
unresolved license annotations are not the current rights authority. The motion
master's rights state is not upgraded. Original Pigcraft evidence remains separate.

Medical review remains pending/unreviewed; anatomicallyValidated, productionApproved
and patientFacing remain false. No patient delivery or source-profile activation
was added. Existing hash-failure checks remain intact.

## First artery prototype

`render/blender/artery_master.py` creates only a new owned generic vessel cutaway.
It does not import or modify the heart, fuse sources, or claim a named coronary.
Wall and lumen geometry, simplified blood-cell discs, enlarged lipoprotein beads,
original procedural material presentation and neutral clinical lighting are
prototypes, not validated histology or physiology. No source illustration was copied.

Medical concept references:

- NHLBI atherosclerosis: https://www.nhlbi.nih.gov/health/atherosclerosis
- Endotext lipoproteins/retention: https://www.ncbi.nlm.nih.gov/books/NBK343489/
- SCCT quantitative stenosis definitions: https://pmc.ncbi.nlm.nih.gov/articles/PMC12782628/

Wall dimensions, lesion length, particle scale, positions and counts are declared
educational choices, not measured human anatomy. No microscopic precision, plaque
type, calcification, pressure, oxygen quantity or CFD result is asserted.

The bounded prototype accepts explicitly **diameter reduction**, 0–85 percent.
For reference radius 1 and educational severity S:

`r(x) = 1 - (S/100) * exp(-(x/1.35)^4)`

At the central section, `Dmin/Dref = 1 - S/100`. Circular area loss is therefore
`1 - (1 - S/100)^2`, not S percent. A 60% diameter reduction yields 84% area loss.
The two proofs use 0% and 55% educational diameter design inputs, not patient
report values. This shape is generic concentric narrowing; a percentage alone
does not establish plaque morphology, plaque type, flow impact or a patient scan.
No report normalizer or patient execution route was implemented.

## Visual inspection: FAIL

Both real 1080x1920 PNGs were inspected. They read as a uniformly smooth cut pipe,
simple discs/beads and a pale concentric thickening. The tissue/particle presentation
does not meet the requested professional biological standard. The framing clips
segment ends. Narrowing is visible, but visibility is not medical/visual acceptance.

Under the owner's explicit schematic-quality stop condition, no clip set or
end-to-end explanation was produced. The prototype is not registered as a trusted
final module, and no prior schematic was promoted to a final asset.

Outputs outside Git:

- `C:/Users/baraa/AppData/Local/Temp/organheal-coronary-v1/artery-healthy-quality-gate.png`
- `C:/Users/baraa/AppData/Local/Temp/organheal-coronary-v1/artery-stenosis-quality-gate.png`
- Corresponding `.evidence.json` files record hashes, counts, configuration and timing.
- `visual-quality-gate.json` records the failure and remaining work.
- `prototype-render-builder.py` archives the exact executed builder. A later comment-only
  correction accurately calls the simplified cells discs rather than biconcave cells.

Blender 5.2.1 LTS: two invocations; 12.706s and 11.476s measured generation/render
times. No HERO rerender, heartbeat change, FFmpeg composition, TTS call, MP4 or cache
execution occurred. No binary asset or output was added to the repository.

## Remaining requested deliverables

| Requested capability | Current result |
|---|---|
| Artery master | Owned prototype only; quality gate failed |
| LDL particle/transport | Simplified stationary concepts only; no qualified reusable module |
| Wall interaction / plaque progression | Not implemented |
| Stenosis | Bounded mathematical prototype only; not a report/clinical capability |
| Reduced flow / ischemia / MI | Not implemented; no patient pathology inferred |
| Angiography / stent | Not implemented |
| Medical visual style enforcement | Manual gate failed; no automatic acceptance claim |
| Evidence-to-visual resolver, LDL/CTA/RCA/LAD/troponin/MI fixtures | Not implemented |
| Chest-pain execution evidence | Not produced; existing symptom/clinical gates unchanged |
| Eight individual clips | Not produced |
| LDL and confirmed-stenosis composed videos | Not produced |
| Master-cache/FFmpeg performance | Not measured; no usable clip master exists |

All new mechanism review states remain PENDING. No clinical claims, source morphing,
geometry merging, patient authority, treatment recommendation or disease-driven
heartbeat modification was introduced.

Next scope: a bounded artery visual-development pass establishing credible vascular
surfaces, clearer cutaway boundaries, less illustrative particle presentation and
unclipped framing, checked against the documented medical assumptions. Review that
visual gate before expanding mechanisms or generating the clip set. Rights clearance
is complete; the current blocker is visual quality, not the HERO source license.

## Final technical validation

Focused rights/artery/cinematic/Heart Knowledge/R2.6B tests: **107/107, 11 files**.
Affected automated regression: **2172/2172, 152 files, zero failures/skips**,
serialized and manual suites excluded. TypeScript PASS. Build PASS, 91/91 pages;
existing artifact-output.ts:34 tracing warning only. Diff check PASS. These passes
do not override the ASSET_QUALITY_BLOCKER. All 21 pre-existing work files remain
byte-identical; original visual configuration/lock and source binaries unchanged.

Healthy PNG SHA-256: `f1d3dbc760536f40171e722727ac969ac5ce5a216bc23fb7e6166f679b7a7127`.

Narrowing PNG SHA-256: `52d9ef312c12a91b7e36cdeb4b9518b44b217fb453b562ee8ac11490284e658d`.

Exact executed prototype builder SHA-256: `0a651d8206c42006422a59770f5e498f0d18bb2ef278d4645440356266ac2606`.

# Decision: TotalSegmentator cardiac anatomy remains conditional

2026-10-03; public code/docs audited at
`246be1de845148081a151870b99aaf8407b7621c`, package 2.18.0.
No weights, annotation dataset or predicted case was inspected/imported.

**PROVEN:** The maintainer's [Issue 618 clarification](https://github.com/wasserth/TotalSegmentator/issues/618#issuecomment-5948385507)
says V1 labels were mixed up, V2 improved the cardiac task, and a definitive V1
answer cannot be supplied. This does not verify V2 wall/cavity semantics.

The [exact highres label map](https://github.com/wasserth/TotalSegmentator/blob/246be1de845148081a151870b99aaf8407b7621c/totalsegmentator/map_to_binary.py)
has seven classes:

| ID | Label | Proven / unproven anatomical meaning |
|---|---|---|
| 1 | heart_myocardium | Label exists; full shell, LV/RV/septal/LA/RA tissue coverage unproven |
| 2 | heart_atrium_left | Label exists; cavity vs muscle wall unproven |
| 3 | heart_ventricle_left | Label exists; cavity vs muscle wall unproven |
| 4 | heart_atrium_right | Label exists; cavity vs muscle wall unproven |
| 5 | heart_ventricle_right | Label exists; cavity vs muscle wall unproven |
| 6 | aorta | Label exists; wall/lumen, root/branch extent unproven |
| 7 | pulmonary_artery | Label exists; wall/lumen and branch extent unproven |

No named septum, valves, pulmonary veins, venae cavae or coronaries appear in this
output map. Inferior vena cava in crop configuration is **not an output class**.
The [task configuration](https://github.com/wasserth/TotalSegmentator/blob/246be1de845148081a151870b99aaf8407b7621c/totalsegmentator/map_tasks_config.py)
selects task 301, nnUNetTrainer, heart crop, robust crop, no fast mode and
`commercial=true`. The exact deployed checkpoint/version remains unresolved.

[Training/validation documentation](https://github.com/wasserth/TotalSegmentator/blob/246be1de845148081a151870b99aaf8407b7621c/resources/heartchambers_highres_details.md)
reports 1,559 images (1,502 training, 57 validation), paired contrast/noncontrast
same-session images with nonlinear annotation transfer, spacing approximately
0.7265625 × 0.72265625 × 1.0 mm and mean validation Dice 0.950. This is not
all-axis submillimeter spacing or a certificate of regional tissue coverage.
The inspected docs do not supply a chamber wall/cavity annotation protocol.
The [README](https://github.com/wasserth/TotalSegmentator/blob/246be1de845148081a151870b99aaf8407b7621c/README.md)
documents voxel-mask outputs and separate commercial-task licensing. A free
noncommercial/academic option is not commercial OrganHeal clearance; actual
agreement/output rights require review. Code Apache terms alone are insufficient.

**UNPROVEN:** Precise tissue/cavity semantics, full myocardial regional coverage,
separate septum, valves, individual geometry quality, topology, clinical approval,
commercial model/output agreement and exact weight version. Missing named labels
must not be substituted with cropped structures or combined chamber surfaces.

**REJECTED:** Promoting labels to VERIFIED; interpreting chamber surfaces as
myocardium; claiming atrial/septal coverage from `heart_myocardium`; bypassing V1
with synthetic geometry; using a commercial-task mask under assumed Apache
permission; treating Dice or Blender import success as clinical approval.

**REQUIRES MEDICAL REVIEW:** Annotation protocol clarification and per-region
evidence, exact reviewed predicted geometry, orientation/spacing consistency,
laterality, wall thickness if represented, mesh topology and smoothing losses,
independent anatomical review and separate clinical approval. Voxel masks can
technically undergo surface extraction and Blender conversion, but no safe
medical mesh is established until those checks pass. No conversion is implemented.

**Decision:** V1 class 44 remains ANATOMY CONDITIONAL; classes 45–48 are not
assumed muscular walls. Current `heart.myocardium` remains missing/unverified.
The seven V2 labels are discovered source capabilities only, with no imported
highres geometry. No mechanism requiring verified myocardium becomes ready.

# Heart visual foundation v1

`contracts/visual-recipe.ts` defines planning data; `visual-foundation.ts` supplies
versioned output, lighting, audio and safety configuration. Neither issues render,
clinical, source-profile or composition authority. Validation produces an immutable
JSON snapshot, not an executable capability. No website or runtime consumes it yet.

The accepted roles refer to the existing owner selections in
`medical-assets/LICENSE_MANIFEST.json`: HEART_HERO_V1 selects realistic-human-heart /
source/Heart.fbx; HEART_MOTION_V1 selects beating-heart / source/Beating heart.glb.
Roles are not registered runtime asset versions. Recipes must record separate exact
asset versions plus source/evidence references; a future trusted adapter must resolve
and verify them independently. References do not establish licensing clearance or
transfer the original rejected HERO source's attribution to the selected local asset.

NORMAL_HEARTBEAT_V1 means only the native source cycle. Disease or risk labels cannot
change rate/rhythm. Personalization has no implementation here and requires a validated
clinical input/preset and separate authorization. Source geometry, materials and
animation curves remain preserved. Assets remain unvalidated, unreviewed and restricted
to internal review; even patient-education-preview is not patient delivery.

The two profiles reuse SceneOutputProfile's 1080p, aspect ratio and asset-native LOD
types. Their normalized safe text rectangles reserve bottom space for narration
captions/subtitles. Lighting is declarative soft key/fill/rim with restrained highlights,
depth-preserving shadows and charcoal/navy backgrounds; no particles or game styling.
Applying that configuration is deferred, with no source material edits in this step.

Timed cues allow concurrent camera/audio/subtitle tracks, ordered by start time within
the recipe duration. Structure-focus cues are review requests, not evidence of
addressability: a single hero mesh cannot silently become separate anatomical parts.
Future execution must use source-supported module structures and existing gates.
Timeline transitions reuse Timeline V2's cut/fade-through-neutral type. Boundary indices
refer to future resolved base clips, not cue indices; the existing timeline validator
must check clip count, duration and provenance once real authorized bases exist.
No anatomy blending, registration or geometry mixing is authorized.

Narration is primary. Optional education music must duck under speech; doctor previews
disable music. Audio slots reuse existing OverlayKind identifiers. Future media execution
must use existing reviewed audio/composition services. Existing composition output is
720p: this planning layer does not silently upgrade its execution contract to 1080p.
No second compositor, renderer, source registry or authorization engine is introduced.

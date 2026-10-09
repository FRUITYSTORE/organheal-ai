# Cinematic runtime contract v1 — internal review

R2.4A adds an opt-in output/readiness/specification layer. It does not spawn
renders, submit jobs, deliver patient media, or reinterpret persisted Timeline V2.

`LEGACY_720P_25` describes the existing Timeline V2 normalization: 1280×720,
25 fps. Existing personalization V1 aspect-ratio output behavior is untouched.
`CINEMATIC_PORTRAIT_1080X1920_24_V1` is exactly 1080×1920, 24 fps, portrait,
internal review. The new `cinematic-1` specification has independent version IDs;
it cannot be passed as Timeline V2 or composition V1 authority.

Output dimensions are registry constants, not request overrides. Maximum cost:
2,073,600 pixels, 60 seconds / 1,440 frames, single encoder/filter thread. Worker
capacity and ownership fencing are unchanged. Frames must be integral at the
selected rate; legacy 25 fps bases cannot implicitly become cinematic 24 fps.

Two source-local master adapters reuse the locked configurations/builders:

- `HEART_MASTER_VISUAL_V1` → `heart-hero-master-runtime-v1` → selected Heart.fbx.
- `HEARTBEAT_MOTION_MASTER_V1` → `heart-native-motion-master-runtime-v1` → selected
  Beating heart.glb, `NORMAL_HEARTBEAT_V1`, native action `test`, cycle 0–24.

Their profiles are registered in `CINEMATIC_MASTER_SOURCE_PROFILES` using the
existing opaque source-profile registry. They are deliberately separate from
clinical `SOURCE_PROFILES` and the clinical OrganModule resolver. Source-local
composite IDs describe entire source assets, not anatomical chamber coverage.
No original public-source attribution/license is transferred to the selected
local HERO. Public provenance/license clearance remains unresolved for both.

`authorizeCinematicMaster` requires exact master/version/hash, the registry-issued
opaque selection, development mode, internal review, matching output profile,
local source bytes and locked builder integrity. HERO additionally requires all
four original texture hashes. Copied JSON, historical/latest fallback, mismatched
profiles and disease/retarget/merge arguments fail closed. Readiness is an opaque
in-memory capability, not authority reconstructed from persisted JSON.

`authorizeCinematicTimeline` consumes one ready capability per scene. It reuses
the existing cinematic compiler and sequence validator. Its fingerprint includes
the output contract, actual source-profile fingerprints, master locks, scene
boundaries, camera guidance, appearance, motion and neutral transitions. Paths
are excluded. The default recipe produces 276 frames / 11.5 seconds. Cutaway
focus is neutral; no coronary/valve/chamber targeting is fabricated.

The cinematic composition filter contract requires exact portrait native-rate
bases, silence and exact frame counts. Fade-through-neutral has no overlap or
geometry blending. It does not add a process runner or ownership implementation.

R2.4B/C must implement the small render/compositor adapters under existing worker
ownership/capacity/process guards. They must recheck source and builder readiness
immediately before spawn, enforce projected camera bounds through the cycle,
verify output dimensions/rate/frame count/hash, and persist per-segment provenance.
No video execution or patient-ready claim is supplied by this milestone.

## R2.4B/C explicit review execution

`compileCinematicExecution` issues an opaque non-clinical scene capability from
the authorized timeline and exact ready masters. It does not manufacture
clinical `CompiledMedicalScene` authority. Copied JSON is rejected.

`executeOwnedCinematic` requires the existing `ExecutionOwnership` lease guard,
rechecks source bytes and profile authority before spawning, uses existing
artifact allocation and Blender/FFmpeg process guards, and confirms ownership
again at handoff. This is an explicit server review adapter; it is not installed
in clinical request workers and does not publish to Storage or patient delivery.

The versioned camera policy prohibits client matrices, roll, shake and anatomical
target inference. Actual source-object projections, clipping, camera clearance
and approach speed are checked in Blender before rendering and at every rendered
pose. The approved native source camera orientation stays fixed. Approach is
bounded; reorientation is a small pull-back, not an invented anatomical view.

The executor digest is locked independently of the unchanged master locks.
HERO setup calls the locked builder directly. The monolithic motion builder's
original setup is reused up to its first render statement, with its exact digest
and statement anchors verified. Its native rig/action and material presentation
remain unchanged. The owner-approved proof's 24 PNGs remain an integrity-checked
server reference. The cinematic polish renders a fresh 24-frame native cycle for
its exposure, lighting and framing; static motion segments repeat those new
frames without changing native timing. The final segment renders the same cycle
with its restrained pull-back. Reference cache intake is local server trust, not
signed public provenance.

The exact six-scene review executor accepts 276 frames at 24 fps, 11.5 seconds,
silence, and a non-overlapping fade through dark at the source boundary. Both
full and review media are probed for exact dimensions, frame count and duration.
Per-segment source/profile/master identities and camera evidence remain in the
invocation evidence. All source files, frames and media stay outside Git.

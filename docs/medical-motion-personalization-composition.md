# Personalization composition V1

Medical base rendering and private presentation are separate operations. An
immutable, currently authorized reusable base can support different approved
values, subtitles, languages, charts and fit-only aspect ratios without another
Blender render. This is a trusted server foundation, not a patient endpoint or
registration in the installed worker/Windows service.

## Existing infrastructure, new presentation boundary

1. The caller claims a separate final job using the existing job repository.
2. `executeOwnedComposition` uses the existing execution ownership, renewals and
   fenced result publication. It accepts only a trusted server-supplied approved
   specification, never arbitrary AI commands or a browser filesystem path.
3. `MedicalMotionCompositionService` reconstructs the existing owner/context and
   repeats the complete clinical Safety Gate, explanation validation and anatomy
   readiness before reading a base artifact.
4. The base must be published to this user, belong to a current reusable-cache
   generation, and match the compiler base/output fingerprints **and** renderer
   signature. A different mechanism, anatomy, camera or motion is not a substitute.
5. The compositor copies verified bytes into a newly allocated private invocation.
   It never writes to the reusable object or base artifact registry record.
6. The final uses `MedicalMotionArtifactService`, its existing private storage,
   put-if-absent/readback, registry and fenced publication. There is no second
   storage service, public URL or personalized shared cache.
7. Before publication, medical authorization, base generation, private identity
   and final readback are checked again. SQL also rejects stale base publication.

`medical_motion_compositions` stores immutable private provenance only: base and
final UUIDs, owner/job/context, composition version/fingerprint, a separately
scoped overlay specification fingerprint, base SHA and
compiler/renderer identities, profile, language and audio IDs/versions. It stores
no overlay prose or numerical patient values. One final intent exists per job.
RLS is enabled; direct application-role access is revoked. Internal RPCs retain
current owner/attempt/lease guards and an empty search path.

SQL rejects personalized artifacts **and composition producer jobs** in reuse
keys/links. A job already reserved for reusable cache production cannot be
relabelled as a private final. Every new variant needs a separate final job;
private deduplication is intentionally absent.

## Allowed presentation

`contracts/personalization.ts` supports version 1, a base UUID, `ar`/`en`, fit-only
720p profiles (1280x720, 720x1280, 720x720), structured timed text/subtitles,
numerical values/units, descriptive charts and narration placements. Unknown
fields, slots, coordinates, filter expressions, shell arguments, anatomy,
pathology, mechanism and severity mutations are rejected.

Only compiler-issued Scene DSL slots are allowed. A trusted constructor policy
may declare additional presentation slots through the existing compiler, only
if medical base/output fingerprints stay unchanged. It is never inferred from
the spec or an AI request; the default retains the existing slot policy.
The specification snapshot
does not invoke getters or `toJSON`; it bounds depth, nodes, arrays and total
text. An immutable WeakSet-backed validated capability, not copied JSON, grants
composition execution. Its fingerprint includes the immutable base SHA/UUID,
version, full specification, duration, language/profile and user/context. It is
separate from the reusable base fingerprint and is never a shared-cache key.

Presentation uses a fixed 30% side panel; the medical viewport uses scale-to-fit
and black padding, without crop or anatomy overlays. The compositor does not
know organ, mesh, node, material or pathology names. PNG bases may produce a
static MP4; V1 final output is MP4, not a separate PNG export implementation.

Text is NFC Unicode with explicit `ar`/`en`, at most three lines, no control,
surrogate or bidi-override characters, and no ASS markup. Fixed layout limits
are 36 characters per line in landscape and 19 in square/portrait. Overflow
fails, rather than clipping text or covering anatomy. Numbers are finite and
bounded; units are bounded text. XML escaping happens before rasterization.
User text is never interpolated into FFmpeg filters or argv.

Sharp/Pango/librsvg renders Arabic shaping, RTL and mixed digits using the
host's existing Arial/sans-serif fonts. Acceptance uses installed Windows Arial;
no font file is embedded, downloaded or distributed. Deployment must verify its
own legally available font/glyph coverage. Multiline Arabic/English raster
samples and actual MP4s are tested. Existing language-dependent labels burned
into a base remain unchanged; the compositor does not erase or silently
translate them. A suitable language-neutral base is needed for fully external
language variants.

Subtitles use the same bounded slot model with explicit start/end seconds.
Intervals must be positive, non-overlapping within a slot, and contained in the
**actual probed media duration**, not just the Scene DSL hint.

Charts are narrow deterministic SVG rasterizations: trend, range marker, neutral
band and comparison. Values/ranges are bounded and interpretation must be
`descriptive-only`; no diagnosis, disease inference, clinical threshold or
severity calculation is performed. Approved text/value provenance belongs to
the trusted producer; this renderer does not medically approve arbitrary prose.

## Narration foundation

Reusable segments carry segment/version/language, text fingerprint, independent
medical review status, immutable audio UUID/SHA, duration and `reusable-no-phi`
scope. Private slots use `private-context` and require resolver owner/context
matching. A trusted audio resolver independently confirms all metadata; an
input claiming `approved` cannot override an unreviewed source. Audio bytes,
WAV container and actual duration are checked. TEST silence fixtures demonstrate
the mechanism; they are not a medically approved narration library.

Approved WAV segments are placed at explicit times, with silence/padding as
needed, and encoded to AAC. Narration intervals cannot overlap each other.
Preserved base audio is muted only during explicitly declared narration slots
to prevent simultaneous explanations. No music is added. `NarrationProvider`
is a future provider interface; no external TTS/video API is called or required.
Production durable audio-library ingestion/review remains a separate future
step, using appropriate existing private infrastructure rather than public
video-studio audio URLs.

## Explicit FFmpeg runtime

`configuredFfmpegRuntime` requires absolute trusted `FFMPEG_EXECUTABLE_PATH` and
`FFPROBE_EXECUTABLE_PATH`; there is no PATH search or auto-download fallback.
The administrator provisions the binaries separately. `auditFfmpegRuntime`
checks FFmpeg/FFprobe identity, H.264/AAC encoders and required filters.
Runtime capabilities cannot be copied from JSON. Only internal generated argv
is passed to `spawn`, with `shell:false`, `windowsHide:true` and no stdin.

The process has a bounded timeout and stdout/stderr budget, cancellation,
termination and close joining. If cleanup cannot be confirmed within five
seconds, the invocation is quarantined and never published. Files are exclusive
to the invocation; stale output cannot satisfy a later request. Media protocols
are restricted to local file/pipe, decode errors fail, filter graph/encoding
threads are bounded, and final size is limited to the existing 64 MiB bound.

Container integrity reuses the existing artifact validator. A runtime-only
capability adds exactly one audio track to an allocated composition owner;
ordinary Blender artifacts retain their video-only validation policy. FFprobe
also verifies actual duration, dimensions/profile and expected audio presence.
Video frame count and frame rate must remain unchanged; a still asset cannot
substitute for a compiler-required moving base. Static PNG output uses a fixed
25 fps presentation timeline without claiming anatomical motion.
Partial, empty, truncated, oversized or mismatched results cannot be handed off.

For this acceptance, an external temporary Gyan FFmpeg 9.0.2 build was obtained
from the vendor linked by [FFmpeg's official download page](https://ffmpeg.org/download.html).
Its [published archive SHA-256](https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-9.0.2-essentials_build.zip.sha256)
is `60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba`.
The archive was checked before execution. No binary is committed, installed
globally, added to PATH or authorized through a Windows security-policy change.

## Failure, recovery and measurements

Missing/corrupt bases, inappropriate slots/timing, unavailable tools, timeout,
cancellation, partial output and invalid source narration fail explicitly.
Unknown provider outcomes retain their durable intent and quarantine resources.
A lost upload response is reconciled by readback. A pending missing upload can
be regenerated with the **same approved spec**, original UUID and exact SHA under
a new current attempt; mismatching bytes fail and never overwrite an intent.
A persisted final recovers without FFmpeg. Lost publication responses replay the
identical fenced manifest without re-execution. Current medical/base gates apply
to both recovery paths.

`CompositionMetrics` exposes fixed PHI-free counters: base hit/miss, composition
start/complete/failure, Blender avoided on an observed cache hit, and reusable
audio hit. No owner, text, fingerprint, clinical value or provider diagnostic is
logged. These media-operation counters are not a paid analytics service or a
claim that a completed composition has already been published.

The actual economic proof uses the existing two-frame Blender smoke, current
local PostgreSQL and private artifact pipeline. Hypothetical TEST cache/anatomy
metadata stays outside production modules. Five final variants share one base:
one Blender invocation and five FFmpeg compositions. The first pair has one
Blender, two compositions and two distinct finals. Separate three-second color
media tests verify readable Arabic/English, charts, numbers, audio, profiles and
heart/lung/kidney/liver/brain TEST scene metadata. None verifies organ geometry
or establishes production cost or throughput.

PostgreSQL acceptance suites mutate global test triggers intentionally; run the
affected suite serially with `--maxWorkers=1 --no-file-parallelism`. Concurrency
tests inside those files still use real simultaneous connections. No tests are
skipped. Real provider tests use only the pinned isolated project, existing
private bucket and exact known UUID cleanup. The installed service remains
unchanged; there is no SCM installation/reboot in this milestone.

Current anatomy remains NOT patient-approved. The unresolved myocardium gate
is unchanged and blocks myocardium-dependent composition before media access.
This foundation must not be enabled as patient-facing clinical output until the
existing medical/anatomical gates and deployment requirements are satisfied.

Next work should add a trusted private personalization producer, durable
specification replay and explicit composition scheduling/capacity policy. V1
requires the same approved specification to be supplied on retry; it does not
persist raw clinical overlays in shared metadata or silently register a queue
handler that accepts arbitrary personalization from AI.

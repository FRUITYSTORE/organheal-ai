# Personalization Composition V1 — acceptance record

Acceptance date: 2026-10-03. Baseline HEAD:
`1e35cc424750400fb81c5df0266a1bcafd52f8ed` on
`codex/medical-motion-worker-execution`. The initial index was empty and upstream
was 0/0. Unrelated `.claude/` and `supabase/.temp/` were excluded throughout.

## Actual evidence

The serial affected automatic regression contains **1,574 unique tests in 97
files**, with zero failures or skips. Real manual acceptance contains **52
unique tests in four files**, with zero failures or skips:

| Manual acceptance | Tests |
| --- | ---: |
| Actual FFmpeg media, Arabic/English, profiles, audio, charts, failures, five organ metadata fixtures | 23 |
| Real Blender + FFmpeg + PostgreSQL + private pipeline/recovery/isolated Supabase | 7 |
| Existing real isolated Storage regression | 16 |
| Existing minimal Blender handler proof | 6 |

**Total: 1,626 unique tests in 101 files.** The separately rerun 89 focused
automatic composition tests are already included in the 1,574, not counted twice.
New tests total 119: 89 automatic plus 30 manual composition cases.

Automatic subsets (overlap; do not sum these as additional tests): artifact/
Storage 100, reusable cache/config 84, Scene DSL/compiler 88, whole-body
mechanism registry 55, anatomy/readiness/heart resolver 131, Medical Motion 985,
background/publication/ownership 117. The broader run also includes clinical and
symptom-explanation regressions. PostgreSQL tests actually execute against the
guarded local database; no psql process or Windows security-policy change is used.

An earlier parallel diagnostic run collided on test-only trigger DDL. Its
synthetic owners were removed by exact captured UUIDs using the existing cleanup
helper semantics. Final PostgreSQL suites run serially; intentional concurrent
ownership tests inside those suites remain concurrent. Failed diagnostic and
filtered runs are excluded from the final unique count.

## Economic proof, not production cost

Five approved TEST variants share one immutable base. Actual counts:

| Measurement | Result |
| --- | ---: |
| Blender executions | 1 |
| FFmpeg compositions | 5 |
| Base artifacts | 1 |
| Distinct final artifacts | 5 |
| First pair | 1 Blender / 2 compositions / 2 final artifacts |
| Five measured composition durations, milliseconds | 1758, 1555, 1969, 1980, 1615 |

Relative to five independent base renders, four Blender runs are avoided: 80%.
The first pair avoids one of two: 50%. The observed cache-hit metric is separately
1 hit / 1 miss; it must not be confused with the four logical avoided rerenders.
Composition counters are 5 start / 5 complete / 0 failure. These are TEST smoke
measurements, not production price, throughput or patient-anatomy validation.

English, Arabic, changed numeric values and fit-only profiles use that same
Blender base; a chart is also composed without another render. Separate color
media tests exercise all four chart kinds and heart/lung/kidney/liver/brain TEST
scene metadata without claiming verified anatomical geometry. Arabic raster QA
shows joined Arabic and correctly ordered `123`; no font files are redistributed.

## Runtime and boundaries

Actual FFmpeg/FFprobe: `9.0.2-essentials_build-www.gyan.dev`, provisioned in TEMP
from the vendor linked by FFmpeg's official download page, with the published
archive SHA-256 verified before execution. H.264/AAC and required filters were
audited. There is no runtime PATH fallback, automatic binary download, global
installation, external video API, paid TTS dependency or new npm dependency.

The compositor is a trusted opt-in server operation, not a public endpoint or
installed worker registration. It repeats current medical/anatomy gates, binds
base compiler/renderer identity and current cache generation, copies immutable
base bytes, generates bounded presentation assets and hands the new final to
the existing private artifact registry/Storage/fenced publication pipeline.

The final has owner/context-scoped identity and opaque UUID storage keys. SQL
prohibits private final artifacts and their producer jobs from reusable keys/
links. Immutable private provenance stores hashes/IDs/versions, never raw overlay
prose or values. Narration approval, version, hash, duration and private ownership
are independently checked by a trusted resolver. TEST audio is silence, not an
approved narration library.

Only declared slots, finite values, bounded NFC text, explicit timing and three
fit-only 720p profiles are allowed. No coordinates, arbitrary filters, shell
commands, anatomy edits, pathology or severity changes are accepted. Medical
viewport pixels are fit/padded into a separate region. Video frame count/rate
are preserved; static images cannot replace required moving media.

Timeout/cancellation, corrupt/partial files, invalid narration and inappropriate
timing fail before publication. Upload-response loss is reconciled by readback;
missing upload recovery reproduces the original UUID/SHA under current fencing.
Persisted final and publication-response-loss recovery avoid re-composition.

Real provider acceptance is pinned to the dedicated isolated Supabase project
`organheal-medical-motion-test`, its existing private `medical-motion-artifacts`
bucket and exact known test object UUIDs. Created objects are removed and absence
confirmed. Local PostgreSQL is strictly localhost/127.0.0.1 and exactly
`organheal_ownership_test_step3c`. Credentials are not emitted.

Final local counts are exactly zero in all nine checked tables: jobs, results,
artifacts, compositions, reuse keys, reuse links, execution contexts, requests
and synthetic auth users. RLS is enabled; all three composition RPCs are
SECURITY DEFINER with empty search paths, denied to anon/authenticated and
executable by service_role. All four new protective triggers are enabled.
`npx tsc --noEmit`, `npm run build` (91 pages) and `git diff --check` passed.
Fontconfig emitted a cache-directory warning during raster tests; Arabic/English
rendering and visual Arabic QA passed without a security-policy change.

## Review and remaining work

No BLOCKER/HIGH implementation finding remains. Deployment must provision trusted
FFmpeg binaries and legally available Arabic/English fonts. V1 is bounded to
60 seconds, 720p profiles, H.264/AAC, WAV narration and 64 MiB final files.
Long videos, additional codecs/profiles, global private deduplication, approved
audio-library ingestion and production capacity benchmarking are deferred.

Current anatomy is **NOT patient-approved**. The unresolved myocardium gate still
fails before storage/media access; TEST review fixtures do not change production
anatomy. The installed worker/service and stable pages remain unchanged; SCM
acceptance is intentionally not rerun and the machine is not rebooted.

Recommended next large safe milestone: a trusted private personalization producer,
durable approved-specification replay and explicit composition scheduling/capacity
policy, using existing ownership and private infrastructure. This is not
implemented by this milestone.

## Exact milestone manifest

The changed/staged manifest is these 24 files only:

```text
docs/medical-motion-personalization-acceptance.md
docs/medical-motion-personalization-composition.md
lib/medical-motion/artifacts/service.ts
lib/medical-motion/composition/compositor.ts
lib/medical-motion/composition/ffmpeg-runtime.ts
lib/medical-motion/composition/metrics.ts
lib/medical-motion/composition/operation.ts
lib/medical-motion/composition/overlays.ts
lib/medical-motion/composition/service.ts
lib/medical-motion/composition/specification.ts
lib/medical-motion/contracts/personalization.ts
lib/medical-motion/render/artifact-output.ts
supabase/migrations/20261003015442_medical_motion_composition_provenance.sql
tests/helpers/composition-media.ts
tests/helpers/composition-postgres.ts
tests/helpers/composition-scene.ts
tests/helpers/medical-motion-artifacts.ts
tests/helpers/medical-motion-rpc.ts
tests/manual/medical-motion-composition-media.acceptance.test.ts
tests/manual/medical-motion-composition-pipeline.acceptance.test.ts
tests/medical-motion-composition-handoff.test.ts
tests/medical-motion-composition.postgres.test.ts
tests/medical-motion-ffmpeg-runtime.test.ts
tests/medical-motion-personalization.test.ts
```

No package manifest, stable UI page, worker entry/configuration or Windows service
file changes. The SQL migration is committed for deployment; it was applied only
to the isolated local test database, not production or remote Supabase Database.

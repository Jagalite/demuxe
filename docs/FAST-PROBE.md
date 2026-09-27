# Local startup probe

The router supplies an evidence checklist to the bounded local probe. The initial
request is `container` plus complete `tracks`. The result is `satisfied` or
`incomplete`, with explicit available/missing facts and any parsed metadata.
Missing evidence does not mean an incompatible codec. Existing route capability
checks still decide compatibility; backends still verify actual playback.

Direct and packet-copy remux reuse those facts. Subtitle and selective-audio
routes also require finite duration. Hybrid requires decoder configuration;
FLAC/Opus adaptation requires track bounds. If the selected route needs facts
not provided by the fast parser, FFmpeg inspection runs sequentially. There is
no race. Metadata already gathered, including duration, is reused by the router.

The no-checklist API retains the previous conservative full structural scan for
legacy callers and regression coverage. Production routing uses the checklist.

## Budget

`FAST_PROBE_BUDGET` in `web/fast-source-inspector.js` defines:

| Resource | Limit |
| --- | ---: |
| Parsing budget, excluding awaited reads | 50 ms |
| Per-read I/O stall timeout | 3 seconds |
| Actual file-read requests | 8 |
| Total requested bytes | 512 KiB |
| Initial/sequential read-ahead | 64 KiB |
| Concurrent reads within an index batch | 8, included in the same total read limit |
| Cue-index payload | 256 KiB |
| Indexed positions | 2,048 |

The parsing clock starts after the first read and pauses while subsequent reads
are pending. `parseMs` measures elapsed time outside I/O waits, not CPU time;
browser scheduling during those intervals can still contribute. `readMs` and
`wallMs` report I/O wait and total elapsed time separately. Browser FileReader
requests have an independent three-second stall timeout. On failure or user
cancellation, pending readers are aborted and drained. Timer delivery can be
delayed by browser scheduling; this is not a hard real-time guarantee. The
Node-only Blob fallback cannot cancel an already pending read.

The player displays “Reading media…” while fast-probe file reads are pending,
then “Inspecting media…” for parsing. Component preparation remains a separate
step. These labels are available through the component's `labels` overrides.

These limits keep ordinary small-metadata inputs inexpensive while declining
large scatter plans before issuing them. They bound speculative work, not total
startup time or the duration of the subsequent FFmpeg inspection. Read-ahead
trades some extra bytes for fewer requests. Counts report actual read requests;
`batches` reports scheduling groups separately and must not be called physical
I/O or used to disguise the number of ranges read.

## Access strategy

The first block and subsequent bounded ranges stay cached during inspection.
Matroska routing stops after complete Tracks and Info, without inventorying
attachments or reading Cues/Cluster headers. SeekHead can locate missing Tracks
or Info; target IDs and bounds are checked. No attachment inventory is returned
in this mode: uninspected attachments must not be confused with their absence.
Complete Tracks establishes which track types exist. Required track metadata,
known linked-segment semantics, and resource limits remain checked.

This is admission metadata, not whole-file validation. Duplicate or malformed
structures beyond the stopping point are left to the playback backend. The
legacy no-checklist scan continues to check its full top-level coverage. MP4 and
simple-audio parsing retain their existing bounded checks.

A fast-inspected local Matroska source now receives the same 1.5-second Direct
readiness trial when a remux alternative is already admitted. A timeout can
try that remux without repeating the metadata probe. If remux fails, the
original Direct route is restored once with its full budget. Cancellation and
permission/identity failures remain terminal.

## Review regression fixes

Partial SeekHead indexes only permit a forward jump when every still-needed
metadata element has a forward target. Otherwise, sequential header traversal
preserves unindexed Info/Tracks, including metadata already in the first read.
Before accepting Software, routing resolves missing facts for earlier candidates
whose source qualification is uncertain. Deployment
rejections do not themselves request more facts.

57 unit checks passed, including both partial-index orderings and missing facts
before Software fallback. Chrome and Firefox integration tests confirm that a
fast result without duration triggers one FFmpeg inspection and recovers the
Native subtitle route even when WebCodecs is unavailable. Complete fast metadata
still opens forced remux with no separate FFmpeg metadata probe.

## Separate-timer validation

18 focused probe checks passed, covering slow I/O excluded from parsing time,
parsing-budget exhaustion, stalled browser-read timeout, cancellation, and
batch cleanup. `tests/probe-progress-browser.mjs` injected 250 ms file-read
delays in Chrome and Firefox: both displayed Reading then Inspecting, cleared
the progress label after opening, and selected Native Direct with mpv subtitles
without an FFmpeg metadata probe. This is a behavior test, not a performance
benchmark. The measurements below predate the separate parsing/I/O timers.

## Checklist validation, 2026-09-27

54 Node checks passed. Seven browser recovery scenarios passed: missing remux
assets (including gain), remux incompatibility, both readiness budgets expiring,
cancellation, source permission, and source identity failure.

`results/fast-probe/2026-09-27T03-17-38.844Z/results.json` records 24 raw probe
calls and six playback checks across Chrome/Firefox and three fixtures.
Successful `stuck.mkv` samples used one 64 KiB read in approximately 1–3 ms;
one Chrome raw sample exhausted the 50 ms budget. `m0.mkv` also needed one
read, and the MP4 needed two. All six playback checks advanced beyond 0.25 s.
Chrome opened `stuck.mkv` in 342 ms using Direct. Firefox opened it in 2,585 ms
using remux after the 1.5 s Direct trial. Firefox's stuck/MP4 playback checks
exhausted the fast deadline before reading and fell back to FFmpeg metadata
inspection; those open timings do not demonstrate the no-handoff path.
These are diagnostic samples with uncontrolled OS caches, not a matched startup
speedup claim. The separate warm in-memory routing contract test verifies that
forced remux can consume fast metadata without an FFmpeg metadata probe.

## Historical validation before checklist routing, 2026-09-27

The diagnostic campaign compared the earlier 8-read / 100 ms / 2 MiB version
with the earlier full-scan version. These measurements predate checklist routing. It used Chrome and Firefox, two fresh browser launches per
browser, reversed variant order in the second launch, fresh contexts and
first/repeat reads. Browser file handles referenced the original files; media
was not loaded wholesale into JavaScript. Sources and fixtures were hashed.
Hashing reads the files before timing, and the OS cache was not reset.
Results are diagnostic samples, not a controlled
cold-disk performance benchmark or an audible-output measurement.

Across 80 probe calls and 12 playback checks:

- `stuck.mkv`, `software_test_slow.mkv`, and `no_audio.mkv` required at most two
  requests before handing off to FFmpeg. Some slow initial reads were aborted.
  Completed probes read approximately 66–77 KiB, versus 512 KiB for the previous
  eight-read attempts. These files still require FFmpeg inspection.
- `fixtures/example.mp4` retained two-read qualification. The subtitle fixture
  `fixtures/m0.mkv` retained complete qualification with eight requests in three
  groups, reading 90,296 bytes instead of 458,936.
- Many warm samples completed around 1–3 ms; slow candidate probes returned
  around the 50 ms deadline (observed maximum 52.3 ms). There was no uniform
  median-latency win on every file/browser combination. Cache and first-use
  differences also prevent interpreting the open-time samples as speedups.
- All 12 baseline/candidate playback checks passed: three files in each browser
  and variant, after all preparation assets were ready, with playback time
  advancing past 0.25 seconds. Chrome used Direct for `stuck.mkv`; Firefox used
  remux. The Firefox direct-load timeout was not changed.
- 51 Node regression checks passed, including malformed/indexed metadata,
  unindexed trailing duplicate tracks/attachments, bounded fallback,
  deadline cancellation and failed-batch cleanup.

Two rejected prototypes are retained with the campaign evidence: a composite
Blob of many disjoint slices, and a larger parallel header scan. Both frequently
exhausted 100 ms in browsers despite looking fast on in-memory Node fixtures.
The shipped planner avoids those expensive plans rather than weakening checks.

## Reproduce

```sh
node --test tests/fast-source-inspector.mjs tests/native-selection.mjs \
  tests/browser-media-capability.mjs tests/plan-admission.mjs
node tests/fast-source-inspector-browser.mjs
```

The browser harness accepts `PROBE_BASELINE` (a saved inspector module),
`PROBE_FILES` (JSON array of local file paths), `PROBE_PLAYBACK_FILES` (optional
JSON array for preparation/open/play checks), and `OUT` (fresh results directory).
It writes source snapshots, fixture hashes, browser versions, raw probe results
and optional playback traces. Use a new output directory for each campaign.

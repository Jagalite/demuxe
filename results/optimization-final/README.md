# Playback optimization closeout evidence — 2026-09-16

Starting source: `cdd1cb5cc2e48f484e58bc0c2f1bc05fb6a7de83`, in the dedicated
`demuxe-optimization-integration` checkout. Remote main was rechecked at that
revision (`remote-main.txt`). No commits, pushes, tags, merges or publication.
The shared `origin/HEAD` lock was left untouched when fetch reported contention;
`ls-remote` independently verified main. The original laboratory is unchanged.

## Implemented scope

- `automaticAudioAdaptation: 'lossless'`: executable source/selected-track admission
  for local Matroska, H264 up to 1080p, PCM16/24 mono/stereo at 48 kHz, established
  track starts/ends within 50 ms, and supported requested components. Copy/direct
  remains preferred. Unknown bounds, embedded required subtitles, remote sources,
  long unequal tails and unsupported precision/layout/rate retain other routes.
  Explicit modes remain pinned. Lossless failure never permits Opus.
- Progressive FLAC long-tail presentation: separate **packaging** lanes from one
  maintained muxer and one browser A/V owner. Finite MSE windows allow the longer
  track to continue, retaining the final video GOP or final audio preroll through
  eviction. Playback after video EOF holds the real final image. There is no
  synthetic video, audio padding, re-encoding of video, or packet timestamp clamp.
- Distant tail seeks retain bounded real preroll, reposition the continuing track,
  and skip pre-target packets without decoding them. Short-video seeks prime the
  final frame with real adjacent audio before moving to the requested position.
  The FLAC encoder remains continuous during sequential playback; a true seek gap
  drains and resets it. Adjacent rounded Matroska timestamps retain the established
  PCM sample clock. Scan and retained-preroll limits reject oversized work.
- Desktop Chrome is the admitted experimental long-tail browser. Firefox's
  separate-track paused seek can land at the window end; it rejects Native long
  tails with `UNSUPPORTED_TIMELINE`, and automatic routing retains the mpv alternatives. A Firefox short-video seek beyond
  video EOF can recover from Hybrid through Software. Safari,
  mobile, other Chromium products, and Opus long tails are not qualified.
- Seek priming gaps are excluded from accepted presentation coverage even if MSE
  coalesces coded ranges. Buffered seeks after video EOF use bounded regeneration:
  a held frame cannot establish a new compositor callback for in-place verification.
- Both SourceBuffer completion events form one append transaction. Pull IDs and
  one outstanding producer request prevent duplicate batches. Paused accepted
  windows stop appending; window completion cannot become public source EOF or
  rewind playback. Source duration comes from selected actual track bounds.
- Adapted buffered seeks and final-frame priming correlate compositor timestamps
  with the emitted copied-video sample intervals and supported edit mapping. Firefox
  can clip callback time to that point instead of reporting the raw packet PTS.
  An early frame callback can complete after `seeked`,
  without accepting a stale frame or an obsolete generation. Preparation ABI 2
  explicitly requires matching worker/JS/Wasm assets.
- Optional-runtime source verification and exact-archive qualification are now
  reusable gates. The standard release verifier requires the optional matrix and
  matching source companions when optional assets are present. Clean tagged source,
  standard engine/consumer/streaming/extra release checks remain mandatory.

## Evidence and retained failures

`tail-chrome-window-coverage.log` and `tail-start-ass-gain-chrome-active.log` cover
complete Chrome playback, original video packet equality, sample-exact sequential
FLAC decode-back, final-frame pixels, pause, rate, near/distant/overlapping seeks,
ASS+gain, and destruction while a real SourceBuffer append is outstanding.
The authenticated-range run additionally checks exact decoded samples around seek
resets, within the source's millisecond timestamp precision. Decode-back is not
physical speaker or A/V synchronization proof.

`frame-race-before.log` fails the deterministic early-frame/late-seeked contract
against committed source. `frame-race-after.log` passes that contract plus stale
frame, retirement, cancellation and synchronous-failure cleanup cases. The first
package-15 lifecycle failure lacked callback tracing; its original browser cause
is not retrospectively proven by this unit reproduction. Its failure and isolated
reruns remain saved, alongside final-artifact qualification results.

The directory preserves rejected track-retirement probes, initial empty/incorrect
harness responses, the Firefox seek failures, long-tail budget/callback failures,
and the near-tail partial-frame DTS overlap. No failed fixture was removed.
`REPRO_UNQUALIFIED=1 BROWSER=firefox SEEKS=1 node tests/unequal-tail-windows.mjs`
retains the browser seek reproducer, explicitly bypassing its production gate.

## Qualification boundaries

HLS/DASH manifest ownership, ABR/live gates, worker retirement and AVIO contracts
are preserved through the saved `f2491f6` assembly. Source compilation and contract
passes do not establish end-to-end streaming or file-adaptation support for CMAF.
No new streaming library, background handoff, GPU effects, WebCodecs audio decoder,
server playback transcoding or independently clocked output was introduced.

The earlier candidate reports are historical. Final archive, benchmark, source
companion, contract and checkpoint results are recorded below after execution.

## Preserved gates and smaller optimization decisions

| Candidate | Final status |
| --- | --- |
| Automatic adaptation | Implemented with explicit `automaticAudioAdaptation: 'lossless'` policy; qualified local matched-track subset above; default remains off |
| Native long tails | Experimental FLAC, desktop Chrome; other browsers and Opus reject rather than truncate |
| External Native ASS | Maintained pinned libass; direct/remux/FLAC and FLAC+gain combinations tested; embedded extraction and destination PiP/casting remain unsupported |
| Opus | Explicit lossy permission; existing supported rate/layout and delay/drain gates retained; no automatic or long-tail admission |
| First-fragment sizing | Earlier smaller-fragment experiment rejected after timestamp regression; final build retains qualified sizes |
| FLAC settings | Existing compression setting 5 retained; no unmeasured CPU/size improvement claimed |
| Module/worker reuse | Deferred; per-source teardown retained; cross-source state/credential isolation takes priority |
| Hybrid packet copies | Existing owned-packet optimization retained; shared Wasm heap never transferred |
| Packet/configuration adapters | Existing qualified adapters and compatibility paths retained |
| Software YUV/GPU | Existing experimental path retained; no new matching-artifact fidelity promotion; working RGB remains |
| Arbitrary GPU effects / WebCodecs audio | Deferred; no new subsystem or admission |

The optional matrix validates installed assets and bounded browser behavior. It
cannot authorize release publication or replace the standard clean tagged-source
release verifier. No Safari/mobile, physical speaker/A/V, endurance, live/ABR or
streaming-adaptation qualification is inferred.

## Current contract results

- Root routing/buffering/transport/packet/frame and seek-fallback contracts:
  **93 passed** on final package-20 source.
- Optional release-evidence contracts: **9 passed**, including conditional standard
  consumer coverage when ASS is shipped.
- Native ASS clean-build validation contracts: **7 passed**.
- Saved streaming checkpoint assembled with final source: TypeScript build and
  **126 contracts passed** on final assembly 44 (`streaming-contracts-44.log`). An initial
  test invocation raced compilation and imported the pre-build Player; its six
  failures are preserved in `streaming-contracts-41.log`. The ordered post-build
  run tests the actual integrated source; no runtime change was needed.
- Exact package candidate 20 SHA-256:
  `e421e59c9aff09f3738a0c89475d7bd1d6f54b7f7d56da35b9ad825f27979bb7`.
  Preparation is `build/adaptation-clean-01/engine-1789533783050441000`, ABI 2;
  ASS is `build/native-ass-clean-02/runtime`. Matching glue and Wasm are packaged
  together. Root playback and preparation artifact scopes remain separate.

Package 16's Firefox ASS failure is retained: callback `mediaTime=3.25` was valid
for the source frame beginning at `3.233` and a requested seek to `3.25`. The prior
exact-PTS predicate rejected it. Seven focused frame contracts now check source
interval acceptance, stale/next-frame rejection, event order and cancellation;
the corrected Firefox FLAC and FLAC+gain ASS cases pass. Final package qualification
below uses the corrected implementation, not package 16's result.

The preserved optimization and owned-packet contracts additionally pass **15/15**.
Their first run retains one mocked event-order failure: the test emitted a frame
before the queued seek action started. An explicit action-start barrier restores
its intended outstanding-seek precondition; runtime code did not change.

## Exact reruns (repository root)

```sh
npm run build
node --test tests/plan-admission.mjs tests/native-selection.mjs tests/remux-buffering.mjs tests/native-seek-frame-race.mjs tests/split-mp4.mjs tests/remux-packaging-contracts.mjs tests/video-codec-config.mjs tests/range-reader-deadline.mjs tests/resource-loader.mjs tests/optimization-contracts.mjs tests/retained-codec-worker.mjs tests/seek-fallback.mjs
python3 tests/optional-release.py
python3 tests/native-ass-source-build.py
python3 scripts/qualify-optional-runtime.py --archive build/optimization-package-20/demuxe-0.3.0-beta.3.tgz --adaptation-build build/adaptation-clean-01/engine-1789533783050441000 --ass-build build/native-ass-clean-02/runtime --output build/optional-qualification-rerun
BETA_ARCHIVE=build/optimization-package-20/demuxe-0.3.0-beta.3.tgz node tests/beta-consumer.mjs
BROWSER=firefox BETA_ARCHIVE=build/optimization-package-20/demuxe-0.3.0-beta.3.tgz node tests/beta-consumer.mjs
BETA_ARCHIVE=build/optimization-package-20/demuxe-0.3.0-beta.3.tgz node tests/beta-streaming.mjs
BROWSER=firefox BETA_ARCHIVE=build/optimization-package-20/demuxe-0.3.0-beta.3.tgz node tests/beta-streaming.mjs
BETA_ARCHIVE=build/optimization-package-20/demuxe-0.3.0-beta.3.tgz node tests/release-extra.mjs
DEMUXE_RUNTIME_ROOT="$PWD/build/optional-qualification-20/installed/package" AUTOMATIC_FLAC=1 PROFILE=flac FIXTURE=build/optimization-fixtures/automatic-lossless.mkv ASS=1 GAIN=.5 QUICK=1 RESULT_ROOT=results/optimization-final node tests/audio-adaptation-cost.mjs
```

Use a fresh qualifier output directory. Do not run cost measurement concurrently
with other browser/build work. `qualify-final-20.py` records the ordered standard
checks and benchmark with their commands, harness/log hashes and archive identity.

## Firefox long-tail recovery boundary

Package 17 passed the Chrome optional matrix and all Firefox checks except the
last unequal-tail test. That test incorrectly required WebCodecs after a distant
short-video seek. Actual automatic playback recovers through Software when Hybrid
cannot present the requested position. Package 18 preserves the failed Hybrid
attempt and its reason in diagnostics. Three queue contracts prove preserved
source/settings/target, explicit-mode authority, and cancellation exclusion.

The expanded Firefox case verifies the recovered final source frame against all
30 offline decoded source images, target time, source identity, paused intent,
continuing digital audio with gain, and cleanup. This frame-identity comparison
is not cross-renderer color-precision qualification. Failed direct PNG equality
and the initial guessed absolute color threshold are retained; scaling and
subtitle composition differ between renderers. The final criterion identifies
the last source image distinctly from earlier moving images.

**Remaining Firefox combination limitation:** Hybrid can retain subtitle pixels
from its final video frame while longer audio continues. Native unequal-tail
playback is rejected on Firefox. Do not claim continuous authored ASS animation
through a Firefox Hybrid video-EOF tail from these tests; use Software explicitly
when that behavior is required. The newly admitted automatic FLAC subset excludes
all long unequal tails. Chrome Native FLAC+ASS+gain is independently tested through
video EOF using its separate, clocked libass overlay.

## Broader installed-consumer findings

Package 18 passed all 25 optional-runtime groups and both full standard consumer
and transport suites. Initial standard-consumer failures were missing local
fixtures, not playback failures. Eighty existing reference fixture files were
copied read-only from the preserved workspace after validating its manifest;
`reference-fixture-copy.json` records every copied hash. The pinned consumer-only
esbuild lock was restored and installed offline; runtime dependency pins did not
change.

One CLI run stalled in Node's shutdown task drain. Its process sample and failed
run remain recorded. The isolated identical archive passed all eight asset checks
in 8.6 seconds, and the subsequent installed CLI stage passed. This is not a proven
root-cause diagnosis of the Node stall.

The broader installed API suite then exposed an inherited public error-contract
regression: the finite plan registry collapsed missing cross-origin isolation into
`UNSUPPORTED_FEATURE`. `inherited-isolation-mapping.txt` records the same mapping
at HEAD. Package 19 carries a typed `ISOLATION_REQUIRED` admission reason through
the public error while keeping ordinary unisolated Native direct playback eligible.
A permanent registry regression covers mpv, preparation and ASS prerequisites.

## Release promotion remains separate

The optional engines have verified clean source correspondence (4,776 subtitle
preferred-source files and 10,427 preparation files). Preparation has only the
recorded audio decoders and FLAC/Opus encoders, with no video decoder or encoder.
These checks do **not** replace the standard engine release-build record.
`standard-engine-record-audit.json` confirms this checkout has no
`build/beta-build.json`. The untagged candidate is deliberately rejected by the
standard release verifier (`untagged-release-rejection.log`).

After review and explicit commit/tag authorization, the remaining release workflow
is a clean standard-engine build and source-backed tagged package plus the required
exact-package suites, following `docs/RELEASE.md`. No release gate was bypassed,
and no commit, tag, push, merge or publication was performed. This delivery is a
locally qualified working-tree candidate, not a promoted release.

## Final installed API/component stage

Package 19 passes all eight `release-extra` groups (CLI, two installed/bundled
consumer suites, two public API suites, two component suites, and menu review).
The exact-archive record is
`results/release-extra/2026-09-16T05-56-21.226Z/result.json`.
This restores the public isolation error contract without changing the three
modes, ordinary Native direct eligibility, or the optional-runtime source pins.

## Fractional buffered seeks: final-artifact regression and repair

The package-19 benchmark's cold Native trial failed rather than preserving its
session: target `6.300974` waited ten seconds, then correctly recovered through
Hybrid. Three focused repetitions reproduced it. Chrome reported source frame
PTS `6.267`; the verifier expected `6.300` from input packet metadata. The emitted
MP4 sample at `6.267` has duration `0.034`, so it legitimately covers that target.
The Matroska input duration was rounded to `0.033`. This was a verification bug,
not a reason to rewrite timestamps or accept arbitrary old frames.

Package 20 reads decode time, composition offset, sample duration and supported
progressive edit mappings from the maintained muxer's emitted fragments. It
accepts a compositor result only when a corresponding emitted sample interval
covers the target. Parsing is bounded by bytes, box count and sample count.
No compressed sample, PTS or DTS is modified. Normal Native direct and standard
remux do not load this preparation-only timing component.

Permanent tests compare muxed timing against demuxed packets, signed composition
offsets, Opus edit mapping, malformed input and budgets. Negative-CTS comparison
uses relative timing because FFmpeg's demuxer normalizes its absolute offset;
the controlled raw first timestamp is checked separately. The browser regression
covers six fractional targets and buffered versus genuinely evicted coverage,
three repetitions each in Chrome and Firefox, preserving intent and eligible
resource identity. It is now required in both browsers by the **27-group** optional
qualification matrix. The earlier failed benchmark and reproducers remain saved.

## Final artifact cost screen

Exact package-20 archive and installed file hashes are in
`cost-1789540293649/result.json`. Four trials passed: cold Native, cold Hybrid,
warm Hybrid, warm Native. Both complete plans include ASS and scalar gain 0.5,
using the same moving 720p/48 kHz PCM fixture and selected audio. Measurement covers
open, subtitle setup, ten seconds playback, a seek plus refill, and destroy.

| Condition | Plan | Browser CPU seconds | Observed peak RSS MiB | Observed meaningful video ms | Seek + refill ms |
| --- | --- | ---: | ---: | ---: | ---: |
| cold | native | 5.619 | 1044.5 | 999.0 | 35.2 |
| cold | hybrid | 6.373 | 1161.5 | 989.4 | 280.9 |
| warm | hybrid | 5.757 | 1191.1 | 617.9 | 446.6 |
| warm | native | 5.398 | 1021.5 | 419.7 | 18.5 |

Native retained backend, worker, MediaSource and SourceBuffer in both seeks. Its
first correct presented-frame recovery was 10.1/18.5 ms; refill-inclusive recovery
was 35.2/18.5 ms. Both plans retained their backend, and every destroy left zero
workers. Native used less observed browser CPU/RSS in these pairs; cold observed
startup was essentially similar, while warm Native startup was faster. These
four trials establish neither statistical significance nor a universal ranking.
Cold means a fresh browser, not flushed OS caches. CPU covers the browser's CDP
process inventory; external OS services and physical A/V are excluded. RSS is the
observed sampled peak, not a bound on every transient browser allocation.


## Final verification and local delivery

Final working revision is the starting `cdd1cb5cc2e48f484e58bc0c2f1bc05fb6a7de83`
plus the saved local integration diff; HEAD was not changed.
`final-20/qualification.json` records all final stages passing against package 20.

| Gate | Final result |
| --- | --- |
| Optional runtime/source/browser groups | 27 passed |
| Installed API, component, CLI, bundling and menu groups | 8 passed |
| Standard consumer | 18 cases each, Chrome and Firefox |
| Standard transport | 6 cases each, Chrome and Firefox |
| Root contracts | 93 passed |
| Saved streaming source contracts | 126 passed; TypeScript build passed |
| Optional release evidence verifier | 9 passed |
| ASS source-build contracts | 7 passed |
| Final complete-plan cost screen | 4 paired cold/warm trials passed |

The final installed API/component record is
`results/release-extra/2026-09-16T06-32-57.226Z/result.json`.
Optional evidence and harness snapshots are preserved in `qualification-20/`.
The assembled streaming source remains protected; compilation and contract results
do not enable staged live/ABR or qualify file adaptation for HLS/DASH/CMAF.

Exact package-20 SHA-256 values:

```
e421e59c9aff09f3738a0c89475d7bd1d6f54b7f7d56da35b9ad825f27979bb7  demuxe-0.3.0-beta.3.tgz
768fa31d7e0dcc728c81542f0622dde3e4be6e438364bb252e6bf0640fc9e43d  demuxe-audio-adaptation-source.tar.gz
1465aefc445eb07111274c9c2bff5a9cb166a910c886ecd75e214d1d801f4d27  demuxe-native-ass-source.tar.gz
```

After qualification, four trailing spaces were removed from one empty JavaScript
line. `post-qualification-formatting.patch` and its hash record disclose that sole
runtime-source difference from the tested archive; token content is unchanged.
The tested archive was not rewritten. JavaScript syntax and diff whitespace checks
were repeated after this formatting-only cleanup.

`checkpoint/integration.patch`, `checkpoint/new-source.tar.gz`, and
`checkpoint/files.json` preserve tracked changes, new source, and evidence/artifact
hashes. `checkpoint/SHA256SUMS` hashes those checkpoint files. No commit, push,
merge, tag, publication or release promotion was performed.

The requested working implementation and optional candidate qualification are
available for review. Full release closeout still requires the clean standard-engine
build record and an authorized source-backed tagged candidate with the release
checks in `docs/RELEASE.md`. Unsupported browser/feature combinations above remain
gated; this is not universal long-tail or release qualification.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cross-player CPU baseline

## Current README: actual CPU usage for each player

For each media case, the reference is the player with the **lowest median CPU**
among the four players with three accepted, matching measurement rounds. The
reference is recorded in the detailed report; every (Pass) cell is bold. Failed, incomplete, fidelity-limited and mismatched
measurements cannot select the leader. Exact median ties use displayed player
order; a lone eligible player is only a reference, not proof it beats unmeasured
players. This is a descriptive baseline, not a statistical superiority claim.

Every numeric cell shows that player's **actual median CPU as a percentage of
one core**; this can exceed 100%. For example, players using 20.2% and 37.9% of
one core display **20.2% CPU** and **37.9% CPU**. These are not relative differences.
The lowest measured median is bold. The detailed report retains each player's
CPU range and raw rounds; overlapping ranges do not establish a statistical tie.
Raw summaries preserve earlier relative-gain fields for traceability, but the
README and current report display actual CPU usage only.

All green **(Pass)** cells are bold and mean successful playback without a valid
CPU comparison. They do not imply a tie, native decoding or near-native performance.
Orange percentages show higher CPU, red **(Fail)** a playback correctness failure,
green `(Pass)*` a historical screening pass with unverified surround or HDR/color
fidelity, and white **(N/A)** unavailable playback evidence. Native in the original
ASS case includes host ASS rendering.

For the nine surround/HDR rows excluded from the CPU campaign, the renderer reads
the exact per-player records linked by the complete-file catalogue and verifies
their run manifests. Only an explicit `screenPassed` result becomes (Pass)*;
recorded failures stay (Fail), and missing fixtures stay N/A. These older records
never qualify a CPU percentage or override newer playback correctness evidence.

The [leader-reference report](../results/head-to-head/cpu-actual-usage-01/REPORT.md)
retains reference identity, medians, round ranges, raw-record links and exclusion
reasons. It reuses existing measurements; no new playback, performance or fidelity
qualification is implied. Earlier native-reference reports remain historical.

Reproduce the current view with `tests/head-to-head/render-native-cpu-table.py
--source results/head-to-head/cpu-baseline-report-02 --output <new-directory>
--update-readme`. The script retains its earlier filename. Run
`python3 tests/head-to-head/native-cpu-table.test.py` for its aggregation,
reference-selection, playback-status and exclusion checks.

## Original Demuxe-versus-player report

This baseline compares **Demuxe automatic selection** separately against ordinary
HTML video, pinned Movi 0.4.0 default, and pinned libmedia AVPlayer 1.3.1 default,
on the same media bytes used by the README catalogue. These reproduce the pinned
comparison; they are not claims about the latest competitor releases. Explicit
native-first or MSE alternatives do not replace failing defaults in a percentage.

For each accepted round:

`gain % = 100 × (comparison-player CPU − Demuxe CPU) / comparison-player CPU`

Positive means less Demuxe CPU; negative means more. The report takes the median
of matched-round percentages **for each fixture and each comparator**, retaining
all individual values and ranges. It never pools media formats, averages the
three competitors into one baseline, substitutes zero for failures, or divides
by a zero CPU measurement. The original README used three values ordered **Native
video / Movi / AVPlayer**; the current compact view above uses the lowest-CPU eligible player
as the reference instead. This original report remains unchanged.

## Recorded baseline — 2026-09-20

The [verified report](../results/head-to-head/cpu-baseline-report-02/REPORT.md)
contains **48 measured comparisons out of 180** across the 60 README cases:
26 versus native video, one versus Movi and 21 versus AVPlayer. Every remaining
comparison has an explicit N/A reason. The final pilot, catalogue and original-case
performance runs contain 297 trials: 258 passed, 36 failed and three were blocked.
Twelve harness/measurement contract tests passed after the campaign.

The baseline preserves unfavorable results as well as gains. For example, the
original H.264/AAC/MP4 case measured +7.5% versus native video and +42.9% versus
AVPlayer; H.264/PCM24/MKV + ASS measured −72.9% versus native video plus the host
ASS renderer. Those are per-fixture medians, not a general ranking. Small gains
whose round ranges cross zero do not establish a consistent advantage.

Exclusions include failed matching playback correctness, surround/HDR fidelity
limits, presentation cadence or dropped-frame failures, repeated Movi audio-only
timeline-check failures, and the missing unique-frame counter on Demuxe's MPEG-2
Software route. These are limitations of this evidence; a measurement failure does
not retroactively overwrite the historical playback table. HEVC/HLS also had a
Demuxe dropped-frame failure, so no comparator is scored for that fixture.

## Frozen inputs and qualification

The campaign uses `build/head-to-head/assets-cross-player-cpu-01`, prepared from
current Demuxe TypeScript and available current engines while reusing hash-verified
36-second fixtures from `assets-component-vtt-review-fix-02`. The manifest captures
source/dirty diff, engine/dependency hashes and media identity. The original four
fixtures and the 56-entry expanded catalogue remain separate harness matrices.

The final harness is frozen under `build/head-to-head/cpu-baseline-harness-02`.
New **headed** correctness runs must pass marked selected audio/video/subtitles,
pause/rate/seeks/EOF (or the declared live-window check) and cleanup before a case
may be scored. Fourteen expanded fixtures with known fixture or surround/HDR
fidelity blockers are excluded from CPU admission; their exact reasons remain in
the report. A baseline and Demuxe both need passing matching evidence.

Some fresh headed results can differ from the earlier headless table. Historical
playback outcomes remain intact in the catalogue; the current README refers to
the CPU campaign's matching correctness, without reclassifying those older runs.
The complete-file evidence catalogue is not regenerated by this campaign.

## Measurement and frame observations

Three rounds per fixture use rotating player order and fresh Chrome processes,
with five seconds of warmup and twenty seconds of CPU measurement. Cases for one
fixture are grouped before moving to the next; they are not compared across hours
of a global all-fixture round. CPU is CDP-listed Chrome process CPU seconds divided
by actual elapsed wall seconds, reported as percent of one core. The runner rejects
process turnover, lost foreground/focus, errors, stalled timeline, frame-counter
reset/change, invalid cadence and failed cleanup. Teardown observes actual Chrome
process exit after releasing player/context resources; a late Playwright close
acknowledgment is disclosed separately and never substitutes for process exit. The same selected subtitle is
requested before the measurement window as in correctness.

The original runner admitted only real HTML video counters. The bounded extension
uses the following **route-specific** observations:

| Route | Source | Meaning and remaining limitation |
| --- | --- | --- |
| HTML video / MSE | `getVideoPlaybackQuality()` | Total minus dropped frames; browser-defined counters. |
| Movi canvas | Public `getVideoPlaybackQuality()` in pinned 0.4.0 | Pinned implementation reads renderer `getFrameStats()`: presented and dropped counts. A dummy zero counter cannot pass cadence. |
| AVPlayer custom | Public `getStats()` | `videoFrameRenderCount` and `videoFrameDropCount` from the pinned renderer. These are not browser compositor counts. |
| Demuxe retained Hybrid | `diagnostics.backend.presentation.drawn` | Counts selected retained-frame draws, excluding the separate paused-redraw counter. No comparable drop counter is exposed; it stays null. |
| Other custom paths | No established counter | Blocked, not silently treated as zero drops. Software `rendered` is not substituted because renderer refreshes are not proven unique video frames. |
| Audio-only fixtures | No video gate | Prior marked-audio correctness plus timeline progression/errors/cleanup; no claim of scored acoustic output. |

For these fixed 30-fps synthetic inputs, each video window must present the expected
frame count within **12 frames plus 1%**: 12 permits asynchronous counter updates at
the two endpoints. Every two-second sample must advance. Exposed drop counters must
increase by no more than max(2 frames, 1% of expected frames). These are submission/
cadence checks, **not equal physical display smoothness, acoustic A/V sync or fidelity
qualification**. Counter availability and semantics are retained per trial. Tests
reject missing counters, frozen output, resets, bad cadence and excessive drops.

The measurements exclude server CPU, external OS media services, GPU energy and
setup/warmup CPU. Startup wall time is API-open time, not time to first photon/sound.
Summed RSS may double-count shared pages. Fresh browsers do not flush OS caches.
Ordinary background user workloads are left running and recorded; no competing
benchmark/build/playback is intentionally launched during performance. Results are
an exploratory shared-host, low-resolution synthetic baseline, not a general player
ranking or a real-world high-resolution performance guarantee.

The initial `cpu-baseline-performance-catalogue-01` was interrupted after browser
close-acknowledgment timeouts. Its measured process IDs were subsequently absent
from the host process table; those trials remain failed/incomplete and are not
scored. Harness 02 adds the observed-process-exit gate, with new matching
correctness and performance evidence. The passing pilot is retained separately.

## Reproduction and reporting

Use the [existing preparation and correctness guide](HEAD-TO-HEAD.md). The runner
now groups performance order by fixture and validates counters with
[`performance-metrics.mjs`](../tests/head-to-head/performance-metrics.mjs).
Run its contracts before preparing the final frozen harness:

```sh
node --test tests/head-to-head/contracts.mjs tests/head-to-head/performance-metrics.test.mjs
```

Select only cases where Demuxe and at least one comparator pass matching headed
correctness. Use the same assets, harness, matrix and browser profile for
`run.mjs --headed --performance --exclusive --correctness <summary.json>`.
`--exclusive` asserts no concurrent benchmark/build; it does not stop user processes.
Each case needs three accepted rounds. A failed round invalidates its comparison;
failed/incomplete evidence remains saved rather than cherry-picked away.

[`report-cpu-baseline.py`](../tests/head-to-head/report-cpu-baseline.py) verifies
input-run integrity and matching identities, emits all 60 rows and 180 comparison
dispositions, and retains raw CPU values, signed gains, ranges and exclusion reasons.
Its legacy `--update-readme` option targets the former six-column table; use the
leader-reference renderer above for the current compact table. Reports retain
the generator and hashes of their input evidence. Use fresh output directories.

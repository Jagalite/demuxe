<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Opt-in JSPI and Asyncify Player playback

This campaign exercises the production `Player` API with
`experimentalRemuxRuntime: 'jspi'` and `'asyncify'`. It measures complete browser
playback, including browser video decoding, rendering and audio, rather than
standalone component calls. The frozen campaign used pthread as its default.
Current local main defaults to automatic runtime selection; see [the current API](REMUX-RUNTIME.md). Installation
and scope are described in the [local integration guide](../experiments/jspi-asyncify/local/INTEGRATION.md).

The three finite URL fixtures are H.264/AAC MPEG-TS, H.264/AC-3 stereo MKV and
HEVC Main 10-bit SDR/AC-3 stereo MKV. They retain the exact bytes from
`assets-auto-main-a563f345-20260927-02`: 36 seconds, 320×180 at 30 fps and 48 kHz
stereo audio. The new snapshot is
`build/head-to-head/assets-private-remux-main-01`; its manifest preserves source,
fixture and engine hashes. It includes the combined local-main Player and CDN
changes, not merely the component merge commit.

Each candidate runs in a document without COOP/COEP. Runtime observations must
show the requested backend, private Wasm memory, `crossOriginIsolated: false`
and unavailable `SharedArrayBuffer`; Asyncify also runs with both JSPI APIs
unavailable. Only `native-remux` and `native-transcode` are accepted for the
candidate measurements. A direct-playback bypass cannot qualify a JSPI or
Asyncify CPU cell. The pthread reference runs with isolation headers.

Correctness covers marked video and stereo tones, pause/resume, rate changes,
seeks, near-EOF behavior and teardown. A separate lifecycle suite covers source
replacement, destroy during an observed pending source read, permission failure
and rejection of a Wasm binary from the wrong backend.

CPU uses three rotated rounds per fixture, one gated Chrome launch per row,
fresh contexts per arm, five-second warmup and twenty-second measurement.
The maintained startup gate waits for Chrome's delayed TPM measurement task;
monotonic timing, foreground, stable process IDs, playback/frame progress and
cleanup are required. Whole CDP-listed Chrome CPU is expressed as a percentage
of one core. Idle CPU is retained without subtraction. Process roles and summed
RSS are retained; shared pages can be counted more than once in RSS.

The three rounds share a browser launch and are correlated. They do not
establish fresh-launch reproducibility. The paired pthread arm belongs to this
campaign; existing README Auto/other-player CPU values belong to earlier
campaigns and must not be treated as matched controls.

This compares the complete configured paths, not isolated suspension overhead.
Private candidates use MessagePort source reads and the window MSE scheduler;
the pthread reference retains its normal shared-memory/Worker-MSE policy.
The isolation and scheduling differences are part of these measured paths.

The evidence does not qualify private mpv Player playback, subtitles, Hybrid,
Software, other codec/profile/layout combinations, long media, additional
browsers, physical audio latency or release packaging. At the time of this campaign, the source option was
experimental and the engines were locally installed. The later default runtime
policy is documented in [runtime selection](REMUX-RUNTIME.md); restricted private
mpv services have a separate [Player campaign](PRIVATE-MPV-PLAYER.md).

## Retained HEVC attempt and repeat

[HEVC attempt 01](../results/jspi-asyncify/player-cpu-hevc10-ac3-01/summary.json)
has eight accepted windows and one rejected pthread window (round 2): 28 dropped
frames during the measurement exceeded the presentation-cadence budget. No CPU
value from that failed window is published. Pthread round 1 and JSPI round 1
passed the checks but recorded 6.0% and 5.8% CPU, respectively, far below the
later windows. Their source, route and frame counters were valid; the cause of
the low CPU is unresolved. These accepted low values remain in the evidence.

A fresh, complete three-arm HEVC row was run as attempt 02, with identical assets,
harness, browser configuration and gates. It is a separate attempt, not a pool
of selected windows from both runs. Cross-launch variability prevents a general
performance claim even if the repeat is internally stable.

The repeat also ended with eight accepted windows and one cadence rejection:
Asyncify round 3 dropped 69 frames during measurement. Both HEVC CPU cells are
withheld in the README. All nine full playback correctness cases passed, but
that does not override a failed CPU presentation window. No third attempt was
used to search for a passing result.

## Recorded results

Chrome 153.0.8010.53, macOS arm64. Nine full Player correctness cases and eight
lifecycle/error cases passed. The two H.264 rows each have nine accepted CPU
windows, all with zero dropped frames during measurement. CPU is the median
and min–max range of three rounds, as percent of one core:

| Exact fixture | Pthread control | JSPI | Asyncify |
| --- | --- | --- | --- |
| H.264 + AAC / MPEG-TS | 19.7% (18.8–20.2) | 17.9% (15.0–19.1) | 18.7% (18.0–19.1) |
| H.264 + AC-3 stereo / MKV | 18.8% (18.2–18.9) | 17.8% (17.6–17.9) | 18.7% (18.0–19.0) |
| HEVC Main 10-bit SDR + AC-3 / MKV | Withheld | Withheld | Withheld |

Round values and paired candidate-minus-pthread differences are retained below.
Idle observations include short between-arm observations; they are not a
normalization baseline. RSS entries are each round's peak summed MiB.

| Fixture / arm | CPU rounds (%) | Paired differences (points) | Idle CPU range | Peak RSS rounds (MiB) |
| --- | --- | --- | --- | --- |
| h264-ts / auto | 20.19, 19.70, 18.84 | reference | 2.0–9.5% | 892, 813, 871 |
| h264-ts / jspi | 19.06, 14.98, 17.94 | -1.13, -4.72, -0.90 | 1.8–9.8% | 807, 754, 869 |
| h264-ts / asyncify | 17.98, 18.75, 19.05 | -2.21, -0.95, +0.21 | 1.5–8.7% | 794, 788, 884 |
| h264-ac3-stereo / auto | 18.24, 18.79, 18.87 | reference | 2.2–14.3% | 730, 686, 703 |
| h264-ac3-stereo / jspi | 17.59, 17.88, 17.82 | -0.65, -0.91, -1.05 | 1.7–8.7% | 785, 791, 725 |
| h264-ac3-stereo / asyncify | 18.71, 17.98, 19.04 | +0.48, -0.81, +0.16 | 1.4–9.7% | 746, 669, 700 |

These small, variable differences do not establish a general runtime speedup.
The [machine-readable summary](../results/jspi-asyncify/player-cpu-summary.json)
also records per-role CPU medians, startup wall times, hashes, both HEVC attempts
and every rejected window's reason. Startup is excluded from the steady playback
CPU windows; these numbers must not be read as end-to-end startup cost.

Evidence:

- [Full Player correctness](../results/jspi-asyncify/player-main-correctness-01/summary.json): 9/9.
- [Lifecycle and errors](../results/jspi-asyncify/player-main-lifecycle-01/result.json): 8/8.
- [H.264 MPEG-TS CPU](../results/jspi-asyncify/player-cpu-h264-ts-01/summary.json): 9/9.
- [H.264 AC-3 CPU](../results/jspi-asyncify/player-cpu-h264-ac3-stereo-01/summary.json): 9/9.
- [HEVC attempt 01](../results/jspi-asyncify/player-cpu-hevc10-ac3-01/summary.json) and [attempt 02](../results/jspi-asyncify/player-cpu-hevc10-ac3-02/summary.json): each 8/9; CPU withheld.

Asset manifest SHA-256: `eefc1d98df4e7d0a128c39ba38d9d9137e2f588ca58a1c8f248fda678bbc2968`.

Harness SHA-256: `041b2ca893cd52dfba89bde636bd3405f3fb44fd27afb393b5bc51c601a97473`.

## Review validation

The subsequent review fixed terminal handling of malformed MessagePort replies
and wrapped engine asset loading/compilation failures so failed Wasm downloads
retain an asset-failure classification. Source errors now close the private
reader instead of permitting reuse. The retained lifecycle harness has an
explicit Apache-2.0 license-map entry.

The scoped commit candidate was built in a separate checkout excluding the
concurrent startup-budget and Player presentation changes. TypeScript, license
checks, 36 host/admission tests and 27 benchmark-contract tests passed.
[Fresh playback validation](../results/jspi-asyncify/player-review-correctness-01/summary.json)
passed 9/9; [lifecycle/error validation](../results/jspi-asyncify/player-review-lifecycle-01/result.json)
passed 12/12, including failed Wasm downloads, invalid bytes and wrong-backend
binaries for both runtimes. Its source/asset hashes are preserved separately.

CPU was not rerun after these error-path fixes. Published CPU values remain
measurements of the earlier frozen snapshot, with the original HEVC failures
and uncertainty retained. They are not new measurements of the commit candidate.

## Reproduction

```sh
python3 -B tests/head-to-head/prepare-private-remux.py \
  --out build/head-to-head/assets-private-remux-main-01 \
  --fixtures build/head-to-head/assets-auto-main-a563f345-20260927-02 \
  --runtime /Volumes/seed2/Projects/demuxe \
  --builds /Volumes/seed2/Projects/demuxe-jspi-asyncify-builds-20260927
node tests/private-remux-lifecycle.mjs \
  build/head-to-head/assets-private-remux-main-01 \
  results/jspi-asyncify/player-main-lifecycle-01
node tests/head-to-head/run.mjs \
  --assets build/head-to-head/assets-private-remux-main-01 \
  --catalogue --include-private-remux --headed \
  --cases demuxe.auto.h264-ts,demuxe.jspi.h264-ts,demuxe.asyncify.h264-ts,demuxe.auto.h264-ac3-stereo,demuxe.jspi.h264-ac3-stereo,demuxe.asyncify.h264-ac3-stereo,demuxe.auto.hevc10-ac3,demuxe.jspi.hevc10-ac3,demuxe.asyncify.hevc10-ac3 \
  --output results/jspi-asyncify/player-main-correctness-01
```

After correctness passes, run each row serially with no concurrent builds or
benchmarks. Substitute the fixture key and use a fresh output directory:

```sh
node tests/head-to-head/run.mjs \
  --assets build/head-to-head/assets-private-remux-main-01 \
  --catalogue --include-private-remux --headed --exclusive --performance \
  --correctness results/jspi-asyncify/player-main-correctness-01/summary.json \
  --browser-scope row \
  --cases demuxe.auto.h264-ts,demuxe.jspi.h264-ts,demuxe.asyncify.h264-ts \
  --output results/jspi-asyncify/player-cpu-h264-ts-01
```

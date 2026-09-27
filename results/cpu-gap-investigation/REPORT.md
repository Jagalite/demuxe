<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# CPU gap root-cause investigation

Publication follow-up: [fresh CPU cell updates](../../docs/CPU-GAP-CLOSEOUT.md) supersede the initial withholding recommendation below. The historical PCM low window remains unresolved; the new cell uses only the fresh three-window median.

Date: 2026-09-27. Frozen runtime: `assets-auto-main-a563f345-20260927-02`, source `a563f345`. Chrome 153.0.8010.53, macOS arm64. This investigation changes no production player code, frozen fixtures, or published README CPU cells.

## HEVC HLS: timestamp defect in the authored fixture

The HLS fixture contains 1,080 video packets with the same encoded payload hashes as `fixtures/source-hevc8.mkv`. Of these, 1,063 have the expected +67ms presentation offset. The 17 keyframes starting segments 1–17 have only +33ms: they are 34ms early. Around the first boundary, intended PTS 2.067s becomes 2.033s, next to another frame at 2.034s. This repeats every two seconds, matching the original benchmark's one dropped frame per segment.

Matched packet-copy mux experiments reproduce the defect with default FFmpeg HLS/fMP4 settings; `-hls_segment_options movflags=+skip_sidx` preserves the expected offset on all 1,080 packets. The checked local FFmpeg source explains the mechanism: `libavformat/hlsenc.c` enables `frag_custom+dash+delay_moov`; `libavformat/movenc.c` rewrites the first sample PTS when DASH indexing is enabled without SKIP_SIDX. This is a fixture-generation issue, not Demuxe's playback remuxer: the affected route is `native-direct`.

For the causal browser control, a separate copy changes just the first video sample composition offset in those 17 fragments by +544 ticks (34ms at 16kHz). File lengths, sample payloads, DTS, and audio remain unchanged. All corrected packet presentation offsets are +67ms. Original fixture files remain untouched. See `packet-comparison.json`, `mux-packet-comparison.json`, `mux-experiments.json`, `original-corrected-hashes.json`, `corrected-hls/changes.json`, and `ffmpeg-version.txt`.

The first gated, uninstrumented Demuxe ABBA experiment (`controlled-2026-09-27T12-37-03.431Z`) observed **10, 0, 0, 10** dropped frames in 20-second windows for original, corrected, corrected, original. Route stayed `native-direct`; process membership stayed stable and worker cleanup passed. Corrected windows presented 600 frames each. Its original arm used the normal server and corrected arm used request interception, so a second launch equalized interception for both variants and added plain HTML video. The exact results are below.


The second startup-gated launch (`controlled-2026-09-27T12-43-31.351Z`) served both variants through identical interception:

| Player | Fixture | Dropped frames / 20 seconds |
| --- | --- | --- |
| Plain HTML video | Original | 0 |
| Plain HTML video | Corrected | 0 |
| Demuxe Native Direct | Corrected | 0 |
| Demuxe Native Direct | Original | 10 |

All four windows advanced 600 total frames, retained their route and stable process membership, and cleaned up every worker. Saved fixture/runtime hashes were rechecked after the run. This independently reproduces the timestamp-only intervention with transport held constant. Plain video tolerated the defective timestamps in this test: the defect triggers drops on the tested Demuxe native path, but does not force identical drops in every Chrome playback setup. The exact browser scheduling difference between those paths was not isolated. No evidence here establishes CPU saturation as the cause.

Recommended fixture repair: regenerate HEVC HLS using `-hls_segment_options movflags=+skip_sidx`, then run full correctness and fresh CPU qualification before replacing the published cell. The direct binary timestamp edit is only a causal diagnostic, not a general media repair algorithm.

Earlier per-frame diagnostic runs are retained separately. They reported zero HLS drops even on the original fixture, while a packet-copy MP4 retained periodic drops. These are not CPU qualification and do not establish an unconditional browser behavior; instrumented/startup playback differs from the gated benchmark. The PTS defect is independently established from the media itself.

## PCM24 + external ASS: unresolved historical CPU state

The original 10.95% window is not uniformly low. It begins near the usual CPU band, then renderer and GPU CPU fall sharply for several two-second intervals and return. Audio-process CPU also falls. The page remains visible and focused, frame progression remains normal, and the subtitle renderer continues its normal update count. No route change or frame-loss explanation is supported.

A fresh startup-gated launch measured **19.83%, 21.32%, 18.13%** in three 20-second windows. All presented 600 frames with zero new drops, retained `native-direct-ass`, had stable process membership, and destroyed every worker. Post-window visual checks found 19,464 nontransparent subtitle pixels at the expected 960x540 canvas; screenshots are retained. The three measurements reproduce the higher band, not the historical low state.

The original CPU window did not record actual compositor output, per-thread execution, core placement, or CPU frequency. Browser compositor state and platform scheduling/frequency remain possible explanations, not established causes. The absence of a low-state reproduction prevents a causal conclusion. Keep its published CPU withheld rather than deleting the outlier or claiming a subtitle optimization.

Raw original-window interval decomposition is in `pcm-historical-intervals.json`. Historical power assertions show the video wake lock remained active during that window; they do not report per-core frequency or prove compositor output.

## Method and limits

The controlled harness uses the repository's 150-second Chrome hardware-key startup gate, 20-second idle observation, five-second playback warmup, 20-second fixed-deadline whole-browser CPU sampling, process-turnover check, and existing frame gate. No fixed idle subtraction. No screenshot or canvas read occurs inside CPU windows. The variants are diagnostic; their CPU samples are not replacements for full row correctness plus publication qualification.

Reproduction helpers: `tests/hevc-hls-timestamp-diagnostic.py` creates the timestamp-only copy; `tests/cpu-gap-controlled.mjs` runs gated comparisons (ARMS selects cases); `tests/cpu-gap-investigation.mjs` records instrumented per-frame diagnostics. CPU run directories retain their exact harness snapshot and runtime/fixture hashes. The first harness snapshot was reconstructed immediately after adding the symmetric interception control; raw results were not rewritten.

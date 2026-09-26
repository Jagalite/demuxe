<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC Native seek: random-access leading pictures

## Status

Source fix prepared on 2026-09-26; **not built or tested**. Another agent is
performance testing, so no builds, tests, benchmarks, browser sessions or
generated-asset updates were performed. Inspection used existing results,
source reads and bounded `ffprobe` packet metadata reads without decoding.

The [original report](NATIVE-VIDEO-AUTO-ROUTING.md#focused-correctness) and
[saved result](../results/native-video-component-routing/correctness.json)
remain the before-state: `hevc-eac3` starts as `native-video-mpv-audio`, then
seeking to 10 seconds reaches Hybrid after `Selected timeline discontinuity`.
The old 12/12 result counts this fallback as expected behavior.

## Diagnosis

Fixture:
`build/head-to-head/assets-release-supplement-20260925-04/fixtures/hevc10-eac3/index.mkv`

SHA-256: `e5d6035275d2f8a9e590c9e235e8fb8b726fdd621d09326c82dc3a0b2abde72e`

Its video time base is 1/1000, reported reorder delay is two frames, and packet
durations are 33 ticks. A bounded packet read starting at 10 seconds shows:

| Decode order | PTS | HEVC NAL type | Meaning |
| --- | ---: | ---: | --- |
| 1 | 10000 | 21 | CRA random-access picture |
| 2 | 9967 | 8 | RASL_N leading picture |
| 3 | 10133 | 1 | TRAIL_R picture |

The remuxer's two-entry synthetic DTS seed starts at 9934 and 9967. It emits
9934 for the CRA, then inserts the leading picture's PTS of 9967 into a queue
already containing 9967. The duplicate eventually reaches the strict
monotonic-DTS check. This explains the saved error without requiring stale
state: `rm_start()` already resets both the queue and previous DTS.

RASL pictures following a fresh CRA access point may depend on the previous
GOP and are not output at that random-access boundary. FFmpeg's
[`hevc_frame_start()` / `decode_slice()`](https://ffmpeg.org/doxygen/trunk/libavcodec_2hevc_2hevcdec_8c_source.html)
set and apply `no_rasl_output_flag`. Continuous playback through a later CRA
is different: its leading pictures remain part of the output timeline.

## Change

For the existing Matroska HEVC DTS-repair path, the remuxer classifies VCL NAL
headers while performing its existing packet scan. It suppresses RASL access
units only under random-access no-RASL state (initial CRA or BLA), before DTS
reconstruction and adaptation frame accounting. A later continuous CRA clears
that state. RADL and ordinary trailing pictures are retained. Restart resets
the state; malformed or mixed-layer/type slice headers reject instead of
allowing an ambiguous packet to be discarded.

Review added a conservative metadata guard: a suppressed RASL packet that
also carries non-VCL NALs other than AUD/filler rejects to the existing fallback.
Unlike skipping a decoded picture, dropping an entire packet could otherwise
lose persistent SEI or other decoder state. Metadata-free RASL packets remain
eligible for omission; metadata-bearing packets require decoder handling.

The monotonic-DTS guard and automatic compatibility fallback remain intact.
This is random-access handling, not a lossy decode policy or timestamp clamp.
Other timestamp failures and broader HEVC random-access cases remain possible.

## Deferred verification

The production route regression now requires Native retention for this
fixture, including repeated paused seeks around the CRA boundary and resumed
playback across the next CRA. Paused seeks check displayed timeline markers;
a captured remux checks source packet hashes before the next CRA, including
its leading pictures, and excludes the initial suppressed RASL control.
These regression changes have not been run. An `OUT` override allows fresh evidence without
replacing the historical result. After performance testing is finished:

1. Rebuild the remux engine and affected audio-adaptation profiles from this
   source, including their normal provenance/asset checks.
2. Run the focused route regression with a fresh output path, for example
   `CASE=hevc-eac3 OUT=results/native-video-component-routing/hevc-seek-fix.json node tests/native-video-component-routing.mjs`.
3. Verify decoded output against the source at the seek targets, continuous
   CRA/RASL playback, RADL retention, repeated restarts, EOF and cleanup.
   Route retention alone does not establish frame identity or fidelity.
4. Run the full component-route regression, existing selective failure
   injections, and remux/adaptation regressions. Genuine discontinuities must
   still reject and recover through the existing fallback policy.

Served WASM assets still contain the old behavior until rebuilt. No runtime
success or release qualification is claimed by this source change.

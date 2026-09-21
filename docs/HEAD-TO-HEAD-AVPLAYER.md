<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AVPlayer comparison audit

This audit concerns **libmedia AVPlayer 1.3.1**, headed Chrome 152 on macOS,
with the pinned fixtures and runtime in `assets-shaka-production-03`.
It does not describe Apple's AVPlayer or the latest libmedia release.
The [paired comparison](../results/head-to-head/configured-alternatives-20260921-report-04/REPORT.md)
remains the complete correctness inventory: 39/70 default and 32/70 with MSE
preference, including fidelity-limited screens. Those totals are bounded
lifecycle outcomes, not codec-support counts.

## Integration review

The adapter awaits `load`, `play`, `pause` and `seek`; it passes seek timestamps
as integer **milliseconds**, as specified by the pinned package's
`dist/types/src/AVPlayer.d.ts`. It uses the documented container and WASM base
URL, selects subtitle stream IDs through public methods, and preserves
AVPlayer's default worker, WebCodecs and hardware settings. MSE preference is
separate and can still fall back to AVPlayer's custom pipeline. Explicit live
options were already tested separately.

The [upstream integration guide](https://github.com/zhaohappy/libmedia/blob/152f629d3021fd8013efa464fcb7b55f9fbe7753/site/docs/guide/player.en-US.md)
requires asynchronous operations to be sequenced and dynamically loaded modules
to be served. The catalogue, specialist, and corrected streaming request logs
contain no HTTP errors for player resources or fixtures; their 404s are only
`/favicon.ico`. Asset hashes are verified before each new run. No dependency
was patched and no output threshold was relaxed for this audit.

## Reproductions and counterfactuals

The [six-case baseline rerun](../results/head-to-head/avplayer-audit-20260921-baseline-01/REPORT.md)
reproduced failed checks for PCM16/MKV, fragmented MP4, embedded SRT, external
WebVTT, embedded ASS, and audio-only Vorbis. The exact first failing seek can
vary; this is not evidence that only one particular seek target is affected.

[Diagnostic observations](../results/head-to-head/avplayer-audit-20260921-diagnostics-01/summary.json)
and the [URL-padding/control follow-up](../results/head-to-head/avplayer-audit-20260921-diagnostics-02/summary.json)
separately test no audio observer, File input, worker configuration, additional
post-seek wait, and a padded WebVTT input. Diagnostic `status: passed` means the
sequence completed; **it is not a playback correctness pass**. Images, OCR,
audio samples, public status/events, and failures must be read together.
Unobserved runs establish whether symptoms persist without our audio tap; they
do not certify audible output.

- PCM16 still raises repeated `Cannot set properties of undefined (setting
  'nbChannels')` exceptions without audio observation. Video advances while
  audio decoding does not produce the required output.
- Embedded SRT and ASS render initially, then remain absent in both early and
  later screenshots after forward/backward seeks, including without audio
  observation. Waiting longer does not restore the long active cue.
- Audio-only Vorbis and MPEG-2/MP2 still exhibit wrong post-seek positions without
  audio observation. A resolved `seek()` promise alone is insufficient evidence
  that output reached the requested position.

## EOF check correction

The HLS/TS fixture has a nonzero starting timestamp. AVPlayer reports duration
36 seconds, but its public clock ends around 37.433 seconds. The old harness
started checking timeline settling as soon as the clock approached 36, while
AVPlayer was still finishing the file. The unobserved diagnostic reaches its
public `ended` event and remains settled at 37.433 in both late samples.

The adapter now records AVPlayer's public `ended` event and clears it on seek
and playback restart. The shared EOF check waits for that signal when exposed,
then checks the final region and settled timeline. The seven-second deadline
and output checks remain unchanged. This is a harness correction, not a player
fix. The [corrected EOF run](../results/head-to-head/avplayer-audit-20260921-eof-01/REPORT.md)
passes HLS/TS in both default and MSE configurations, plus the default FLAC
control. The six other MSE EOF failures still reproduce. This changes the
complete default total from 38 to 39 and MSE preference from 31 to 32.
Earlier failures remain linked under `supersedes` in the paired report.

## Input-sensitive behavior

Fragmented MP4 opens, renders marked video/audio, and seeks when its unchanged
bytes are supplied as a browser `File`, although URL input stalls during opening.
That diagnostic does not alone qualify the complete lifecycle; the separately
listed File-input correctness lane runs the shared contract, including pause,
rate, EOF, and cleanup. It downloads the entire input first and makes no
streaming or bounded-memory claim. The
[full alternative run](../results/head-to-head/avplayer-audit-20260921-alternatives-01/REPORT.md)
confirms ordinary File-input playback but fails its near-EOF seek; it is not a
complete pass. The other three File-input cases still fail, as do 15 of the 16
WebCodecs-off cases. The one WebCodecs-off pass is HLS/TS, which now also passes
by default after the EOF harness correction.

The original external WebVTT input fails during subtitle loading. Adding one
trailing newline permits loading and initial subtitle rendering, through both
File subtitle input and the same URL. The cue still disappears after seeking.
The [WebVTT syntax](https://www.w3.org/TR/webvtt1/#syntax) permits optional trailing
line terminators. This is input-sensitive behavior of the pinned parser, not
proof that AVPlayer cannot render WebVTT. The padded bytes are diagnostic inputs;
the original fixture remains unchanged.

## Other recorded failure families

These findings come from the existing hashed records, not fresh reproductions
of every combination:

- TrueHD cases log `audio codec not support`; the captured stats show no decoded
  audio. That is narrower than claiming the HEVC/MKV file cannot play video.
- ProRes/PCM logs rejection of both video and audio streams during opening.
- PGS/VobSub cases play audio/video but subtitle selection reports failure. The
  pinned built-in subtitle path did not produce the required bitmap drawing.
- The real E-AC-3/JOC sample plays and seeks normally until its near-EOF seek;
  AVPlayer logs a demuxer seek error. This does not establish an Atmos fidelity
  result or a general E-AC-3 decoding failure.
- MSE preference adds no complete passes in the paired campaign. Its seven
  regressions are H.264/FLAC stereo, H.264/FLAC 5.1, H.264/Opus, AV1 10-bit/Opus,
  AV1/WebM, VP9/Opus, and HDR10/AV1. Six fail the EOF check; VP9/Opus fails opening.

## Validation

The audit adds 36 shared-contract cases (six baseline, twenty alternatives,
nine EOF/control, one negative control) and eighteen diagnostic observations.
All six raw run manifests verify. The covered-video negative control fails at
`initial-output`, as intended. Nine harness contract tests and the report
regression test pass; the latter checks that partial File-input playback stays
a failure rather than being upgraded to a complete pass. No new CPU numbers or
HDR/surround fidelity claims were produced. This is a targeted audit of failure
families, not a fresh exhaustive campaign over every version and configuration.

## Reproduce

```sh
node tests/head-to-head/run.mjs \
  --assets build/head-to-head/assets-shaka-production-03 \
  --catalogue --configured-alternatives --headed \
  --cases libmedia.default.h264-pcm16,libmedia.default.h264-fmp4,libmedia.default.h264-srt,libmedia.default.h264-vtt,libmedia.default.h264-ass,libmedia.default.audio-vorbis \
  --output results/head-to-head/<unique-baseline-directory>

node tests/head-to-head/avplayer-audit.mjs \
  build/head-to-head/assets-shaka-production-03 \
  results/head-to-head/<unique-diagnostic-directory>
```

The diagnostic runner also accepts a comma-separated fourth argument selecting
`fixture.variant` IDs. Each run retains its exact runner and injected adapter;
File inputs and WebVTT padding are explicitly labeled counterfactuals, never
silently substituted into the original comparison. Use `verify.mjs` to verify
completed run integrity; an integrity pass does not turn a failed media check
into a successful one.

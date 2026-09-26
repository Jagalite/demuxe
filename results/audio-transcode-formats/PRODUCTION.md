<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Default FLAC24 audio preparation — correctness and integration

Auto now tries selected-audio FLAC24 after original Direct/Remux and before mpv/AudioWorklet. Compatible original audio stays unchanged. `audioPlayback: 'worklet'` disables automatic transcoding. Video remains packet-copied and browser-decoded. The strict integer FLAC and explicitly permitted Opus policies are retained.

This is correctness evidence, not a new CPU campaign or release qualification. The README CPU cells retain their previous measurements and are marked as preceding the new default.

## Fixes

- TrueHD/MLP: equal millisecond container DTS is permitted only for decoded audio, while sample continuity remains enforced. Selected Matroska TrueHD/MLP bypasses the byte-stream parser, which could attach skipped preroll PTS to a later major-sync unit. Every access unit is length-validated before decoding; copied-video DTS checks stay strict.
- Vorbis: mux choice checks the encoded FLAC output codec instead of the original Vorbis codec.
- Surround: bounded discovery decodes only the selected audio to establish its actual speaker layout before writing the FLAC header. It retains packets and reopens the decoder for playback. Unknown and noncanonical FLAC layouts fall back rather than relabeling speakers.
- Multi-audio: when Direct browser support is inconclusive, controlled preparation owns selection. The negative control showed Chrome playing alternate PCM while Demuxe reported default AC-3; distinct 440/880 versus 550/990 Hz tones now verify the initial and switched tracks.
- Precision: decoded S16/S24 samples are exact; float and wider integer PCM is rounded to 24 bits. Nonfinite or out-of-range PCM rejects this route. There is no added perceptual codec, resampling or channel remix.

## Engine and source provenance

- Final local engine: `/Volumes/seed2/Projects/demuxe/build/audio-transcode-production-01/engine-1790464723570815000`.
- Served Wasm SHA-256: `2e829ff6ef44d6c2f313004bb78714946804d202153b108ee43b9e09cf7bc562`.
- [Build verification](production-build-verification.json) checks the pinned source, library hashes, source snapshots, LGPL configuration and exact audio-only decoder/encoder inventory. No video decoder or encoder is enabled.
- The full 21-format run predates only the final canonical-speaker-layout rejection guard. The final engine is rechecked with stereo Auto, clipping/layout fallback, and the three surround cases below. The raw manifests retain the distinct engine hashes.

## Format qualification

[Lifecycle run](production-formats-05/result.json): 21/21 passed in Chrome 153 on macOS. Pause/resume, 0.5/1/2× playback, forward/backward and paused seeks, near EOF, replay, channel/time tones and worker cleanup were checked. VideoToolbox/platform video decoding and browser FLAC decoding were observed, with no mpv audio worker.

[Scalar-reference comparisons](production-formats-05/media-verification-scalar.json): 21/21 passed. Captured video packet hashes and relative PTS match the source. Sample rate and speaker layout match; decoded audio/video mux shifts differ by less than 2.1 ms, respecting source millisecond timestamps. Integer exactness is checked on the captured two-second prefix, not asserted for every unobserved sample.

| Fixture | Channels | Hz | Maximum absolute PCM error | Exact integer comparison required |
| --- | ---: | ---: | ---: | --- |
| `ac3` | 2 | 48000 | 8.19563866e-08 | No |
| `eac3` | 2 | 48000 | 8.19563866e-08 | No |
| `dca` | 2 | 48000 | 7.4505806e-08 | No |
| `truehd` | 2 | 48000 | 0 | Yes |
| `aac` | 2 | 48000 | 8.94069672e-08 | No |
| `libmp3lame` | 2 | 48000 | 1.2293458e-07 | No |
| `libopus` | 2 | 48000 | 9.68575478e-08 | No |
| `vorbis` | 2 | 48000 | 9.68575478e-08 | No |
| `flac` | 2 | 48000 | 5.96046448e-08 | No |
| `alac` | 2 | 48000 | 0 | Yes |
| `pcm_s16le` | 2 | 48000 | 0 | Yes |
| `pcm_s24le` | 2 | 48000 | 0 | Yes |
| `pcm_f32le` | 2 | 48000 | 5.96046448e-08 | No |
| `aac-44100` | 2 | 44100 | 8.94069672e-08 | No |
| `flac-96000` | 2 | 96000 | 5.96046448e-08 | No |
| `ac3-mono` | 1 | 48000 | 8.19563866e-08 | No |
| `eac3-51` | 6 | 48000 | 8.94069672e-08 | No |
| `truehd-51` | 6 | 48000 | 0 | Yes |
| `flac-71` | 8 | 48000 | 5.96046448e-08 | No |
| `flac-bits24` | 2 | 48000 | 0 | Yes |
| `flac-96000-bits24` | 2 | 96000 | 0 | Yes |

The host FFmpeg 8.1.2 optimized Vorbis reference disagreed on the right channel
(peak error 0.2767), while `-cpuflags 0` agreed within 9.69e-8. The discrepancy is
isolated to that optimized reference. Both the [original failed comparison](production-formats-05/media-verification.json)
and [per-channel attribution](production-formats-05/vorbis-reference-attribution.json)
are retained. The scalar comparison is explicitly labeled and does not overwrite
the failed control.

## Production route checks

- [Route 01](production-route-01/result.json): Worklet override, missing assets,
  and HEVC/PGS transcoding plus mpv subtitles passed. Initial Auto audio-observer
  failure was a harness issue: it attached before startup changed the backend;
  corrected to observe the active video after output verification.
- [Route 02](production-route-02/result.json): AC-3 URL/local, TrueHD, E-AC-3 5.1,
  H.264/AC-3 and unchanged AAC passed. FLAC/Vorbis Direct was initially rejected by
  overly narrow test expectations; preserving the original route is intended.
- [Route 03](production-route-03/result.json): unchanged FLAC/Vorbis Direct, older
  engine fallback and out-of-range PCM fallback passed. Its multi-audio negative
  control exposed the wrong-track issue described above.
- [Track correction](production-track-04/result.json): selected source identity,
  distinct tones and lifecycle passed after controlling multi-audio selection.
- [Final core routes](production-final-06/result.json): AC-3 Auto, HEVC/PGS and
  distinct-tone track switching passed with final core routing.
- [Final layout guard](production-layout-07/result.json): stereo Auto, out-of-range
  PCM fallback and noncanonical 3.1 layout fallback passed with the final engine.
  Fallback reasons are asserted, not inferred from the accepted route.
- [Surround regression](production-surround-08/result.json): E-AC-3 5.1, TrueHD 5.1
  and FLAC 7.1 lifecycle passed with the final layout guard. Independent scalar
  sample comparisons are retained in that directory.
- Strict FLAC and explicit Opus passed the existing `tests/audio-adaptation.mjs`
  `b0-start0-mismatch0` check; evidence is under `legacy-flac/` and `legacy-opus/`.
- Build, license boundaries and 53 routing/capability/track-policy contracts passed.
- [Short-tail seek regression](production-tail-09/result.json): a six-second
  H.264 video with 5.2 seconds of audio passed paused seeks to 5.8, 2 and 5.4
  seconds, EOF, replay and worker cleanup, retaining `native-transcode` throughout.
  AC-3 URL/local File and TrueHD URL inputs passed. The worker retains real audio
  preroll before the completed track's end; the presentation target is unchanged.
  [The original failure](production-tail-09/before.json) returned FFmpeg EOF on
  layout discovery and then timed out in fallback. Reproduce with a fresh `OUT`
  using `node tests/audio-transcode-tail-browser.mjs`; no CPU measurements ran.

## Scope and reproduction

This does not establish every container/profile/browser/device combination,
physical surround, Atmos/DTS:X metadata, or release readiness. Unsupported inputs
and feature combinations retain fallback. Source permissions, identity and network
errors retain their normal error behavior.

Build with `scripts/build-audio-adaptation.py --transcode --opus --flac-level 0`
and install its assets under `web/engine-adaptation/`. The engine manifest records
source, SDK, archive and link inputs. Use fresh output directories:

```sh
PROFILE=flac24 ENGINES=build/audio-transcode-production-01/engines.json \
FIXTURES=build/audio-transcode-production-01/fixtures.json \
OUT=results/audio-transcode-formats/fresh-formats \
node experiments/audio-transcode-formats/run.mjs
python3 experiments/audio-transcode-formats/verify.py \
  results/audio-transcode-formats/fresh-formats --scalar-reference
OUT=results/audio-transcode-formats/fresh-routes node tests/audio-transcode-browser.mjs
```

Fixture manifests retain preparation commands/hashes. The integration harness
records fixture hashes, including additional controls in
`build/audio-transcode-integration-fixtures/`. No CPU figures were republished.

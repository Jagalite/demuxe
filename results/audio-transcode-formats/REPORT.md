<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# FLAC24 transcoding across audio formats — 2026-09-26

**16 of 21 configurations pass both browser lifecycle and independent media
checks. Five configurations are blocked. This supports a wider experimental
path, not unconditional production admission.** No production engine, route,
public audio policy, README CPU cell or existing EOF edit was changed.

All cases use original synthetic 18-second Matroska media, copied 320×180/30 fps
HEVC Main10 SDR video, and distinct channel/time-coded tones. The output is FLAC24
in fragmented MP4, prepared live in Wasm and played by the maintained RemuxPlayer.
This checks additional **input** codecs; it does not qualify AAC as an output.

## Results

| Input | Result | PCM comparison or blocker |
| --- | --- | --- |
| AC-3 stereo 48 kHz | Pass | Max sample error 8.94e-08 |
| E-AC-3 stereo 48 kHz | Pass | Max sample error 8.2e-08 |
| DTS core stereo 48 kHz | Pass | Max sample error 7.82e-08 |
| TrueHD stereo 48 kHz | Blocked | Selected timeline discontinuity |
| AAC stereo 48 kHz | Pass | Max sample error 8.94e-08 |
| MP3 stereo 48 kHz | Pass | Max sample error 1.27e-07 |
| Opus stereo 48 kHz | Pass | Max sample error 9.69e-08 |
| Vorbis stereo 48 kHz | Blocked | Selected codecs incompatible with MP4 |
| FLAC 32-bit stereo 48 kHz | Pass | Max sample error 5.96e-08 |
| ALAC 24-bit stereo 48 kHz | Pass | Exact PCM samples |
| PCM16 stereo 48 kHz | Pass | Exact PCM samples |
| PCM24 stereo 48 kHz | Pass | Exact PCM samples |
| Float PCM stereo 48 kHz | Pass | Max sample error 5.96e-08 |
| AAC stereo 44.1 kHz | Pass | Max sample error 8.94e-08 |
| FLAC 32-bit stereo 96 kHz | Pass | Max sample error 5.96e-08 |
| AC-3 mono 48 kHz | Pass | Max sample error 8.2e-08 |
| E-AC-3 5.1 / 48 kHz | Blocked | Unknown multichannel layout |
| TrueHD 5.1 / 48 kHz | Blocked | Selected timeline discontinuity |
| FLAC 7.1 / 48 kHz | Blocked | Unknown multichannel layout |
| FLAC 24-bit stereo 48 kHz | Pass | Exact PCM samples |
| FLAC 24-bit stereo 96 kHz | Pass | Exact PCM samples |

Every passing configuration completed:

- decoded channel and temporal audio markers, pause/resume, 0.5x/2x/1x rates;
- forward/backward seeks, paused-seek video marker, EOF, replay and worker cleanup;
- matching declared output sample rate/channel count and zero reported clipping;
- matching decoded/encoded sample counts at EOF;
- `VideoToolboxVideoDecoder` with `kIsPlatformVideoDecoder=true`;
- browser FLAC audio decoding (`SymphoniaAudioDecoder`), with no mpv workers;
- exact compressed video packet payloads in captured pre-seek output;
- constant video timestamp shift and matching audio shift within 2.1 ms, allowing
  source Matroska's millisecond timestamp precision;
- at least one second per channel of independent sample comparison (normally two
  seconds) with native FFmpeg decoding of the original input.

The per-channel Web Audio observer is correctness-only. These checks establish
browser-decoded channels, not physical surround-speaker fidelity. Time-coded
markers detect gross seek/sync errors, not sample-accurate physical A/V latency.
Captured-prefix comparisons are not an exhaustive full-file PCM comparison.

## Concrete blockers

1. **TrueHD stereo and 5.1: packet timestamp guard.**
   The frozen TrueHD source has adjacent packet DTS values `0,1,2,3,3,4,5,6,7,8,8`:
   sub-millisecond packets share millisecond Matroska ticks. The common remux
   guard requires strictly increasing packet DTS and rejects before playback.
   This needs a rule for transcoded audio that retains decoded-sample continuity
   validation; the video packet-order protections must remain effective.
   See [packet guard](../../native/remux/remux.c#L584).
2. **Vorbis: packaging checks the input codec.**
   `rm_set_container()` rejects source Vorbis for MP4 even though adaptation
   advertises FLAC output. Container selection/admission must use the actual
   adapted audio codec. The failure is before decoding/playback qualification.
   See [container guard](../../native/remux/remux.c#L391).
3. **E-AC-3 5.1 and FLAC 7.1: channel layout unavailable at admission.**
   Metadata probing deliberately forbids decoder-assisted stream discovery.
   In these cases it supplies channel count but no established channel layout;
   the experimental converter rejects unspecified multichannel layouts rather
   than silently selecting a layout. Selected-audio format discovery and layout
   preservation need implementation and channel-level validation. This is not
   evidence that the browser cannot play multichannel FLAC.
   See [metadata-only probe](../../native/remux/remux.c#L278) and the private
   `adaptation_describe` source archived in the engine manifest.

The failures remain in the raw results; no admission guard was relaxed to make
these cases pass. The matrix runner exits nonzero for the five blocked cases.

## Precision boundary

PCM16, PCM24, ALAC24 and explicit FLAC24 controls produced exactly equal decoded
samples in the checked prefixes. All comparison rows record actual sample format,
layout and precision evidence.

This installed FFmpeg version defaults to **32-bit FLAC** when fed S32 without
an explicit bit-depth option. Those original controls were retained and labeled
as 32-bit; separate 24-bit controls were added. Their FLAC24 conversion rounds
samples, with a maximum observed absolute error of one-half a 24-bit step.
Float PCM also rounds. Neither is a lossless path for arbitrary source precision.

The worst maximum absolute sample difference across all passing quantized/native-
versus-Wasm comparisons was 1.2665987e-07 relative to full-scale PCM.
Lossy source decoding is compared against decoding that source, not against the
pre-encoding test tone. These values do not establish perceptual equivalence
for arbitrary programme material or authorize clipping.

Mono/stereo PCM Matroska frames omit an explicit channel-layout label in native
ffprobe output. The verifier records that fact and checks the authored fixture's
mono/stereo contract, channel count and independently observed channel markers.
It does not treat missing metadata as an observed layout change or infer surround.

## Evidence and reproducibility

- [Final 19-case sweep](check-03/result.json), [media verification](check-03/media-verification.json).
- [Two explicit FLAC24 controls](check-04/result.json), [exact-sample verification](check-04/media-verification.json).
- [Machine-readable combined summary](summary.json).
- [Harness/build instructions](../../experiments/audio-transcode-formats/README.md).
- Engine: `/Volumes/seed2/Projects/demuxe/build/audio-transcode-formats-02/build/engine-1790460735350394000`.
- Engine SHA-256: `130cc2851dd8527cc3cef549f0417c23bb5d8a5bba7b88c742330cda1fa0f3d9`.
- Fixture manifests: `build/audio-transcode-formats-fixtures-04/combined-manifest.json`
  and `build/audio-transcode-formats-fixtures-05/manifest.json`.
- Each result retains browser identity, fixture/runtime hashes, media properties,
  raw phases, captured MP4 prefixes and screenshots. The final two result sets
  use the same engine and runtime hashes.

`build-01` revealed that FFmpeg disabled Opus because `libswresample` was excluded.
The isolated `build-02` enables and links that decoder dependency, and the final
configuration audit confirms Opus is enabled. No application resampling/downmix
step was introduced; tested output sample rates and channels equal input values.
No video decoder or encoder is enabled in this preparation engine.

`check-01` was an AC-3 control on build-01; `check-02` retained early TrueHD and
surround failures. The final sweep reran on build-02. Fixture preparation attempts
01/02 had command-construction errors; attempt 03 exposed unsupported planar
encoder options for TrueHD/ALAC, corrected only for those inputs in attempt 04.
All preparation records are retained. `check-03/media-verification-initial.json`
retains the verifier's initial unspecified-mono/stereo-layout rejection; fixing
that metadata interpretation required no playback change or browser rerun.

## Admission remains experimental

Do not route all lossy codecs here solely because one AC-3 performance result
was favorable. Direct browser-playable AAC/MP3/Opus inputs are controls; passing
this transcode does not justify replacing their direct route. This campaign ran
no additional CPU benchmarks, so CPU savings for these other formats remain
unmeasured.

The tested scope is Chrome 153.0.8010.53, these authored clips and Matroska input.
Other browsers/containers, DTS-HD, Atmos/DTS:X or other object metadata, arbitrary
surround layouts, subtitles, multiple-track switching, long files, network stalls
and clipping/precision policy remain outside this screen. Keep production routing
unchanged while addressing the identified blockers and selecting an explicit
precision-preservation policy.

Subsequent bounded AC-3/E-AC-3/DTS performance measurements are recorded separately
in [PERFORMANCE.md](PERFORMANCE.md); they do not change the correctness statuses above.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Remaining bounded container and legacy codec work

Baseline: committed `5759d3e6` before the current follow-up campaign. Concurrent
codec/provider additions need their own final status and evidence.

This inventory distinguishes source/build support from a maintained split and
runtime qualification. A broad FFmpeg demuxer does not establish an admitted
playback route or a decoder in that build. Current native adaptation enables all
FFmpeg demuxers, MP4/WebM muxers, parsers and bitstream filters, but only its
explicit audio decoder list (`scripts/build-audio-adaptation.py`).

| Priority | Area | Current support | Remaining implementation and evidence |
| --- | --- | --- | --- |
| P1 validation | WAV/AIFF PCM | Reader integrated with explicit audio-only conversion; 51 reader and 70 native composition checks passed | Installed assets/embedded playback and current package gates underway; RF64/AIFC and extended layouts reject |
| P1 validation | MOV/MP4 audio | Bounded reader plus AAC-LC/FLAC/ALAC/float PCM conversion; 35 reader and 23 composition checks passed | Current installed source/package refresh; fragmented/encrypted/complex edits remain unsupported |
| P1 packet boundary | MPEG-TS | Bounded single-program AVC/AAC reader; 27 checks passed, explicit PTS/DTS | Conversion and seek/discontinuity contracts are separate; no replacement of production timestamp repair |
| P1 integration | Ogg Opus/Vorbis/FLAC | Single-stream CRC/continuation/granule reader; 24 tests passed with two fixture encoder limits recorded | Actual audio-only conversion, installed delivery and playback underway; chained/multiplexed streams reject |
| P2 validation | WebM VP8/VP9/AV1 + Opus/Vorbis | Bounded packet-copy reader/writer and exact native references; 18 installed Chromium cases passed with silence and frozen-image controls | Refreshed final package rerun and Firefox CI remain; hidden preview qualified decoded frames and canvas changes, not visible compositor callbacks |
| P2 validation | MP1/MP2 | Legacy slice built; 13 legacy packet cases and 52 reset/preroll intervals passed | MP2 composition implemented; MP1 remains canonical 32 kHz packet-only until a corresponding source/output contract is qualified |
| P2 validation | WMA v1/v2 | Legacy slice plus actual WAVEFORMATEX Matroska framing; twelve MP2/WMA compositions passed | Installed delivery underway; ASF source reader and WMA Pro/Lossless/Voice remain separate gaps |
| P2 packet boundary | APE | Modern 3930–3990 packet decoder built; canonical full-file PCM/reset/seek proof passed | Standalone canonical 3990 stereo16/44.1 kHz conversion passed; current installed rerun underway; older versions and other configurations remain separate work |
| P2 integration | WavPack | Integer lossless packet decoder built; archive matrix has 33 cases and 128 exact seek intervals | 32 Matroska mapping and 32 composition checks passed (21 exact conversions, 11 expected rejections); installed browser pending; hybrid/correction, float and DSD explicitly reject |

MP1/MP2/WMA/APE/WavPack do not need separate external libraries merely to use
FFmpeg's decoder implementations. That is an architectural observation, not a
completed license audit: actual source closure, build flags, notices and exact
corresponding source still require the established package gates. Existing broad
mpv availability does not prove these codecs were compiled or runtime-qualified;
mpv remains consolidated.

TTA now has an audited `audio-archive-more` packet package and bounded standalone reader/converter. Seventeen packet/reader rows and twenty composition checks passed, including explicit header and packet-budget rejection. The updated 620-case installed matrix adds standalone TTA, APE and WavPack.

## New PCM reader contract

`WaveAiffReader.open(blob, signal)` returns one audio track, `sampleCount`,
`sampleRate`, `channels`, `bitDepth`, `format` and cumulative `bytesRead`.
`packets(startSample = 0)` yields owned little-endian PCM packets with track 1,
key flag, sample-derived timestamp and duration. It seeks directly by sample
index; it never reads the entire Blob or a large metadata body.

Admitted inputs are mono/stereo at exactly 44.1, 48 or 96 kHz:

- RIFF WAVE signed 16/24/32-bit PCM or IEEE 32/64-bit float.
- WAVE extensible only when valid bits equal storage bits and subtype is PCM or
  IEEE float; channel mask is unspecified or canonical mono/stereo.
- FORM AIFF signed 16/24/32-bit big-endian PCM, normalized without numerical
  conversion into the existing PCM decoder slice's little-endian byte format.
- One format and one data chunk; exact declared sizes, alignment and sample count.

RF64, RIFX, AIFC/compression, multiple data chunks, cue/loop/timeline metadata,
unknown structural extensions, padded-valid-bit layouts, and other rates/channels
reject with `PROVIDER_PROFILE_MISMATCH`. WAVE LIST/INFO and AIFF descriptive text
chunks are ignored, not preserved. AIFF block-aligned storage rejects; ordinary
SSND prefix offsets are honored. Floating sample values retain their bits; the
consumer applies its own finite-value/range/precision rules.

Reads are bounded to 64 KiB, metadata iteration to 4096 chunks, and container
sizes to their declared 32-bit fields. Integer nanosecond calculation retains
precision for large sample offsets. Abort checks occur before and after Blob
reads. Header order is flexible, including data before format, because opening
scans chunk headers without loading audio payloads.

Run the native reference matrix:

```sh
PCM_BUILD_POINTER=build/codec-expansion/decoder-families/pcm.json \
  node --test tests/provider-wave-aiff.mjs
```

Fixtures, compilation and complete evidence go to a fresh temporary directory,
printed by the test; heavy media stays off the external checkout. The matrix
covers 30 WAV and 18 AIFF combinations, exact independent FFmpeg PCM bytes,
actual pinned Wasm decoder precision, sample timestamps, sample seeking, bounded
reads, abort and malformed metadata controls. A sparse 3.2 GB declaration checks
large-offset seeking without creating a large file. It is a synthetic reader
control, not real large-file playback qualification.

Format rules were checked against [Microsoft WAVEFORMATEXTENSIBLE](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ksmedia/ns-ksmedia-waveformatextensible)
and the [Apple AIFF 1.3 specification](https://blog.zamzar.com/wp-content/uploads/2014/10/aiffspecs.pdf).

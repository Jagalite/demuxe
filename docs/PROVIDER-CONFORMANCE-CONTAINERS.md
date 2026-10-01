<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Container provider conformance

The standard provider runner exercises all **17 declared container offers** in the audited `container-conformance-01` package. New checks import the actual declared package artifacts through the verified adapter; they do not substitute checkout-compiled reader implementations. The original Matroska AVC/AAC and fMP4 checks remain in place.

See [compact qualification evidence](../results/media-components/bundling/container-conformance.json). This is finite reader/writer conformance. Audio conversion, browser playback, production routing and broad FFmpeg release qualification remain separate gates.

## Covered contracts

| Capability/profile | Reference and scope |
| --- | --- |
| `container.read.matroska / finite-clear-av` | Existing original AVC/AAC packet, configuration, timestamp, ownership, cancellation and display-metadata controls. |
| `container.mux.fmp4 / explicit-timeline-av` | Existing explicit DTS/PTS/duration, display aspect, packet/configuration and complete native output comparisons. |
| `container.read.isobmff / finite-clear-av` | AVC plus ALAC, AAC-LC, FLAC and float64 sample tables; packet bytes, track configuration, sample clocks, AAC edit extent; encryption, external references, fragmentation, transformed video and malformed table rejection. |
| `container.read.ogg / finite-clear-audio` | Opus/Vorbis/FLAC packets, original headers and comments, sequence, CRC, final granule and pre-skip; explicit rejection of invalid continuation, mapping, gain, chained streams and impossible granules. Vorbis packet clocks remain unspecified. |
| `container.read.wave-aiff / finite-clear-audio` | WAV/AIFF integer24, WAV float64, WAV unsigned8 and AIFF signed8; exact normalized PCM, original sample count, integer sample clock and sample seeking; format, rate, alignment and AIFF metadata rejection. |
| `container.read.mpegts / finite-pes-av` | AVC Annex B and AAC ADTS; exact 90 kHz PTS/DTS, including reordered pictures, and explicit packet formats. PAT/PMT CRC/program, continuity, scrambling, PES and rollover controls. **Packet-only**: no TS remux, arbitrary seek or Player admission. |
| `container.read.matroska / finite-clear-webm` | VP8/Opus and VP9/Vorbis original packet/header/clock ownership and display-metadata checks. |
| `container.mux.webm / explicit-timeline-av` | Installed remux admission and writer primitive; complete packet/configuration/PTS/duration/final-trim identity, independently decoded full video/audio, actual SeekHead/Cue positions and invalid timeline/mapping/gain controls. |
| `container.read.wavpack / finite-clear-audio` | 31 integer fixtures plus an explicit float rejection; complete original WavPack blocks, original sample clocks, native decoded extent and exact seek packet history. |
| `container.read.ape / finite-clear-audio` | Real modern3990 stereo16/44.1 kHz canonical source; exact native-demux packets, configuration, full sample count and original packet seek history. Broader APE modes are not inferred. |
| `container.read.tta / finite-clear-audio` | 13 positive fixtures plus four exact profile/budget rejection cases; exact native packets, original header/configuration, sample clocks and seek history. |
| `container.read.tak / finite-clear-audio` | Real codec2/profile2 mono16/44.1 kHz canonical source; 1,015 original packets and complete original 5,589,504-sample extent. |
| `container.read.shorten / finite-clear-audio` | Canonical version2 stereo16/44.1 kHz embedded RIFF extent and original owned 1,024-byte chunks. Chunks are **untimestamped**; predictive seeking requires full restart and discarding decoded PCM. |
| `container.read.adpcm-wave / finite-clear-audio` | 26 Microsoft/IMA WAV configurations; original complete blocks, block configuration, independently declared `fact` extent, decoded versus presented duration and final discard. |
| `container.read.telephony / finite-clear-audio` | 16 G711/GSM configurations, including the GSM-MS `fact` endpoint shortened by123samples with unchanged original compressed blocks; exact codewords, finite clocks and predictive restart policy. |
| `container.read.g726 / finite-clear-audio` | Four explicitly qualified canonical0x45 WAV coded widths, complete original payload, declared `fact` extent and original predictor history. |
| `container.read.g726 / explicit-raw-audio` | Eight synthetic source-bound MSB/LSB raw width configurations. Codec/packing and coded width are caller-supplied; no sniffing. Missing/guessed configuration, unsupported width, extra fields and impossible original extents reject. |

Every new positive fixture also checks packet ownership, mutation isolation, repeat reads, early iterator return, cancellation and bounded reads. The original strict reader/native/converter tests remain intact. These conformance fixtures supplement those proofs; their finite configurations are not aliases for every mode a decoder supports.

## Explicit reference adaptations

Standalone WavPack carries complete inline block headers in every owned packet. Its reader exposes empty extradata, while FFprobe supplies a two-byte version as stream extradata. The suite verifies that this independent version equals the original inline header and every emitted packet version; it does not invent or prepend a new decoder header.

FFprobe reports a full5,512-sample duration for the final TAK packet, although the original header and decoded stream end with336samples. The suite checks original packet bytes/PTS and derives this final presentation duration from independent `duration_ts - final packet PTS`; complete native decoded sample count must also match. Candidate timestamps are never repaired.

Shorten's finite header reader does not validate the complete compressed payload. Container conformance verifies original chunk bytes, header/sample extent and cancellation, without fabricating packet timestamps. Decode/corruption qualification belongs to the separately tested native decoder and converter.

Read budgets match the implementations: 64 KiB ranges for MOV/Ogg/WAV/AIFF/TS, at most1 MiB for qualified encoded archive frames, and1,024-byte Shorten chunks. Final block padding is reported separately from original presentation samples.

## Running and preparing portable inputs

Prepare independent small fixtures and explicit descriptors for the retained real archive/block sources:

```sh
node scripts/prepare-container-conformance.mjs \
  --provider /absolute/path/to/installed/provider-container \
  --core /absolute/path/to/installed/demuxe \
  --output /absolute/path/to/fresh/prepared-directory

node scripts/test-providers.mjs \
  --config /absolute/path/to/fresh/prepared-directory/config.json \
  --output /absolute/path/to/fresh/report-directory
```

The preparation emits `fixtures.json`, `config.json` and `preparation.json`, with exact source/manifest/generator/tool identities. It performs no downloads or native provider builds. Keep media files in ignored local/CI fixture storage.

Optional `--manifests /absolute/path/to/manifests.json` supplies an absolute-path map for `ape`, `wavpack`, `tta`, `tak`, `shorten`, `adpcm-wave`, `telephony`, `g726` and `g726-raw`. Defaults use the retained `/tmp/demuxe-*-fixtures/` manifests. `telephony` defaults to `composition-browser.json` to preserve the original final-fact clipping case. Canonical-only fixtures are required; unavailable real media must fail or block explicitly rather than being replaced by synthetic scope claims.

Portable descriptors use `container` as the conformance kind, absolute `input`, `inputSHA256`, and explicit codec/rate/channel/extent metadata. G726 retains `sourceContainer` (`wave-g726` or `raw-g726`) and `rawConfiguration` with codec, coded width and optional original sample count. Expected reader failures carry `expectedRejection` and exact `expectedMessage`. Source manifest paths/hashes are retained and rechecked when supplied.

The standard worker records package, imported-artifact, harness and fixture hashes, validates each reported fixture pin and rechecks inputs during cleanup. The raw full report contains all17rows; failed, blocked or unsupported offers keep the gate incomplete. A reader result never grants an unsupported composition or playback route.

# Speech audio split qualification

The optional `speech` native profile contains FFmpeg's built-in Speex, AMR-NB and AMR-WB decoders. Decoder ABI 35–37 follows telephony 31–34 without renumbering. No external libspeex or opencore library is linked. mpv stays atomic.

## Current finite packet profiles

| Decoder | Qualified canonical envelope | Native output | Source clock |
| --- | --- | --- | --- |
| Speex | Headerless FLV metadata 16kHz mono; empty extradata; payload≤2048bytes;320/640 decoded samples per packet | Packed float32 mono | Original FLV packet PTS; two real gaps retained |
| AMR-NB | Mode0/4.75kbps speech;8kHz mono;one 13-byte frame;TOC 0x04 | Planar float32 mono; 160 samples | Original raw AMR frame timestamps |
| AMR-WB | Mode0/6.60kbps speech;16kHz mono;one 18-byte frame;TOC 0x04 | Planar float32 mono; 320 samples | Verified original 320-sample timestamps |

Configuration has coded width 0, no extradata/blockAlign/bitRate, exactly one channel and the listed rate. The native bridge and adapter validate actual rate/layout/float format/sample geometry. Nonfinite PCM, negative/invalid packet clocks and overflowed output sample clocks reject. Only the finite single-channel Speex output with explicitly admitted metadata normalizes an unspecified native channel-order enum to the unambiguous mono mask.

These are packet decoder profiles. Speex Ogg headers/modes and AMR container conversion are not implicitly admitted. Original FLV timestamp gaps must not be replaced by a concatenated sample clock in a future remuxer.

## Independent reference and functional evidence

`scripts/build-speech-reference.py` builds independent host FFmpeg n9.0.2 from the pinned archive, with only native speech decoders, required raw/FLV demuxers, AMR parser, PCM output and file/pipe input. The AMR parser is required to preserve whole 13/18-byte source frames; without it, the raw demuxer supplies 1024-byte chunks crossing frame boundaries. Fixtures decode with `-cpuflags 0`.

`tests/speech-audio-fixtures.py` pins three official originals and independent reference hashes:

- AMR-NB FATE `4.75k.amr`: SHA256 `02f83e3d2cf78d9224e57d2441e521f8063eeea5d92de67b4e574e6b3f229973`.
- AMR-WB FATE `seed-6k60.awb`: SHA256 `5cd9696ce3b0df137c5c53f02392c3a9ee2ef0a614908d12f93c33fefa21b92f`. Despite its extension, the original bytes are 3GP. The fixture derives a raw AMR-WB file by copying each independently inspected original mode0 packet and adding the raw signature. Original timestamps and compressed payload remain identical; this does not qualify a 3GP reader.
- Speex FLV `testingSpeex.flv`: SHA256 `fb4db54c578240d5d39f2a22bedf103aa0f5a0e430626a5e83027635e536e36a`.

`tests/speech-audio.mjs` passes three full streams, complete predictor reset, 12 original-stream forward/backward restart/discard seeks and 65 metadata/framing/clock/abort/native controls. Full-stream decoded samples are 45440 NB, 163840 WB and 109440 Speex. Source packet/frame PTS and sample counts are independently checked; Speex's 171 frames retain both timestamp gaps.

| Full stream | Maximum absolute float error | Scalar reference SNR |
| --- | --- | --- |
| AMR-NB |7.63×10⁻⁶ |102.53dB |
| AMR-WB |3.91×10⁻⁵ |89.32dB |
| Speex |6.14×10⁻⁵ |80.99dB |

The finite measured float gate is maximum absolute error below 7×10⁻⁵ and whole-stream SNR above 80dB. This is not integer/bit-exact decoder qualification. Quiet seek excerpts have lower relative SNR; their absolute error remains inside the full-stream bound, and each restart/discard target must additionally match the original native full-stream frame **bit for bit**. Arbitrary packet restart is tested separately and rejected as an original seek claim. Silent PCM and changed speech payload controls fail reference comparisons.

AMR SID/DTX frames reject explicitly in the adapter. An independent native call proves both built-in decoders return `AVERROR_PATCHWELCOME` (`-1163346256`) for those modes; the bridge preserves that unsupported-feature result. Other bitrates/modes, quality-loss/concealment frames and multi-frame packet layouts are outside the current profile.

## Provenance and source

Pinned archive SHA256 is `6e374ed621e48faa40639307dff48ba6fe574a509977956d2cce9669b7cc27e9`. Primary implementation references: [Speex](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/speexdec.c), [AMR-NB](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/amrnbdec.c), [AMR-WB](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/amrwbdec.c). Preserve the Speex implementation's BSD-3-Clause notice within the FFmpeg LGPL distribution closure. Native AMR implementations use LGPL-2.1-or-later.

Candidate Wasm is 342955 bytes; linked JS is 13873 bytes. These are raw measured native artifacts, before delivery packaging/compression.

Normalized record `build/codec-expansion/speech-provenance/engine-build.json` SHA256 is `63129f5b79d1ad7928884b5914d27c0e396636313967e63c105027199f64160d`. All 24 exact native/policy inputs are retained at `/tmp/demuxe-speech-source-inputs/recovered-retained.json`; later C/encoder/build-map edits do not replace them. Scalar reference binaries/configuration/source record are separately pinned under `/tmp/demuxe-speech-native-reference`.

Compact evidence: `results/media-components/codec-expansion/speech-audio.json`. Browser packet manifest: `/tmp/demuxe-speech-fixtures/packet-browser.json`. Binary fixtures remain ignored temporary assets.

## Next gates

Public package/capability integration, source companion, installed-browser packet qualification and portable CI follow this native proof. A maintained AMR raw reader and low-rate float-to-FLAC composition need separate endpoint/quantization/owner tests. Speex Ogg parsing and FLV timestamp-gap composition need separate container policies. More AMR speech modes require actual mode-specific fixtures and independent reset/seek references; SID/DTX remains explicitly unsupported.

## Optional provider and maintained qualification

The optional `audio-speech` package target contains the native `speech` profile and advertises only packet decoding: Speex `flv-wideband-float`, AMR-NB `mode0-float`, and AMR-WB `mode0-float`. It does not advertise a FLV, 3GP, or raw AMR reader, remux recipe, or player route. The default Player and atomic mpv provider are unchanged.

`tests/speech-audio-browser.mjs` executes the maintained installed-page packet gate against the actual hash-bound speech module in a Node VM. All three official streams pass the fixed speech-only absolute error below `7e-5` and whole-stream SNR above 80 dB, exact original frame clocks and timestamp gaps, bit-exact native reset, and silent and corrupted original packet controls. This is qualification of the maintained page logic; installed asset and embedded browser delivery remain a separate gate. The ordinary packet tolerance remains `2e-5`, and the WMA Voice gate remains unchanged.

The browser manifest is `/tmp/demuxe-speech-fixtures/packet-browser.json`; the fixture generator persists its enabled official rows and exact `speechFloatQualification` metadata. No composition manifest is supplied. Native speech floats are not promised to be exactly representable at FLAC's maintained 24-bit precision. A future raw AMR reader must retain the existing lossless precision rejection unless a separate intentional quantization API is introduced and qualified.

## Explicit ordinary AMR modes

The `ordinary-modes-float` offer extends AMR-NB to modes 0–7 at 8 kHz mono and AMR-WB to modes 0–8 at 16 kHz mono. `AudioDecoderConfiguration.amrModes` is a nonempty, duplicate-free integer whitelist; its values are cloned and frozen when the owner is created. Omitting this field retains mode 0 only. The offer remains packet-only.

Each packet is one complete storage frame: quality bit 1, reserved TOC bits zero, exact mode-owned payload size, and a finite nonnegative original sample PTS whose decoded end is a safe integer. SID/DTX/no-data, compound frames, erased frames and unknown mode numbers are rejected. SID reaches the native decoder only in the dedicated negative control to retain its explicit unsupported-feature error.

`tests/amr-mode-fixtures.py` pins all 17 official fixed-mode source hashes and independently decodes them with the retained scalar FFmpeg 9.0.2 reference. FATE WB files are actually 3GP; extraction preserves complete original packet bytes. Two mode-switch streams cycle exact packets at corresponding original temporal indices. They are intentional derived test streams, not claimed original container timelines.

`tests/amr-mode-audio.mjs` qualified 19 whole streams, 76 fresh original-stream restart/discard seeks and 462 controls. Full-stream PCM SNR is at least 85.99 dB; the largest scalar float difference is 9.3222e-5 in AMR-NB mode 1. This explicit offer uses a fixed maximum absolute error below 1e-4 and whole-stream SNR above 80 dB, with mandatory actual silent-output and all-original-block-byte corruption controls. The existing mode 0/Speex 7e-5 gate and ordinary AAC/PCM 2e-5 gate remain unchanged.

`tests/amr-mode-browser.mjs` runs the maintained packet page in a Node VM against all 19 actual native sources, binds the module/adapter/page/packet/reference hashes and validates portable export. Installed browser delivery qualification is separate. Strict FLAC precision guards remain unchanged; floating speech does not automatically qualify exact integer conversion.

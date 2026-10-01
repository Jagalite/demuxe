<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Legacy MPEG and WMA packet split

The `legacy` native profile enables only MPEG Layer I/II float decoders and WMA
v1/v2 decoders from the pinned LGPL FFmpeg source. It is a packet decoder group;
a container provider and qualified recipe still own source admission.

The local native campaign passed **13 cases** and **52 reset/preroll seek
intervals**. See
[`legacy-audio.json`](../results/media-components/codec-expansion/legacy-audio.json)
for exact inputs, source/build hashes, fixture origins, reference hashes and
individual results. Wasm is 439,866 bytes before packaging.

| Codec | Actual evidence |
| --- | --- |
| MP1 | Official FFmpeg sample, 32 kHz stereo, 0.576 seconds |
| MP2 | 44.1/48 kHz mono/stereo, 6.137-second synthetic MKV fixtures |
| WMA v1 | 44.1/48 kHz mono/stereo, 6.137-second synthetic ASF fixtures |
| WMA v2 | 44.1/48 kHz mono/stereo, 6.137-second synthetic ASF fixtures |

MPEG references explicitly select `mp1float`/`mp2float`; the host's default fixed
point decoders introduce integer quantization differences. MPEG2 MKV's declared
481-sample priming skip is applied externally. Reference comparisons do not
search for waveform alignment.

WMA requires framing metadata from its actual WAVEFORMATEX header. The new
`mc_create_config_v2` ABI accepts block alignment and bit rate. Existing numeric
codec IDs and `mc_create_config` remain compatible. WMA v1 is restricted to its
four-byte extradata form, and WMA v2 to its ten-byte form; rates are 44.1/48 kHz
and channel counts are one/two. Each decode call requires exactly one complete
block. Grouped or truncated blocks are rejected rather than silently truncated.
These bounds do not qualify WMA Pro, WMA Lossless, or WMA Voice.

WMA's final delayed frame has no packet PTS in both the pinned decoder and the
independent host decoder. The bridge continues the prior validated frame's sample
clock, rejects recovery without prior timing or with integer overflow, and clears
that timing on reset. Tests compare every known host frame PTS, final drain timing,
full decode after reset, malformed metadata, block framing and abort cleanup.

At 48 kHz, WMA v1 synthesizes noise using state that advances through the stream.
Seeking resets that state: samples can differ from uninterrupted playback even
when decoder recovery is correct. The campaign rebuilds a scratch WAVE stream
from the exact ASF format header and selected compressed blocks, then decodes it
with independent scalar FFmpeg. All reset sequences match within 3.73e-8; the
observed difference from uninterrupted decode has at least 60.47 dB SNR. This
exception is recorded separately from exact reconstruction results.

## Reproduce

```sh
LEGACY_FETCH_CANONICAL=1 python3 tests/legacy-audio-fixtures.py
node tests/legacy-audio.mjs
```

The generator pins the [official MP1 sample](https://samples.ffmpeg.org/A-codecs/mp1-sample.mp1)
by SHA-256. Media and reference PCM remain in `/tmp/demuxe-legacy-audio-fixtures`;
set `LEGACY_AUDIO_FIXTURE_ROOT` for another scratch directory. The generator also
creates twelve no-reorder MKVs with MP2/WMA audio for independent container
qualification, retaining original WMA framing metadata in `compositions.json`.

The runner verifies `/tmp/demuxe-legacy-audio-builds/legacy.json` and its native
record/Wasm hashes, and uses the compiled packet adapter in
`build/component-candidates/`. Set `LEGACY_BUILD_POINTER` for another verified
build. Native/source provenance and package/browser qualification are separate
records; this packet campaign alone does not establish shipping readiness.

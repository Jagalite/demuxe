<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Bounded TTA1 audio split

The optional `archive-more` native profile initially contains FFmpeg's TTA
(True Audio) decoder. Decoder ABI 23 preserves all existing codec IDs. TTA's
pinned decoder sources carry LGPL 2.1 or later headers; no external codec library
is required.

## Supported component contract

| Property | Qualified bounds |
| --- | --- |
| Header | Exactly 22 bytes, `TTA1`, unencrypted format 1, valid IEEE CRC32 |
| Source rate | 44.1 or 48 kHz |
| PCM | Integer 16 or 24 bits; original samples stay in integer storage |
| Channels | Mono, stereo, or six channels; masks 4, 3, or 63 |
| Native frames | At most 65,536 samples |
| Encoded packets | At most one MiB, with strict native packet CRC checks |
| Standalone source | Header and CRC-protected frame-size seek table, bounded ID3v1/APEv2 tags |

The decoder verifies that requested rate, precision and channel count match the
header before allocation. Mono TTA omits a channel mask in FFmpeg's decoded frame.
The bridge assigns mask 4 only when the validated TTA header and decoded frame
both declare exactly one channel. It performs no surround channel remapping.

TTA frame length is `floor(sampleRate * 256 / 245)`: 46,080 samples at 44.1 kHz,
50,155 at 48 kHz, and 100,310 at 96 kHz. Therefore 96 kHz remains excluded by the
existing frame budget. Eight-channel TTA uses FFmpeg's 7.1 wide layout and remains
excluded. FFmpeg's TTA encoder converts requested 32-bit PCM to 24 bits, so it
cannot supply a genuine 32-bit TTA positive fixture. Encrypted, eight-bit and
32-bit TTA header configurations reject.

## Native qualification

[Packet evidence](../results/media-components/codec-expansion/tta-audio.json) and
[standalone reader evidence](../results/media-components/codec-expansion/tta-audio-standalone.json)
each passed all 17 cases:

- Thirteen positive cases: the real 60.48-second stereo sample and generated
  16/24-bit mono/stereo/six-channel sources at 44.1 and 48 kHz.
- Two real 96 kHz/eight-channel sources rejected by the declared contract.
- Two six-channel 24-bit sources with abrupt quiet transitions rejected because
  their compressed packets exceed one MiB. Those exact files remain explicit
  negative controls; smooth six-channel sources passed.

All original PCM, sample counts, frame PTS, frame sizes and channel masks matched
independently decoded scalar FFmpeg references. The packet campaign passed 52
fresh forward/backward reset/preroll intervals; the standalone reader passed 26.
Header mismatch/encryption/precision/CRC controls exercise both JS and native
construction guards. Corrupted packet checksums must fail native decoding.
Standalone malformed header, seek-table CRC, packet length, tag, seek range and
abort controls also passed.

The [official FFmpeg sample](https://samples.ffmpeg.org/A-codecs/lossless/luckynight.tta)
has SHA-256 `8bc3603af61b7a059e064aaca0b93bb5ef43e5a61f249f886bf9cbea3b73a953`.
Its complete integer PCM hash is
`8e96d4eba1b732365ccf582d7bd94593c5c554c4d4a9f87ea773b78604a5aca8`,
identical to the independently decoded paired APE/WavPack samples.

## Standalone reader and container work

`TtaReader.open(blob, signal)` exposes one audio track, `sampleCount` and
`packets(startSample, prerollSamples)`. Packets contain owned native bytes,
`startSample` and `durationSamples`; timestamps come from the indexed frame count.
All frame sizes are checked before conversion starts. The header and seek-table
checksums are validated during open; packet checksums are enforced by the native
decoder. A full original sample count is available without estimating duration.

Matroska's maintained `A_TTA1` mapping reconstructs decoder header sample count
from container duration. Video can extend that duration beyond the final TTA
sample, so it requires separate non-aligned-tail qualification. This campaign
adds no TTA Matroska recipe or installed browser playback claim.

## Reproduce

```sh
TTA_FETCH_CANONICAL=1 python3 tests/tta-audio-fixtures.py
npm run build:components
node tests/tta-audio.mjs
node tests/tta-audio-standalone.mjs
```

The verified native pointer defaults to
`/tmp/demuxe-archive-more-builds/archive-more.json`. `TTA_AUDIO_FIXTURE_ROOT`,
`TTA_BUILD_POINTER` and `TTA_READER_MODULE` select alternative verified locations.
Native build records bind module JS and Wasm hashes separately. Binary fixtures
and compiled artifacts remain in scratch/ignored output directories.

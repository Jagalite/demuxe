<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# APE and integer WavPack packet split

The `archive` native profile enables APE and WavPack decoders from the pinned
LGPL FFmpeg source. The supported component contract is modern APE and integer,
lossless WavPack. A container/provider recipe must separately establish source
admission; codec availability alone does not grant playback qualification.

The fixture campaign includes paired **60.48-second real APE/WavPack files**
from the [official FFmpeg lossless sample archive](https://samples.ffmpeg.org/A-codecs/lossless/),
thirty generated integer WavPack files, and a float WavPack rejection control.
The paired files independently decode to the same complete original PCM hash:
`8e96d4eba1b732365ccf582d7bd94593c5c554c4d4a9f87ea773b78604a5aca8`.
Binary samples remain in scratch storage, with pinned origin/hash metadata in the
[compact packet evidence](../results/media-components/codec-expansion/archive-audio.json).

| Contract | Bounds |
| --- | --- |
| APE | Version 3930–3990 headers, 16/24-bit mono/stereo, configured 44.1/48/96 kHz |
| WavPack | Integer 16/24/32-bit, 44.1/48/96 kHz, 1/2/6/8 channels; complete version 4.03/4.10 block headers |
| Input packets | At most 1 MiB; complete frames/blocks |
| APE decoded chunks | At most 32,768 samples per native frame, at most 294,912 declared samples per packet |
| WavPack blocks | At most 65,536 samples; matching index/sample count across concatenated channel blocks |

APE continuation subframes omit PTS even though the first subframe has its
packet's established PTS. The bridge continues the validated sample clock for
these chunks, checks overflow, and clears timing on reset. It rejects missing
initial timing. The canonical file produces frames of at most 32,768 samples and
packets of at most 194,208 bytes; all 2,667,168 source samples are retained exactly.
Older APE versions can force a whole-packet decode, and eight-bit APE uses a sample
format outside the integer adapter contract; those variants remain excluded.

WavPack header checks happen before native decode. Hybrid/correction, float and
DSD flags are rejected; malformed lengths, block boundaries and ambiguous packet
structure are rejected too. Native codec compilation includes FFmpeg's decoder,
while the component wrapper supplies the narrower qualified contract. An integer
lossless claim applies only after these header checks and independent PCM tests.
All 33 packet cases passed: 32 complete integer PCM comparisons and one real float rejection. The 32 integer cases also passed 128 fresh forward/backward seek intervals, full reset, malformed metadata/framing and abort controls. Thirty generated fixtures cover integer bit depths and supported rates/layouts;
float WavPack must fail with `PROVIDER_PROFILE_MISMATCH`.

Reset-and-seek checks compare fresh sample intersections within the target time
window, rather than requiring a native frame to start inside it. This matters for
mono WavPack frames that span a whole second. Comparisons use exact timestamps
and original integer samples, with no waveform alignment search. Canonical
forward/backward targets include 48.25, 16.75, 58.5 and 4.75 seconds.

## Reproduce

```sh
ARCHIVE_FETCH_CANONICAL=1 python3 tests/archive-audio-fixtures.py
node tests/archive-audio.mjs
```

Set `ARCHIVE_AUDIO_FIXTURE_ROOT` for another scratch fixture directory and
`ARCHIVE_BUILD_POINTER` for a verified archive native build. The default pointer
is `/tmp/demuxe-archive-audio-builds/archive.json`; the packet adapter is compiled
under `build/component-candidates/`. The generator preserves external media as
immutable, verifies exact pinned SHA-256 values, and creates independent scalar
FFmpeg PCM references. No media or Wasm binary belongs in the source commit.

Packet/source evidence is separate from current browser, container, and release
qualification. APE's canonical evidence is 44.1 kHz stereo 16-bit; other allowed
native configurations are not demonstrated by that single real sample.

## Maintained Matroska mapping

The pinned FFmpeg `libavformat/matroskadec.c:matroska_parse_wavpack` implements
`A_WAVPACK4`. Its two-byte little-endian CodecPrivate stores the WavPack version.
Each Matroska payload starts with a shared little-endian sample count, then block
flags and CRC. Multichannel blocks additionally carry a little-endian payload
size. The reader reconstructs the standard 32-byte `wvpk` headers with the same
zero total-sample and block-index fields as FFmpeg. Complete reconstructed packets
are compared byte for byte with independently demuxed host FFmpeg packets.

The mapping permits at most eight channel blocks, 65,536 samples and one MiB per
reconstructed packet. Unsupported version, length, channel-block order, hybrid,
float and DSD headers reject before decode. Laced Matroska blocks remain excluded.
APE has no maintained Matroska codec mapping and remains packet-only.

Composition fixtures cover integer 16/24-bit WavPack at 44.1 kHz mono/stereo and
48/96 kHz mono/stereo/6/8 channels, plus the real 60.48-second stereo sample.
All 32 mapping cases passed (31 host-demuxed packet comparisons plus one float-header rejection), with five malformed framing controls. All 32 composition cases passed: 21 byte-exact integer conversions, ten required 32-bit precision rejections and one float-mode rejection. Source sample count, rate, channels and copied video were preserved in every successful conversion. 32-bit integer and float source conversion to FLAC24 must reject. This does not
qualify 44.1 kHz surround or any untested rate, mode or channel order.

```sh
python3 tests/archive-audio-composition-fixtures.py
node tests/archive-audio-matroska.mjs
node tests/archive-audio-compositions.mjs
```

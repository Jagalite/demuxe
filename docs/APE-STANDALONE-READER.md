<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Modern standalone APE reader

`packages/provider-container/src/ape.ts` provides a bounded local `ApeReader`.
It returns native decoder packets with exact sample positions from the seek table.
The implementation follows the pinned FFmpeg `libavformat/ape.c` packet mapping:

- A 52-byte modern descriptor and 24-byte stream header establish the audio extent,
  frame count, compression mode and PCM parameters.
- Seek positions are aligned to four bytes relative to the first frame. Each native
  packet starts with little-endian sample count and alignment skip, then the aligned
  frame bytes. The final read follows FFmpeg's naturally shortened EOF behavior.
- APEv2 metadata after the declared audio extent is parsed within a 64 KiB,
  256-item budget. The real pinned file has a legacy `0x40000000` footer flag,
  which FFmpeg accepts. Its final decoder packet includes those metadata bytes.
- Forward/backward seeking starts from the independently indexed packet at or
  before the requested sample position minus explicit preroll. Packet timestamps
  come directly from frame sample counts.

The structural contract accepts versions 3980–3990, compression modes
1000/2000/3000/4000/5000, format flags zero, 16/24-bit mono/stereo and
44.1/48/96 kHz. It limits frames to 294,912 samples and packets to one MiB.
Old descriptors, eight-bit PCM, surround, unknown extensions, stored WAV tails,
leading/trailing junk and high audio-length fields reject with
`PROVIDER_PROFILE_MISMATCH`.

## Qualification

Actual positive evidence is the pinned **3990, 16-bit stereo, 44.1 kHz,
60.48-second** official FFmpeg `luckynight.ape` sample. This does not establish
positive coverage for every structurally allowed rate, precision or compression
mode. The canonical file passed:

- All 37 packets compared byte for byte with independently demuxed FFmpeg packets.
- All 2,667,168 original PCM samples compared byte for byte with scalar FFmpeg.
- Four fresh forward/backward reset/preroll seek intervals, with exact sample
  clocks and PCM comparisons, without waveform alignment.
- Twenty-one malformed descriptor/header/seek/tag controls, four invalid seek
  controls and abort checks before open and after indexing.

Opening its 6,510,317-byte source reads only 489 bytes of metadata/index data.
Native APE continuation chunks retain the established packet sample clock; the
bridge clears that timing on reset. Packet/frame limits stay unchanged.

[Compact native evidence](../results/media-components/codec-expansion/archive-ape-standalone.json)
records fixture hashes, original module/Wasm hashes, preferred native build
inputs and the exact compiled reader hash. Public provider routing, conversion
and installed browser coverage require their own qualification.

## Reproduce

```sh
ARCHIVE_FETCH_CANONICAL=1 python3 tests/archive-audio-fixtures.py
npm run build:components
node tests/archive-ape-standalone.mjs
```

`ARCHIVE_AUDIO_FIXTURE_ROOT`, `ARCHIVE_BUILD_POINTER` and `APE_READER_MODULE`
can select another verified scratch fixture/native/compiled-reader location.
Binary samples and native build outputs stay outside source commits.

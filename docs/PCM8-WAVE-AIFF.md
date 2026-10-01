# PCM8 WAV and AIFF

The finite PCM extension uses existing `audio-pcm` with two appended native ABI
kinds: 38 (`pcm-u8`) and 39 (`pcm-s8`). The distinct `integer-8bit` capability
requires a rebuilt module; older PCM modules cannot satisfy it.

WAV PCM format 1 at eight bits is unsigned. Uncompressed AIFF at eight bits is
signed. The bounded reader preserves these source bytes and exposes the exact
decoder codec, `sampleEncoding`, and `sourceByteOrder: 'byte'`. Existing
16/24/32-bit and floating-point source behavior remains unchanged. Only 44.1,
48, and 96 kHz with one or two channels enter the PCM8 envelope.

Pinned FFmpeg produces packed `AV_SAMPLE_FMT_U8` for both codecs. Its signed
decoder biases source bytes into unsigned samples first. The adapter converts
the actual decoded bytes into owned, left-justified S32 integer PCM using
`(value - 128) * 2^24`. No float conversion or quantization is involved. Format
U8 is accepted only for these PCM8 codec kinds, and their other formats reject.

```sh
node scripts/prepare-pcm8-fixtures.mjs /tmp/demuxe-pcm8-fixtures
python3 scripts/build-audio-providers.py \
  --sdk /path/to/pinned/emsdk \
  --archive build/downloads/ffmpeg-adaptation.tar.gz \
  --profile pcm --out /tmp/demuxe-pcm8-builds
PCM8_FIXTURES=/tmp/demuxe-pcm8-fixtures \
PCM8_BUILD_POINTER=/tmp/demuxe-pcm8-builds/pcm.json \
  node --no-maglev --test tests/provider-pcm8.mjs
```

The twelve fixtures exercise all 256 byte codes for both signedness choices at
each rate/channel combination, with more than one reader packet. Expected S32
bytes are computed directly from the source code values and independently
verified by host FFmpeg. Native tests compare exact integer PCM, resets, nine
seek offsets including EOF, owned memory, complete FLAC conversion, output
sample counts, metadata precision, malformed headers and layouts, default
configuration rejection, native-format controls, iterator return and abort.

PCM8 packets are bounded to 65,536 bytes, must contain complete sample frames,
and require a nonnegative safe sample clock. Low-rate PCM8, AIFC, RIFX,
multichannel PCM8, other integer widths, and ambiguous source formats remain
outside this extension. Native proof, source companions/package audits,
capability registration and installed browser evidence are separate gates.

Public selection uses `audioRepairRecipe('pcm-u8', channels, 'flac',
'wave-aiff', rate)` or the signed `pcm-s8` equivalent. These recipes require
`audio.decode.pcm/integer-8bit`; the older `configured-pcm` offer cannot satisfy
them. The owner rejects other containers, channel counts, rates and Opus output.

`tests/provider-pcm8-owner.mjs` runs every fixture through the maintained owner
path, independently checks exact FLAC-decoded S32, and exercises busy, partial
iteration, abort, factory failure, recovery and disposal. Preparation emits
`fixtures.json` for compositions and `packet-fixtures.json` for packets with
pinned source/reference bytes and explicit signedness/framing metadata.

The new module passed all 14 native PCM8 tests, all 51 existing WAV/AIFF tests,
and all 14 public recipe/owner tests. Installed Chromium/Firefox evidence and
package/source qualification must bind the rebuilt module independently.

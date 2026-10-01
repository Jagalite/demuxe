# Finite G.726 experiment

This candidate appends native ABI 41 (`adpcm-g726`) and 42
(`adpcm-g726le`) in a separate `g726` module. It admits 8 kHz mono with
2/3/4/5 coded bits per sample (16/24/32/40 kbit/s), no codec extra data or
block alignment override, and an exact matching configured bitrate. Default
constructors and all other rates/channel layouts reject. The optional public recipes and owned conversion have native proofs. Installed
assets/embedded browser qualification and release packaging remain separate gates.

## Packing and state

Pinned FFmpeg n9.0.2 `libavcodec/g726.c` implements big-endian code packing for
`g726` and least-significant-first code packing for `g726le`, with packed S16
output. The owned wrapper preserves the decoded integers as left-justified S32.
Each admitted packet has `bytes * 8 % codedBits == 0` and at most 65,536 decoded
samples. Thus 3/5-bit packets require byte lengths divisible by 3/5. The raw
FFmpeg demuxer uses 1,020-byte packets, which meet all four geometries.

Decoder prediction persists across packets. Seeking means restarting at stream
origin and discarding decoded samples up to the requested source sample. Opening
a fresh decoder at a later packet changes decoded audio; packet boundaries are
not independent seek points. Sample timestamps come from the explicit source
sample clock. Negative, fractional and unsafe end clocks reject.

## Containers

Canonical WAV tag `0x0045` maps to **big-endian** G.726 in pinned
`libavformat/riff.c`. `riffdec.c` derives coded width from average bitrate divided
by sample rate. Generated 2/3/4/5-bit WAV files have matching format fields,
complete bit groups and independently declared `fact` counts. Host decoding
matches raw explicit-big-endian decoding exactly. The source also lists older
tags `0x0014`, `0x0040` and `0x0064`; they remain outside the candidate.

There is no G.726LE WAV mapping in this source. Little-endian raw files require
explicit codec/packing metadata. A filename or generic WAV ADPCM tag is
insufficient. MOV, RTP, ASF, AIFF and automatic bit-order detection remain
outside the initial envelope.

## Reproduction

```sh
python3 scripts/build-g726-reference.py --out /tmp/demuxe-g726-reference-01
python3 scripts/prepare-g726-fixtures.py \
  --reference /tmp/demuxe-g726-reference-01 --out /tmp/demuxe-g726-fixtures
python3 scripts/build-audio-providers.py \
  --sdk /path/to/pinned/emsdk --archive build/downloads/ffmpeg-adaptation.tar.gz \
  --profile g726 --out /tmp/demuxe-g726-builds
node --no-maglev --test tests/g726-audio-native.mjs
```

The scalar host build extracts a fresh SHA256-pinned n9.0.2 archive, disables
assembly and external dependencies, and hashes every extracted source file before
and after compilation. Its binaries/configuration/build record are retained.
The twelve synthetic fixtures cover all eight raw width/packing combinations
and four canonical WAV files. Preparation checks exact encoded code-value
identity between packing variants, full decoded S32/F32 identity, complete
packet/sample geometry, original WAV `fact` duration, and controls showing wrong
packing and missing predictor warmup alter decoded audio. Raw, media, packet JSON
and reference bytes have pinned SHA256 in the fixture manifest.

The [FFmpeg sample archive](https://samples.ffmpeg.org/A-codecs/g726/) contains
`axis.726`, 202,800 bytes, SHA256
`dae47006802b46cd8f3975a005d8039c99623d937ef3c0e986ee1fb50081ac97`.
Its [description](https://samples.ffmpeg.org/A-codecs/g726/axis.txt) identifies a
32 kbit/s mono radio recording but does not declare code packing. Pinned FATE
`tests/fate/voice.mak` tests synthetic encodes and supplies no `axis.726` packing
contract. A 12,000-byte prefix is retained for explicit-big-endian differential
screening with `originPackingQualified: false`. Successful decoding or audible
PCM does not qualify the original source's bit order. It does not establish
an independent recording reference or redistribution permission.

Implementation license: FFmpeg G.726 codec and raw demuxer source are
LGPL-2.1-or-later. Existing pinned adaptation patches, SDK inputs and native build
attribution remain necessary distribution gates. No mpv split or default Player
routing change is part of this experiment.

## Optional public conversion

The `audio-g726` provider offers both finite integer decoder capabilities. WAV
uses the maintained audio recipe; raw input requires explicit codec and coded
width. Both select the distinct `low-rate-s24` FLAC encoder offer.

```ts
const wave = audioRepairRecipe('adpcm-g726', 1, 'flac', 'wave-g726', 8000);
const raw = g726RawRepairRecipe('adpcm-g726le', 3);
// Acquire the selected recipe before executing its owned components.
const mp4 = await owners.executeRawG726(file, 'adpcm-g726le', 3, signal, sampleCount);
```

`sampleCount` is an optional independently declared presentation extent. It may
clip only inside the final complete packing group. WAV requires its own `fact`
count. Generic raw audio execution, inferred packing, other rates/layouts and
Opus output reject. `G726Reader` always restarts predictive decoding from origin
for a non-EOF seek. Input/convenience output budgets are 64/96 MiB; fragmented
conversion retains one current encoder block and a bounded output queue.

Proofs: `tests/g726-audio-native.mjs` (15 tests, 91 restart/discard seeks),
`tests/g726-audio-conversion.mjs` (16 tests, 12 qualified sources, 48 reader
seeks, independent final-group trims), and `tests/g726-audio-owner.mjs`
(14 tests including factory failures, iterator return, abort and busy ownership).
`tests/g726-audio-page.mjs` exercises 12 actual native fixtures through the
maintained packet page in a Node VM and rejects integer-reference corruption
and unqualified packing. This is not browser delivery or playback evidence.

Preparation emits `packet-fixtures.json` (12 qualified packet cases) and
`browser-fixtures.json` (12 FLAC compositions). The official Axis screening
case is absent from both. Portable export binds source/reference hashes and
explicit codec, width, bitrate, packing and predictor-reset contracts. Host
validation applies raw demuxer options to source input only; generated fMP4
remains independently auto-probed. Browser source extensions include `.g726`
and `.g726le`; no generic WAV-to-little-endian mapping is introduced.

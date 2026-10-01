<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Finite MOV/MP4 provider

`IsoBmffReader` reads local, self-contained, unfragmented MOV/MP4 files using
bounded Blob slices. Its normalized tracks and packets feed the maintained
packet audio repair composition through the explicit `container: 'isobmff'`
option or `repairIsoBmffAudio` wrapper. This does not enable automatic Player
routing or imply coverage of all ISO BMFF media.

The tested envelope is one constant-frame AVC video track and one audio track:

| Input | Tested rates | Tested channels |
| --- | --- | --- |
| ALAC | 44.1, 48 kHz | mono, stereo |
| AAC LC | 44.1, 48 kHz | mono, stereo |
| FLAC | 44.1, 48, 96 kHz | mono, stereo, 5.1, 7.1 |
| QuickTime version 1 float PCM | 44.1, 48 kHz | mono, stereo |

The reader validates chunk/sample tables, media byte ranges, sync samples,
constant video timing, codec configuration, and data references. Track-local
AAC recovery groups and a single integral AAC priming edit are supported;
final padding is trimmed to the explicit edit presentation duration. Other
sample groups, complex or fractional edits, composition offsets, encryption,
external data, transforms, nonsquare pixels, fragmented files, QuickTime
version 2 audio, and Opus MOV reject this provider profile.

All reads are at most 64 KiB. Metadata is limited to 8 MiB, each table to 250,000
rows, non-PCM tracks to 250,000 samples, PCM to 10 million samples, and duration
to 24 hours. The small-file repair convenience wrapper retains its 64 MiB input
and 96 MiB output limits. The fragment iterator supports demand-driven output.

FLAC24 output rejects integer or float precision that cannot be represented
exactly. The original float64 samples are checked before any float32 narrowing.
Opus output is an explicit lossy choice, currently stereo at 48 kHz.

## Reproduce native correctness tests

These commands require the existing decoder/encoder native build pointers and
FFmpeg fixtures from the codec expansion work. Generated media stays in `build/`.

```sh
python3 tests/decoder-family-fixtures.py
python3 tests/isobmff-fixtures.py
./node_modules/.bin/tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir build/isobmff-reader packages/provider-container/src/isobmff.ts
node tests/isobmff-reader.mjs
npm run build:components
node tests/isobmff-compositions.mjs
```

The native run passed 35 reader checks and 23 composition checks, including two
required FLAC24 precision rejections. Reader packets are compared independently
with FFprobe byte hashes, timestamps, sample duration and key flags. Composition
checks compare decoded video hashes, original integer or float64 PCM where
applicable, lossy signal quality, and exact presentation sample counts.

[Compact evidence](../results/media-components/codec-expansion/isobmff.json)
binds source, native builds, fixture hashes, and results. Installed browser and
release qualification are recorded separately; native correctness is not release
qualification.

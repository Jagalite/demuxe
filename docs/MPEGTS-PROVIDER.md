<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Finite MPEG-TS packet reader

`MpegTsReader.open(localBlob, signal)` exposes selected transport tracks and an
owned packet iterator. Every packet includes explicit `pts`, `dts`, a 90,000 Hz
`timescale`, and `packetFormat` (`annexb` video or `adts` audio). AVC duration is
left unspecified. AAC duration is derived from the ADTS frame's 1,024 samples,
which equals 1,920 ticks at the admitted 48 kHz rate.

This reader preserves source clocks, including reordered AVC PTS/DTS. It does
not construct replacement timestamps, remux packets, seek, or enable an automatic
Player route. Those operations require separate qualification. It deliberately
does not use the Matroska packet type, which has no separate DTS field.

The native tested envelope is complete 188-byte transport packets containing
one CRC-valid, stable PAT/PMT program with exactly one AVC video and one AAC-LC
mono or stereo audio stream. Video uses one AUD-delimited picture per PES; audio
uses ADTS at 48 kHz. The AAC track reports an independently parsed AudioSpecificConfig.

Transport errors, scrambling, continuity gaps or duplicates, discontinuity flags,
unsupported adaptation extensions, program/table changes, external PCR tracks,
unknown stream codecs/descriptors, incomplete PSI/PES, and a 33-bit clock rollover
reject this provider profile. Metadata search is limited to 4 MiB plus one read
block, each PES to 4 MiB, and the source to 10 million transport packets. Reads
are at most 64 KiB. Unbounded video PES headers are inspected once, so appending
transport chunks does not repeatedly copy the accumulated PES.

## Reproduce packet qualification

```sh
python3 tests/decoder-family-fixtures.py
python3 tests/mpegts-fixtures.py
./node_modules/.bin/tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir build/mpegts-reader packages/provider-container/src/mpegts.ts
node tests/mpegts-reader.mjs
```

The run passed 27 checks: three real stereo/mono/reordered AVC inputs with exact
FFprobe packet byte hashes, PTS/DTS and key flags; 20 malformed transport/table/PES
or clock controls; two abort controls; and two metadata/PES budget controls.

[Compact evidence](../results/media-components/codec-expansion/mpegts.json) binds
the maintained source, fixtures, native reference version and exact results.
Browser, mux, seek and release qualification remain separate.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Bounded Ogg audio packet reader

`packages/provider-container/src/ogg.ts` is an independent original TypeScript
reader for one Ogg logical audio stream. It is not a public playback route or a
qualified replacement for broad FFmpeg demuxing.

`OggAudioReader.open(blob, signal)` scans and validates pages before returning one
track with codec configuration, `sampleCount`, `granuleEndSamples`, `preSkip`,
`packetCount`, and cumulative `bytesRead`. `packets()` reconstructs owned codec
packets and exposes the page-ending granule on the final completed packet of that
page. Each packet includes `pageSequence` and `endOfStream`.

The finite inputs are:

- Opus mapping family 0, mono/stereo, 48 kHz decode clock, version 1, zero header
  output gain, pre-skip at most 3840 samples.
- Vorbis version 0, mono/stereo, 44.1/48 kHz, three ordered identification/comment/
  setup packets and at most 64 KiB of codec extradata. Current native reference
  fixtures qualify stereo; mono fixture generation is blocked by the installed
  host experimental encoder and does not establish decoder rejection.
- Ogg-FLAC mapping 1.0, mono/stereo, 44.1/48/96 kHz, signed 16/24/32-bit input,
  known header count, a comment block followed only by padding metadata blocks.

The reader checks page capture/version, CRC, one serial, page sequence, BOS/EOS,
continuation/lacing, packet completion, header order and granule bounds. It rejects
chaining, multiplexing, holes, missing EOS, empty packets/pages, unsupported
headers and arbitrary initial offsets. All page reads are at most 64 KiB, packet
assembly at most 1 MiB, metadata comments at most 4096 entries, pages at most
100,000, and packets at most 1,000,000. Abort is checked during reads and between
packets that were assembled from the same page. Text comments are retained in
Vorbis codec headers but not copied into a new output container.

## Sample timing and trimming

Opus packet duration comes from its TOC and frame count. Its `startSample` is the
coded sample position minus pre-skip; decoded audible output starts at sample 0.
The native decoder applies pre-skip exactly once. Presentation ends at final
Ogg granule minus pre-skip, so a consumer removes only the declared decoded tail.

FLAC packet duration comes from the frame block size. Its coded sample clock must
agree with nonterminal page granules and bound EOS; a known STREAMINFO total must
agree with the terminal granule. Codec payload validity and actual decoded
rate/channel/precision remain the native decoder's responsibility.

Vorbis granules identify PCM extent, while packets can use different overlapping
window sizes. The reader exposes its granules without inventing per-packet
`startSample` or `durationSamples`. A sequential decoder supplies the actual sample
clock and checks page/end bounds. Native tests derive the clock from actual
emitted sample counts, verify frame continuity, and trim exclusively at the final
granule. There is no signal alignment search, resampling, or guessed packet clock.
The installed host experimental Vorbis Ogg mux emits padding beyond its terminal
granule in scalar decoding; the independent reference is clipped at that declared
extent, with the untrimmed count retained in evidence.

There is no Ogg random-seek claim. Indexed seeking, codec preroll, arbitrary
initial granule offsets, chained streams, and larger channel layouts require
separate implementation and qualification.

## Native evidence

```sh
DECODER_BUILD_ROOT=build/codec-expansion/decoder-families \
  node --test tests/provider-ogg.mjs
```

The test compiles only the reader and packet adapter into a fresh temporary
directory, generates real Ogg files with host FFmpeg, compares packet bytes to
independent ffprobe output, and runs actual pinned Opus/Vorbis and FLAC Wasm
modules. Opus/FLAC extradata matches host demux bytes. The host Ogg Vorbis demuxer
removes user comments from extradata; original identification and setup headers
match exactly, while the reader retains the original comments and the native
decoder consumes them.

The matrix contains 22 positive native cases: two Opus, two Vorbis stereo and
18 FLAC combinations. FLAC output is integer exact; lossy decoding is checked
against independent scalar host decoding. Two Vorbis mono fixture cases retain
an explicit encoder-blocked status. Structural controls cover corrupt CRC,
headers/mapping/gain, sequence, serial, continuation, bad lacing, chaining,
truncation, missing EOS/setup and impossible granules. A 70,016-byte Opus comment
packet spans pages and proves continued-packet assembly.

Complete fixtures and reports stay in the printed temporary directory. Compact
source/build/reference hashes belong with campaign evidence; media and packet
JSON are not committed. Installed-package/browser conversion and playback remain
separate gates.

Format references: [Ogg framing RFC 3533](https://www.rfc-editor.org/rfc/rfc3533),
[Opus mapping RFC 7845](https://www.rfc-editor.org/rfc/rfc7845),
[Vorbis specification](https://xiph.org/vorbis/doc/Vorbis_I_spec.html), and
[Xiph Ogg-FLAC mapping](https://xiph.org/flac/ogg_mapping.html).

## Bounded audio-only conversion

`repairOggAudioFragments(blob, components, signal)` uses actual decoded frame
counts as the clock, clips at the validated terminal granule, and writes FLAC or
explicit lossy stereo 48 kHz Opus fragments. The FLAC encoder preserves admitted
44.1/48/96 kHz rates. FLAC integer PCM retains its original precision before the
FLAC24 admission check; nonzero low eight bits reject. Original float64 planes,
when present, are checked before quantization. Decoder and encoder owners are
released on completion, abort, error and iterator return. The fragment queue is
limited to 16 MiB; only the current PCM block is retained. `repairOggAudio` adds
64 MiB input and 96 MiB output limits.

```sh
node --no-maglev --test tests/provider-ogg-repair.mjs
node scripts/prepare-ogg-browser-fixtures.mjs
```

The conversion matrix uses all 22 exact reader fixtures: 16 successful FLAC
outputs, six intentional FLAC32 precision rejections, and five explicit stereo
48 kHz Opus outputs. Two further tests cover lifecycle, admission, original double
precision and discontinuous decoded clocks. Integer FLAC output is exact against
independent scalar host decoding through the final sample; lossy outputs have
finite quality thresholds and retained measurements. Opus presentation extent
uses the packet endpoint after output pre-skip, while host decoded packet padding
is retained separately. FFprobe stream duration includes initial padding; its
`start_pts + duration_ts` equals the Ogg presentation sample count.

The recorded Node 23.5.0 host campaign used `--no-maglev` after the initial
process hung in the background Maglev compiler and garbage collection barrier.
This is a test host limitation, not browser qualification. Compact evidence is
`results/media-components/codec-expansion/ogg-repair.json`; installed-package
Chromium/Firefox playback, pause/seek, source archive closure and registry routing
remain separate gates. The preparation script emits 27 composition rows including
six deliberate rejections, with only media and necessary integer precision
references; it does not publish fixtures or change the registry.

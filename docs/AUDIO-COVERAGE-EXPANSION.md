<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Audio split coverage expansion

The packet campaign qualifies the existing native decoder artifacts against
independent scalar FFmpeg references. It does not change playback admission.
Generated media, PCM references, and native binaries remain outside tracked
source. The compact report is
[`audio-coverage.json`](../results/media-components/codec-expansion/audio-coverage.json).

The campaign contains **73 passing cases** and **three fixture-generation
blocks**. Every passing case also checks four forward/backward reset-and-preroll
seeks, giving **292 passing seek intervals**. Inputs last 6.137 seconds, contain
distinct per-channel signals and quiet intervals, and end outside codec frame
boundaries. This is longer finite synthetic coverage, not a long-duration or
real-world playback qualification.

| Family | Tested rates and channel counts |
| --- | --- |
| AAC-LC | 44.1 kHz mono/stereo; 48 kHz 5.1/7.1; extra M4A priming cases at 44.1 kHz mono/stereo and 48 kHz stereo |
| Opus | 48 kHz mono/stereo/5.1/7.1; mapping-family 1 multichannel headers |
| Vorbis | 44.1 kHz stereo; host encoder cannot generate mono/5.1/7.1 |
| FLAC24 and ALAC | 44.1 kHz mono/stereo; 48 kHz 5.1/7.1; 96 kHz mono/stereo/5.1/7.1 |
| MP3 | 44.1 kHz mono/stereo in MKV; tagged standalone MP3 at 44.1 kHz mono/stereo and 48 kHz stereo |
| PCM s16/s24/s32/f32/f64 | 44.1 kHz mono/stereo; 48 kHz 5.1/7.1; 96 kHz mono/stereo/5.1/7.1 |

All integer and original float64 output is byte-exact against references. Lossy
float output differs by at most 2.17e-7. A seek resets the native decoder, supplies
500 ms of preceding packets, and compares fresh post-target frames by exact
frame timestamps with the full independently validated decode. No waveform
alignment search is used. This verifies packet decoder recovery; browser MSE
seek behavior requires its own tests.

## Limits exposed by the campaign

- ALAC MOV eight-channel files decode to mask 255, meaning 7.1 wide. Most other
  eight-channel fixtures use mask 1599. Equal channel counts do not establish
  interchangeable layouts. A conversion that assumes mask 1599 must reject the
  ALAC wide layout or explicitly preserve/remap it.
- Standalone MP3 skip/discard metadata recovers the exact generated sample count.
  AAC M4A exposes its 1024-sample priming skip, but no trailing discard metadata;
  scalar FFmpeg still returns a padded final AAC frame. AAC comparisons verify
  reference decoder sample counts, not recovery of the original gapless tail.
- Opus native decode consumes OpusHead pre-skip itself; container discard padding
  trims the tail separately. Applying pre-skip twice would drop source samples.
- Vorbis mono and multichannel are blocked by the available host encoder, rather
  than reported as decoder failures. Independent source fixtures are still needed.
- Packet inputs contain reordered H264 video; video is irrelevant to packet
  qualification. Separate no-reorder inputs qualify bounded compositions. A
  bounded provider must continue rejecting reordered video until it is qualified.

## Reproducing the packet campaign

Generate the default matrix, then append 96 kHz and standalone priming cases:

```sh
python3 tests/audio-coverage-fixtures.py
FIXTURE_CODECS=flac24,alac,pcm-s16le,pcm-s24le,pcm-s32le,pcm-f32le,pcm-f64le AUDIO_COVERAGE_LAYOUTS=96000-1,96000-2,96000-6,96000-8 python3 tests/audio-coverage-fixtures.py
FIXTURE_CODECS=aac,mp3 AUDIO_COVERAGE_LAYOUTS=44100-1,44100-2,48000-2 AUDIO_COVERAGE_STANDALONE=1 python3 tests/audio-coverage-fixtures.py
node tests/audio-coverage.mjs
```

The runner uses the previously compiled packet adapter in
`build/codec-expansion/decoder-js/` and verifies the exact native build records
and Wasm hashes referenced from `/tmp/demuxe-decoder-families/`. Set
`DECODER_BUILD_ROOT` for another verified build-pointer directory. Set
`AUDIO_COVERAGE_ROOT` to place generated media on a faster scratch filesystem.
The retained report records source hashes, exact build records, fixture hashes,
reference hashes, layouts, trimming metadata, and every seek interval.

## Longer bounded compositions

The separate composition campaign passed **49 cases**: **33 real conversions**
and **16 mandatory precision rejections**. No-reorder MKV inputs last 6.137 seconds.
AAC, Opus, Vorbis, FLAC24 and integer PCM conversion preserve the qualified
44.1/48/96 kHz source rates and 1/2/6/8 channel counts. Every successful output
compares its decoded video, scalar audio PCM, sample count, rate, and channel
count with independent FFmpeg references. FLAC24 and integer PCM16/24 outputs
are byte-exact. Inputs exceeding FLAC24 precision remain rejected.

[`audio-coverage-compositions.json`](../results/media-components/codec-expansion/audio-coverage-compositions.json)
retains source/build hashes and individual results. To reproduce, generate
fixtures with `AUDIO_COVERAGE_BFRAMES=0`, then pass their directory as
`AUDIO_COVERAGE_COMPOSITION_ROOT` to `node tests/audio-coverage-compositions.mjs`.
Use `FLAC_BUILD_POINTER` to supply a verified FLAC build with the sample-rate
configuration ABI; the default is `/tmp/demuxe-flac-rate-builds/flac.json`.
Use `AUDIO_COVERAGE_OUTPUT_ROOT` for scratch output. Existing standalone MOV
packet cases and Vorbis generation blocks are omitted from this MKV campaign.

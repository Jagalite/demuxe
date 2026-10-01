<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Lower-rate legacy audio

The existing `audio-legacy` slice has a separate `lower-rate-pcm` offer for MP2
at 32 kHz and WMA1/2 at 8, 16, 22.05 and 32 kHz, mono/stereo. The existing
`configured-pcm` offers retain their 44.1/48 kHz scope. MP1 retains its canonical
32 kHz stereo packet contract; additional real MP1 sources remain unqualified.

WMA framing is the actual ASF WAVEFORMATEX: codec tag, coded width, block size,
bitrate and exact extradata. Matroska conversion retains that format and copies
AVC/HEVC packets under the existing finite container bounds. The finite lower-rate
recipe selects FLAC's `low-rate-s24` offer; it does not select Opus or an ASF reader.

## Evidence

`tests/legacy-lowrate-fixtures.py` prepares eighteen original source tuples,
their complete packet streams, scalar PCM and native frame timing, and pins
the reference executables. The eighteen native checks and eighteen no-reorder
AVC/FLAC conversions passed. Full packet PCM error was at most 5.22e-8;
conversion error was below 9.69e-8, with exact rate, sample count and video.
The standard conformance runner also passed all seven legacy offers on the
transient candidate, including the eighteen new source tuples, independent
clock checks and three actual restart/discard windows per new tuple. The report
is `results/media-components/provider-conformance/p2-20260930/legacy-lowrate-retained-04.json`.
Final audited installed-package conformance, assets/embedded playback and
package/source audit remain pending.

Seeks require **restart from stream origin and discard**. Seventy-two replay
intervals passed the unchanged 2e-5 PCM limit. Starting a fresh WMA2 decoder
at a later packet failed for the 16 kHz mono/stereo sources, with errors around
3e-4. The failure is retained in
`results/media-components/codec-expansion/legacy-lowrate-packet-start-seek-failed.json`.
That packet-start strategy is not qualified for the new offer.

The independent ffprobe frame timeline supplies original PTS and sample counts.
MP2 Matroska timestamps have a declared 1/1000 time base, so the independent
comparison allows half that clock tick: sixteen samples at 32 kHz. PCM limits
stay unchanged. WMA frame clocks compare exactly.
For WMA's one final drained frame, whose host PTS is absent, the declared clock
continues from the previous native frame end. This bounded continuation is
recorded explicitly; other missing timestamps cannot use it.

Native provenance is retained at
`build/codec-expansion/legacy-lowrate-provenance/engine-build.json`; prior native
runtime bytes are backed up. Binary sources and references stay in scratch
storage until exported as hash-pinned conformance/browser inputs.

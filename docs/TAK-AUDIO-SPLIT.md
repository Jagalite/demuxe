# TAK packet and standalone reader qualification

The optional `archive-next` native profile currently contains only FFmpeg's LGPL TAK decoder. ABI kind27 is appended after the advanced WMA kinds24–26; kind28 remains reserved for a future Shorten experiment.

## Qualified scope

The first profile is deliberately narrow: integer TAK codec2/profile2, 44.1 kHz mono16, 125 ms frames (5512 samples), ten-byte stream information without channel-layout extensions. Actual evidence uses the official [`lostchord-tak_2_2_0.tak`](https://samples.ffmpeg.org/A-codecs/tak/lostchord-tak_2_2_0.tak), SHA256 `6696820264e05fd1dda2355a4ba92d2fc573716881d633553eaee448dd4b2eec`.

- 5,589,504 original samples, 1015 frames, approximately126.75 seconds.
- Complete native integer PCM is byte-exact against independently decoded scalar FFmpeg output.
- Native reset, owned PCM, four fresh forward/backward keyframe seeks, host frame timestamps and sample counts pass.
- Constructor metadata mismatches and corrupt frame headers/payload CRCs reject. Native CRC checks are fatal for this codec.

There is no maintained FFmpeg TAK encoder for generating additional rate/layout/precision cases. Other TAK profiles, stereo/surround, rates, precision and external tags remain unqualified or rejected. Native source support alone does not qualify those cases. The experiment does not add a Matroska codec mapping.

## Standalone reader

`packages/provider-container/src/tak.ts` exports `TakReader.open(blob, signal)`, `tracks`, `sampleCount`, `bytesRead` and `packets(startSample, prerollSamples)`. Packets own their bytes and sample clock. Seeking starts at an actual preceding `HAS_INFO` frame so a recreated native decoder receives its stream header.

The reader validates stream/encoder/last-frame metadata CRCs, exact final frame byte extent, every frame header and payload CRC, contiguous frame numbers and the final sample count. It maintains a fixed64 KiB scan cache. It accepts at most64 MiB of input, 1 MiB per packet, 64 KiB of metadata, 32 metadata blocks and100,000 frames.

Opening scans the compressed payload to establish the frame index. This is not a sparse metadata-only operation: TAK frames do not expose a simple byte length in each frame header. The reader does not retain a complete payload copy. Canonical opening and packet iteration together read approximately three times the compressed file bytes.

The standalone test verifies all1015 reconstructed packets against host demux bytes, the original native PCM, four exact native seek intervals, 14 malformed metadata/framing/CRC/extent controls, invalid seeks and cancellation.

## Build and source provenance

The native build record, Emscripten module and Wasm hashes are bound in each report. Exact preferred native inputs were retained before subsequent source edits. The normalized build record captures those historical bytes separately from current application integration source.

```sh
python3 tests/tak-audio-fixtures.py
python3 scripts/build-audio-providers.py \
  --sdk /path/to/emsdk-4.0.14 \
  --archive build/downloads/ffmpeg-adaptation.tar.gz \
  --profile archive-next --out /tmp/demuxe-tak-builds
npm run build:components
node tests/tak-audio.mjs
node tests/tak-audio-standalone.mjs
```

Set `TAK_FETCH_CANONICAL=1` to fetch a missing official original. `TAK_BUILD_POINTER`, `TAK_AUDIO_FIXTURE_ROOT`, `TAK_ADAPTER_MODULE` and `TAK_READER_MODULE` support explicit verified local paths. Media and binaries stay ignored; compact reports are `results/media-components/codec-expansion/tak-audio*.json`.

Maintained standalone conversion, provider/owner and capability integration, exact native source closure and audited package assembly have passed. The full 5,589,504-sample FLAC conversion preserves exact integer PCM, with factory, clock, CRC, cleanup, abort and early-return controls. Next gates are installed assets/embedded browser tests and the combined CI fixture export. Additional TAK modes require actual independently decoded fixtures before admission. Shorten remains a separate experiment: its raw packet/frame timestamps are missing, its predictor state spans packets, and it needs an explicit native sample-clock and seeking design.

# FLAC output for speech sample rates

The finite encoder extension accepts signed 24-bit integer PCM at 8, 16, 22.05,
and 32 kHz with one or two channels. Native and TypeScript guards reject other
low rates and multichannel low-rate output. Existing 44.1/48/96 kHz output keeps
its existing envelope. The Opus encoder remains at 48 kHz; no resampling occurs.

This requires a new native FLAC artifact and the distinct `low-rate-s24`
capability profile. An older `configured-s24` offer proves only 44.1/48/96 kHz and
cannot satisfy a low-rate recipe. Caller quantization, channel mapping and packet
timestamps remain explicit responsibilities.

```sh
python3 scripts/build-audio-providers.py \
  --sdk /path/to/pinned/emsdk \
  --archive build/downloads/ffmpeg-adaptation.tar.gz \
  --profile flac --out /tmp/demuxe-flac-lowrate-builds
FLAC_LOWRATE_POINTER=/tmp/demuxe-flac-lowrate-builds/flac.json \
  node --no-maglev --test tests/provider-flac-lowrates.mjs
```

The focused test binds exact native build/JS/Wasm hashes and current wrapper
source, verifies STREAMINFO rate/channel/24-bit metadata, compares original S32
PCM exactly through independent FFmpeg decoding, and checks full/partial blocks,
packet clocks, terminal drain, recreation, malformed precision, abort, invalid
rates and channel layouts. Recreating an encoder establishes a new zero-based
stream; there is no encoder reset method.

Native proof, source-companion packaging, capability registration, real speech
container conversion, and installed browser qualification are separate gates.
Passing the encoder test alone does not qualify an input speech codec or widen
existing AAC/container recipes.

# Microcodec research harness

This directory is isolated from all production loaders, routing, manifests, and bridges.
Read [MICROCODEC-POC.md](../../MICROCODEC-POC.md) for conclusions and qualification boundaries.

From the repository root (requires the existing pinned SDK/archive):

```sh
python3 experiments/microcodec/fixtures.py
python3 experiments/microcodec/build.py --profile ac3 --opt Oz
python3 experiments/microcodec/build.py --profile ac3 --opt Os
python3 experiments/microcodec/build.py --profile ac3 --opt O2
python3 experiments/microcodec/build.py --profile dts
python3 experiments/microcodec/build.py --profile flac
python3 experiments/microcodec/build.py --profile remux
python3 experiments/microcodec/build.py --profile adaptation
curl --fail --location https://downloads.xiph.org/releases/flac/flac-1.4.3.tar.xz -o build/microcodec/flac-1.4.3.tar.xz
python3 experiments/microcodec/build-libflac.py
python3 experiments/microcodec/reference.py
node experiments/microcodec/run.mjs build/microcodec/reference-O2 build/microcodec/ac3-Oz build/microcodec/ac3-Os build/microcodec/ac3-O2 build/microcodec/dts-Oz
node experiments/microcodec/encode-run.mjs build/microcodec/flac-Oz build/microcodec/libflac-Oz
python3 experiments/microcodec/audit.py
node experiments/microcodec/sizes.mjs
```

`--out` selects a separate build root. `--reconfigure` reruns FFmpeg configure before rebuilding an existing profile. Output lives under `build/microcodec`, measurements under `results/microcodec`. `normalize-opt.py` records a one-time pilot correction; fresh builds do not need it. Never use these artifacts to overwrite `web/engine-*`.

`reference.py` verifies the installed adaptation static-library hashes against its manifest before linking the packet ABI. For DTS, copy the three reference output files (`module.mjs`, `module.wasm`, `provenance.json`) into `build/microcodec/reference-dts`, then run `run.mjs` on that directory. `check.mjs` checks the resulting exact comparisons.

```sh
ffmpeg -v error -y -i build/microcodec/fixtures/ac3-stereo.ac3 -c copy build/microcodec/fixtures/ac3.mkv
COMPOSE=1 node experiments/microcodec/remux-run.mjs \
 current-adaptation,web/engine-adaptation/remux.mjs,build/microcodec/fixtures/ac3.mkv,1 \
 minimized-adaptation,build/microcodec/adaptation-Oz/module.mjs,build/microcodec/fixtures/ac3.mkv,1
```

The composition test supplies known packet boundaries, buffers PCM/FLAC, creates a temporary Matroska handoff, then invokes the unchanged remux bridge. It is **not** a streaming container-to-container replacement. It quantizes float PCM to signed 24-bit using round-half-away-from-zero, clips to the integer range, and records clipping. Atmos/object metadata is not represented.

`worker.mjs` is a Node benchmark Worker. `browser-worker.mjs` is a standalone browser Worker with open/decode/flush/reset/destroy messages. The latter copies planar Float32 PCM into transferable buffers. `remux-worker.mjs` and `source-worker.mjs` exercise the unchanged shared-memory source bridge in Chrome. There is no compiled-module cache or production asset loader.

Packet ABI: create kind 0=AC3, 1=EAC3, 2=DTS core, 3=TrueHD, 4=MLP (only built codecs succeed). Configure the packet time base with sample rate before sending data; default 48000. Decode accepts complete packets and safe-integer sample PTS, copies them with FFmpeg padding, and returns FFmpeg status. Drain `mc_frame` until EAGAIN after each send; flush submits NULL then drain until EOF. `mc_info` fields: sample count, rate, channels, AVSampleFormat, PTS, raw AVFrame duration, native channel mask, decoder delay, initial padding. Raw duration may be zero; duration in seconds is sample count/sample rate. No timestamps are invented or repaired. Copy frame planes before receiving another frame. `mc_reset(d,0)` flushes buffers; `mc_reset(d,1)` recreates the decoder. Destroy owns all decoder resources. ABI pointers are trusted research handles, not hardened public inputs.

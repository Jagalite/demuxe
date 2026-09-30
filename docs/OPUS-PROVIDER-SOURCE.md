<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Dedicated Opus encoder source

The optional `@demuxe/provider-audio-opus-encoder` package links libopus using
the version and archive hash pinned as `opus-audio` in `sources.lock.json`.
Its upstream BSD notice is retained in `LICENSES/BSD-3-Clause-opus.txt`.
The original packet bridge and build recipe are Apache-2.0. Emscripten runtime
material retains its MIT terms. This provider does not link FFmpeg.

`engine-build.json` identifies the exact linked artifact, bridge, toolchain,
configuration and source hashes. `source-companion.json` identifies the matching
source archive assembled with the package. Retain those records together.
The build recipe is `scripts/build-opus-provider.py`; the owned packet ABI is
implemented by `native/audio-codecs/opus-encoder.c`.

The supported output is explicitly lossy 48 kHz mono/stereo Opus. The adapter
preserves encoder delay and final packet duration. Container integration must
preserve pre-skip, trimming and seek preroll; an encoder build alone does not
qualify a playback route.

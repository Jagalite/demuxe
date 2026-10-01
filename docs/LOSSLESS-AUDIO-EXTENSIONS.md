# TrueHD, MLP and DTS-HD qualification extensions

This experiment reuses the verified production `truehd-mlp` and `dts-hd` native modules. It extends the bounded packet adapter and Matroska audio conversion runtime. Public recipe admission and installed browser qualification remain separate gates.

## Evidence

`tests/lossless-audio-extension-fixtures.py` generates and pins 28 packet fixtures and 28 AVC Matroska compositions with no video frame reordering. `tests/lossless-audio-extension.mjs` verifies complete scalar FFmpeg integer PCM, exact native reset, 112 fresh forward/backward seek intervals, host frame timestamps/sample counts, and configuration/output metadata rejection. `tests/lossless-audio-extension-compositions.mjs` verifies byte-exact integer PCM after FLAC/fMP4 conversion, preserved rate/channels and unchanged video.

| Codec | New native and composition evidence | Limits |
| --- | --- | --- |
| MLP | 44.1/96 kHz, mono/stereo/5.1, actual 16/24-bit; official 44.1 kHz stereo 16-bit sample | FFmpeg's MLP channel mapping has at most six channels. No MLP 7.1 admission. |
| TrueHD | 44.1/96 kHz, mono/stereo/5.1, actual 24-bit; official 48 kHz 5.1 | Requested16-bit host encoder fixtures produce actual 24-bit headers. Their names retain the requested input precision; recorded `bitsPerSample` is the actual codec header precision. These cases do not qualify TrueHD 16-bit. |
| DTS-HD MA | Official48 kHz stereo 16-bit and5.1 24-bit, including117.6-second stereo composition | Requires native integer planar16/32 output, exact source bit depth and admitted channel layout. No new rate, mono or arbitrary DTS extension admission. |

The runtime retains the historical48 kHz TrueHD/DTS-HD 7.1 paths. This experiment does not add new7.1 evidence. The six-channel native masks 63 and 1551 are accepted; mono 4, stereo 3 and historical7.1 mask1599 retain explicit guards.

### Official DTS-HD fixture derivations

Both official DTS-HD downloads end with a packet rejected by scalar FFmpeg strict decoding and by the actual Wasm decoder. The qualified fixtures are complete packet prefixes. The manifest retains the original download URL/SHA256, original extracted stream SHA256, retained packet count and excluded corrupt final packet count.

- `bond_sample_dtshdma.m2ts`: first audio stream only; retain 337 of 338 packets.
- `Master Audio 2.0 16bit.dts`: retain 11025 of 11026 packets.

The original corrupt endings remain outside the positive qualification. Prefix references are independently decoded with `-cpuflags 0 -xerror`; no concealment or waveform alignment is used.

## Native and source ownership

The original production modules have `_mc_create` and `_mc_configure(rate)` but lack the newer configured constructor. The adapter permits the old constructor only for TrueHD/MLP/DTS-HD with empty extradata and bounded configuration. Actual decoded rate, channels, layout and precision must match that configuration. Other families still require their configured ABI; WMA packet framing still requires v2.

Each test binds the native build record, module.mjs and module.wasm hashes and reports the historical native input hashes separately from the current application source and compiled adapter hashes. The original preferred native inputs were verified and retained before further decoder bridge edits. An old compiled module is not attributed to the current bridge source.

The source companion originally associated with both modules is `source-production-03.tar.gz`, SHA256 `ec451ad0a9ca5f501091d3ff514932f162c85a3939860905a5ab6c832c5dc37c`. Current application packaging must preserve that historical native provenance and separately capture the tested adapter/runtime source.

## Reproduction

```sh
python3 tests/lossless-audio-extension-fixtures.py
npm run build:components
node tests/lossless-audio-extension.mjs
node tests/lossless-audio-extension-compositions.mjs
```

The default fixture root is `/tmp/demuxe-lossless-extensions`. Official originals are hash-pinned under `/tmp/demuxe-lossless-next-inventory`; set `LOSSLESS_FETCH_CANONICAL=1` to fetch missing originals. Generated media and Wasm stay outside committed source. Compact evidence is under `results/media-components/codec-expansion/lossless-audio-extension*.json`.

Next gates: public recipe bounds, installed bundle/browser and CI fixture integration, exact source package closure, and long-duration/seek browser evidence. Additional TrueHD 16-bit, broader DTS-HD rates/layouts, and MLP 7.1 remain unqualified or unsupported.

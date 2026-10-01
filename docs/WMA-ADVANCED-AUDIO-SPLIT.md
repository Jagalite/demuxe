# WMA advanced packet slice

The `wma-advanced` native family compiles WMA Pro, WMA Lossless, and WMA Voice
from pinned FFmpeg n9.0.2. It is a finite packet decoder experiment. Its codec
blocks come from real, independently demuxed official FFmpeg samples. This does
not add a container reader, remux recipe, automatic playback route, or resampler.

## Qualified input envelope

| Codec | Sample rate | Channels | Coded precision | Decoder output |
| --- | --- | --- | --- | --- |
| WMA Pro | 44.1 kHz | 6 | 16 bit | Float32 planar |
| WMA Pro | 48 kHz | 2, 6, 8 | 24 bit | Float32 planar |
| WMA Pro | 96 kHz | 2 | 24 bit | Float32 planar |
| WMA Lossless | 44.1 kHz | 2 | 16 bit | Owned exact Int32 PCM |
| WMA Voice | 8, 16 kHz | 1 | 16 bit in ASF header | Float32 |

Pro/Lossless require exactly18 extradata bytes, matching coded precision and
native channel mask. Voice requires exactly46 extradata bytes. Every input
packet is exactly one original codec block with the original ASF blockAlign
and bitRate supplied through `mc_create_config_v2`. Grouped and truncated
blocks are rejected. None of these settings may be inferred from output PCM.
Other rates, layouts, precisions, and header sizes fail before native allocation.
Native ABI kinds24/25/26 append Pro/Lossless/Voice without changing older kinds.

A block can produce several delayed/reservoir frames. Advanced WMA has a
bounded256-frame drain and1,048,576 scalar-sample output limit per call. Older
families retain their64-frame limit. The96 kHz Pro fixture proves the larger
frame limit is needed. Flush delivers all delayed PCM; reset recreates native
codec state and clears timestamp anchors. Returned samples are owned copies.

## Timing and seeking limits

`AudioFrame.timestampOrigin` is present for this family. `native` means the
actual decoded FFmpeg frame PTS is retained, including coarse ASF regressions.
`packet-clock` means the decoder supplied no frame PTS. Its first value is
anchored to the first successfully submitted real packet PTS; subsequent
values continue by decoded sample count. Native timestamps are never replaced
or silently repaired. Reset clears both the anchor and derived clock.

Decoded frames frequently lack PTS, including the first Pro frame. These
recovered values qualify packet service operation only. They do not prove
alignment on the original media timeline. Four block restarts per positive
fixture are independently compared with native FFmpeg decoding the exact same
WAVEFORMATEX and block suffix. This proves reservoir reset behavior; original
media seeking and container composition remain unqualified.

## Independent references and controls

`tests/wma-advanced-fixtures.py` fetches SHA256-pinned official FFmpeg samples,
extracts exact ASF metadata, and stores original packet bytes, frame metadata,
and independently decoded PCM in ignored scratch storage. The canonical
Lossless fixture shares the original music PCM with the APE/TTA/WavPack tests.
`scripts/build-wma-reference.py` builds a separate native scalar reference from
matching n9.0.2 codec sources and records source/configuration/binary identities.
The Wasm decoder is separately compiled with Emscripten4.0.14.

Lossless PCM must match every original Int32 sample exactly. Pro float PCM uses
an absolute2e-5 limit. Voice nonlinear filters accumulate small numerical
changes across native and Wasm implementations: Voice requires exact sample
count and layout, absolute error below0.01 and SNR at least65 dB. Tests record
both metrics for the full stream and each independent block restart, plus
mandatory muted-output and corrupted-block controls. This tolerance is specific
to Voice; it does not weaken any lossless or other float codec check.

The official `wmav_8.wma` includes unsupported WMAPro-in-Voice music frames.
Its exact `AVERROR_PATCHWELCOME` failure is recorded as a negative case rather
than a decoded positive. DRM/encrypted input is outside the packet contract.

```sh
python3 scripts/build-audio-providers.py --sdk /path/to/sdk \
  --archive build/downloads/ffmpeg-adaptation.tar.gz \
  --profile wma-advanced --out /tmp/demuxe-wma-advanced-builds
python3 scripts/build-wma-reference.py --source /path/to/FFmpeg-n9.0.2
WMA_REFERENCE_FFMPEG=/tmp/demuxe-wma-native-reference/ffmpeg \
WMA_REFERENCE_FFPROBE=/tmp/demuxe-wma-native-reference/ffprobe \
  python3 tests/wma-advanced-fixtures.py
WMA_REFERENCE_FFMPEG=/tmp/demuxe-wma-native-reference/ffmpeg \
  node --no-maglev tests/wma-advanced-audio.mjs
```

Compact evidence is saved under
`results/media-components/codec-expansion/wma-advanced.json`. Media, large packet
JSON, native tools, and PCM reference files stay out of Git.

## Installed packet harness

WMA advanced is optional in the existing assets/embedded packet matrix. The
original64 baseline cases remain required. WMA Lossless requires owned integer
samples and exact integer references; an ordinary float match cannot qualify it.
Every positive advanced frame must report its timestamp origin, and reset must
reproduce PCM and timestamp origins exactly.

Voice's four-field qualification schema fixes the numerical limits above and
requires both controls. The muted control replaces actual decoded PCM with
zeros. The corruption control zeroes every byte of every original codec block,
retains each original block length and PTS, resets the real decoder, and decodes
those blocks. Empty or incorrect decoded output must fail the reference gate.
The unsupported music-feature failure has a separate exact-message branch from
packet size failures and provider profile rejections.

`tests/wma-advanced-browser-fixtures.mjs` executes the actual page packet handler
with the real native Wasm module in Node and records all13 cases and their
controls. An installed browser campaign checks delivery and browser behavior
separately.

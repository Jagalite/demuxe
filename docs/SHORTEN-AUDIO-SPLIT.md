# Shorten audio split qualification

The optional native `archive-historical` profile contains FFmpeg's Shorten decoder only, using append-only decoder ABI 28. mpv remains one provider.

## Qualified source and output

| Field | Maintained bound |
| --- | --- |
| Source | Standalone Shorten `ajkg`, version 2 |
| Coded profile | Signed16 LE/type5; stereo; block 256; maxLPC 0; mean 4; skip 0 |
| Embedded header | First verbatim command contains classic 44-byte RIFF/WAVE PCM stereo16/44100 |
| Input | Local Blob at most 64MiB; owned chunks at most 1024bytes |
| Output | FLAC in fragmented MP4; stereo44100, exact original integer PCM/sample extent |
| Clock | Actual decoded sample count, explicitly `timestampOrigin: 'stream-clock'` |
| Seeking | Fresh decoder from byte zero, decode and discard to the requested sample |

`ShortenReader.open(file, signal)` exposes `tracks`, declared `sampleCount`, `bytesRead`, and `chunks()`. Chunks deliberately have no source PTS or duration. Each `chunks()` iteration restarts at byte zero. It does not interpret an external Shorten seek table or permit arbitrary packet restarts.

`repairShortenAudio` returns the complete prepared Blob. `repairShortenAudioFragments` yields bounded fMP4 fragments and releases both native owners on completion, errors, cancellation, or early iterator return. A complete Blob is returned only after decoded and encoded totals equal the embedded RIFF declared sample count. Frames with a different clock origin, layout, rate, or missing integer PCM are rejected.

The native bridge independently validates the actual compressed header and RIFF metadata, keeps input AVPacket timestamps missing, and derives each output timestamp from the prior actual decoded frame end. Only the first actual source header establishes sample zero. EOF rejects incomplete declared audio, and overflow past the original sample total rejects. Partial predictor reset is unsupported; reset recreates the complete decoder.

## Evidence

The [official FFmpeg lossless samples archive](https://samples.ffmpeg.org/A-codecs/lossless/) supplies `luckynight.shn`, SHA256 `16852768010391248078df61b7e2f46f7b3c35877add049f85917caf13e30e7f`. Pinned [FFmpeg n9.0.2 Shorten source](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/shorten.c) is the decoder implementation reference.

The 60.48-second source contains 2667168 stereo samples, 10419 native frames and 7019 input chunks. Independent scalar FFmpeg signed32 PCM SHA256 is `8e96d4eba1b732365ccf582d7bd94593c5c554c4d4a9f87ea773b78604a5aca8`. Source packet and frame PTS are genuinely missing; tests retain that distinction.

- `tests/shorten-audio.mjs`: complete PCM, native frame shapes, owned full reset, four forward/backward restart/discard seeks, flush/EOF/abort and causal RIFF/predictor/header/extent controls.
- `tests/shorten-audio-standalone.mjs`: every reader chunk matches original bytes; four exact native restart/discard seeks; signature/version/input bounds and abort controls.
- `tests/provider-shorten-repair.mjs`: full independent FLAC output PCM/sample extent; deterministic repeated conversion and streaming fragmentation; clock-origin/layout/integer/output-clock guards; truncated input and native owner cleanup.
- Compact evidence: `results/media-components/codec-expansion/shorten-{audio,standalone,compositions}.json`.

Native normalized record is retained under ignored `build/codec-expansion/shorten-provenance/engine-build.json`. Its 24 exact preferred build inputs are retained separately from the evolving application checkout. Fixture binaries and scalar references remain ignored temporary assets.

## Remaining work and limits

Public recipe/provider/owner integration, installed browser delivery and portable CI qualification follow the native proof. This document does not claim those gates passed. Other Shorten versions, predictor profiles, rates, layouts, RIFF variants, or precisions are not admitted. The source format has no CRC integrity check; the malformed-input controls do not establish detection of every syntactically valid audio mutation. Seeking is bounded full restart/discard rather than indexed random access. The canonical source's external seek-table bytes remain owned original bytes and are not used as a seek index.

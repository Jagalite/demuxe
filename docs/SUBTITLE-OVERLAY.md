<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Bounded mpv subtitle overlays

mpv/libass owns subtitle decoding, layout, styling, animation, and compositing.
Hybrid playback retains browser-decoded video frames and transfers only subtitle
pixels out of Wasm.

The original bridge allowed 512 bitmap tiles and 2 MiB of bitmap data. Those
limits were experimental packet bounds, not supported subtitle-file limits.
A complex ASS scene can exceed them with valid overlapping layers.

The maintained bridge in `native/subtitles/bitmap.c` always calls mpv's
`mp_draw_sub_overlay()`. mpv owns the compositor cache and combines all subtitle
layers, including small captions, into a premultiplied BGRA overlay. The bridge
copies the single visible bounding rectangle returned by mpv. Empty updates
clear the overlay; unchanged updates reuse the previous browser snapshot.

The export is bounded by the supported 1920×1080 output surface: at most
8,294,400 bytes. Video pixels never enter that buffer. The browser converts
premultiplied BGRA to Canvas ImageData's straight RGBA and draws the one image;
it does not interpret libass masks, position subtitle layers, or blend them.
Changed snapshots own their surfaces so pending video presentations cannot be
mutated by a later subtitle update. Existing pending-presentation limits remain.

The packet ABI is version 2: a 48-byte header followed by the composed pixels.
Old tile engines are explicitly rejected with a rebuild message. Deploy the
worker and rebuilt engines together; no legacy browser tile compositor remains.

Malformed overlay data still fails. A genuine export-budget or compositor failure
is a known backend compatibility failure: automatic playback can recover through
Software while preserving selected tracks and position. Explicitly pinned modes
still report failures. The mpv subtitle-service build shares the maintained C
bridge and must be rebuilt alongside Hybrid.

`npm run build:hybrid` now links the maintained bridge rather than the historical
experimental copy. Rebuild the engine when changing native code; TypeScript
compilation alone does not rebuild Wasm.

Validation commands:

```sh
npm run test:track-policy
npm run test:subtitle-overlay
```

The composition browser test covers a small fading caption and five overlapping
1080p ASS vector layers,
asserts that Hybrid stays active with a single overlay larger than 2 MiB, and
checks that seeking away and back clears and redraws it. The overlay unit suite
also exercises the YUV presenter through visible, moved, unchanged, and hidden
overlays. Run `CASES=animated node experiments/software-yuv-integration/qualify.mjs`
after rebuilding YUV for real browser lifecycle coverage. These checks do not establish
performance or correctness for every subtitle format or the user's exact file.

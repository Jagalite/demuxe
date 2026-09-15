# Demuxe

Demuxe is a browser media playback runtime that automatically chooses the least
expensive correct playback path: native browser playback, progressive remuxing,
WebCodecs-assisted hybrid playback, or FFmpeg/mpv software decoding.

The three public modes are **native**, **hybrid**, and **software**. Remuxing is
part of Native, not a fourth mode. This is a developer beta with representative
Chrome/Firefox evidence, not a promise of universal codec or browser support.

## Install

```sh
npm install demuxe@beta
npx demuxe copy-assets public/assets/demuxe
```

Serve the copied directory at `/assets/demuxe/`, preserving its relative tree.
Native remux, Hybrid, and Software require cross-origin isolation headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Native direct playback does not require Wasm or isolation. Remote sources need
appropriate CORS and range support. See [runtime assets](docs/RUNTIME-ASSETS.md).

## Core runtime

```js
import { Player } from 'demuxe';

const player = new Player(container, { assetBase: '/assets/demuxe/' });
await player.open(source); // File, ArrayBuffer, URL, or supported remote source
await player.play();
// When finished: await player.destroy();
```

## Ready-made player

```js
import { definePlayerElement } from 'demuxe/player';
definePlayerElement();
```

```html
<demuxe-player controls asset-base="/assets/demuxe/"></demuxe-player>
```

The component includes local-file and URL opening, subtitles, playback controls,
keyboard shortcuts, and optional session diagnostics. Local files stay in the
browser. The runtime never uploads them.

See [the public API](docs/PUBLIC-API.md), [component contract](docs/PLAYER-COMPONENT.md),
[migration notes](docs/API-MIGRATION.md), and [beta limits](docs/BETA.md).

## HLS and DASH quality control

For persistent quality switching through the mpv-backed Hybrid or Software path,
open an aligned streaming source with a quality policy:

```js
await player.open({
  url: 'https://media.example/master.m3u8',
  format: 'hls', // 'dash' for an MPD
  streaming: { qualityPolicy: { mode: 'auto', maxHeight: 1080 } }
});
await player.play();

const rendition = player.state.quality.qualities.find(q => q.height === 720);
if (rendition) {
  await player.setQuality({ mode: 'manual', qualityId: rendition.id });
}
```

Use an initial `{ mode: 'manual' }` policy for conservative startup without Auto.
Quality IDs belong to the current source. Requested and presented quality are
reported separately; a request does not mean the picture has already changed.
The optional component shows an Auto/quality selector when available.

The integrated path supports qualified aligned H.264/fMP4 ladders, associated
audio/subtitles, standard rolling windows, admitted discontinuities and DASH
period transitions. See the [quality and live contract](docs/PUBLIC-API.md#streaming-quality-and-live-windows)
for admission limits and migration from fixed selection. Native direct/remux
remains unchanged without an explicit quality policy. LL-HLS, low-latency DASH,
encryption/DRM and universal manifest/device support are not claimed.

## Release and licensing

The repository root is intentionally `private: true` and cannot be published to
npm. `scripts/package-beta.py` assembles the publishable package; only the exact
verified release tarball is published, with the `beta` dist-tag. See
[the release procedure](docs/RELEASE.md).

The combined package is GPL-2.0-or-later. Preserve the license, dependency notices,
and matching source companion when distributing the runtime. See
[licensing](docs/LICENSING.md). Safari/mobile, physical HDR/surround, PiP/casting,
and broad device/performance qualification remain follow-up work.

## Develop

From the source checkout, run `npm ci`, build the engines using
[the release recipe](docs/RELEASE.md), then run `npm run build` and `npm run dev`.
Open http://127.0.0.1:4179/. Maintained source and issues are at
[Jagalite/demuxe](https://github.com/Jagalite/demuxe).

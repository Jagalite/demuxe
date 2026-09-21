<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Provenance

The movie source, transformed MP4s, RGB reference frames, and movie screenshots
retain **CC BY 3.0**: (c) copyright 2008, Blender Foundation /
www.bigbuckbunny.org. The Sunflower version also credits Janus Bager Kristensen
(2013). See [publisher attribution](https://peach.blender.org/about/) and
[repository media notices](../../../docs/MEDIA-NOTICES.md). `fixtures/manifest.json`
records the source URL, source hash, transformations, and derivative hashes.
The high-bitrate variant adds temporal noise and is a synthetic stress derivative.

Original independent experiment tooling under `tests/` is Apache-2.0. Captured
copies and content-addressed historical tooling retain that license. Original
reports and measurement records are CC-BY-4.0. No license headers are inserted
into captured binary or hash-sensitive evidence.

`runtime/` is an unchanged copy of the current Demuxe `web/` tree plus the font,
with its original mixed component licenses. Player/engine integrations are
GPL-3.0-or-later; reusable modules and third-party code retain their individual
notices. The font retains `runtime/fixtures/FONT-LICENSE.txt`. Refer to
[repository licensing](../../../docs/LICENSING.md) and `third_party/notices/`
at repository root. This item is not a standalone redistribution of those assets.

`evidence/source-review/` contains unmodified upstream mpv v0.40.0 source/manual
files fetched from `https://raw.githubusercontent.com/mpv-player/mpv/v0.40.0/`:
`demux/demux.c`, `stream/stream_cb.c`, `stream/stream.c`, `player/playloop.c`,
`player/loadfile.c`, `player/command.c`, and `DOCS/man/options.rst`. Preserve their
upstream notices/terms; the report license does not relicense those files.

Two preliminary movie download URLs returned HTTP 403/404 and contributed no
media bytes. The successful source is the Blender Sunflower archive documented
in the fixture manifest.

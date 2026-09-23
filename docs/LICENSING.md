<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Licensing and distribution

## Next-release boundary

The next Demuxe release is prepared with these separate grants. The root npm
`license` field identifies **original Demuxe application and runtime code** as
Apache-2.0. It does not describe every bundled file.

| Material | Terms |
| --- | --- |
| Original Demuxe router, planner, capabilities, transport, API, UI, Native/Shaka adapters, engine loaders, tests and build tools | Apache-2.0 |
| Original browser AO, browser decoder, private mpv subtitle/render integration and their internal ABI headers | LGPL-2.1-or-later; these translation units are part of the LGPL engine build |
| Modified mpv v0.40.0 built with `-Dgpl=false` | LGPL-2.1-or-later and individual upstream file notices |
| Modified FFmpeg n7.1.1 built with `CONFIG_GPL=0`, `CONFIG_NONFREE=0`, `CONFIG_POSTPROC=0` | LGPL-2.1-or-later and individual upstream file notices |
| Optional audio-preparation Wasm (original Apache remux wrapper plus locked FFmpeg n9.0.1) | LGPL-2.1-or-later for the linked engine; original wrapper retains Apache-2.0 |
| Optional Native ASS Wasm (original Apache wrapper, libass, FriBidi, FreeType and HarfBuzz) | LGPL-2.1-or-later for the linked engine through FriBidi; component notices retain their individual terms |
| Original Demuxe reports, documentation and result data | CC-BY-4.0, except copied source and third-party material |
| Historical source, patches, fonts, media and other dependencies | Existing notices and grants; see the boundary map and notice inventory |

`licensing/boundaries.json` is the machine-checked file map. Original source has
SPDX headers; upstream headers are retained. `LICENSES/` includes Apache, LGPL,
historical GPL and CC BY texts. The root `LICENSE` grants Apache rights only to
original Demuxe code. No SPDX edit grants Apache rights to upstream code.

The existing `demuxe-core` source closure and package remain Apache-2.0. The
complete `demuxe` archive contains separate LGPL media engines, so downstream
redistributors must carry their source, notices and relinking materials. The
package `demuxeLicenses` field and `license-map.json` describe this boundary.

**Historical GPL releases remain GPL under their original grants.** Their
published binaries, source archives and source snapshots are not relabeled by
this migration. Preserved research evidence retains its recorded terms and bytes.
The GPL texts remain for those materials and for upstream files that offer those
terms; their presence in the source companion does not prove GPL code was linked
into the new engines.

## Generated engine closure

The build recipes require mpv `-Dgpl=false`, retain `libmpv=true`, `cplayer=false`,
GL and Lua disabled, and retain the browser AO, browser VO, Emscripten and Demuxe
patches. Software and Hybrid use FFmpeg's upstream-default decoder, demuxer and
filter selection with GPL and nonfree components disabled. They do not build or
link libpostproc. Remux remains an independent LGPL FFmpeg packet-copy build.
The optional mpv subtitle-only service must be rebuilt from the same LGPL mpv and
full FFmpeg configurations before packaging.

`python3 scripts/verify-lgpl-closure.py` reads generated Meson options, mpv
compile commands, FFmpeg configuration headers and component lists, configure
requests and linker maps. It rejects GPL-only mpv source, `CONFIG_GPL=1`,
`CONFIG_NONFREE=1`, postproc, known GPL/nonfree external FFmpeg libraries and
GPL-only FFmpeg filters. It also requires the maintained decoders, demuxers and
filters used by Demuxe. The result is `build/lgpl-closure.json`, embedded in
`engine-build.json` and hash-bound to the corresponding source companion.
Packaging rechecks those generated materials and exact engine artifact hashes.
A source flag alone does not establish the license of a statically linked binary.

The specific GPL-only mpv modes disabled by `-Dgpl=false` are Linux X11/XV,
VDPAU, JACK, OSS, CDDA, DVD navigation, DVB, CACA, legacy Direct3D and related
GPL-only source. The pinned browser build already had these desktop backends
absent. The browser AO and libmpv/browser VO remain. The actual FFmpeg component
loss and current playback evidence are recorded in the migration report; broad
codec registration is not a substitute for playback qualification. The public
Software video/audio filter API accepts custom chains, so removed GPL-only
FFmpeg filters are an actual option-level loss even if no catalogue case used
them. The maintained tone mapping chain uses LGPL-available `zscale`, `format`
and `tonemap`.

Modified mpv patches target LGPL files including `audio/out/ao.c`,
`demux/demux.c`, `demux/demux_lavf.c`, `demux/demux_mkv.c` and
`filters/f_decoder_wrapper.c`. The modified FFmpeg files, all patches and
modification notices accompany the preferred source. `sources.lock.json`
retains exact upstream revisions and archive SHA-256 values.

## Other linked dependencies

| Component | Retained terms and role |
| --- | --- |
| libass | ISC; subtitle rendering |
| FriBidi, libplacebo | LGPL-2.1-or-later; text direction and rendering |
| HarfBuzz | MIT-style notices; text shaping |
| FreeType | FreeType License alternative and retained GPLv2 notice; font rendering uses the FreeType License grant |
| zlib | Zlib license |
| libxml2 | MIT-style notices |
| dav1d | BSD-2-Clause; AV1 decoding |
| zimg | WTFPL; image scaling/color operations |
| Emscripten runtime libraries | Their separate notices and exceptions under `third_party/notices/emscripten/` |
| Shaka Player 5.2.11 | Apache-2.0 with bundled MIT portions identified in its upstream notices |
| DejaVu font | Its license in `fixtures/FONT-LICENSE.txt` |

`third_party/notices.json` hashes retained notices. Vulkan headers are a build
input; their notice is retained without claiming a Vulkan runtime is shipped.
Inspect each dependency's source for file-specific terms. Source downloads for
Shaka are hash-pinned separately from runtime assets and are included in tagged
source companions.

## Source, modifications and relinking

Ship the runtime archive and its matching `demuxe-*-source.tar.gz` together from
the same download location. The companion contains the exact Demuxe revision,
Apache application source and LGPL integration source, locked upstream archives,
patches, notices, SDK source, generated configuration, component selections,
linker maps, compiler/tool versions, build commands and the engine build record.
`source-manifest.json` hashes every member. `scripts/verify-beta-release.py`
checks that the runtime and source companion match byte for byte.

The engines are statically linked into WASM. A recipient can modify mpv, FFmpeg
or another LGPL component, rerun the pinned build scripts and relink all affected
engines using the supplied original Demuxe source. The exact commands and
relinking procedure are in [LGPL-RELINK.md](LGPL-RELINK.md). The source and
scripts are the machine-readable application material needed for relinking;
linker maps identify the actual object/archive closure. Retain the source
companion alongside the runtime so recipients can exercise those rights. Do not
impose terms that prevent modification, relinking or debugging such changes.

A release is held until the full current playback catalogue, matched baseline
comparison, selected CPU/memory checks and exact-archive consumer gates pass or
record explicit losses. Archive assembly and source hashes do not by themselves
qualify playback, physical HDR/audio fidelity, legal arrangements or patent rights.
`scripts/compare-lgpl-catalogue.py` checks the exact 71 README rows against
the same fixture bytes and acceptance harness, and release verification
recomputes that comparison against the linked candidate engine hashes.

References: [FFmpeg's pinned license](../third_party/notices/ffmpeg/LICENSE.md),
[mpv's pinned copyright inventory](../third_party/notices/mpv/Copyright),
[LGPL version 2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html),
[GNU's static-linking FAQ](https://www.gnu.org/licenses/gpl-faq.html#LGPLStaticVsDynamic).

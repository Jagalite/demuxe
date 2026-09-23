<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Apache/LGPL engine migration: release qualification record

This is the next-release work record for `0.3.0-beta.4`. The published
`0.3.0-beta.3` runtime and all earlier GPL releases retain their existing
licenses and binary labels. The candidate evidence below uses a fresh clean
engine build, the complete 71-row catalogue and matched performance runs.

## A. Executive result

**Migration successful with explicitly listed functionality loss in the
qualified catalogue.** The higher-priority recoded CPU measurements finished
first with 111 planned cells and 333 attempted rounds. The GPL and LGPL 71-row
catalogues were then rerun with identical fixture bytes and acceptance checks.
The candidate retained all 62 baseline bounded-screen passes on the same
routes, with zero new regressions or blocks. Nine rows retain their baseline
fixture, oracle or marked-fidelity limits. The direct option-level loss is the
33 GPL-only FFmpeg filters listed below and libpostproc; no README route uses
them. This conclusion does not claim physical HDR or multichannel audio
qualification beyond the recorded checks.

The clean release candidate is tagged `v0.3.0-beta.4-rc.3` at `ab77016c`.
`build/beta-build.json` and `build/lgpl-closure-before-after.json` record the
generated closure and linker evidence. The archive-level release gate remains
separate from engine and catalogue qualification.

## Before state: why the existing complete player is GPL

The baseline here is the published `0.3.0-beta.3` source companion, rather
than README claims. Its generated build files were extracted under
`build/licensing-migration/baseline/build/` for local inspection.

| Actual build evidence | `0.3.0-beta.3` result |
| --- | --- |
| `obj-mpv/meson-info/intro-buildoptions.json` | `gpl=true`, `libmpv=true`, `cplayer=false`, `gl=disabled`, `lua=disabled` |
| `obj-software-full-ffmpeg/config.h` | `CONFIG_GPL=1`, `CONFIG_NONFREE=0`, `CONFIG_POSTPROC=1`; FFmpeg reports `GPL version 2 or later` |
| `experiments/software-full/build.sh` at the published revision | Passes `--enable-gpl`; links `libpostproc/libpostproc.a` |
| `scripts/link-hybrid.sh` at the published revision | Links full FFmpeg and `libpostproc/libpostproc.a` |
| `native-remux/ffmpeg/config.h` | `CONFIG_GPL=0`, `CONFIG_NONFREE=0`, `CONFIG_POSTPROC=0`; FFmpeg reports `LGPL version 2.1 or later` |

The full FFmpeg and GPL-mode mpv were statically included in Software and
Hybrid WASM. Therefore the old complete-player GPL designation reflects the
actual dependency closure. The independent Remux FFmpeg build was already
LGPL-compatible; its original Demuxe wrapper belonged to the former GPL
complete-player release boundary.

The pinned upstream inputs remain mpv `v0.40.0`, full-player FFmpeg `n7.1.1`,
optional audio-preparation FFmpeg `n9.0.1`, and Emscripten `4.0.14` (exact
hashes in `sources.lock.json`). The published optional engine used n9.0.1;
retaining that pin avoids a measured Opus padding-accounting change under
n7.1.1. The full Demuxe mpv
and FFmpeg patch series replayed against their locked source archives before
candidate compilation. The mpv patches touching `audio/out/ao.c`,
`demux/demux.c`, `demux/demux_lavf.c`, `demux/demux_mkv.c` and
`filters/f_decoder_wrapper.c` target LGPL-licensed upstream files.

## B. Actual lost functionality

The pinned mpv `Copyright` inventory says `-Dgpl=false` removes the following
features and their listed GPL-only source files:

| Category | mpv features excluded by LGPL mode | Browser baseline evidence |
| --- | --- | --- |
| Demuxe browser capabilities | None identified in the GPL-only mpv inventory; the browser AO, libmpv and browser VO are separate LGPL code | All baseline bounded catalogue screens pass on the same route |
| Desktop or native outputs irrelevant to WASM | Linux X11/XV, VDPAU, VAAPI, JACK, OSS, CACA video output, legacy Direct3D | Corresponding published `HAVE_*` values were already zero |
| Device/media inputs not exposed or qualified by Demuxe | CDDA, DVD navigation and DVB | Corresponding published `HAVE_*` values were already zero; no browser device route exists |

The published Emscripten mpv `config.h`
already had `HAVE_X11`, `HAVE_XV`, `HAVE_VDPAU`, `HAVE_JACK`,
`HAVE_OSS_AUDIO`, `HAVE_CDDA`, `HAVE_DVDNAV`, `HAVE_DVBIN`, `HAVE_CACA`,
`HAVE_DIRECT3D` and `HAVE_VAAPI` all equal to zero. These desktop and device
backends were therefore not available in the browser WASM baseline. Their
absence is not evidence of a new Demuxe playback loss.

The full FFmpeg baseline registered 33 GPL-only filters selected by the pinned
`configure` dependency map:

`blackframe`, `boxblur`, `colormatrix`, `cover_rect`, `cropdetect`, `delogo`,
`eq`, `find_rect`, `fspp`, `histeq`, `hqdn3d`, `interlace`, `kerndeint`,
`mcdeint`, `mpdecimate`, `mptestsrc`, `nnedi`, `owdenoise`, `perspective`,
`phase`, `pp`, `pp7`, `pullup`, `repeatfields`, `sab`, `signature`,
`smartblur`, `spp`, `stereo3d`, `super2xsai`, `tinterlace`, `uspp`,
`vaguedenoiser`.

`libpostproc` and exactly these 33 filters disappear in the candidate's
generated component list. No decoder, demuxer, parser, bitstream filter or
protocol is removed. Link maps contain no postproc archive or GPL-only
external FFmpeg library.
FFmpeg's pinned `LICENSE.md` also identifies optional GPL x86 assembly/code
(`flac_dsp_gpl.asm`, `idct_mmx.c`, `vf_removegrain.asm`) and build/test helpers.
The Wasm baseline used `--disable-asm`, so those optimizations were not a
browser capability being removed. The GPLv3 `lensfun` filter was not configured
in the baseline. No GPL external FFmpeg library was selected in the published
configuration; the candidate gate checks the pinned external license lists
again against generated config and link maps.
The first candidate link map contained `libavfilter.a(vf_removegrain.o)` from
LGPL `libavfilter/vf_removegrain.c`; the GPL-only item is the separate
`libavfilter/x86/vf_removegrain.asm`. The closure gate was corrected to allow
the C object while requiring `--disable-asm` and rejecting the x86 assembly
object. The initial clean build was discarded after that gate-script change;
the fresh tagged build passed the corrected gate.
Demuxe's public `videoFilters` and `audioFilters` options accept user chains,
so a user who selected one of the GPL-only filters loses that option even if
all codec cases continue to pass. Source and generated-graph review found no
Demuxe automatic graph that selects any of them. The maintained HDR tone-map
graph uses `zscale`, `format` and `tonemap`. The generated candidate retains
`scale`, `zscale`, `format`, `colorspace`, `tonemap`, `transpose`, `crop`, `fps`,
`aresample`, `aformat`, `atempo`, `bwdif`, `yadif` and `w3fdif`. Catalogue
checks exercise retained scaling, color, rate, deinterlace, subtitle and audio
paths to their documented bounds; component registration alone is not the
playback evidence.

## C. README matrix impact

The GPL-current baseline at
`results/head-to-head/lgpl-gpl-baseline-20260923/summary.json` and the LGPL
candidate at `build/head-to-head/lgpl-candidate-rc3-correctness/summary.json`
reran all 71 README rows against the same frozen 36-second fixtures. Each run
recorded 48 passed, 19 blocked and 4 failed rows. Fourteen of the blocked rows
passed their bounded screen but retain stereo, HDR or other fidelity limits;
five lack a qualifying fixture or reference oracle. The four failed rows are
the HDR10 TrueHD/PGS, HDR10 DTS-HD/PGS and two Dolby Vision/Atmos/ASS
combinations; each failed its initial marked-audio check in both builds.

`build/head-to-head/lgpl-compare-rc3.json` machine-checks each row, its first
failure stage, route, fixture hashes and acceptance harness. Its classification
is 62 identical bounded-screen passes, zero route changes, zero measured
behavior differences, zero regressions, nine unchanged blocked/failed rows,
zero newly blocked rows and zero cases intentionally unsupported because of
the licensing change. The 62 includes the 14 rows with an unchanged fidelity
limit; it is not a claim that all 62 meet every physical fidelity goal.

For this matrix, “identical pass” means the same bounded acceptance checks pass
and the public route is unchanged; it does not claim bit-identical decoded
frames. The comparison record retains exact fixture hashes, harness hash,
browser identity, per-row route and first failure stage. Separate matched
measurements cover CPU, memory and frame timing.

## D. FFmpeg engine inventory

The counts come from the published GPL full FFmpeg and candidate LGPL full
FFmpeg generated `config_components.h` files, counting only
`CONFIG_*_<kind> 1` definitions. The machine-readable comparison is
`build/lgpl-closure-before-after.json`.

| Kind | GPL baseline | LGPL candidate | Removed/added |
| --- | ---: | ---: | --- |
| Decoders | 497 | 497 | 0 |
| Demuxers | 352 | 352 | 0 |
| Parsers | 60 | 60 | 0 |
| Bitstream filters | 45 | 45 | 0 |
| Filters | 473 | 440 | 33 removed |
| Protocols | 1 | 1 | 0 |
| Encoders | 0 | 0 | 0 |
| Muxers | 0 | 0 | 0 |
| Hardware accelerators | 0 | 0 | 0 |

The build deliberately keeps upstream-default decoders and demuxers, rather
than substituting a handwritten codec list. `scripts/verify-lgpl-closure.py`
requires the named video, audio, subtitle, container and LGPL filter set in
the actual generated component list. It rejects GPL/nonfree configuration,
postproc, pinned mpv GPL-only compiled sources and forbidden linked libraries.

## Representative performance and implementation selection

The headed Chrome comparison used the same three 36-second fixtures, harness,
five-second warmup and 20-second measurement window for Native H.264/MP3,
Hybrid HEVC Main 10/AC-3 and Software ProRes/PCM. All nine candidate and all
18 GPL rounds passed. The candidate fixture files were hardlinked to the GPL
snapshot so equivalent bytes also had equivalent file backing; a control with
the same candidate engines but different file backing produced a misleading
Native CPU increase. The table shows medians of three rounds per run, with CPU
as summed browser-process one-core percentage and RSS as summed process MiB.

| Route | GPL run 1 CPU / RSS | GPL run 2 CPU / RSS | LGPL candidate CPU / RSS |
| --- | ---: | ---: | ---: |
| Native H.264/MP3 | 39.8% / 1133 | 36.9% / 1133 | 42.4% / 1138 |
| Hybrid HEVC10/AC-3 | 59.4% / 1321 | 58.2% / 1310 | 62.8% / 1324 |
| Software ProRes/PCM | 66.6% / 1279 | 73.1% / 1328 | 69.9% / 1329 |

Recorded decoder selections remained Native direct; Hybrid WebCodecs HEVC
with mpv AC-3; and Software FFmpeg ProRes with PCM. Demux formats and public
routes were unchanged. Generated configuration preserves the same thread
settings and all maintained conversion/filter primitives. The candidate
measurements are within the observed round-to-round range or near its edge;
these short host-wide measurements do not establish long-session CPU, memory
or physical A/V equivalence. The full records are in
`build/head-to-head/lgpl-matched-backing-performance-3/` and the two baseline
directories `build/head-to-head/lgpl-gpl-baseline-performance-3/` and
`build/head-to-head/lgpl-gpl-baseline-performance-3-repeat/` in the baseline
checkout.

## E. License closure

The candidate closure is Apache-2.0 for original application/runtime,
LGPL-2.1-or-later for the modified mpv/FFmpeg engines and internal mpv/FFmpeg
integration units, and the existing grants in `third_party/notices/` for
libass, FriBidi, HarfBuzz, FreeType, libplacebo, zlib, libxml2, dav1d, zimg,
Shaka and Emscripten runtime libraries. A final linked-dependency inventory
was checked against candidate linker maps. `docs/LICENSING.md` gives each
dependency's current terms and individual notices. No historical GPL binary
is relabeled.

| Shipped component | Candidate terms |
| --- | --- |
| Original application, router, UI, API, transport, Native/Shaka adapters and build tools | Apache-2.0 |
| Software and Hybrid mpv/FFmpeg WASM; mpv subtitle-only WASM | LGPL-2.1-or-later for mpv, FFmpeg and internal integration units |
| Remux WASM and optional FLAC/Opus preparation WASM | LGPL-2.1-or-later for linked FFmpeg; original wrappers retain Apache-2.0 |
| Optional Native ASS WASM | LGPL-2.1-or-later through FriBidi; Apache-2.0 original wrapper; each library retains its own terms |
| libass, HarfBuzz, FreeType, FriBidi | ISC; MIT-style; FreeType License alternative with retained GPLv2 notice; LGPL-2.1-or-later, respectively |
| libplacebo, zlib, libxml2, dav1d, zimg | LGPL-2.1-or-later; Zlib; MIT-style; BSD-2-Clause; WTFPL, respectively |
| Shaka Player and Emscripten runtime | Apache-2.0 with bundled MIT portions; separate SDK runtime notices and exceptions |

The published beta also bundled separate optional Native ASS and FLAC/Opus
preparation engines. Both were rebuilt from the new original-code grants and
the same pinned upstream archives, with clean-source verification, maps and
separate corresponding-source companions. The candidate catalogue snapshot
included their newly built assets; the GPL baseline snapshot used its own
published optional assets. No previously released binary bytes were relabeled.

The tagged source companion carries pinned upstream archives, all Demuxe
patches, modified sources, exact commands, generated options/configurations,
component lists, linker maps, hashes, tool versions, notices and relinking
instructions. The runtime archive and companion are matched by
`scripts/verify-beta-release.py`. The LGPL relinking procedure is in
`docs/LGPL-RELINK.md`.

## F. Release recommendation

**The Apache/LGPL engine configuration is suitable to become the next default
on the measured catalogue, subject to final exact-archive release gates.** The
generated closure, full same-fixture catalogue and representative matched
performance checks passed. The 33 GPL-only custom filters and libpostproc are
the explicit functionality loss. Existing fixture/reference limits and
baseline audio failures remain unchanged. The candidate must still satisfy
the complete Chrome/Firefox consumer, streaming, Shaka, optional-engine and
public API suites against one tagged archive and its matching source before
publication. A passing archive gate can promote this recommendation without
reinterpreting the inherited 9 limited rows as full fidelity passes.

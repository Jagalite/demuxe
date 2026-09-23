<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Apache/LGPL engine migration: release qualification record

This is the next-release work record for `0.3.0-beta.4`. The published
`0.3.0-beta.3` runtime and all earlier GPL releases retain their existing
licenses and binary labels. The new configuration is **not release qualified**
until the candidate engine build, full catalogue rerun and matched performance
comparison are recorded below.

## A. Executive result

**Migration blocked pending candidate qualification.** The higher-priority
recoded CPU measurements in
`results/head-to-head/passing-cell-cpu-exploratory-20260923-01/` finished with
111 planned cells and 333 attempted rounds. The GPL-current 71-row catalogue
was rerun afterward; the LGPL engines and matched candidate matrix remain to
be built and tested. The recommendation in section F remains conditional.

The package assembler currently refuses the still-present GPL engine binaries
with `Packaging requires a completed LGPL engine build record`; the Apache
metadata cannot produce a release archive from stale engine assets.

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

The pinned upstream inputs remain mpv `v0.40.0`, FFmpeg `n7.1.1` and
Emscripten `4.0.14` (exact hashes in `sources.lock.json`). The full Demuxe mpv
and FFmpeg patch series replayed against their locked source archives before
candidate compilation. The mpv patches touching `audio/out/ao.c`,
`demux/demux.c`, `demux/demux_lavf.c`, `demux/demux_mkv.c` and
`filters/f_decoder_wrapper.c` target LGPL-licensed upstream files.

## B. Actual lost functionality

The pinned mpv `Copyright` inventory says `-Dgpl=false` removes the following
features and their listed GPL-only source files:

| Category | mpv features excluded by LGPL mode | Browser baseline evidence |
| --- | --- | --- |
| Demuxe browser capabilities | None identified in the GPL-only mpv inventory; the browser AO, libmpv and browser VO are separate LGPL code | Candidate runtime playback remains to be tested |
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

`libpostproc` and these filters are expected to disappear in the candidate;
the exact generated component difference and link maps remain to be measured.
FFmpeg's pinned `LICENSE.md` also identifies optional GPL x86 assembly/code
(`flac_dsp_gpl.asm`, `idct_mmx.c`, `vf_removegrain.asm`) and build/test helpers.
The Wasm baseline used `--disable-asm`, so those optimizations were not a
browser capability being removed. The GPLv3 `lensfun` filter was not configured
in the baseline. No GPL external FFmpeg library was selected in the published
configuration; the candidate gate checks the pinned external license lists
again against generated config and link maps.
The first candidate link map contains `libavfilter.a(vf_removegrain.o)` from
LGPL `libavfilter/vf_removegrain.c`; the GPL-only item is the separate
`libavfilter/x86/vf_removegrain.asm`. The closure gate was corrected to allow
the C object while requiring `--disable-asm` and rejecting the x86 assembly
object. The initial clean build was discarded after that gate-script change;
a fresh tagged build is required for source correspondence.
Demuxe's public `videoFilters` and `audioFilters` options accept user chains,
so a user who selected one of the GPL-only filters loses that option even if
all codec cases continue to pass. The maintained automatic HDR tone-map graph
uses `zscale`, `format` and `tonemap`; candidate availability and behavior must
still be verified. The named LGPL alternative filters, color transforms,
resampling, deinterlacing, subtitles and playback rate are qualification
targets, not assumed passes.

## C. README matrix impact

The GPL-current baseline at
`results/head-to-head/lgpl-gpl-baseline-20260923/summary.json` reran all 71
README rows against the frozen 36-second fixture set. It recorded 48 passed,
19 blocked and 4 failed rows. Fourteen of the blocked rows passed their bounded
screen but retain stereo, HDR or other fidelity limits; five lack a qualifying
fixture or reference oracle. The four failed rows are the HDR10 TrueHD/PGS,
HDR10 DTS-HD/PGS and two Dolby Vision/Atmos/ASS combinations; each failed its
initial marked-audio check. The same-fixture LGPL candidate classification and
route counts remain pending. **No catalogue row is yet classified as an LGPL
pass.** The release must report identical passes, route
changes, measurable differences, regressions, blocked cases and deliberate
unsupported cases without changing acceptance checks.

For this matrix, “identical pass” means the same bounded acceptance checks pass
and the public route is unchanged; it does not claim bit-identical decoded
frames. The comparison record retains exact fixture hashes, harness hash,
browser identity, per-row route and first failure stage. Separate matched
measurements cover CPU, memory and frame timing.

## D. FFmpeg engine inventory

The counts below come from the published full FFmpeg
`config_components.h`, counting only `CONFIG_*_<kind> 1` definitions. The
candidate column must be filled from its generated file.

| Kind | GPL baseline | LGPL candidate | Removed/added |
| --- | ---: | ---: | --- |
| Decoders | 497 | Pending | Pending |
| Demuxers | 352 | Pending | Pending |
| Parsers | 60 | Pending | Pending |
| Bitstream filters | 45 | Pending | Pending |
| Filters | 473 | Pending | Pending |
| Protocols | 1 | Pending | Pending |
| Encoders | 0 | Pending | Pending |
| Muxers | 0 | Pending | Pending |
| Hardware accelerators | 0 | Pending | Pending |

The build deliberately keeps upstream-default decoders and demuxers, rather
than substituting a handwritten codec list. `scripts/verify-lgpl-closure.py`
requires the named video, audio, subtitle, container and LGPL filter set in
the actual generated component list. It rejects GPL/nonfree configuration,
postproc, pinned mpv GPL-only compiled sources and forbidden linked libraries.

## E. License closure

The planned new closure is Apache-2.0 for original application/runtime,
LGPL-2.1-or-later for the modified mpv/FFmpeg engines and internal mpv/FFmpeg
integration units, and the existing grants in `third_party/notices/` for
libass, FriBidi, HarfBuzz, FreeType, libplacebo, zlib, libxml2, dav1d, zimg,
Shaka and Emscripten runtime libraries. A final linked-dependency inventory
will be taken from candidate linker maps. `docs/LICENSING.md` gives each
dependency's current terms. No historical GPL binary is relabeled.

The published beta also bundled separate optional Native ASS and FLAC/Opus
preparation engines. Preserving its complete playback capability requires
fresh optional builds from the new original-code grants and the same pinned
upstream archives, with clean-source verification and link maps. Reusing those
previously released binary bytes under a new label is prohibited. The candidate
catalogue snapshots must include the same optional assets in both comparison
lanes, or record the missing route as a change.

The tagged source companion must carry pinned upstream archives, all Demuxe
patches, modified sources, exact commands, generated options/configurations,
component lists, linker maps, hashes, tool versions, notices and relinking
instructions. The runtime archive and companion must be matched by
`scripts/verify-beta-release.py`. The LGPL relinking procedure is in
`docs/LGPL-RELINK.md`.

## F. Release recommendation

**Hold `0.3.0-beta.4` as a candidate.** It becomes suitable as the next
default only after the generated LGPL closure gate passes, the full current
catalogue is rerun against the GPL baseline on the same fixtures, any
regressions are documented, representative matched performance is checked,
and the exact runtime/source archives pass release verification. Existing
fixture/reference limits and baseline failures must remain explicit; the
candidate must retain every bounded baseline pass and may not silently change
a prior failure stage or reason.

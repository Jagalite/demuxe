<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Licensing and distribution

## Original Demuxe material

Demuxe uses three explicit grants for its original material. Copyright (C) 2026
webmpv contributors is retained as the historical code copyright credit.

| Boundary | License and scope |
| --- | --- |
| Reusable original code | **Apache-2.0**. `coreSources` in `licensing/boundaries.json` lists the engine-independent TypeScript core, routing, capability tracking, transport, container contracts and lightweight MP4 probe. Original research/test/build tooling in the manifest also uses this grant. |
| Complete player and integration | **GPL-3.0-or-later**. `src/index.ts`, `src/unified-player.ts`, the component/UI, backend adapters, engine workers, FFmpeg-backed `web/source-probe.js`, and original native integrations use GPLv3 or later. Existing upstream LGPL and other file licenses are retained. |
| Reports and results | **CC-BY-4.0**. Original documentation, research reports and published result data; not executable tooling, copied source, bundled archives or third-party imagery. |

The full texts are in `LICENSES/`. The root `LICENSE` identifies these boundaries
and retains the GPL text for the complete player. Maintained code carries SPDX
headers. `licensing/boundaries.json` annotates other files, including result data
whose bytes and recorded hashes must remain unchanged. Ordered rules and the
explicit reusable list are checked in CI; unknown top-level paths fail the check.

Reusable original code is Apache-2.0 only. The complete player incorporates those
modules in a GPLv3-or-later combined work while retaining their Apache license
and notices. This does not relicense upstream dependencies or make the complete
player Apache-licensed. GPLv2-only compatibility is not a goal of the maintained
distribution. Apache-2.0 can be combined under GPLv3 where all other component
terms permit it. See the
[Apache compatibility explanation](https://www.apache.org/licenses/GPL-compatibility).

The root workspace and assembled `demuxe` package retain `license:
"GPL-3.0-or-later"`. `packages/core/package.json` and the separately assembled
`demuxe-core` package use `"Apache-2.0"`. Run
`npm run build:core` to create its local candidate archive. It includes only
the approved source/output closure, attribution and license materials; no player,
workers, Wasm engines, fonts or runtime dependencies. The repository package
templates are private. Neither building nor checking an archive publishes it.

For CC BY attribution, credit **Demuxe contributors**, name the report/result,
link to its repository location and https://creativecommons.org/licenses/by/4.0/,
retain supplied notices and indicate changes. Include the recorded revision/date
when available. Code snippets remain under the corresponding software license.
CC BY applies only to rights held in the original report/result; it does not
create copyright in unprotected facts or replace third-party image, quotation,
font, film, code or archive licenses. See `MEDIA-NOTICES.md`, especially the
separate CC BY 3.0 attribution for Big Buck Bunny imagery. Creative Commons
[recommends software licenses for software](https://creativecommons.org/faq/#can-i-apply-a-creative-commons-license-to-software).

Historical `/files/` and result-code snapshots, legacy generated players without
maintained TypeScript sources, patch context, upstream-derived SIMD code and mpv
source retain their existing terms and bytes. The GPLv2 text remains available
for historical and upstream material; it is not an alternative license grant for
the maintained Apache core or GPLv3 player. Previously distributed copies retain
their granted permissions. `NOASSERTION` entries in the map
mean consult those preserved notices; they are not an Apache or CC grant.
Research harnesses may invoke GPL programs without granting rights to those
programs. Native probes compiled into an engine remain in the integration boundary.

These grants cover Demuxe-controlled original material only. Relicensing another
contributor's work requires their permission; neither SPDX nor a passing check
establishes that permission. See `CONTRIBUTING.md` for future contributions.

The complete distributed player package is GPL-3.0-or-later. Commercial use is allowed under the
license's conditions. Redistributing a covered combined work entails GPL source
and license obligations; this package does not provide a proprietary embedding
exception. A particular application's relationship to the library and distribution
terms may need review.

## Current linked engines

These classifications follow the actual configured builds, not just the dependency
names. `build/beta-build.json` records the configuration and hashes for each build.

| Shipped artifact | Linked configuration | Applicable engine terms |
| --- | --- | --- |
| `web/engine-software-full/player.{mjs,wasm}` | mpv with `gpl=true`; FFmpeg with `CONFIG_GPL=1`, `CONFIG_VERSION3=0`, `CONFIG_NONFREE=0`; static libraries | Maintained original wrapper and combined engine: GPL-3.0-or-later; upstream mpv/FFmpeg grant GPL-2.0-or-later, using the later-version permission; retain component notices |
| `web/engine-hybrid/player.{mjs,wasm}` | The same mpv and full FFmpeg archives, browser decoder bridge, and modified mpv subtitle renderer | Maintained original integration and combined engine: GPL-3.0-or-later; preserve upstream GPL-2.0-or-later/LGPL grants and component notices |
| `web/engine-remux/remux.{mjs,wasm}` | Independent FFmpeg packet-only build; `CONFIG_GPL=0`, `CONFIG_VERSION3=0`, `CONFIG_NONFREE=0`; static libraries | FFmpeg library: LGPL-2.1-or-later; original wrapper and combined engine: GPL-3.0-or-later; retain the LGPL notices and source/relink materials |

`CONFIG_VERSION3=0` describes the selected FFmpeg components; it does not prohibit
exercising an upstream "or later" grant or make the combined Demuxe engine GPLv2.
Changing the original-code grant does not enable additional FFmpeg components or
change the build flags. New distributions still require matching rebuilt engines
and source records; historical binary records are not relabeled or requalified.

The optional YUV engine is outside the standard three-engine candidate and must be
qualified and recorded separately before distribution.

Additional linked components include libass (ISC), FriBidi and libplacebo
(LGPL-2.1-or-later), HarfBuzz (MIT-style notices), FreeType (its GPLv2-or-later
alternative permits GPLv3 distribution; retain both its FTL and GPLv2 texts),
zlib (Zlib), libxml2 (MIT-style notices), dav1d
(BSD-2-Clause), zimg (WTFPL), and Emscripten runtime libraries (the licenses and
exceptions under `third_party/notices/emscripten`). Inspect each component's source
headers for file-specific terms. Vulkan headers are build inputs; their notice is
retained without claiming that a Vulkan runtime is shipped. The bundled DejaVu font
has its separate copyright/license in `fixtures/FONT-LICENSE.txt`.

This software uses FreeType. Portions are copyright the FreeType Project
(https://freetype.org). The upstream notices identify the respective authors.

The patched upstream sources, including `experiments/retained-subtitles/vo_libmpv.c`,
retain their upstream licensing and any individual license headers. mpv's
`Copyright` inventory also covers its C files without individual headers. The
original-code license does not replace those upstream terms. The dated release record and `patches/` identify our modifications.

## Source and build materials accompanying a distribution

`npm run check:licenses` checks source headers, package metadata, core import and
export boundaries, preserved source/notice hashes and license texts.
`npm run test:licenses` exercises failures for boundary violations and archive
tampering. The lightweight CI workflow builds TypeScript and checks a real core
archive without building native engines. Player packaging runs the same source
gate, carries the Apache, GPLv3 and CC BY texts plus the retained GPLv2 text,
the boundary map and a per-file
`license-map.json`, and checks the assembled files before writing the archive.
`verify-beta-release.py` checks the actual archive again. Source companions carry
the policy and texts. These checks supplement the existing source correspondence
and engine-configuration gates; they do not replace them or establish legal approval.

Ship the runtime archive and its matching `demuxe-*-source.tar.gz` together from the
same download location. The source companion must contain:

- The exact demuxe source revision, native wrappers, browser bindings, patches,
  build scripts, source/toolchain locks, package lock, notices and font asset.
- Every SHA-256-verified upstream archive in `sources.lock.json`, including the
  SDK installer source, plus the actual installed Emscripten sources and runtime
  library sources used in the build (excluding compiler caches).
- Actual FFmpeg configuration headers and configure arguments, mpv configuration,
  compiler/tool versions and hashes, the build log, and the engine build record.
- Instructions to rebuild all engines and to relink the remux wrapper with a
  modified FFmpeg. The supplied wrapper source and link command are part of the
  static LGPL relinking materials; do not remove them from the source companion.

The release manifest binds both archives to the source revision and engine hashes.
Archive assembly must fail if the linked configuration or inputs disagree with the
build record. Notices alone and a link to generic upstream sources do not substitute
for matching source/build materials. Keep the companion downloadable alongside the
runtime for recipients; do not rely on an unfulfilled written-source offer.

The public download page and integrator documentation must identify the GPL engines
and LGPL remux library and link the matching source archive. Preserve license texts,
copyright notices and change identification when redistributing. Do not impose terms
that conflict with the supplied licenses, including restrictions on the LGPL rights
to modify/relink and debug those modifications.

The build audit establishes the inputs/configuration and presence of these materials.
It does not establish legal approval of a particular host application, EULA, store,
patent jurisdiction, or distribution arrangement. Have those arrangements reviewed
where needed, especially before embedding the GPL engines in a proprietary product.

References: [FFmpeg's license and distribution guidance](https://ffmpeg.org/legal.html),
[mpv's copyright and licensing statement](https://github.com/mpv-player/mpv/blob/v0.40.0/Copyright),
[GPL version 3](https://www.gnu.org/licenses/gpl-3.0.html),
[LGPL version 2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html).

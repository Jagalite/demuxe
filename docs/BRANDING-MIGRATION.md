<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Beta.3 branding and migration audit

Public package/executable: `demuxe`. Component: `<demuxe-player>`; exported class:
`DemuxePlayerElement`. CSS variables use `--demuxe-*`. There is no legacy element
alias: no public Demuxe npm release previously established that name.

## Deplexr to Demuxe

The attempted first publication as `deplexr` was rejected by npm's name-similarity
check. It was never published. The replacement identity is `demuxe`; version
`0.3.0-beta.3` remains the first proposed npm beta for this new package name.

Update imports from `deplexr` and `deplexr/player` to `demuxe` and `demuxe/player`,
the executable to `demuxe`, `<deplexr-player>` to `<demuxe-player>`,
`DeplexrPlayerElement` to `DemuxePlayerElement`, and `--deplexr-*` variables to
`--demuxe-*`. Asset examples now use `/assets/demuxe/`. Recopy assets with the new
CLI into a fresh directory so the `demuxe-runtime.json` manifest describes them.
Public `DEPLEXR_*` environment knobs become `DEMUXE_*`; older internal `WEBMPV_*`
fallbacks remain as documented below. No Deplexr component or CSS aliases remain.

The repository is `Jagalite/demuxe`. Historical Git commits, release tags, archive
filenames, checksums and result records retain their original identity. They do
not qualify renamed package bytes; a new clean tagged candidate must be built and
tested before publishing Demuxe. The active local checkout directory may retain
its old name until the workspace is reopened at a new location.

The CLI is `bin/demuxe.mjs`; copied assets record `demuxe-runtime.json`. AudioWorklet
registration and internal browser virtual URLs migrated together. Engine filenames
remain `player.mjs`, `player.wasm`, `remux.mjs`, `remux.wasm`; their native C symbols
and upstream names are not a public package identity and are preserved.

Public docs, examples, install paths and package/source archive names use Demuxe.
The following historical names are intentionally retained:

* `LICENSE` and `docs/LICENSING.md`: the original copyright holder text remains
  verbatim. Renaming a product does not rewrite attribution.
* `results/`, `docs/validation/`, `docs/HANDOFF.md`, and experimental Markdown:
  historical evidence, commands, paths and old artifact identities retain provenance.
* `native/`, `patches/`, experimental native hooks: `webmpv_*` private C ABI symbols
  remain to avoid cosmetic native changes. The source companion includes these
  preferred sources and historical materials for GPL correspondence.
* No legacy branded runtime filename or public custom-element alias is shipped.

## Environment variable classification

Maintained public knobs: `DEMUXE_SDK`, `DEMUXE_JOBS`, `DEMUXE_DECODER_SIMD`,
`DEMUXE_REMUX_FFMPEG_DIR`, `DEMUXE_TEST_MEDIA`. Their old spellings remain fallback
aliases in existing consumers; the new spelling wins. The standard clean-release
recipe fixes the decoder/remux profile, regardless of optional overrides.

`DEMUXE_RUNTIME_ROOT` is an internal qualification server mount used to test the
installed archive, never a runtime API. Other unprefixed test knobs (`BETA_ARCHIVE`,
`BROWSER`, `STREAMING_FIXTURE`, etc.) remain unchanged.

The remaining legacy environment names are internal build/experimental harness
wiring. Migrating their recorded configure scripts and historical experiments is
technical debt, not a public runtime requirement. Inventory at this revision:

* `WEBMPV_AUDIO_BRIDGE_H`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_BROWSER_DECODER`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_BROWSER_DECODER1`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_CACHE`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_DECODER_SIMD`: temporary compatibility alias.
* `WEBMPV_DECODER_SIMD0`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_EM_CONFIG`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_ENGINE_DIR`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_FFMPEG_OBJ`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_FULL_MANIFEST_DIR`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_JOBS`: temporary compatibility alias.
* `WEBMPV_KERNEL_OPT`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_LINK_OPT`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_MANIFEST_DIR`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_ORIGIN`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_PERFORMANCE_CONFIG`: internal build/experiment variable; retained for beta.3.
* `WEBMPV_REMUX_FFMPEG_DIR`: temporary compatibility alias.
* `WEBMPV_SDK`: temporary compatibility alias.
* `WEBMPV_TEST_MEDIA`: temporary compatibility alias.

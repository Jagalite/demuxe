<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Current-provider delivery evidence

`summary.json` binds final local artifacts, source companion and validation.
The worktree is `/Volumes/seed2/Projects/demuxe-media-components`, branch
`modular-media-providers`; consolidation checkpoint is `ea98201f`.

Passing validation:

* 84 focused Node tests and 24 Python licensing/archive/deployment tests.
* 16 installed-package deployment cases in Chrome and 16 in Firefox, including
  actual output pixels, selective audio, preparation, preview, fallback ordering,
  missing modules/assets, wrong identities and corrupt bytes.
* All 21 legacy Player API cases; bundled/unbundled CDN worker and playback checks.
* Clean core install: SSR, all public TypeScript exports, provider-free bundle,
  native playback from bundled and unbundled entry points.
* All 42 copied runtime assets retain their previous hashes.

`qualification-*.json` is the immutable candidate evidence pinned by the core
build registry. `browser-*.json` tests the final archives, including their added
notices and matching source companion. The final core bytes and optional runtime
implementation identities equal those in qualification evidence. The archive
metadata/source companion differs deliberately from earlier candidate packages.

Local archives (ignored build outputs, not published or committed binaries):

```text
build/media-components/player-core/demuxe-0.3.0-beta.4.tgz
build/media-components/provider-ffmpeg-v2/demuxe-provider-ffmpeg-0.3.0-beta.4.tgz
build/media-components/provider-mpv-v2/demuxe-provider-mpv-0.3.0-beta.4.tgz
build/media-components/provenance/pthread-providers-source-v2.tar.gz
```

The native source companion contains 8,888 files, including all 143 recorded
native source inputs and 8,562 Emscripten source files. The original native record
retains its dirty-build status. These artifacts establish local delivery, not
fresh clean-release provenance, npm publication, performance or all-media claims.

See the [distribution instructions](../../../docs/PROVIDER-DISTRIBUTION-DRAFT.md)
for composing installed packages into an explicit asset deployment.

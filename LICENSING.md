<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe license boundaries

| Material | License |
| --- | --- |
| Current original Demuxe application, runtime, router, API, UI and public engine bridges | **Apache-2.0** |
| Original code compiled against mpv internals | **LGPL-2.1-or-later** |
| Bundled modified mpv and FFmpeg engines in the next qualified build | **LGPL-2.1-or-later**, subject to their upstream file notices |
| Original research reports, documentation and published result data | **CC BY 4.0** |
| Other dependencies, fonts, media, patches and archived source | Their existing licenses and notices |

The `demuxe` package's `license: "Apache-2.0"` describes original Demuxe
application code. Its bundled statically linked WASM media engines have separate
LGPL terms. It does not grant an Apache license to mpv, FFmpeg or other third-party
code. The previously bundled optional audio-preparation and Native ASS engines
must also be freshly rebuilt and retain each linked component's terms.
[The detailed policy](docs/LICENSING.md), [boundary map](licensing/boundaries.json),
[third-party notices](third_party/notices.json) and packaged `license-map.json`
identify each part. The separately assembled `demuxe-core` package remains
Apache-2.0.

Previously published GPL Demuxe releases and their binaries keep the licenses
granted with those releases. This migration applies only to newly built artifacts
that pass the generated-configuration, linker-map, source-correspondence and
playback qualification gates. The GPL license texts and historical source notices
remain available and do not imply GPL code is in the new LGPL engines.

Original code copyright: Copyright (C) 2026 webmpv contributors. This historical
credit is retained after the Demuxe rename. Reports are attributed to Demuxe
contributors; give the report title, source link and revision/date when available,
link https://creativecommons.org/licenses/by/4.0/, and indicate changes. Code
examples retain the license of the software they illustrate.

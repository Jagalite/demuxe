<!-- SPDX-License-Identifier: MIT -->
# Review follow-up package qualification

Two review findings are repaired: cooperative source seekability now reaches
public timeline/loop/range controls, and modular playback consumes provider-verified
manifest, Wasm, glue and default-font bytes. The worker imports verified glue from
a temporary Blob URL, which is revoked after module import.

The immutable runtime/source archives in `review-package-02` are bound to source
commit `ef838b4f501166ccc95b159c7deba21eececa7ad` and local tag
`qualification/nonisolated-review-20260930-02`. `qualification.json` records their
hashes, 331 verified runtime files and 12,763 verified source files. Native inputs
and isolated RGB/YUV/Hybrid binaries are unchanged from the preceding qualification.

All 110 focused source checks and 21 browser checks passed. Chromium 152 (T3)
passed eight positive cases and six corruption cases across JSPI/Asyncify;
Firefox 146 passed four positive cases and three corruption cases with Asyncify.
Positive cases cover both public Software/Hybrid modes, legacy and modular assets,
seekable state/capability, seeks, range and whole-file loops, playback ranges,
progress and destruction. Negative cases corrupt the provider manifest, Wasm or
glue and require ASSET_LOAD_FAILED. The modular fixture supplies an explicit core
identity registry derived from the exact package engine/font assets; it does not
claim separately built provider npm archives were qualified.

The reports' survivingBlobURLs counter observes the main page only; worker glue
URL disposal is established by the loader's finally block, not that counter.
The server and Firefox commands are the three maintained review harness files
under ../../tests/. The fixture is the existing independent H.264/AC-3 six-second
file identified by SHA-256 in both browser reports. This follow-up qualifies the
JavaScript changes; it does not repeat the preceding 99-case codec/audio/subtitle
matrix or extend the established browser/format/resource limits. Full CPU
benchmarks remain excluded. Initial setup failures are retained in rejected/.

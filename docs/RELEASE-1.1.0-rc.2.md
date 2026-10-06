<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# 1.1.0-rc.2 candidate

This candidate includes the functional-core policy migration, adversarial async coverage, and live boundary checks added since 1.1.0-rc.1. Release preparation is in progress; previous candidate archives and receipts do not qualify these bytes.

The release gate now requires all 19 boundary scenarios in Chromium, Firefox and WebKit against independent offline installations of the exact archive. Each installation verifies its complete runtime inventory. The final verifier requires complete successful scenario receipts, matching archive and source identities, and matching harness, fixture and served runtime hashes. Missing, partial, negative-control and stale results fail qualification.

The modular core and mpv provider explicitly include the shared async policy; the core includes the playback deadline policy. Existing browser, streaming, Shaka, optional-runtime, source/license and complete correctness catalogue gates remain mandatory. Performance and endurance remain optional under RELEASE.md.

Local preparation uses an isolated checkout at `/Volumes/seed2/Projects/demuxe-release-1.1.0-rc.2-20261005`. Final candidate revision, archive hashes and qualification results must be recorded after the clean build and exact-archive checks complete. No publication or npm staging is implied by this document.

Preparation checks: 3,415 unit tests and consumer typechecks passed (`results/api-stability/gate-unit-all-node-1791247004770/result.json`). Core package compilation, shared core/mpv emitted-byte comparison, functional-core static boundary checks, native portability preflight with two negative controls, and release/package guard tests passed. These checks do not qualify an archive.

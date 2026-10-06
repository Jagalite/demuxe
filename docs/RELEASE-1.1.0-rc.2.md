<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# 1.1.0-rc.2 candidate

This candidate includes the functional-core policy migration, adversarial async coverage, and live boundary checks added since 1.1.0-rc.1. Release preparation is in progress; previous candidate archives and receipts do not qualify these bytes.

The release gate now requires all 19 boundary scenarios in Chromium, Firefox and WebKit against independent offline installations of the exact archive. Each installation verifies its complete runtime inventory. The final verifier requires complete successful scenario receipts, matching archive and source identities, and matching harness, fixture and served runtime hashes. Missing, partial, negative-control and stale results fail qualification.

The modular core and mpv provider explicitly include the shared async policy; the core includes the playback deadline policy. Existing browser, streaming, Shaka, optional-runtime, source/license and complete correctness catalogue gates remain mandatory. Performance and endurance remain optional under RELEASE.md.

Local preparation uses an isolated checkout at `/Volumes/seed2/Projects/demuxe-release-1.1.0-rc.2-20261005`. Final candidate revision, archive hashes and qualification results must be recorded after the clean build and exact-archive checks complete. No publication or npm staging is implied by this document.

Preparation checks: 3,415 unit tests and consumer typechecks passed (`results/api-stability/gate-unit-all-node-1791247004770/result.json`). Core package compilation, shared core/mpv emitted-byte comparison, functional-core static boundary checks, native portability preflight with two negative controls, and release/package guard tests passed. These checks do not qualify an archive.

Source-boundary reruns: Chromium and Firefox each passed 19/19 when run individually, and WebKit passed 19/19. The initial concurrent Chromium and Firefox runs hit the existing 1.5-second preview decode deadline; those failed receipts remain retained. No timeout or assertion was relaxed. The archive release gate runs browsers sequentially. This source evidence does not replace installed-archive qualification.

LTS validation: Node 22.23.3 and Node 24.21.0 each passed all 3,415 tests and consumer typechecks (`gate-unit-all-node-1791248072503` and `gate-unit-all-node-1791248072714`). The first Node 24 run exposed eager Playwright loading before unsupported-browser validation. Validation now precedes that import, with an import-blocking regression; no test deadline was extended.

After adding direct archive support to the maintained API gate, Node 22 and Node 24 each passed 3,416 tests and consumer typechecks (`gate-unit-all-node-1791249091832` and `gate-unit-all-node-1791249091803`). The added regression proves that a missing archive cannot silently use an ambient source runtime. The tagged workflow now also requires all six API shards in Chromium and Firefox against the installed archive before retaining publishable artifacts.

Archive preparation exposed a missing `playback-deadlines.js` entry in the mpv provider manifest. The corrected package passed its real source/archive audit; a fresh-compiler import-closure regression now catches this omission without a native build. The three compiler/provenance tests pass on Node 22 and 24. Both LTS versions also passed the 3,416-test gate and typechecks again (`gate-unit-all-node-1791253053519` and `gate-unit-all-node-1791252778577`).

Demo preflight exposed an incorrect narrow-screen test expectation: the settings panel intentionally hides transport controls. The test now checks the open panel and settled responsive visibility, then requires visible transport controls after dismissal. Chromium and Firefox each passed all nine trials with the corrected test. Final tagged archive qualification remains required. A DTS-HD compiler configuration attempt failed when internal scratch space ran out; retries use external scratch space and preserve the original failure log.

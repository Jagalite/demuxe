<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# 1.1.0-rc.2 release readiness

Local qualification completed on 2026-10-06 for **`v1.1.0-rc.2` at `842ec2cffba3a185d36b6202a311159861935bcd`**. The canonical verifier passed, followed by all 12 installed-archive API shards. This is a qualified functional developer-beta candidate; the remote Linux tag workflow and publication have not run.

The candidate includes the functional-core policy migration, adversarial asynchronous state coverage, installed-browser boundary gates, corrected modular package dependencies, and stricter release-report validation. The tested tag and archive are frozen. These closeout notes and publishing-guide corrections are subsequent documentation and do not change the qualified source identity.

## Exact artifacts

Artifacts are retained in `/Volumes/seed2/Projects/demuxe-release-1.1.0-rc.2-20261006/build/release/`.

| File | SHA-256 |
| --- | --- |
| `demuxe-1.1.0-rc.2.tgz` | `0d1bcf68b9feb578d0ba38716acf1fe001e04af37b6fe577494e944b3cb55f55` |
| `demuxe-1.1.0-rc.2-source.tar.gz` | `680b39621abab9bb29c3a9afe24dc8e63533f8326d851de72553c8651bfb73ea` |
| `demuxe-audio-adaptation-source.tar.gz` | `064652646e9f5330d604d3fd292f208add25da96168cd91c556f7a4f3c4275d7` |
| `verification.json` | `920054cfb2b0f5318b4e34ea858b7c8701d108d95108c7acb5b8623e4b140e34` |
| `qualification-evidence.tar.gz` | `f27a30200417622432f0ea10aef8f5437673205375883370902bbd3cb1f9dfe2` |
| `archive-api-matrix.json` | `e6ca4e1a3db65a8634f46cafbd4125d2e2bd4effc8496ab3a20b82ac0522e3b9` |
| `supplementary-evidence.tar.gz` | `43f8a16fdfea3027d03f44088a64c1d003edd8e7c7ec7483f2d5dfe095ca9d70` |

`SHA256SUMS` also covers the clean build record, fixture recipes, release manifest, and archived deadline-test log. The supplementary archive contains 339 files with a hash inventory: API shard receipts and underlying reports, Pages results, provider audit receipts, native reproducibility evidence, and source-test logs. It supplements the canonical verifier; it does not expand that verifier's claims. Distribute these tested bytes without repackaging.

## Completed checks

Paths below are relative to the qualification worktree unless stated otherwise.

| Layer | Result | Evidence |
| --- | --- | --- |
| Clean standard/private native build and optional audio preparation | Passed; source correspondence and LGPL closure verified | `build/clean-build.log`, `build/beta-build.json`, `build/lgpl-closure.json`, `build/tag-release/adaptation/latest.json` |
| Independent clean-build comparison | All 32 native JS/Wasm code artifacts reproduced byte-for-byte | `build/native-reproducibility.json` |
| Installed consumers | 38/38 in Chrome and 38/38 in Firefox | `results/beta/consumer-*-2026-10-06*/result.json` |
| Installed streaming | 6/6 in each browser | `results/beta/streaming-*-2026-10-06*/result.json` |
| Shaka package | 4/4 in each browser | `results/shaka-package/*-2026-10-06*/result.json` |
| Public API, component, CLI, exports, types and boundaries | All 11 release-extra jobs passed, including 19/19 boundaries in Chromium, Firefox and WebKit | `results/release-extra/2026-10-06T06-43-38.613Z/result.json` |
| Optional runtime | 30/30 checks passed | `build/tag-release/optional/qualification.json` |
| Complete README catalogue | All 80 rows compared; qualified with zero regressions | `build/tag-release/catalogue-comparison.json` |
| Archived reader deadline regressions | 11/11 passed | `build/release/deadline-tests.txt` |
| Publication handoff validation | Passed in validation-only mode; no staging | `build/release-handoff-validation.log` |
| Installed API matrix | 12/12: core, UI, integration, preview, sequences and streaming in Chromium and Firefox | `results/api-stability/archive-matrix-1791273832222/result.json` |
| Assembled Pages demo | 9/9 trials in each browser | `results/pages/chromium-2026-10-06T06-27-57.120Z/result.json`, `results/pages/firefox-2026-10-06T06-28-22.705Z/result.json` |
| Provider package collection | 35 providers plus matching core collected after package/source audits | `build/bundle-ci-inputs/bundle-ci-inventory.json` |

The catalogue ran both lanes in headless Chrome 154 with matching fixture bytes. The baseline recorded **58 passed, five failed, 17 limited**; the candidate recorded **63 passed, zero failed, 17 limited**. Eight limited rows also passed their bounded playback screen. The comparison therefore records 71 passing screens, nine remaining blocked rows, zero newly blocked rows and zero changed pre-existing limitations. All five baseline failures passed on the candidate: HEVC/PGS, HLS fMP4, HLS HEVC, dual-audio selection and isolated PGS. This is not an 80/80 universal-format support claim.

Provider evidence has a separate scope. The 31 codec/container/Shaka packages reuse verified source-identical native artifacts and reproduce the preflight archives exactly; their current-revision audits and applicable audio ABI/lifecycle checks passed. The four broad FFmpeg/mpv providers use freshly built native engines. The collection is package/provenance evidence, not an exhaustive browser matrix for every provider combination. Its core archive is distinct from the full release runtime.

Pages also uses its own assembled-site package, with runtime package SHA-256 `76c341a889258691f1465a2fdc551f2d82f858a342ae4de91be5fe6c756469ed`. Its 18 trials are site evidence, not a substitute for the installed release-archive checks.

## Source tests and retained diagnostics

Node 22.23.3 and Node 24.21.0 each passed 3,416 unit tests and consumer typechecks at `9ea40a82`, before the final catalogue-completion guard commit. Main-checkout receipts are `results/api-stability/gate-unit-all-node-1791264634133/result.json` and `gate-unit-all-node-1791264581262/result.json`. The final guard changes at `842ec2cf` passed all nine completion/rate tests on both LTS versions and all 19 Python release-guard tests. Ten catalogue-comparison tests also passed. These source tests are separately identified from archive qualification.

The earlier preflight worktree, `/Volumes/seed2/Projects/demuxe-release-1.1.0-rc.2-20261005`, retains its failed reports. Its H.264/E-AC-3 rate screen assigned IPC read times to older cached public positions; actual media progression measured approximately 1.247–1.249x. The corrected harness timestamps observed public-position updates, bounds observation uncertainty, and retains the existing acceptance limits. Live positive checks passed on baseline and candidate routes; forcing an ignored 1x rate setter failed both routes as expected. No original failed receipt was overwritten.

The wrapper now permits completed catalogue exit status 1 only when finalized reports, expected cases, counts and completion hashes agree. The strict comparison still rejects regressions and changed limits. A full catalogue without browser identity or any successful playback screen fails separately. The final complete candidate run passed under these guards.

## Remaining release steps and limits

- Run the clean Linux tag-to-release workflow in GitHub Actions when publication is authorized. Its remote build produces its own exact archives, which must pass the same gates; local evidence does not qualify different remote bytes.
- Publish the qualified runtime, matching source companions, checksums and evidence together. Stage the verified npm archive for `latest`; maintainer approval and 2FA make it public. No push, GitHub Release, Pages deployment, npm staging or publication was performed during this local qualification.
- Full Safari and physical mobile coverage, physical HDR/tone mapping, lossless/discrete surround and object-audio fidelity remain outside these results. Automated WebKit passed the 19 boundary scenarios; that is not full Safari qualification.
- The API inventory still labels all 222 runtime items as mapped-partial and none as exhaustive. Passing the maintained matrix does not prove every API input, interleaving or browser/device behavior.
- Performance and endurance campaigns remain optional under [the release policy](RELEASE.md); this candidate makes no new measured performance or endurance claim.

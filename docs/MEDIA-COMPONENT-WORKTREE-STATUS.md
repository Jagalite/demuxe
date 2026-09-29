<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Media-component worktree: implementation status

Worktree: `/Volumes/seed2/Projects/demuxe-media-components`, now on branch `modular-media-providers`, based on `a97314baac60dd903a0b0ea102669097abb5aed2`. The user explicitly authorized including all current original-checkout work and assets. No integration commit, tag or push has been made. See [integration record](MEDIA-COMPONENT-INTEGRATION.md). The user authorized testing on September 28, 2026. TypeScript/generated output, 168 focused Node tests, 19 Python tests and Chrome/Firefox playback suites now pass; the integration record identifies exact artifacts and case subsets. Benchmarks remain deferred. This is partially validated implementation, not completed provider/runtime qualification.

## Provenance

The worktree began at `d8a6c65a` with only the provider plan imported. The [source inventory](media-component-source-baseline.json) remains historical provenance. On September 28, the user authorized consolidation: six newer original-checkout commits, 65 tracked edits/deletions and 1,595 untracked files were integrated without changing the original checkout. The local integration inventories retain imported hashes and merge actions.

The integrated source has 29 plan IDs. External subtitle rendering now uses the imported mpv service, and the recipe registry includes `native-transcode-ass`. Native recipe getters and the new subtitle source owner were reconciled in NativePlayer; existing admission/order remains authoritative. Policy-prohibited preparation now retains a policy rejection rather than being mislabeled as an unavailable deployment.

Dependencies are installed locally. All 16 engine directories, repository fixtures and the `build/fixtures` and `build/remux-fixtures-v1` trees were copied without shared symlinks: 82 files, approximately 242 MiB, with copy hashes recorded and eight available engine manifests verified. Engine build caches, old experiment asset snapshots and toolchains were not duplicated. Binary copy integrity does not establish full runtime/release qualification.

## Implemented in source

| Area | Source work | Activation |
| --- | --- | --- |
| Capabilities/providers | Logical semantic requests; separate technology/delivery; integrated FFmpeg/mpv and existing JS/browser offers | Internal metadata |
| Recipes | Explicit 29-plan table, guarded JS MP4 and FFmpeg binding descriptions, immutable execution profiles | Used by UnifiedPlayer.create and Native execution |
| Backend construction | Family, Native transport/adaptation, audio/subtitle flags and exact MSE-owner exceptions use recipes | Source integrated; existing loaders/admission retained |
| Deployment catalog | Versioned parser; explicit asset closure/hash expectations; missing/cyclic dependency rejection; immutable availability updates | Internal library; not loaded automatically by Player |
| Provider resolution | Exact qualified composition identities; scoped evidence; absent/pending/available/failed states | Internal library; not enabled in production discovery |
| Ordered provider stage | Admitted order; skips deployment gaps; holds pending candidates; propagates terminal errors | Internal library for later deployment integration |
| Final errors | Additive DEPLOYMENT_UNAVAILABLE code; existing deployment rejections retain typed final diagnostics; no compatibility caching | Source integrated; no new Player methods/options |
| Cost | Readiness fingerprints; whole-recipe measured-cost comparison with freshness, resource limits and uncertainty | Shadow/replay helper only; no production ranking |
| Acquisition | Scoped qualified resolution tickets; owner-driven verified asset loading; native/JS owners; cancellation and disposal | Internal library; no automatic Player deployment activation |
| Service imports | Deployment-relative existing mpv modules; lazy software preview import; cross-package typed error identity | Existing runtime owners and paths; browser regressions pass |
| Distribution | Full Apache core compiler/allowlist; audited tarball and clean consumer; strict optional-provider assembler | Core locally assembled and tested; optional engine packages and publication still gated |
| Regression coverage | Qualification/build isolation, absence/pending/failure, bundles, ordering, catalog integrity, cost uncertainty and recipe exceptions | Resolver and archive regression suites pass |

PLAYBACK_PLANS order, planAdmission, source inspection, output verification, synchronization algorithms and fallback execution retain their existing owners. Full mpv remains atomic. Final deployment errors deliberately become more precise; this is a diagnostic behavior change, not a claim of perfect behavioral parity.

## Retained subtleties

- NativePlayer.startRemux can try selectedMP4View for unadapted local files without selective audio before FFmpeg. A remux label does not prove FFmpeg/MSE ran. Binding inventories do not introduce a new trial order.
- native-remux-mpv and selective audio request window-owned MSE; native-transcode-mpv retains auto. This exception is preserved rather than generalized.
- Private and pthread mpv-audio services retain distinct clock/transport owners. JSPI/Asyncify retain current loader configuration with no new runtime retries.
- Source/transport/integrity/acquisition failures are distinct from catalog omissions. Unknown configuration remains pending; acquisition errors retain identity.
- Exact-plan replacement reports that plan's deployment rejection rather than an unrelated optional plan's rejection. Pinned discovery and final exhaustion keep deployment reasons.

## Remaining implementation and validation

1. Finish broader cross-browser and full media-matrix qualification. Generated JS/declarations are regenerated from the integrated source; see the integration record for new FFmpeg/mpv browser coverage.
2. Integrate catalogs with actual loaders and source/runtime-specific qualification records. Do not manufacture evidence from provides. The ordered provider resolver exists, but reduced deployments do not yet control Player discovery.
3. Assemble optional FFmpeg/mpv packages from exact matching build/source/relink inventories. The full Apache Player core is now assembled and tested; it is separate from the unchanged demuxe-core utility package. Optional templates still intentionally refuse publication.
4. Complete optional engine artifact ownership/provenance and installed-consumer qualification. Core compilation now emits its own reviewed closure and the exact core tarball passes a clean consumer; optional engines still require their native build/relink records.
5. Gather comparable whole-recipe cost evidence before enabling cost-aware selection. Helper outputs are not performance results.
6. Complete full browser/runtime/output/cleanup qualification before merge/release; the original checkout subtitle migration is now integrated.

Step 0 full behavior measurements remain incomplete. No native engine builds, performance measurements or publication occurred. A new full Player core tarball is now assembled and tested; optional FFmpeg/mpv npm artifacts are not. The legacy full-assets worktree remains usable independently.

## Provider delivery continuation

Evidence: `results/media-components/provider-delivery-20260928/`. This continuation passes 74 focused Node tests (including acquisition failure/cancellation, cross-package typed errors and ordered core/FFmpeg/mpv deployment simulations), nine archive/assembly regressions, and an actual core tarball/consumer. Browser reruns cover both CDN layouts, all 21 Player API cases, software previews, four Chrome Asyncify subtitle cases and two Firefox Asyncify subtitle cases. Exact package identities and final source hashes are in that directory's summary; these results do not enable new production routing or qualify optional npm releases.

The generic acquisition scope and actual service loader boundary are separate: the former returns verified bytes to configured owners; the latter retains existing module/worker behavior. Connecting the two requires real runtime owner adapters and qualification records, not a metadata-only availability claim.

## Initial validation before consolidation

Run date: September 28, 2026 (browser artifacts use September 29 UTC). All commands below completed successfully in this detached worktree.

- `npm ci --ignore-scripts`: installed locked dependencies; npm reported no known vulnerabilities.
- `npm run build`: TypeScript compilation and declaration regeneration, verified Shaka assets, source licenses/notices and existing 48-file core dependency boundary passed.
- `node --test tests/provider-resolution.mjs tests/plan-admission.mjs tests/tier-policy.mjs tests/native-selection.mjs tests/native-readiness-contracts.mjs tests/runtime-capability-contracts.mjs tests/shaka-backend.mjs tests/roadmap-contracts.mjs tests/preview-facade.mjs tests/public-api-state.mjs tests/integration.mjs`: 126 passed.
- `node --test tests/audio-worklet.mjs tests/retained-video.mjs tests/timing-coalescing.mjs tests/browser-media-capability.mjs tests/remux-packaging-contracts.mjs tests/track-policy.mjs tests/asset-deployment.mjs`: 36 passed.
- `python3 tests/provider-package-audit.py`: 6 passed against synthetic trusted-inventory archives; no real provider artifact audited.
- `python3 tests/licenses.py`: 13 passed, including existing utility-core archive/consumer and dependency-boundary regressions.
- `node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext tests/integration-types.ts`: passed.
- Additional `Policy.check()` with its path inventory set to `git ls-files --others --exclude-standard` passed. This covers new untracked source/metadata omitted by the maintained checker's tracked-file inventory, without staging files.
- `ONLY='native transactional' node tests/roadmap-browser.mjs`: 1 passed on Chrome 153.0.8010.53, covering initial position, rejected replacement and retained source identity. Artifact: `results/api-roadmap/chrome-1790641841703/result.json`.
- `HEADLESS=1 ONLY=roadmap node tests/shaka-lifecycle.mjs`: 2 passed on the same Chrome, covering quality/audio/position/attachment retention and live navigation/source ownership, including cleanup assertions. Artifact: `results/shaka/lifecycle-2026-09-29T00-30-49.725Z/result.json`.

Initial Node output is retained under `results/media-components/validation-20260928/`. That initial run required no fixes and had no FFmpeg/mpv assets. The later integration record supersedes that limitation and records the error-classification and harness fixes found with real runtimes. The complete playback matrix and WebKit remain unqualified; the integration record includes focused Firefox results.

## Files

- [Capabilities](../src/internal/execution-capabilities.ts), [providers](../src/internal/media-providers.ts), [recipes](../src/internal/execution-recipes.ts).
- [Catalog](../src/internal/provider-catalog.ts), [resolver](../src/internal/provider-resolution.ts), [ordered plan stage](../src/internal/provider-plan-resolution.ts), [deployment errors](../src/internal/provider-deployment-errors.ts), [cost comparison](../src/internal/provider-cost.ts).
- [Distribution draft](PROVIDER-DISTRIBUTION-DRAFT.md), [ownership policy](../licensing/provider-packages.json), [tarball auditor](../scripts/audit-provider-package.py), [resolver regressions](../tests/provider-resolution.mjs), [archive regressions](../tests/provider-package-audit.py).

## Imported-work license audit boundary

The maintained tracked-file license check passes. A separate audit of **all untracked files** reports 161 failures, all belonging to the original-checkout integration inventory (research snapshots, experimental/vendor files and an unclassified note). New files outside that inventory pass. Details are preserved in `results/media-components/provider-delivery-20260928/all-untracked-license-check.json`. These inherited files are excluded from the explicit core package allowlist; the exact core tarball audit passes. Their license/provenance issues must be reviewed before including them in any future distribution or source companion. No notices or historical evidence were relabeled to make the audit pass.

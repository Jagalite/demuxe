<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Combined media-component branch

Working directory: `/Volumes/seed2/Projects/demuxe-media-components`.
Branch: `modular-media-providers`.
Imported original-checkout HEAD: `a97314baac60dd903a0b0ea102669097abb5aed2`.

The user explicitly authorized including all current original-checkout work and
runtime assets. The original checkout was preserved. The branch fast-forwarded
from `d8a6c65a` through six README/evidence commits, then integrated 65 tracked
edits/deletions and 1,595 untracked files (approximately 651 MiB). These imported
changes and the provider implementation remain uncommitted; no tag or push was
made. This snapshot does not automatically follow later original-checkout edits.

## Reconciliation

The original subtitle migration, presentation components, release tooling,
experiments and evidence are included. The single textual conflict in
`NativePlayer` retained both the recipe-based configuration getters and the new
mpv subtitle source owner. The recipe inventory now covers all 29 plan IDs,
including `native-transcode-ass`; external ASS/SSA, SRT and rich WebVTT use the
mpv attachment service. Full mpv remains atomic, and deployment resolution/cost
ranking remain dormant libraries rather than new production routing policy.

Browser testing found that `nativeRemux: 'never'` was reported as an unavailable
deployment. Admission now distinguishes policy-prohibited preparation from
missing MSE/Web Audio, without changing eligibility or fallback ordering. A
four-plan regression checks both rejection categories. The subtitle audio observer now follows actual surface replacement and filters
measurements to the active element; the initial automatic-selection trial had
otherwise left it measuring retired media. Three browser harnesses
now use the existing process-exit observer rather than waiting indefinitely for
Chrome's close acknowledgement after process retirement.

## Local assets and provenance

All 16 `web/engine-*` directories and repository/playback fixtures were copied
locally, without shared symlinks: 82 files, approximately 242 MiB. Eight engine
manifests with embedded file hashes verified, and every copied file was hashed.
Dependencies are installed locally. Build caches, historical experiment asset
snapshots and compiler toolchains were not duplicated. This provides local
playback assets, not a complete offline rebuild or release-qualified package.

Local inventories and pre-merge backups are under
`build/media-component-integration/`:

- `runtime-assets.json`: source paths, copy hashes and verified manifests.
- `tracked-integration.json`: imported tracked hashes and merge actions.
- `untracked-integration.json`: imported untracked hashes and sizes.
- `original-snapshot/` and `provider-before/`: pre-merge source copies.

## Validation

Completed checks on the integrated source:

- TypeScript/generated build, license/core-boundary check and integration type contracts.
- 168 focused Node tests; 6 synthetic provider-package audit tests; 13 maintained license tests.
- 21 Chrome Player API cases covering Native/Hybrid/Software output, transactions, rollback and resource cleanup.
- 22 Chrome presentation cases covering layout/theme switching and retained Player ownership.
- 12 Chrome JSPI/Asyncify preparation-plus-subtitle cases (six isolated, six non-isolated), with active-surface audio RMS, visible subtitle pixels, seek/resume and worker cleanup.
- 14 runtime-selection cases, including missing assets, authorization failures and JSPI/Asyncify preparation.
- 10 Chrome external-subtitle cases across pthread, JSPI and Asyncify, with isolation variants.

The automatic-selection harness now waits for the pre-existing deferred promotion
after clearing filters, includes all available Native recovery plans, and captures
failure events rather than assuming the bounded 32-entry diagnostic history is
complete. No routing change was made to satisfy those tests.

The policy/deployment failure and stale-audio-probe failure are preserved in
initial run artifacts; corrected suites passed. The initial concurrent runs
that did not finish are not counted as completed suites. Four Firefox 146.0.1 external-subtitle cases also passed, covering isolated
pthread and non-isolated Asyncify. Eight focused automatic-selection checks passed across the final runs, including
full Hybrid fallback after injected failures in Direct, remux, FLAC24 and
selected mpv audio. All six non-isolated audio adaptation cases passed as well.

Validation logs and a machine-readable `summary.json` are retained under
`results/media-components/integration-validation-20260928/`. The summary links exact browser artifacts and distinguishes passing case subsets from passing whole suites. A post-run snapshot records 211 source/output/harness hashes. Runtime-selection coverage preceded the policy-code fix; the affected no-remux-policy case subsequently passed in the final admission and Player API suites. The broader media
matrix, WebKit, real provider-package extraction and exact package
qualification remain incomplete. No benchmarks have been run.

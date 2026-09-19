<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Ranked local screening — current checkpoint

The complete 17-item queue has a scoped disposition: **13 examined and four awaiting exact source reports**. One localized improvement, R47, is integrated and qualified for its stated local profile. No commit, push, release, default-route change or licensing change was made.

Start with the latest [follow-up.md](follow-up.md), [queue.md](queue.md), [full-queue-audit.md](full-queue-audit.md) and [r47-qualification.md](r47-qualification.md). The last record per stable key in `inventory.jsonl` is current. The original checkpoint is preserved at `runs/initial-baseline/checkpoint.md`.

## Integrated result

`web/native-remux-worker.js` reuses a sole full owned ArrayBuffer instead of gathering it into another allocation. Partial views, shared buffers and multiple pieces retain the existing copy. It reduced **gather-copy bytes by 96.2% on the small-fragment fixture**, with byte-identical captured output and unchanged append sizes. On the 1080p movie control, the reduction was **8.96%**, below the predeclared value threshold for that workload. These are copy counts, not CPU or latency gains.

The fresh remux/adaptation builds passed source/artifact verification. Baseline lossless cases and candidate correctness/lifecycle cases passed. Final integration passed **39 contract tests**, the maintained build/license checks, and default-served bounded-gain/source-identity/stale-generation browser checks. Qualification includes **100 lifecycle cycles and 1,801.927 seconds of soak with 142 EOF restarts** on headless Chrome 152/macOS/M1. Full scope and exclusions are in the qualification record.

R74 was reopened on a longer workload; its isolated bypass passed correctness and lifecycle controls but failed the declared complete-playback CPU value gate (−0.80% measured saving; approximate interval −2.97% to +1.23%, versus 5% required). R40's maintained UI already suppresses intermediate scrubs; R02 already retains direct preparation. R27 now has paired startup evidence against the unchanged worker: 14.10% aggregate improvement, but its 9.89–18.39% interval crosses the declared 10% threshold, so it remains inconclusive. R01, R48 and the remaining delivery/index/preview ideas have explicit findings and reopening conditions. No missing result is treated as passed.

## Remaining dependencies and limits

- R242-A needs `R239-R246-report.md`.
- R131 needs `R116-R131-report.md`.
- R274 and R272 need `R268-R275-report.md`.

Those report bytes are absent from the bundle and local search; the external file connector is not connected. The supplied bundle manifest hashes all verified, but a pointer alone does not resolve a mechanism's exact report hash.

The non-keyframe movie failure is now traced to the existing one-second preroll guard; Native direct passes. The exact caption-end behavior matches an independent plain browser video/track. Both follow-up diagnostics and the original failed checks are preserved. Broader browsers, physical audio output, full-length real-media endurance, required subtitles/ASS and release qualification remain outside this local profile.

## Evidence and reproduction

- Exact command history: `runs/engine-baseline/commands.log`.
- Toolchain/host: `runs/engine-baseline/environment.json`.
- Baseline runtime/source hashes: `runs/engine-baseline/runtime-manifest.json`; the prior worker snapshot is beside it.
- Final integrated identities: `runs/engine-baseline/closeout-manifest.json`.
- Variant and rollback patch: `r47-single-owned.patch`.
- Owned-buffer regression: `node --test tests/local-screening-r47.mjs`.
- Independent packet/output comparisons: `r47-reference-03`, `r47-candidate-01`, and both `r47-bbbkey060-*` run directories.
- Exact PCM wrong-output control: `runs/engine-baseline/wrong-output-control.json`.
- Long-run evidence: `runs/r47-endurance-01/result.json`.

Use a fresh `RESULT_ROOT` when rerunning browser harnesses. Matching built assets and recorded fixture bytes are required. Build outputs remain under ignored `build/local-screening/` and `web/engine-*`; the SDK was reused read-only with an isolated compiler cache. Initial source revision: `c5a82ca0346d1e27be8f8007d4a68585ababcb75`.

Movie captures retain Big Buck Bunny's CC BY 3.0 attribution; see `docs/MEDIA-NOTICES.md` and notices beside the captures.

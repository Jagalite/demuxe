<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Offer a non-pthread remux path without isolation

## Current status: Dropped / intentionally removed

JSPI/non-isolated remux was evaluated and intentionally removed from the production architecture. Its primary benefit was deployment compatibility without cross-origin isolation, while it introduced an additional Wasm runtime, invocation model, packaging path, qualification surface, and long-term maintenance burden. Maintenance complexity outweighs present production value; it did not materially advance Demuxe’s primary objective of maximizing native/near-native playback performance. The pthread runtime remains the maintained advanced Wasm runtime. Browser-native functionality remains usable without isolation. Revisit only if concrete deployment demand appears later.

Asyncify is not a replacement runtime in this decision. No new research or benchmarks were performed. See [runtime requirements and disposition](../../../docs/NON-ISOLATED-REMUX.md).

## Historical record — superseded production status

The text below describes earlier work only. References to integration, maintained assets, tests, and next actions are historical and no longer apply.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Offer a non-pthread remux path without isolation

## Production integration — 2026-09-21

**production_integrated**. Scoped non-isolated JSPI AVC/AAC TS remains integrated and qualified in the exact package. Its producer now feeds either worker-owned or window-owned MSE without being coupled to the window. No broader source admission or general speed claim.

[Maintained implementation](../../../docs/PRODUCTION-PIPELINE.md) · [Current qualification and tradeoffs](../../shared/runs/20260921T203100Z-production-pipeline/analysis.md). Release not published.

## Retained earlier research evidence


Full identity: `R006.offer-a-non-pthread-remux-path-without-isolation`.

Current decision: **already_implemented** (maintained_player_exact_package_integration).

Production integrated (scoped): the maintained public Player automatically uses the no-pthread JSPI runtime on non-isolated origins for finite single-video AVC / single-audio AAC MPEG-TS. Builds, inspection, bounded source reads, cancellation, seeking, source replacement, packaging and exact-archive release gates are integrated. Eleven non-isolated Chrome checks pass, including exact decoded pixels/PCM and cancellation after an observed pending Wasm read with an initialization-only negative control. Isolated pthread regressions and missing-JSPI rejection pass. Local working-tree implementation; no commit, deployment or release publication is claimed.

Next action: Maintain the production regression suite and complete normal clean-source release gates before publishing. Reopen broader containers/codecs only with their own timing, priming, output and lifecycle qualification. No whole-player speed improvement is claimed.

**Integration: production integrated (scoped). Release: not released.**

[Maintained implementation and deployment contract](../../../docs/NON-ISOLATED-REMUX.md) · [Production regression suite](../../../tests/remux-jspi.mjs)

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Maintained public Player exact-package output and lifecycle checks, real pending-read cancellation with negative control, isolated regressions and feature rejection passed; limited to finite single-video AVC / single-audio AAC MPEG-TS. |
| performance | passed | Seven fresh-owner alternating cost pairs preserve complete remux SHA256 versus independently verified host pixels/PCM. Resident acquisition median56.0ms; asynchronous15ms-per-request range reads median211.6ms; worst257.4ms below declared4021.333ms source-duration bound. Same actual nonisolated JSPI FFmpeg engine, all transfer/close/termination included. Parallel independent engines also return exact output; one-instance owner rejects conflicting call before entry. |
| results | passed | Production integrated (scoped): the maintained public Player automatically uses the no-pthread JSPI runtime on non-isolated origins for finite single-video AVC / single-audio AAC MPEG-TS. Builds, inspection, bounded source reads, cancellation, seeking, source replacement, packaging and exact-archive release gates are integrated. Eleven non-isolated Chrome checks pass, including exact decoded pixels/PCM and cancellation after an observed pending Wasm read with an initialization-only negative control. Isolated pthread regressions and missing-JSPI rejection pass. Local working-tree implementation; no commit, deployment or release publication is claimed. |
| decision | passed | Production integrated (scoped): the maintained public Player automatically uses the no-pthread JSPI runtime on non-isolated origins for finite single-video AVC / single-audio AAC MPEG-TS. Builds, inspection, bounded source reads, cancellation, seeking, source replacement, packaging and exact-archive release gates are integrated. Eleven non-isolated Chrome checks pass, including exact decoded pixels/PCM and cancellation after an observed pending Wasm read with an initialization-only negative control. Isolated pthread regressions and missing-JSPI rejection pass. Local working-tree implementation; no commit, deployment or release publication is claimed. |

[New run](../../shared/runs/20260921T194328Z-jspi-production-integration/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)

Repository validation: the new item evidence passes targeted integrity checks. [Global validation notes](../../../results/remux-jspi/research-verification-20260921T195313Z/README.md) retain unrelated historical mutable-runtime hash mismatches and subtitle-service SPDX failures.

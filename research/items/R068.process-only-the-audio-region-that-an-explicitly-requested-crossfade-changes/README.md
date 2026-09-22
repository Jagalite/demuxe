<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Process only the audio region that an explicitly requested crossfade changes

Full key: `R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes`

Current decision: **stop_current_profile** (2026-09-19T23:55:58.292833+00:00).

Actual explicit quarter-second integer linear crossfade between two96000sample monoS16/48kFLAC sources: 41 unaffected coded subframes copied,26368 aligned edge source samples decoded,14368 bridge samples encoded. Variable absolute frame headers and STREAMINFO rebuilt. All180000 output samples exactly match independent full decode/mix/encode oracle in host and Chrome; six libFLAC sample seeks and four native encoded seeks, render, EOF and owner cleanup pass. Wrong no-crossfade and source identity controls detected. Five alternating complete cold index/isolate/decode/mix/encode/reindex/reheader/write/consume jobs469.695ms vs full-render212.307ms ratio2.21234 fails0.9. Reduced processed samples are not a latency improvement.

Stop this Python/subprocess selective bridge profile on cost. A fused lower-overhead implementation or substantially longer unchanged spans can reopen with a new matched workload. This is actual audio component evidence only: no preserved-video queue mapping, MSE/Wasm integration, caption overlap or production admission claim.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T235558Z-flac-crossfade/run.json) · [Analysis](../../shared/runs/20260919T235558Z-flac-crossfade/analysis.md) · [Manifest](../../shared/runs/20260919T235558Z-flac-crossfade/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D51 — Express a requested crossfade in the browser audio graph**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch10_D48-D51/demuxe_batch10/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D51 — deferred_profile_followup**: New audio-edit crossfade capability is deferred with the decoded-audio scheduler; an ordinary native graph is the correct future baseline.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

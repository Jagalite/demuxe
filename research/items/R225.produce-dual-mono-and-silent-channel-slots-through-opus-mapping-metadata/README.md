<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Produce dual-mono and silent channel slots through Opus mapping metadata

Full key: `R225.produce-dual-mono-and-silent-channel-slots-through-opus-mapping-metadata`

Current decision: **stop_current_profile** (2026-09-20T00:08:53.289619+00:00).

Actual mono Opus mapping family1 streams1/coupled0 [0,0] and[0,255] retain coded packets, preskip/gain/endgranule. All96000stereo frames match same-consumer mono duplication/silence in Chrome and libopus, with native render/EOF/closed. Wrong source/intent/cancellation guards reject. Default FFmpeg native Opus decoder incorrectly zeros both channels for silent-right; that destination remains excluded and failed run is retained. With efficient strided PCM expansion baseline, complete cold remap/CRC/write/libopus consumption ratios1.11953 dualmono and1.29753 silent fail0.9. Earlier generator-based baseline diagnostic is retained but not accepted.

Stop this complete cold mapping/consumption cost profile. Metadata capability is real for Chrome/libopus, but default native FFmpeg silent-slot fidelity is not. Prepared packet mapping or another workload must separately remeasure; no spatial upmixing or production routing claim.

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

[Run](../../shared/runs/20260920T000853Z-opus-slots/run.json) · [Analysis](../../shared/runs/20260920T000853Z-opus-slots/analysis.md) · [Manifest](../../shared/runs/20260920T000853Z-opus-slots/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D26 — Explicit mono duplication and silent slots through Opus mapping**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch05_D26-D30/demuxe_batch5/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Regroup existing Opus frames without re-encoding

Full key: `R203.regroup-existing-opus-frames-without-re-encoding`

Current decision: **pursue** (2026-09-19T20:56:27.118329+00:00).

Matched20ms versus40ms codec packets with one packet per Ogg page preserve pinned full host/browser PCM and split-back frames. Real paced HTTP delivery reduces audio packet/page submissions101→51 (0.50495 ratio) and bytes5.8920%; median browser first audio2036.1→2040.8ms (+4.7ms) passes80ms budget. Measured complete adapter setup23.705→27.470ms yields cold first-output totals2060.440→2068.904ms, still within budget. Actual trials reach EOF with full response and cleanup.

Pursue restricted40ms grouping when packet/page submission reduction is valuable. This is a submission/byte/availability tradeoff versus one-packet-page20ms baseline, not a CPU or earlier-start claim; original FFmpeg Ogg mux remains smaller. Production routing, multistream and universal page policies are outside this profile.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T205627Z-opus-group-delivery/run.json) · [Analysis](../../shared/runs/20260919T205627Z-opus-group-delivery/analysis.md) · [Manifest](../../shared/runs/20260919T205627Z-opus-group-delivery/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D31 — Change packet grouping after startup rather than imposing one latency policy**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch06_D31-D35/demuxe_batch6/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.


## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D31 — deferred_profile_followup**: Retain the prior Opus grouping/delivery study. A dynamic grouping policy needs a real transport/latency workload, not default adoption from equal decoded samples.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

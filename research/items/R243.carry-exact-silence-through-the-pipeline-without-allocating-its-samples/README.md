<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Carry exact silence through the pipeline without allocating its samples

Full key: `R243.carry-exact-silence-through-the-pipeline-without-allocating-its-samples`

Current decision: **stop_current_profile** (2026-09-19T21:00:17.431150+00:00).

Actual unchanged PCMOutput renders all48000 float samples exactly from symbolic zero spans, retaining the three nonzero FIR tail samples. Media-clock versus underrun, epoch reset, close and nonlinear noise materialization controls pass. Explicit cached PCM payload1040bytes versus192000bytes meets8x reduction criterion, but complete scan/descriptor/materialize/playback median2.9885ms versus2.592417ms (1.152785x) fails1.10 time ceiling.

Stop this post-filter scan-to-spans-to-materialized-ring cost profile. Reopen with upstream certified symbolic intervals or a consumer that avoids ring materialization; this prototype does not avoid initial decoding/filter allocations, and explicit retained payload is not total process memory.

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

[Run](../../shared/runs/20260919T210017Z-symbolic-silence-cost/run.json) · [Analysis](../../shared/runs/20260919T210017Z-symbolic-silence-cost/analysis.md) · [Manifest](../../shared/runs/20260919T210017Z-symbolic-silence-cost/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D52 — Preserve explicit silent time with constant FLAC frames**: merge_existing. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch11_D52-D55/demuxe_batch11/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.

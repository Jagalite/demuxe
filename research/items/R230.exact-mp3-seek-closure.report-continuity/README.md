<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# exact MP3 seek closure

Full key: `R230.exact-mp3-seek-closure.report-continuity`

Current decision: **stop_current_profile** (2026-09-19T21:45:10.321305+00:00).

Fresh20 alternating seek queries to packets100/220 in pinned48k stereo128k no-Xing MP3 reproduce every continuous-reference float byte after3frame72ms preroll; no-preroll and wrong-source-identity controls reject. Five complete alternating batch pairs include cold ffprobe index/read/hash, tail file writes, decoder processes, PCM output and trim:778.862ms candidate versus750.574ms baseline, ratio1.03769 fails0.9. Initial overlapping cost run retained invalid; final isolated timings used.

Stop current host subprocess suffix-seek cost profile; exact closure remains demonstrated at these two targets. Reopen with persistent decoder/range reader implementation and independent exact PCM oracle, then rerun complete cost; no universal3frame guarantee.

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

[Run](../../shared/runs/20260919T214510Z-mp3-cost/run.json) · [Analysis](../../shared/runs/20260919T214510Z-mp3-cost/analysis.md) · [Manifest](../../shared/runs/20260919T214510Z-mp3-cost/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

Disposition vocabulary normalized 2026-09-19T21:48:27.630401+00:00; no new execution.

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D48 — Byte availability is not the complete MP3 output state**: stop/negative. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch10_D48-D51/demuxe_batch10/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.

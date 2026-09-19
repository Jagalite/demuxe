<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# reservoir-independent prepared MP3

Full identity: `R244.reservoir-independent-prepared-mp3.report-c`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Current packet-copy playback preserves source MP3 and does not author a no-reservoir encoding. Removing reservoir dependence changes preparation requirements and still leaves synthesis-state preroll, so it cannot make arbitrary MP3 packets independent.

Next action: For explicitly prepared seek-friendly MP3, compare no-reservoir and normal encodes at matched requested quality and verify exact suffix recovery after restart.

## Definition and contract

Matched six-second stereo Layer III files were encoded at 192 kb/s CBR with and without the LAME bit reservoir. Both are 144,866 bytes and contain 231 frames. At frame 120 the ordinary stream has main_data_begin=168; the prepared representation has zero. Every frame in the prepared file has main_data_begin=0, while 230/231 ordinary frames reference reservoir data. When each file is cut exactly at frame 120, the normal stream reaches a byte-exact PCM suffix after two decoded MP3 frames. The no-reservoir stream reaches the exact suffix after one. This reproduces the prior conclusion: removing the compressed-data back-reference removes one preroll dependency, but synthesis/filterbank state remains.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

Pending preparation/correctness/performance means the historical evidence has not
been converted into a stage acceptance record; it does not erase historical passes
or require rerunning them. Read the evidence before updating these fields.

## Working files

- [Item state and original definition](item.json): authoritative current metadata; update this README when changing it.
- [Decision history](history.jsonl): imported records and their exact ledger locations; append future decisions.
- [Evidence index](evidence/index.json): paths, hashes, and historical hash declarations.
- [Research process](../../PROCESS.md): run layout, gates, fixture and license requirements.

Create `tests/` and `fixtures/` only when this item needs its own code or data.
Shared historical harnesses remain in `tests/` at repository root; commands and
fixture references are in the linked evidence. No unverified harness-to-item
association was invented during migration.

## Archived evidence and definitions

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R244.reservoir-independent-prepared-mp3.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R244.reservoir-independent-prepared-mp3.report-c.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R244.reservoir-independent-prepared-mp3.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R244.reservoir-independent-prepared-mp3.report-c.md)

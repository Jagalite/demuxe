<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# packet-granular Ogg Opus repagination

Full identity: `R239.packet-granular-ogg-opus-repagination.report-c`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Maintained output builds/mux contracts target MP4/WebM, not Ogg page production. Historical one-packet pages preserved PCM but grew 8.52%; a parser/repage path needs a delivery-latency use case.

Next action: Measure source-page withholding on one actual Ogg delivery trace, then reconstruct only one-packet pages with exact packet/granule/CRC checks and truncated continuation rejection.

## Definition and contract

A four-second mono Opus fixture contains 201 audio packets in seven source pages. The rerun parser reconstructs Ogg pages with valid lacing, sequence numbers, CRCs and packet-end granule positions, using one audio packet per page after the two Opus header packets. All 203 packet hashes—including OpusHead and OpusTags—match. FFmpeg PCM is byte-identical. Chromium decodeAudioData returns 192,000 samples at 48 kHz for both files with the same complete float-buffer hash and probe samples. The cost is real: 62,100→67,392 bytes (+5,292 bytes, +8.52%). This proves a finer delivery representation, not a latency improvement by itself.

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
| decision | passed | Historical decision imported verbatim: DEFER_SETUP. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R239.packet-granular-ogg-opus-repagination.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R239.packet-granular-ogg-opus-repagination.report-c.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R239.packet-granular-ogg-opus-repagination.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R239.packet-granular-ogg-opus-repagination.report-c.md)

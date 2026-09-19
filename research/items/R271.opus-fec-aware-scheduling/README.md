<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Opus FEC-aware scheduling

Full identity: `R271.opus-fec-aware-scheduling`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Maintained path reads complete immutable file ranges and treats failed transport as an error; no real-time lossy Opus receive/PLC/FEC policy exists. Concealment changes exact file playback output.

Next action: Reopen only for explicitly permitted real-time concealment/latency policy; compare one actual loss FEC/PLC with original-packet reference and report nonexact output, not optimization of lossless file delivery.

## Definition and contract

A 48 kHz mono Opus stream used 20 ms packets with in-band FEC enabled. Packet 60 was treated as lost. Immediate PLC added no wait but produced −6.55 dB SNR for the lost frame. Waiting exactly one subsequent packet (20 ms) and requesting its in-band FEC improved that lost frame to +8.11 dB. The FEC result was still not exact. A modeled retransmission/rebuffer path that receives the original packet after 60 ms is exact by construction. This supports an explicit scheduling policy: FEC can buy materially better concealment for one bounded packet of latency, while exactness still requires original coded data. Network retransmission timing was modeled here, not measured from a real transport.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

## Current stage reconciliation

**stop_current_profile** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: stop_current_profile |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R271.opus-fec-aware-scheduling.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R271.opus-fec-aware-scheduling.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R271.opus-fec-aware-scheduling.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R271.opus-fec-aware-scheduling.md)

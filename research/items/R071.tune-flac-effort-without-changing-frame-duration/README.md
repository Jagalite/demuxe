<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Tune FLAC effort without changing frame duration

Full identity: `R071.tune-flac-effort-without-changing-frame-duration`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

No new matched Wasm compression-level experiment was run. Historical host level0 trades more bytes for little CPU saving and does not match maintained frame_size, so it cannot select the production level. Defer until preparation CPU is an actual bottleneck and level0/5 can be compared at identical frame duration including browser decode and bytes.

Next action: Write the exact requested signal operation, codec tool constraints, state and rounding contract. Check whether an optimized existing library already performs it.

## Definition and contract

Question. Does lower compression effort materially reduce preparation cost without an excessive byte penalty? This isolates encoder effort, rather than claiming another lossless audio route. The reviewed source already defaults DEMUXE_FLAC_LEVEL to 5. [D2] Two deterministic 30-second, 48 kHz stereo S16 signals were encoded at levels 0, 5 and 8 with a fixed 4,608-sample frame size. One is tonal; the other adds seeded noise. This fixed-frame-size host setup is not a matching production encoder configuration. All six decoded PCM hashes exactly match their source samples. Each output has 313 packets: full frames and a final 2,304-sample frame. The three tonal FLAC-in-MP4 browser variants pass playback, seeking and near-end/EOF observations. Their short stream-copy extracts are 4.032 seconds, not exact four-second cuts. Browser signal presence is not a complete bit-exact digital-output or physical-device audit.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R071.tune-flac-effort-without-changing-frame-duration.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R071.tune-flac-effort-without-changing-frame-duration.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R071.tune-flac-effort-without-changing-frame-duration.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R071.tune-flac-effort-without-changing-frame-duration.md)

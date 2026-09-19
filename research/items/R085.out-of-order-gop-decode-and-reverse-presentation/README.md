<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Out-of-order GOP decode and reverse presentation

Full identity: `R085.out-of-order-gop-decode-and-reverse-presentation`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The retained owner holds a bounded forward queue plus current frame, not independent GOP caches or reverse scheduling. Historical success used prepared independent GOP encodes and its concurrent decoder stress missed frames.

Next action: Scope a single closed-GOP reverse buffer with an explicit byte cap and exact frame IDs before parallel decode; include a non-independent GOP rejection.

## Definition and contract

The four-second source was prepared as four independent one-second closed-GOP clips. They were decoded in deliberate non-timeline order 3 → 1 → 2 → 0. Each GOP retained exactly 30 ImageBitmaps, including an explicit initial-frame snapshot plus presentation callbacks. The retained frames were then drawn without further media seeking or decoding in global order 119 → 118 → ... → 0. All 120 frame identities were unique and strictly descending. Independent GOP encodes remained visually close to the matching full-source regions: sampled mean absolute RGB error was 0 to about 0.57/255. A separate stress probe started all four GOP media elements concurrently. Callback counts were 29, 29, 27 and 27 rather than 30 each. Therefore the useful result is bounded independent-region decode plus retained reverse presentation—not a claim that arbitrarily many decoder instances can run concurrently without loss.

Output contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Primary metric: Time to the requested exact or explicitly approximate preview, total prerequisite work and retained state.

Adverse control: Move backward, request a non-RAP dependency, change source or cancel a pending request; stale previews must never become current.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R085.out-of-order-gop-decode-and-reverse-presentation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R085.out-of-order-gop-decode-and-reverse-presentation.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R085.out-of-order-gop-decode-and-reverse-presentation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R085.out-of-order-gop-decode-and-reverse-presentation.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md)

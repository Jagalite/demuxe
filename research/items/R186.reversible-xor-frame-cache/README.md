<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# reversible XOR frame cache

Full identity: `R186.reversible-xor-frame-cache`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current retained output is a bounded live VideoFrame map plus one redraw frame; it is not an archive of full decoded reverse-preview frames. A checkpoint/XOR/zlib representation would require an exact decoded-plane cache and eviction owner. The report also shows random data can exceed raw size.

Next action: If reverse-preview retention is requested, compare one bounded coherent and one incompressible real decoded sequence against both raw-cache traversal and persistent decode; cap representation growth and preserve checkpoint bridge reconstruction.

## Definition and contract

A four-second H.264 fixture was decoded to 120 actual 320×180 grayscale frames. The cache stores a checkpoint every 15 frames plus zlib-compressed XOR deltas; bridge deltas at checkpoint boundaries preserve exact reverse stepping. All sampled random reconstructions and the complete 119-step backward traversal were byte-exact. On this deliberately coherent moving-shape source: - raw full-frame cache: 6,912,000 bytes; - XOR/checkpoint representation: 12,595 bytes; - reduction: 99.82%; - full reverse traversal: 15.9 ms median; - re-decoding the source: 78.5 ms median; - raw full-cache pointer/index traversal: 0.01 ms median. The negative control matters: random incompressible frames produced a delta cache 1.059× larger than raw. This is a content-dependent reverse-playback cache, not a universal compact frame format.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R186.reversible-xor-frame-cache.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R186.reversible-xor-frame-cache.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R186.reversible-xor-frame-cache.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R186.reversible-xor-frame-cache.md)

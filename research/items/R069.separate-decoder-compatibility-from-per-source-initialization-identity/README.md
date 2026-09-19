<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Separate decoder compatibility from per-source initialization identity

Full identity: `R069.separate-decoder-compatibility-from-per-source-initialization-identity`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (top100).

Same-configuration configure occurs within semantic seek/reset clearing software buffers, replay, delivered/recovery and keyframe state. No redundant wrapper-only configure boundary exists in inspected owner. Do not suppress this reset.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

Reconfiguration-avoidance hypothesis · P2 · Risk: High · PROPOSED / NOT TESTED First environment: Sandbox decision/sequence checks; a meaningful production saving requires local reconfiguration instrumentation. Related cards: R36, R43, R27. Proposed mechanism. Use a strict decoder-configuration fingerprint to recognize when a new wrapper or initialization segment does not require replacing an entire playback backend. Maintain a DIFFERENT source/track/timeline identity and still append required initialization data. Begin with exact codec-extra-data equality, not speculative semantic rewriting of parameter sets. What is new. R27 shared immutable compiled code, while R43 crossed a real video configuration change. This asks whether harmless wrapper-level differences or object identity cause avoidable application reconfiguration when the complete codec contract is unchanged.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R069.separate-decoder-compatibility-from-per-source-initialization-identity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R069.separate-decoder-compatibility-from-per-source-initialization-identity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R069.separate-decoder-compatibility-from-per-source-initialization-identity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R069.separate-decoder-compatibility-from-per-source-initialization-identity.md)
- [results/top100/audits/R069.json](../../../results/top100/audits/R069.json)

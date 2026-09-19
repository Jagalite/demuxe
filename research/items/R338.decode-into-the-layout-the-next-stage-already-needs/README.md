<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode into the layout the next stage already needs

Full identity: `R338.decode-into-the-layout-the-next-stage-already-needs`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_CURRENT_ALLOCATION_VARIANT** (full-completion).

The cheaper R215 stride-aware upload already removes tested presenter row packing with exact pixels and no decoder allocator change. Do not add get_buffer2 ownership solely for that eliminated copy; reopen for other measured layouts/cost.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

Type: Software-decoder allocation/presentation optimization. Related: R215 and R298. Status: PROPOSED. Negotiate a decoder-valid, downstream-friendly allocation before reconstruction begins. Instead of decoding into one layout and then repacking an entire picture, let the decoder populate an allocation whose plane offsets and row strides already fit the selected consumer. FFmpeg's get_buffer2 contract permits custom reference-counted output buffers for qualified decoders. It also explicitly constrains alignment, dimensions, supported allocation capabilities, and later decoder ownership. This is existing direct-rendering machinery, not a new allocation API. [S1] The initial implementation would allocate ordinary CPU/Wasm-addressable storage. It does not make GPU memory a Wasm heap and does not promise zero-copy browser uploads.

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
| decision | passed | Historical decision imported verbatim: STOP_CURRENT_ALLOCATION_VARIANT. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R338.decode-into-the-layout-the-next-stage-already-needs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R338.decode-into-the-layout-the-next-stage-already-needs.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R338_R342_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R338_R342_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R338.decode-into-the-layout-the-next-stage-already-needs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R338.decode-into-the-layout-the-next-stage-already-needs.md)
- [results/full-completion/presentation/result.json](../../../results/full-completion/presentation/result.json)

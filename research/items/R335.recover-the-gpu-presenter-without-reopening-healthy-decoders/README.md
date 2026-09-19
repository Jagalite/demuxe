<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recover the GPU presenter without reopening healthy decoders

Full identity: `R335.recover-the-gpu-presenter-without-reopening-healthy-decoders`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual WebGPU device destruction/recreation preserves held decoded-frame redraw exactly; same VideoDecoder remains configured and emits the next timestamp. Worth independent presenter recovery. This is a small GPU owner prototype, not the current player integration.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

Proposal key: a246fb6ea7330c8dc6f9b8b354dc85a53e61eca8e83b71ad7b630aca72a435c0 Mechanism: Treat presentation-device loss as its own recovery scope. Recreate device-bound presentation resources while retaining independently verified healthy audio and decoding state, within strict frame-retention limits. Initial scope: One WebCodecs video path, a separately controlled audio clock, a WebGPU presenter, and test-injected presentation-device destruction. The initial contract permits a measured visible recovery gap and resumption at the current audio timeline. Acceptance contract: No stale-device resources or stale-source frames are published; surviving audio is not unnecessarily restarted; recovery output has the correct frame/time/configuration. All missed presentation intervals are counted. Decoder survival is observed, never assumed.

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
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R335.recover-the-gpu-presenter-without-reopening-healthy-decoders.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R335.recover-the-gpu-presenter-without-reopening-healthy-decoders.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R332_R337_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R332_R337_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R335.recover-the-gpu-presenter-without-reopening-healthy-decoders.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R335.recover-the-gpu-presenter-without-reopening-healthy-decoders.md)
- [results/top100/gpu/result.json](../../../results/top100/gpu/result.json)

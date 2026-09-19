<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Start with a bounded software prefix while browser decoding warms up

Full identity: `R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The old report lacked VideoDecoder in an insecure origin; the shared current secure probe resolves that API block. Current browser/software paths implement fallback rather than two simultaneously decoded branches with an explicit prefix handoff. A dual-owner same-clock protocol is new setup.

Next action: First specify video-only prefix limits and one handoff point in the retained presenter; compare adjacent handoff frame identities and immediate browser-win cancellation.

## Definition and contract

Use one existing controlled frame presenter and one audio clock. Feed the same qualified starting access point to a browser decoder and an already-available software decoder. Let software provide only a short startup prefix. Once the browser decoder has independently reconstructed a timely continuation, switch output ownership at an explicit presentation boundary and retire the software branch. No reference buffers are transferred. Both decoders receive complete dependencies from their own valid entry point. No ordinary HTML video element is assumed to hand its internal clock or decoding state to a software player. Start video-only to verify frame ownership, then integrate the same already-qualified audio path. Admit real A/V startup only after audio and video can proceed under one clock. Never produce speculative audio twice.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R358_R362_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R358_R362_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md)

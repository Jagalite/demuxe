<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Join, split or reorder independent FLAC channel subframes

Full identity: `R103.join-split-or-reorder-independent-flac-channel-subframes`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Maintained FLAC path decodes selected audio and admits mono/stereo; no residual-bit parser exposes independent subframes. Compressed channel selection is distinct from whole-track selection and needs new bounded framing/layout logic.

Next action: Parse one independently coded four-channel FLAC and copy two complete subframe bit ranges; compare every sample with decode-select-reencode and reject mid/side or mismatched blocks.

## Definition and contract

Question. Can a requested channel selection or synchronized channel assembly be produced without reconstructing all PCM samples? What differs from earlier work. Unlike R61, no PCM channel matrix is executed. Unlike packet-copy remux, this operates on coded channel subframes inside each FLAC frame. Mechanism. Parse the bit boundaries of independent channel subframes, preserve their coding bits, and rebuild the frame/channel metadata, alignment and checksums. Initial source profile. Independent-channel FLAC only; matching sample rate, effective depth, block boundaries and source sample positions. Start with two mono inputs and a four-channel independently coded input. Source basis. FLAC has per-channel subframes; stereo may instead use dependent mid/side forms, and subframes are not necessarily byte-aligned. [S1]

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R103.join-split-or-reorder-independent-flac-channel-subframes.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R103.join-split-or-reorder-independent-flac-channel-subframes.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R103.join-split-or-reorder-independent-flac-channel-subframes.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R103.join-split-or-reorder-independent-flac-channel-subframes.md)

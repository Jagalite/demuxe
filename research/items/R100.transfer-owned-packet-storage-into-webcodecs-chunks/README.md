<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Transfer owned packet storage into WebCodecs chunks

Full identity: `R100.transfer-owned-packet-storage-into-webcodecs-chunks`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: Whole-owned packet transfer detaches input, preserves chunk bytes and matches independent decoded I420. Shared heaps and oversized subviews reject at the candidate ownership guard. Normal maintained VP9 path already has zero owned packet bytes, so pursue only measured fallback/prefix branches, not global copying changes.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

Question. Can the browser retain already-owned encoded storage rather than allocating another packet copy? What differs from earlier work. Beyond R42 worker buffer recycling: target the chunk-constructor data copy rather than only postMessage ownership. Input scope. Standalone owned transferable ArrayBuffers containing complete valid codec units. Mechanism to test. Construct EncodedVideoChunk or EncodedAudioChunk with its data ArrayBuffer in the constructor transfer list, then decode normally. Smallest experiment. 1. Feature-test actual detachment and chunk contents on the target Chrome. 2. Compare copied construction and transferred construction with identical small and large packets. 3. Include subviews over oversized backing buffers to expose retained-memory tradeoffs.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R100.transfer-owned-packet-storage-into-webcodecs-chunks.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R100.transfer-owned-packet-storage-into-webcodecs-chunks.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R100.transfer-owned-packet-storage-into-webcodecs-chunks.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R100.transfer-owned-packet-storage-into-webcodecs-chunks.md)
- [results/full-completion/frame-boundaries/result.json](../../../results/full-completion/frame-boundaries/result.json)
- [results/full-completion/r332/result.json](../../../results/full-completion/r332/result.json)

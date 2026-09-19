<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Generate seek fragments without replaying a mux session

Full identity: `R296.generate-seek-fragments-without-replaying-a-mux-session`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current seeks use FFmpeg indexed av_seek_frame then reconstruct output state; the report pure constructor reassembles already-existing immutable moof recipes. There is no current sample-addressable construction recipe service, and its microbenchmark omits cold indexing and source costs.

Next action: First trace one repeated distant seek to isolate mux reconstruction cost; only then compare a single explicit recipe generated in order 50,3,51,3 with a mid-GOP rejection.

## Definition and contract

Type: Packet-copy mux architecture. First owner: Indexed-source construction harness, then browser integration. Related: R109, R162, R222. Hypothesis. Construct an output fragment from explicit immutable inputs: source identity, track configuration, source sample interval, output timeline mapping, fragment identity, and the required sample bytes. A seek should not require replaying unrelated earlier samples merely to rebuild a writer's mutable counters. Source basis. The ISO BMFF MSE byte-stream specification defines initialization segments, fragment-relative sample addressing, track-fragment decode times, and the requirement that referenced samples be present. MP4Box.js demonstrates fragment construction from sample descriptions, while also relying on session values such as a sequence counter and first decode time. Those values would need to become explicit inputs in this experiment. [S3, S4]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R296.generate-seek-fragments-without-replaying-a-mux-session.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R296.generate-seek-fragments-without-replaying-a-mux-session.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R296.generate-seek-fragments-without-replaying-a-mux-session.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R296.generate-seek-fragments-without-replaying-a-mux-session.md)

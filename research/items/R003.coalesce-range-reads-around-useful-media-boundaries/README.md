<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Coalesce range reads around useful media boundaries

Full identity: `R003.coalesce-range-reads-around-useful-media-boundaries`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: Actual remux read-window candidate reduced requests 73 to 24 while fetched bytes changed 4784128 to 5701632. Source identity replacement rejects, decoded-frame progress and distant seek pass, workers close. Worth a latency/abandoned-byte tradeoff study; this is not boundary-indexed coalescing or a CPU benchmark.

Next action: Locate one real repeated read/index/validation boundary and its trusted source identity. Separate logical requests from transferred or physical-disk bytes.

## Definition and contract

Delivery · New optimization hypothesis · P1 · Risk: Medium First environment: Host fixture server + browser. Dependencies: R01. Status: Untested hypothesis. Proposed mechanism. Use bounded adjacent-read coalescing and metadata/keyframe-aware prefetch rather than one network request per small AVIO read. Maintain separate budgets for startup metadata, active playback and speculative seek lookahead. Source basis. FFmpeg exposes probe and I/O buffering controls; increasing probe coverage may increase startup work. Streams defines consumer-driven backpressure. These do not choose Demuxe’s network chunk size for it. [F1, S1] First agent experiment. Compare fixed small chunks with adaptive coalescing on front-index MP4, tail-index MP4, MKV cues and interrupted seek scrubbing. Use the same range server with controlled latency; record received and abandoned bytes separately.

Output contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Primary metric: Total bytes and time to correct startup/target, including cold index/identity acquisition; bounded retained bytes.

Adverse control: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R003.coalesce-range-reads-around-useful-media-boundaries.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R003.coalesce-range-reads-around-useful-media-boundaries.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R003.coalesce-range-reads-around-useful-media-boundaries.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R003.coalesce-range-reads-around-useful-media-boundaries.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/r003-baseline-correction.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/r003-baseline-correction.md)
- [results/full-completion/remux-policies/result.json](../../../results/full-completion/remux-policies/result.json)

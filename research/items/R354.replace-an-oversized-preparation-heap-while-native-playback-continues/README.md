<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Replace an oversized preparation heap while native playback continues

Full identity: `R354.replace-an-oversized-preparation-heap-while-native-playback-continues`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

MediaSource lives on page while preparation uses a separate worker, so lifetime separation exists. Worker currently owns FFmpeg demux/mux state, not immutable continuation sample recipes. Historical 64 MiB scratch handoff is synthetic and no real temporary spike is established by that report.

Next action: First observe a genuine remux high-water spike; if present, specify one fragment continuation identity and compare keeping instance with safe replacement peak overlap.

## Definition and contract

Can a temporarily enlarged Wasm preparation instance be retired without reopening a healthy native presentation? WebAssembly memory can grow, and the JavaScript memory interface rejects attempts to resize its backing memory downward. Freeing an allocation can make its space reusable internally without reducing the memory object's length. This does not prove any particular resident-memory saving from worker replacement. [S3] Keep MediaSource, SourceBuffers, playback intent, source identity, and a validated sample index under a long-lived owner. Put only restartable packet-copy preparation in a replaceable worker with private memory. At a committed output-fragment boundary, record an explicit continuation recipe: next sample ordinals, track configuration, timeline mapping, fragment identity, and source version. Move any necessary surviving payload into independently owned storage. Initialize a fresh worker, verify its first continuation output, then commit the switch and retire the old worker. Do not export opaque decoder pointers or a raw Wasm heap snapshot.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R354.replace-an-oversized-preparation-heap-while-native-playback-continues.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R354.replace-an-oversized-preparation-heap-while-native-playback-continues.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R353_R357_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R353_R357_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R354.replace-an-oversized-preparation-heap-while-native-playback-continues.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R354.replace-an-oversized-preparation-heap-while-native-playback-continues.md)

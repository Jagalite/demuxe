<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# independently checkable remux construction record

Full identity: `R222.independently-checkable-remux-construction-record`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: Independent source/output byte ranges, packet timestamps and config hashes validate214 packets and reject wrong offset, swapped range, timing, configuration and stale source. Useful reproducible remux audit artifact, not performance gain.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

A normal H.264/AAC MP4 with B-frames was packet-copy remuxed to fragmented MP4. The construction record contains source/output identities, stream configuration hashes, source/output packet positions, payload hashes, DTS/PTS/duration mappings, composition offsets and top-level fragment structure. - 232/232 packet payloads correspond exactly (90 video + 142 audio); - H.264 and AAC configuration hashes match; - video composition offsets are preserved; - the output contains three moof fragments; - Chromium plays 90 frames and reaches EOF without a media error. 1. wrong source byte offset → packet_offset_mismatch; 2. swapped sample hashes → payload_hash_mismatch; 3. wrong composition/timing field → output_timing_mismatch; 4. changed codec configuration → codec_config_mismatch; 5. stale source identity → source_identity_mismatch.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R222.independently-checkable-remux-construction-record.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R222.independently-checkable-remux-construction-record.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R222.independently-checkable-remux-construction-record.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R222.independently-checkable-remux-construction-record.md)
- [results/full-completion/r222/result.json](../../../results/full-completion/r222/result.json)

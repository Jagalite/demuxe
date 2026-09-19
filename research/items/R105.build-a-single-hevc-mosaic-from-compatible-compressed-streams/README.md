<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Build a single HEVC mosaic from compatible compressed streams

Full identity: `R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current HEVC adapter carries existing configuration, not slice/tile merging. Shared current hvc1 query is positive, so historical blanket browser unavailability cannot be carried forward; motion-constrained inputs and a strict merger remain setup.

Next action: Provision two controlled motion-constrained tiles and a pinned strict merger, validate every reconstructed region before one exact browser HEVC configuration probe.

## Definition and contract

Type: Compressed-video composition. Priority: P1. Question. Can several synchronized, suitably constrained HEVC inputs become one coded mosaic? What differs from earlier work. R98 prepared a new atlas encode. This asks whether suitable coded regions can be merged into one decoder input without pixel composition and re-encoding. Mechanism. Combine compatible coded regions into a motion-constrained tiled HEVC stream by rebuilding parameter/slice geometry around retained coded tile data. Initial source profile. Start with equal, coding-unit-aligned dimensions, matching timing/GOP/configuration, and proven motion constraints. Do not accept arbitrary unrelated HEVC files. Source basis. GPAC supplies hevcmerge and tile split/aggregation tools. Strict configuration validation is optional in the merger and should be enabled; the splitter does not establish motion independence. [S3, S4]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams.md)

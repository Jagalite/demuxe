<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode a GOP once for exact reverse-frame playback

Full identity: `R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Playback delegates rate to the media element or persistent engine; no exact reverse-GOP frame cache/presenter is exposed. The historical 30-frame reverse hash exercise uses an intentionally repeated-seek baseline. A bounded reverse-preview owner and memory contract would be new setup.

Next action: If exact reverse preview is requested, scope one bounded GOP cache against current persistent decode, with independent frame hashes and a long/open-GOP rejection control; include all retained plane bytes.

## Definition and contract

A six-second 320×180 H.264 fixture used 30-frame GOPs. For frames 120–149, the candidate decoded the GOP once in forward dependency order, retained the 30 decoded YUV420 frames, and presented their hashes in reverse. All 30 matched the independently decoded full-stream oracle exactly. This validates a reverse-preview cache, not reversal of H.264 packet order. The speed comparison intentionally represents the bad-but-realistic repeated seek/decode fallback: 1925.06 ms versus 63.24 ms. Production value depends on a hard decoded-frame memory budget and GOP length.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R318-R323-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R318-R323-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity.md)

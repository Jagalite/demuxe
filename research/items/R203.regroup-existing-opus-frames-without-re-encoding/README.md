<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Regroup existing Opus frames without re-encoding

Full identity: `R203.regroup-existing-opus-frames-without-re-encoding`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Packet-copy remux has no libopus repacketizer owner. The report preserves PCM but its one-packet-per-page Ogg grows, so fewer packets alone is not a value decision.

Next action: Scope one same-configuration libopus repacketizer with an independent constituent-frame/PCM oracle; measure total container bytes and release delay, with incompatible frame configurations rejected.

## Definition and contract

301 20-ms Opus packets were repacketized into 151 packets using libopus. Constituent encoded frames were preserved and host 48-kHz decoded PCM is byte-identical. Chromium's 48-kHz decodeAudioData() output is also sample-identical, and both original/grouped Ogg presentations seek and advance without media error. The delivered Ogg writer uses one packet per page, so file size grew from 86,939 to 90,755 bytes despite the lower codec-packet count. This validates packet regrouping, not a bandwidth win or earlier availability. It does not create new random-access points.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R203.regroup-existing-opus-frames-without-re-encoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R203.regroup-existing-opus-frames-without-re-encoding.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R203.regroup-existing-opus-frames-without-re-encoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R203.regroup-existing-opus-frames-without-re-encoding.md)

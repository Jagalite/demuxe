<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# FLAC bit-depth promotion without sample reconstruction

Full identity: `R174.flac-bit-depth-promotion-without-sample-reconstruction`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current FLAC admission requires established 16/24-bit integer precision and ordinary encode, so 20-bit framing promotion is not present. The one-frame mono result needs a bounded subframe parser and truthful STREAMINFO/CRC rewriting.

Next action: Prototype only independent mono 20-to-24 wasted-bit promotion and compare normalized exact samples, rejecting decorrelated stereo and malformed residual bounds.

## Definition and contract

A valid one-frame mono 20-bit FLAC was transformed into 24-bit by declaring four wasted low bits and rebuilding framing/checksums while preserving the coded fixed-predictor payload bits. The destination therefore represents x24 = 16x20 exactly. Both files contain 4,096 samples; the normalized WAVE bytes are identical, and Chromium decodeAudioData() reports zero normalized difference over all samples. The source frame is 3,652 bytes and the promoted frame 3,653 bytes. This is genuine bitstream surgery, not a decode/re-encode round trip. Integration implication: bit-depth promotion can be metadata/framing work for admitted independent FLAC subframes. The current evidence is deliberately narrow: one mono profile, not stereo decorrelation or arbitrary FLAC frame forms.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R174.flac-bit-depth-promotion-without-sample-reconstruction.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R174.flac-bit-depth-promotion-without-sample-reconstruction.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R174.flac-bit-depth-promotion-without-sample-reconstruction.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R174.flac-bit-depth-promotion-without-sample-reconstruction.md)

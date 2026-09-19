<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# GPU JPEG entropy decoding

Full identity: `R177.gpu-jpeg-entropy-decoding`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Shared current evidence exposes a real nonfallback Apple WebGPU adapter, so the historical no-GPU/blocked-localhost verdict is no longer the blocker. Existing renderer accepts decoded planes; there is still no GPU JPEG entropy parser/kernel or malformed-input oracle.

Next action: Prepare one restart-bounded JPEG entropy segment and independent coefficient oracle, then test a single bounded GPU kernel with truncated/invalid Huffman controls.

## Definition and contract

This card is BLOCKED by the execution environment, not disproven. The permitted page reports no WebGPU adapter and no WebGL context. A localhost-origin capability retest could not run because Chromium returned ERR_BLOCKED_BY_ADMINISTRATOR for the navigation. No CPU implementation was substituted for the requested GPU entropy kernel, because that would not test the card. Integration implication: keep the experiment pending for a GPU-enabled browser environment with exact coefficient or pixel oracle coverage and malformed-input bounds.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R177.gpu-jpeg-entropy-decoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R177.gpu-jpeg-entropy-decoding.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R177.gpu-jpeg-entropy-decoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R177.gpu-jpeg-entropy-decoding.md)

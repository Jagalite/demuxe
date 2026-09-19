<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# common JPEG quantization basis without requantization loss

Full identity: `R197.common-jpeg-quantization-basis-without-requantization-loss`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Current playback consumes JPEG/video pixels without requiring a shared coefficient quantization basis. The gcd transform is exactly useful for coefficient editing but substantially grew both example files, so it is not a transparent compression/playback improvement.

Next action: For a coefficient-domain composition requirement, verify each dequantized coefficient after gcd rescaling with JCOEF overflow rejection, then charge larger entropy payloads.

## Definition and contract

Two 128×128 grayscale JPEGs used different quantization tables. For every coefficient position the transformer chose G=gcd(Q_A,Q_B) and replaced each quantized coefficient with C' = C·Q/G. Every transformed coefficient remained within JCOEF range (maximum absolute 513). The dequantized coefficient hashes are unchanged for both images. FFmpeg reports zero decoded-pixel differences, and Chromium createImageBitmap + canvas reports zero RGBA component differences for both transformed files. The representation is not automatically smaller: A grew 516→1494 bytes and B 1329→2292 bytes. This is a lossless compatibility/editing basis, not a compression win.

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
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R197.common-jpeg-quantization-basis-without-requantization-loss.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R197.common-jpeg-quantization-basis-without-requantization-loss.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R197.common-jpeg-quantization-basis-without-requantization-loss.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R197.common-jpeg-quantization-basis-without-requantization-loss.md)

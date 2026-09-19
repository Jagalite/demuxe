<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Incremental MJPEG stripe decode/upload

Full identity: `R206.incremental-mjpeg-stripe-decode-upload`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Presenter gets complete mp_image/VideoFrame outputs, not partial libjpeg stripes. Overlap would require a decoder stripe callback and unpublished-texture owner; multiple uploads alone showed no reported gain.

Next action: Expose one bounded stripe callback and completion fence only if existing decoder permits it; compare complete pixels and withhold publication until final stripe, with partial-frame negative control.

## Definition and contract

libjpeg exposed each 64-row RGB stripe while decoding a 1024×768 JPEG. The first stripe was available at 0.313 ms, versus 2.678 ms for the complete image. WebGL accepted those stripes through repeated texSubImage2D() calls into a texture that remained unpublished until completion. The partial negative-control pixel differed from the final published pixel. Median full-frame texture upload was 0.900 ms versus 1.000 ms for all stripe uploads, so there is no standalone upload-speed win here. The open opportunity is overlap between decode and upload; this pilot did not benchmark an actually overlapped pipeline. The graphics implementation is SwiftShader-class software, not physical-GPU evidence.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R206.incremental-mjpeg-stripe-decode-upload.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R206.incremental-mjpeg-stripe-decode-upload.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R206.incremental-mjpeg-stripe-decode-upload.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R206.incremental-mjpeg-stripe-decode-upload.md)

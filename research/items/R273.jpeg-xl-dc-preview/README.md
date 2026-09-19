<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# JPEG XL DC preview

Full identity: `R273.jpeg-xl-dc-preview`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The report uses libjxl progressive events and intentionally approximate DC output. Current player has no JPEG XL decoder/event bridge or progressive still-preview consumer, so a new codec service exceeds a first-pass candidate patch.

Next action: Identify an existing libjxl runtime and scope only progression event/FlushImage plus cancel on a tiny image before UI integration.

## Definition and contract

A 1024×768 JPEG XL image (29,564 bytes) was decoded directly through libjxl's progressive API. At the first FRAME_PROGRESSION event, FlushImage produced the 1:8 intended-downsampling-ratio DC image after only 6,926 bytes had been consumed—23.43% of the codestream. The flushed preview measured 22.09 dB PSNR against the final decoded image. A separate cancellation run destroyed the decoder at that exact progression point and consumed no later codestream bytes. Completing the decode yielded RGB bytes identical to FFmpeg's libjxl output. The result is an actual codec-progressive preview, not a truncated-file heuristic. It is intentionally a lower-fidelity preview and must be labeled as such.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R273.jpeg-xl-dc-preview.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R273.jpeg-xl-dc-preview.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R273.jpeg-xl-dc-preview.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R273.jpeg-xl-dc-preview.md)

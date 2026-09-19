<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# JPEG XL reconstruction followed by browser JPEG decode

Full identity: `R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current video route exposes codec frames, not a JPEG XL original-JPEG reconstruction adapter followed by browser image decode. A libjxl source file in dependency tree is not proof the required Wasm API is built/available.

Next action: Establish one bounded libjxl reconstruction API artifact and genuine JPEG-origin JXL fixture; exact JPEG hash then browser image equality, rejecting missing metadata/truncation/oversized output.

## Definition and contract

Used JxlEncoderAddJPEGFrame, reconstruction metadata, and the actual installed libjxl reconstruction API. No original JPEG is stored outside the JXL input as a reconstruction shortcut. The reconstructed bytes are emitted by libjxl, then independently decoded by Chromium’s JPEG image path. These public reconstruction APIs explicitly support returning the original JPEG codestream rather than a pixel reconstruction [S1, S2]. All four original/reconstructed browser RGBA comparisons have zero changed values. Missing reconstruction metadata, truncation, and non-JPEG input are rejected. A too-small fixed reconstruction output buffer initially failed to make progress; the final pilot uses an explicit 1 MiB bound for these small fixtures. That harness development failure is not a codec-format failure.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode.md)

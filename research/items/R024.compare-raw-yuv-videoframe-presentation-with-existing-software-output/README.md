<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compare raw-YUV VideoFrame presentation with existing Software output

Full identity: `R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: Raw I420 VideoFrame preserves padded strides/crop and black/white oracle exactly at the current display boundary. A scoped SDR performance comparison is now feasible; general color/HDR/rotation remain unqualified.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Presentation · Follow-on alternative presenter · P2 · Risk: Medium First environment: Matching Software build + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. After software video decode, construct a VideoFrame from its actual planar layout and let browser rendering handle presentation conversion. Compare against direct YUV texture upload and the existing RGB path; do not assume one is inherently superior. Source basis. WebCodecs defines raw-frame construction and layouts. External-texture presentation is available through WebGPU primitives; construction may still copy CPU memory. [W1, G1] First agent experiment. Use one software-required codec with stride, crop, color-range and nonzero-start variations. Record swscale activity, upload/copy bytes, queue size, first frame and sustained presentation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output.md)
- [results/full-completion/presentation/result.json](../../../results/full-completion/presentation/result.json)

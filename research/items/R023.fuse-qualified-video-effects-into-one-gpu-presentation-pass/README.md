<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fuse qualified video effects into one GPU presentation pass

Full identity: `R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Retained output uses canvas and current YUV presentation combines geometry/color conversion but subtitles remain a separate draw; requested video filters still require Software. GPU capability exists, yet a retained-frame effect contract/shader registry is not implemented.

Next action: Define one exact rotation plus simple color operation and compare a research fused presenter against existing output pixels including subtitle alpha and context loss.

## Definition and contract

Presentation · Follow-on optimization experiment · P2 · Risk: High First environment: WebGPU/WebGL browser + matching frames. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. For supported retained-frame effects, combine scaling, rotation/mirror, a simple color operation and subtitle composition into one render graph rather than returning pixels to Wasm for each stage. Keep a strict supported-operation subset. Source basis. WebGPU can sample external textures from VideoFrame or a video element; the official Chrome description calls zero-copy a possibility, not a promise. [G1] First agent experiment. Compare existing copy-back/filter behavior with a single-pass implementation for one operation at a time, then a combined plan. Match reference pixels, color range, transfer and alpha behavior before timing.

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass.md)

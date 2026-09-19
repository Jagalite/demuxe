<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reuse GPU command sequences across changing video frames

Full identity: `R364.reuse-gpu-command-sequences-across-changing-video-frames`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current custom plane presentation is WebGL2 with a video triangle and optional overlay draw, not a stable multi-draw WebGPU renderer using owned slot bind groups. WebGPU availability does not make render bundles usable by this owner. Rewriting the presenter just to test bundles exceeds first-pass scope.

Next action: If a WebGPU owned-slot renderer is introduced for independent reasons, compare one existing batched layout with recorded bundles using alternating pictures/parameters and atlas-generation invalidation; never add a video copy solely for caching commands.

## Definition and contract

Hypothesis. In a renderer with a stable sequence of draw operations, repeatedly encoding equivalent commands may be avoidable even though texture contents and effect parameters change each frame. Source basis. WebGPU render bundles are reusable recorded render-command sequences, unlike ordinary one-use command buffers. executeBundles does not inherit the surrounding pass's bindings and clears relevant pass state afterward. Video-backed external textures have their own identity and expiration rules; an imported frame is not a permanently live view that automatically follows future video frames. [S3] Proposed construction. Record rendering portions that bind stable, Demuxe-owned texture slots, stable glyph atlases, geometry, and parameter buffers. Update the contents of the selected slot and parameter buffer, then execute the corresponding compatible render bundle. Keep a bounded bundle per relevant resource slot and layout generation. This caches commands, not completed images, subtitle semantics, or decoded video.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R364.reuse-gpu-command-sequences-across-changing-video-frames.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R364.reuse-gpu-command-sequences-across-changing-video-frames.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R363_R366_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R363_R366_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R364.reuse-gpu-command-sequences-across-changing-video-frames.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R364.reuse-gpu-command-sequences-across-changing-video-frames.md)

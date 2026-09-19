<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Separate AV1 base decoding from film-grain reconstruction

Full identity: `R107.separate-av1-base-decoding-from-film-grain-reconstruction`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Browser video submission preserves AV1 coded payloads and returns reconstructed frames; no grain-disable bitstream parser or grain synthesis component exists here. Historical host grain-off CPU improvement intentionally changes pictures and is not an exact-output result.

Next action: First inventory one valid AV1 grain fixture and a reference exposing pre/post-grain planes; scope a parser-only sidecar before any external synthesis.

## Definition and contract

Type: Video reconstruction component. Priority: P2. Question. Can base decoding stay browser-owned while grain is omitted explicitly or reproduced by a separate verified component? What differs from earlier work. Unlike the HDR gain-map proposal, this uses a reconstruction stage already represented in a real codec. Mechanism. Parse original per-frame grain state, write a valid grain-disabled coded stream without changing tile image data, retain resolved grain parameters in a sidecar, then optionally synthesize grain on decoded output. Initial source profile. Known AV1 grain-enabled fixtures with an independent pre-grain and post-grain reference. Begin with one simple 8-bit profile. Source basis. AV1 separates reconstructed intermediate pictures from output grain synthesis and specifies both reference-exact and other allowed grain implementations. [S6]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R107.separate-av1-base-decoding-from-film-grain-reconstruction.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R107.separate-av1-base-decoding-from-film-grain-reconstruction.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R107.separate-av1-base-decoding-from-film-grain-reconstruction.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R107.separate-av1-base-decoding-from-film-grain-reconstruction.md)
